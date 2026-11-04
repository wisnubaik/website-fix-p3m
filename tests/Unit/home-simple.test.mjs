import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let server, Hero, StudyProgramLinks, programLevel;
before(async () => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    server = await createServer({ configFile: false, root, plugins: [react()], resolve: { alias: { '@': root + 'resources/js' } }, server: { middlewareMode: true, watch: null } });
    Hero = (await server.ssrLoadModule('/resources/js/components/ui/Hero.tsx')).default;
    const programs = await server.ssrLoadModule('/resources/js/components/ui/StudyProgramLinks.tsx');
    StudyProgramLinks = programs.default;
    programLevel = programs.programLevel;
});
after(async () => { await server?.close(); });
test('home hero ignores legacy emphasis and renders the complete title without italics', async () => {
    for (const phrase of ['Masyarakat', 'kepada Masyarakat', '', null]) {
        const result = await createInertiaApp({ page: { component: 'Hero', props: { titleText: 'Pengabdian kepada Masyarakat', titleItalicWord: phrase }, url: '/', version: null }, render: renderToStaticMarkup, resolve: () => Hero, setup: ({ App, props }) => React.createElement(App, props) });
        const html = result.body;
        assert.ok(html.includes('Pengabdian kepada Masyarakat'));
        assert.doesNotMatch(html, /<em[ >]/);
    }
});

test('program cards preserve CMS order and destinations, expose diploma filters, and contain no icons', () => {
    const items=Array.from({length:13},(_,i)=>({id:String(i),name:`D-IV Program studi ${i+1}`,href:`https://prodi${i+1}.example`,groupTitle:i<7?'Diploma IV':'Diploma III'}));
    items.splice(3,0,{id:'hidden',name:'Tidak tampil',href:null,groupTitle:'Diploma II'});
    const html=renderToStaticMarkup(React.createElement(StudyProgramLinks,{items}));
    assert.equal((html.match(/<li /g)||[]).length,13);
    assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g)||[]).length,13);
    assert.equal((html.match(/aria-pressed=/g)||[]).length,3);
    for(let i=1;i<=13;i++) {
        assert.ok(html.includes(`href="https://prodi${i}.example"`));
        if(i<13)assert.ok(html.indexOf(`>Program studi ${i}</span>`) < html.indexOf(`>Program studi ${i+1}</span>`));
    }
    assert.match(html,/grid-cols-1 sm:grid-cols-2 lg:grid-cols-4/);
    assert.doesNotMatch(html,/Tidak tampil|Diploma II<|<svg|D-IV Program/);
    assert.equal(renderToStaticMarkup(React.createElement(StudyProgramLinks,{items:[]})), '');
});
test('existing program levels remain compatible and custom CMS levels become filters', () => {
    assert.equal(programLevel({name:'D-IV Teknik',groupTitle:'Program studi'}),'Diploma IV');
    assert.equal(programLevel({name:'D-III Akuntansi',groupTitle:'Program D-III'}),'Diploma III');
    assert.equal(programLevel({name:'Nama prodi',groupTitle:'Diploma II'}),'Diploma II');
    const html=renderToStaticMarkup(React.createElement(StudyProgramLinks,{items:[{id:'new',name:'Nama prodi',href:'https://example.com',groupTitle:'Diploma II'}]}));
    assert.match(html,/>Diploma II<\/button>/);
});
test('home CMS excludes the legacy new-tab caption while retaining compatibility with saved drafts', () => {
    const catalog=JSON.parse(readFileSync(new URL('../../database/managed-site-catalog.json',import.meta.url),'utf8'));
    const visible=catalog.pages['/'].fields.map(key=>catalog.fields[key]).filter(field=>!field.hidden);
    assert.ok(!visible.some(field=>field.key==='f_6f81b4269fc9ab'));
    assert.ok(visible.some(field=>field.key==='f_fd095e662366d1'));
    assert.ok(visible.some(field=>field.key==='f_c1d8d581292cf4'));
});
