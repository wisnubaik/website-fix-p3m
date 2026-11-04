import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const root = fileURLToPath(new URL('../../', import.meta.url));
let server, Card;
before(async () => {
    server = await createServer({ configFile: false, root, plugins: [react()], resolve: { alias: { '@': root + 'resources/js' } }, server: { middlewareMode: true, watch: null } });
    Card = (await server.ssrLoadModule('/resources/js/components/ui/QuickAccessCard.tsx')).default;
});
after(async () => { await server?.close(); });
test('quick access metadata has no decorative dot', () => {
    const html = renderToStaticMarkup(React.createElement(Card, { title: 'Dokumen', meta: 'PDF 2025-2029', href: '/profil', accent: 'navy', icon: React.createElement('span', null, 'PDF') }));
    assert.match(html, /PDF 2025-2029/);
    assert.doesNotMatch(html, /w-1 h-1 rounded-full|[—–·•]/u);
});
test('renderable literals contain no long dash or middle dot, while parsing regexes are left alone', () => {
    const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);
    const found = [];
    for (const file of files(join(root, 'resources/js')).filter(file => /\.tsx?$/.test(file))) {
        const source = readFileSync(file, 'utf8');
        const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
        function visit(node) {
            if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) {
                if (/[\u2012-\u2015·•]/u.test(node.text)) found.push(file.replace(root, ''));
            }
            ts.forEachChild(node, visit);
        }
        visit(ast);
    }
    assert.deepEqual(found, []);
});
