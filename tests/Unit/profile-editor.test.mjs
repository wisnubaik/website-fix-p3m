import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
let server, ProfileEditor, sections, AssetInput,profileModule,drafts;
before(async () => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    server = await createServer({ configFile: false, root, plugins: [react()], resolve: { alias: { '@': root + 'resources/js' } }, server: { middlewareMode: true, watch: null } });
    const module = await server.ssrLoadModule('/resources/js/Pages/Admin/Editors/profil/page.tsx');
    profileModule=module;ProfileEditor = module.default; sections = module.visibleProfileSections(false);
    drafts=await server.ssrLoadModule('/resources/js/lib/profile-drafts.ts');
    AssetInput = (await server.ssrLoadModule('/resources/js/components/admin/ContentInputs.tsx')).AssetInput;
});
after(async () => { await server?.close(); });
test('profile editor renders each destination with its public anchor and grouped choices', () => {
    for (const section of sections) {
        const html = renderToStaticMarkup(React.createElement(ProfileEditor, { initialSection: section.key }));
        assert.ok(html.includes(`href="/profil#${section.anchor}"`));
        assert.ok(html.includes(`value="${section.key}" selected=""`));
        assert.ok(html.includes('Tombol Simpan draf halaman tidak menyimpan perubahan pada Data halaman.'));
    }
});
test('image input retains existing image and describes both application and server limits', () => {
    const html = renderToStaticMarkup(React.createElement(AssetInput, { value: '/gedung-pnm.jpg', image: true, onChange() {} }));
    assert.ok(html.includes('src="/gedung-pnm.jpg"'));
    assert.ok(html.includes('Batas server dapat lebih kecil.'));
    assert.ok(html.includes('.jpg,.jpeg,.png,.webp,.gif,.svg'));
});

const record=(id='revision-profil-image-2')=>({id,name:'Struktur P3M',groupTitle:'Profil',published:true,order:6,version:5,documentUpdatedAt:'2026-10-29T00:00:00.000Z',content:{tables:[{title:'',caption:'Bagan P3M',intro:'',note:'',numeric:false,headers:['Bagian','Nama'],rows:[[{text:'Kepala',items:[],ordered:false},{text:'Nama kepala',items:[],ordered:false}]]}]}});
test('empty additional section is hidden but records with content remain editable',()=>{
 assert.equal(profileModule.hasAdditionalProfileData([]),false);assert.ok(!sections.some(s=>s.key==='informasi-lain'));
 assert.equal(profileModule.hasAdditionalProfileData([record()]),false);
 const extra=record('additional-profile-record');assert.equal(profileModule.hasAdditionalProfileData([extra]),true);
 assert.ok(profileModule.visibleProfileSections(true).some(s=>s.key==='informasi-lain'));
 const html=renderToStaticMarkup(React.createElement(ProfileEditor,{initialSection:'informasi-lain'}));assert.doesNotMatch(html,/value="informasi-lain"/);assert.match(html,/Pengantar P3M/);
});
test('JSON draft round trip restores contents and position without trusting old concurrency metadata',()=>{
 const old=record();old.version=1;old.documentUpdatedAt='2020-01-01T00:00:00.000Z';old.name='Nama hasil edit';
 const current=record(),before=JSON.stringify(current),payload=JSON.parse(JSON.stringify(drafts.exportProfileDraft(old,2))),result=drafts.importProfileDraft(payload,current,2);
 assert.equal(result.position,2);assert.equal(result.record.name,old.name);assert.deepEqual(result.record.content,old.content);assert.equal(result.record.version,current.version);assert.equal(result.record.documentUpdatedAt,current.documentUpdatedAt);assert.equal(result.record.order,current.order);assert.equal(JSON.stringify(current),before);
 const legacy=drafts.importProfileDraft(old,current,2);assert.equal(legacy.position,undefined);assert.equal(legacy.record.name,old.name);
});
test('JSON import rejects another section, invalid contents, unsupported format and out of range position',()=>{
 const current=record(),before=JSON.stringify(current);
 assert.throws(()=>drafts.importProfileDraft(record('revision-profil-image-1'),current,2),/bagian lain/);
 for(const modify of [p=>p.formatVersion=99,p=>p.position=0,p=>p.position=3,p=>p.record.content.tables[0].headers=[],p=>p.record.published='yes']){
  const payload=drafts.exportProfileDraft(current,1);modify(payload);assert.throws(()=>drafts.importProfileDraft(payload,current,2));
 }
 assert.equal(JSON.stringify(current),before);
});
