import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('../../', import.meta.url));
const defaults = JSON.parse(fs.readFileSync(root + 'database/cms-default-content.json', 'utf8'));
const source = JSON.parse(defaults.tables.ProfileTableContent.find(row => row.documentId === 'revision-profil-image-1').content).tables[0];
let server, layout, roles, Diagram;
before(async () => {
    server = await createServer({ configFile: false, root, plugins: [react()], resolve: { alias: { '@': root + 'resources/js' } }, server: { middlewareMode: true, watch: null } });
    layout = (await server.ssrLoadModule('/resources/js/lib/institution-diagram.ts')).institutionLayout;
    roles = await server.ssrLoadModule('/resources/js/lib/profile-organisation.ts');
    Diagram = (await server.ssrLoadModule('/resources/js/components/ui/InstitutionDiagram.tsx')).default;
});
after(async () => { await server?.close(); });

function bounds(diagram) {
    for (const box of diagram.boxes) {
        assert.ok(box.x >= 0 && box.y >= 0, box.id);
        assert.ok(box.x + box.width <= diagram.width && box.y + box.height <= diagram.height, box.id);
        for (const text of box.texts) assert.ok(text.y + (text.lines.length - 1) * box.lineHeight <= box.height, box.id);
    }
    for (let i = 0; i < diagram.boxes.length; i++) {
        for (let j = i + 1; j < diagram.boxes.length; j++) {
            const a = diagram.boxes[i], b = diagram.boxes[j];
            const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
            const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
            assert.ok(width < .01 || height < .01, `${a.id} overlaps ${b.id}`);
        }
    }
}

test('reference layout keeps the original positions, oval bodies, and every study programme visible', () => {
    const diagram = layout(source);
    assert.equal(diagram.width, 1280);
    assert.equal(diagram.spine, 686);
    const box = id => diagram.boxes.find(item => item.id === id);
    assert.deepEqual([box('director').x, box('director').y, box('director').width], [481, 220, 410]);
    assert.equal(box('council-0').shape, 'ellipse');
    assert.equal(box('inspection-0').shape, 'ellipse');
    assert.ok(box('department-2').x < diagram.spine);
    assert.ok(box('administration-0-0').x > diagram.spine);
    assert.ok(box('centre-0').y > box('administration-0-1').y);
    assert.equal(box('programmes-0').texts.length, 4);
    assert.equal(box('programmes-1').texts.length, 3);
    assert.equal(box('programmes-2').texts.length, 8);
    assert.ok(box('programmes-2').texts[0].lines[0].startsWith('1. '));
    assert.equal(diagram.boxes.filter(item => item.id.startsWith('support-')).length, 6);
    bounds(diagram);
});

test('all unit labels point to their original CMS row and entry without mutating data', () => {
    const table = structuredClone(source), before = JSON.stringify(table), diagram = layout(table);
    for (const row of table.rows) {
        roles.cellEntries(row[1]).forEach((_, entry) => {
            assert.ok(diagram.boxes.some(box => box.row === row && box.column === 1 && box.texts.some(text => text.entry === entry)), `Missing entry ${entry + 1} in ${row[0].text}`);
        });
    }
    assert.equal(JSON.stringify(table), before);
});

test('renaming and deleting units preserves explicit coordination instead of guessing from new names', () => {
    const table = roles.withOrganisationRoles(structuredClone(source));
    const supportIndex = table.rowRoles.indexOf('support');
    const leaderIndex = table.rowRoles.indexOf('leader');
    table.rows[leaderIndex][1].items[1] = 'Wakil Direktur Pendidikan';
    table.rows[supportIndex][1].items[0] = 'Perpustakaan Terpadu';
    table.rows[supportIndex][1].items.splice(1, 1);
    roles.remapOrganisationEntries(table, supportIndex, [0, 2, 3, 4, 5]);
    assert.deepEqual(table.supportLinks, [{ leader: 1, units: [0, 1, 2, 3] }, { leader: 3, units: [4] }]);
    const diagram = layout(table);
    assert.equal(diagram.paths.filter(path => path.id.startsWith('coordination-unit-')).length, 4);
    assert.equal(diagram.boxes.filter(box => box.id.startsWith('support-')).length, 5);
    bounds(diagram);
});

test('long names and new departments, deputy rows, and units expand without hiding or overlapping boxes', () => {
    const table = roles.withOrganisationRoles(structuredClone(source));
    table.rows[0][1].items.push('Wakil Direktur Tambahan', 'Wakil Direktur Pengembangan');
    const dept = structuredClone(table.rows[3]);
    dept[0].text = 'Jurusan Baru'; dept[1].items = ['Program studi dengan nama yang panjang '.repeat(15), 'Studi baru'];
    table.rows.push(dept); table.rowRoles.push('department');
    table.rows[1][1].items.push('Dewan tambahan '.repeat(12), 'Dewan lainnya '.repeat(10));
    const support = table.rows[table.rowRoles.indexOf('support')][1];
    support.items.push('Unit tambahan pertama', 'Unit dengan nama panjang '.repeat(15));
    const diagram = layout(table);
    assert.equal(diagram.boxes.filter(box => box.id.startsWith('deputy-')).length, 5);
    assert.ok(diagram.width > 1280 && diagram.height > 914);
    bounds(diagram);
});

test('removing sections removes their nodes and leaves no stale coordination paths', () => {
    const table = roles.withOrganisationRoles(structuredClone(source));
    const indices = table.rowRoles.flatMap((role, i) => ['support', 'inspection', 'council', 'functional'].includes(role) ? [] : [i]);
    table.rows = indices.map(i => table.rows[i]); table.rowRoles = indices.map(i => table.rowRoles[i]); table.supportLinks = [];
    const diagram = layout(table);
    assert.ok(!diagram.boxes.some(box => /^(support|inspection|council|functional)-/.test(box.id)));
    assert.ok(!diagram.paths.some(path => path.coordination));
    bounds(diagram);
});

test('public diagram uses selectable text; CMS uses keyboard-focusable edit targets for every entry', () => {
    const publicHtml = renderToStaticMarkup(React.createElement(Diagram, { table: source }));
    const adminHtml = renderToStaticMarkup(React.createElement(Diagram, { table: source, onEdit() {} }));
    assert.ok(publicHtml.includes('D4 Akuntansi Perpajakan'));
    assert.ok(publicHtml.includes('Garis Komando') && publicHtml.includes('Garis Koordinasi'));
    assert.ok(!publicHtml.includes('<details'));
    assert.ok(!publicHtml.includes('role="button"'));
    assert.equal((adminHtml.match(/role="button"/g) ?? []).length, 38);
    assert.ok(adminHtml.includes('aria-label="Ubah D4 Akuntansi Perpajakan"'));
    assert.ok(adminHtml.includes('clipPath') && adminHtml.includes('overflow="hidden"'));
});

test('custom heading and HTML-like CMS text remain escaped and editable', () => {
    const table = structuredClone(source);
    table.title = 'Struktur organisasi\nInstitusi setelah perubahan';
    table.rows[3][1].items[0] = '<img src=x onerror=alert(1)>';
    const html = renderToStaticMarkup(React.createElement(Diagram, { table }));
    assert.ok(html.includes('INSTITUSI SETELAH PERUBAHAN'));
    assert.ok(html.includes('&lt;img'));
    assert.ok(!html.includes('<img src=x'));
    assert.ok(!html.includes('POLITEKNIK NEGERI MADIUN'));
});
