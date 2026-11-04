import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
let server,graph,validate,remap,Diagram,ProfileExcel,StructuredExcel;
before(async()=>{
 const root=fileURLToPath(new URL('../../',import.meta.url));
 server=await createServer({configFile:false,root,plugins:[react()],resolve:{alias:{'@':root+'resources/js'}},server:{middlewareMode:true,watch:null}});
 graph=await server.ssrLoadModule('/resources/js/lib/organisation-connections.ts');
 validate=(await server.ssrLoadModule('/resources/js/lib/profile-tables.ts')).validateProfileContent;
 remap=(await server.ssrLoadModule('/resources/js/lib/profile-organisation.ts')).remapOrganisationEntries;
 Diagram=(await server.ssrLoadModule('/resources/js/components/ui/ConnectedOrganisation.tsx')).default;
 ProfileExcel=(await server.ssrLoadModule('/resources/js/components/admin/ProfileExcel.tsx')).default;
 StructuredExcel=(await server.ssrLoadModule('/resources/js/components/admin/ExcelImport.tsx')).StructuredExcel;
});
after(async()=>await server?.close());
const cell=(text='',items=[])=>({text,items,ordered:false});
const table=()=>({title:'Struktur',caption:'Struktur P3M',intro:'',note:'',numeric:false,headers:['Bagian','Nama'],rowRoles:['leader','groups','other'],rows:[[cell('Pimpinan'),cell('', ['Ketua'])],[cell('Kelompok dosen'),cell('', ['Teknik','Akuntansi'])],[cell('Unit lain'),cell('', ['Unit baru'])]]});
test('custom connections survive content validation and render new units with their selected parent',()=>{
 const t=table();t.connections=[...graph.defaultConnections(t,'organisation'),{from:'1:0',to:'2:0'}];
 const checked=validate({tables:[t]}).tables[0];assert.deepEqual(checked.connections,t.connections);
 const html=renderToStaticMarkup(React.createElement(Diagram,{table:checked}));
 assert.match(html,/Teknik menuju Unit baru/);assert.match(html,/Unit baru/);
 assert.equal((html.match(/<li class=/g)||[]).length,4);
});
test('connections reject cycles, unavailable boxes, self links, and duplicate parents',()=>{
 const t=table();
 for(const links of [[{from:'0:0',to:'0:0'}],[{from:'9:0',to:'1:0'}],[{from:'0:0',to:'1:0'},{from:'1:1',to:'1:0'}],[{from:'0:0',to:'1:0'},{from:'1:0',to:'0:0'}]])assert.throws(()=>validate({tables:[{...t,connections:links}]}));
});
test('moving and deleting boxes remaps arrows instead of reconnecting them to another box',()=>{
 const t=table();t.connections=[{from:'0:0',to:'1:0'},{from:'1:0',to:'2:0'}];
 remap(t,1,[1,0]);assert.deepEqual(t.connections,[{from:'0:0',to:'1:1'},{from:'1:1',to:'2:0'}]);
 t.rows[1][1]=cell('', ['Akuntansi','Teknik']);remap(t,1,[0]);assert.deepEqual(t.connections,[]);
});
test('profile and nested draft Excel editors expose current-data download',()=>{
 const html=renderToStaticMarkup(React.createElement(ProfileExcel,{table:table(),context:'test',onChange(){}}));
 assert.match(html,/Unduh data saat ini/);assert.match(html,/perubahan yang belum disimpan/);
 const nested=renderToStaticMarkup(React.createElement(StructuredExcel,{value:[{name:'Nama',items:['Satu','Dua']}],sample:{name:'',items:['']},name:'Daftar',context:'nested',onChange(){}}));
 assert.match(nested,/Unduh data saat ini/);
});
test('footer contact types use real destinations and fallback to site contacts',async()=>{
 const {footerSocialHref,DEFAULT_FOOTER_SOCIAL}=await server.ssrLoadModule('/resources/js/lib/footer-social.ts');
 const settings={instagram:'@p3m_pnm',email:'p3m@example.com',phone:'(0351) 12345'};
 assert.deepEqual(DEFAULT_FOOTER_SOCIAL.map(item=>footerSocialHref(item,settings)),['https://instagram.com/p3m_pnm','mailto:p3m@example.com','tel:035112345']);
 assert.equal(footerSocialHref({type:'youtube',href:'https://youtube.com/@pnm'},settings),'https://youtube.com/@pnm');
 assert.equal(footerSocialHref({type:'website',href:''},settings),'');
});
test('PNM visual connections include department headings and survive validation and edits',()=>{
 const t=table();t.rowRoles=['leader','department','support'];t.rows[1][0]=cell('Jurusan Teknik');
 t.connections=graph.defaultConnections(t,'institution');
 assert.deepEqual(t.connections,[{from:'1:h',to:'1:0'},{from:'1:h',to:'1:1'}]);
 const next=graph.connectOrganisation(t,'0:0','1:h');
 const checked=validate({tables:[next]}).tables[0];
 const html=renderToStaticMarkup(React.createElement(Diagram,{table:checked}));
 assert.match(html,/Jurusan Teknik/);assert.match(html,/Ketua menuju Jurusan Teknik/);
 remap(checked,1,[1,0]);assert.ok(checked.connections.some(link=>link.to==='1:h'));
});
test('drag reconnection replaces the parent, rejects cycles, and leaves the source unchanged',()=>{
 const t=table();t.connections=[{from:'0:0',to:'1:0'}];
 const next=graph.connectOrganisation(t,'2:0','1:0');
 assert.deepEqual(next.connections,[{from:'2:0',to:'1:0'}]);
 assert.deepEqual(t.connections,[{from:'0:0',to:'1:0'}]);
 assert.throws(()=>graph.connectOrganisation(next,'1:0','2:0'));
});
