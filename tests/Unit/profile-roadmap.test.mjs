import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
let server, mergeRoadmap, roadmapPayload, ResearchRoadmap;
before(async () => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    server = await createServer({ configFile: false, root, plugins: [react()], resolve: { alias: { '@': root + 'resources/js' } }, server: { middlewareMode: true, watch: null } });
    ({ mergeRoadmap, roadmapPayload } = await server.ssrLoadModule('/resources/js/components/admin/ProfileRoadmapEditor.tsx'));
    ({ ResearchRoadmap } = await server.ssrLoadModule('/resources/js/Pages/Public/profil.tsx'));
});
after(async () => { await server?.close(); });
const cell = text => ({ text, items: [], ordered: false });
const pair = () => [7, 6].map((number, side) => ({ id: `revision-profil-image-${number}`, content: { tables: [{ title: '', caption: 'Peta jalan', intro: 'PENGANTAR_LAMA', note: 'CATATAN_LAMA', numeric: false, headers: ['Tahun', side ? 'Indikator' : 'Agenda'], rows: [[cell('2025\nAwal'), cell('Isi A')], [cell('2030\nLanjutan'), cell('Isi B')]] }] } }));
test('one edit updates both headings and reorders both columns without mutating the originals', () => {
    const records = pair(); const rows = mergeRoadmap(records).reverse();
    rows[0].title = 'Judul bersama';
    const payload = roadmapPayload(records, rows);
    for (const record of payload) assert.equal(record.content.tables[0].rows[0][0].text, '2030\nJudul bersama');
    assert.equal(records[0].content.tables[0].rows[0][0].text, '2025\nAwal');
    const html = renderToStaticMarkup(React.createElement(ResearchRoadmap, { items: payload }));
    assert.ok(html.indexOf('2030') < html.indexOf('2025'));
    assert.equal((html.match(/Judul bersama/g) || []).length, 1);
    assert.doesNotMatch(html, /PENGANTAR_LAMA|CATATAN_LAMA/);
    assert.equal(payload[0].content.tables[0].intro, 'PENGANTAR_LAMA');
});
test('missing years and conflicting old headings remain visible for correction', () => {
    const records = pair(); records[1].content.tables[0].rows[0][0].text = '2025\nJudul lain';
    records[1].content.tables[0].rows.push([cell('2020\nTambahan'), cell('Indikator lama')]);
    const rows = mergeRoadmap(records);
    assert.equal(rows[0].oldTitle, 'Judul lain');
    assert.equal(rows[2].year, '2020');
    assert.equal(rows[2].cells[1].text, 'Indikator lama');
    assert.throws(() => roadmapPayload(records, rows), /agenda penelitian/);
});
test('duplicate years cannot silently merge away existing data', () => {
    const records = pair(); records[0].content.tables[0].rows.push(records[0].content.tables[0].rows[0]);
    assert.throws(() => mergeRoadmap(records), /berulang/);
});
