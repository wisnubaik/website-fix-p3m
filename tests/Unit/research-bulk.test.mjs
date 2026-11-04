import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
let server, ExcelImport;
before(async()=>{
    const root=fileURLToPath(new URL('../../',import.meta.url));
    server=await createServer({configFile:false,root,plugins:[react()],resolve:{alias:{'@':root+'resources/js'}},server:{middlewareMode:true,watch:null}});
    ExcelImport=(await server.ssrLoadModule('/resources/js/components/admin/ExcelImport.tsx')).default;
});
after(async()=>{await server?.close();});
const render=props=>renderToStaticMarkup(React.createElement(ExcelImport,{title:'Data',...props}));
test('each research category explains all-year scope and offers replace and clear',()=>{
    for(const category of ['penelitian-internal','penelitian-eksternal','penelitian-unggulan','pkm-internal','pkm-eksternal','pkm-unggulan']){
        const html=render({resource:'riset-entries',scope:{category}});
        assert.match(html,/Ganti seluruh data bagian ini/);
        assert.match(html,/Kosongkan data/);
        assert.match(html,/seluruh tahun/);
        assert.match(html,/Filter pencarian tabel tidak membatasi impor/);
    }
});
test('unscoped and unrelated editors do not offer destructive research controls',()=>{
    for(const props of [{resource:'riset-entries'},{resource:'monev-slot',scope:{acara:'monev'}},{resource:'rows'}]){
        const html=render(props);
        assert.doesNotMatch(html,/Kosongkan data|Ganti seluruh data bagian ini/);
    }
});

test('KI editor offers the same bulk controls for all works',()=>{
    const html=render({resource:'ki-karya'});
    assert.match(html,/Tahun tujuan impor/);
    assert.match(html,/Ganti seluruh data bagian ini/);
    assert.match(html,/Kosongkan data/);
});

test('inline tables offer replacement in draft while parent schemes do not',()=>{
 assert.match(render({resource:'rows',onApply:()=>0}), /Ganti seluruh data bagian ini/);
 assert.doesNotMatch(render({resource:'acara-skema'}), /Kosongkan data/);
});
test('event schedules require both period and scheme before bulk controls appear',()=>{
 assert.match(render({resource:'monev-slot',scope:{acara:'semhas',periodeId:'period',skemaId:'scheme'}}), /Ganti seluruh data bagian ini/);
 assert.doesNotMatch(render({resource:'documents',scope:{section:'semhas'}}), /Kosongkan data/);
});
