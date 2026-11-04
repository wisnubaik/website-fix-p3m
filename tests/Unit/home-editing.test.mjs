import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

let server, HeroTitle, ManagedBlocks;
before(async () => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    server = await createServer({ configFile: false, root, plugins: [react()], resolve: { alias: { '@': root + 'resources/js' } }, server: { middlewareMode: true, watch: null } });
    HeroTitle = (await server.ssrLoadModule('/resources/js/components/ui/HeroTitle.tsx')).default;
    ManagedBlocks = (await server.ssrLoadModule('/resources/js/components/ui/ManagedContent.tsx')).ManagedBlocks;
});
after(async () => { await server?.close(); });
const renderTitle = (title, phrase) => renderToStaticMarkup(React.createElement(HeroTitle, { title, phrase }));
const block = overrides => ({ id: 'test', type: 'text', title: '', text: '', url: '', alt: '', items: [], headers: [], rows: [], ...overrides });
const renderBlocks = blocks => renderToStaticMarkup(React.createElement(ManagedBlocks, { blocks }));

test('hero emphasis uses the complete phrase, preserves title case, and matches literal punctuation', () => {
    assert.equal(renderTitle('Pengabdian Kepada Masyarakat', ' kepada Masyarakat '), 'Pengabdian <em class="font-serif italic font-normal">Kepada Masyarakat</em>');
    assert.equal(renderTitle('Riset (A+B) dan (A+B)', '(a+b)'), 'Riset <em class="font-serif italic font-normal">(A+B)</em> dan (A+B)');
});
test('empty or unmatched emphasis never removes or changes title text', () => {
    for (const phrase of ['', '  ', '\u00a0', null, 'tidak ditemukan']) assert.equal(renderTitle('Judul asli', phrase), 'Judul asli');
    assert.equal(renderTitle('<script>', ''), '&lt;script&gt;');
});
test('title-only blocks render a heading without an empty paragraph or list', () => {
    for (const fields of [{ text: '' }, { text: '  \n\u00a0' }, { richText: [] }, { richText: [{ type: 'bullet', runs: [{ text: ' \u00a0 ' }] }] }]) {
        const html = renderBlocks([block({ title: 'Judul saja', ...fields })]);
        assert.match(html, /<h2[^>]*>Judul saja<\/h2>/);
        assert.doesNotMatch(html, /<(?:p|ul|li)(?: |>)/);
    }
});
test('fully blank blocks disappear; body-only content and ordering remain intact', () => {
    assert.equal(renderBlocks([block({ title: '  ', text: '\u00a0' })]), '');
    assert.equal(renderBlocks([block({ text: 'Teks lama', richText: [] })]), '');
    const html = renderBlocks([block({ id: 'a', title: 'Pertama' }), block({ id: 'b', text: 'Isi tanpa judul' })]);
    assert.ok(html.indexOf('Pertama') < html.indexOf('Isi tanpa judul'));
    assert.equal((html.match(/<section/g) ?? []).length, 2);
});
