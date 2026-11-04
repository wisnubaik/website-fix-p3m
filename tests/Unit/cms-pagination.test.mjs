import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
let server, paginateRecords;
before(async () => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    server = await createServer({ configFile: false, root, plugins: [react()], resolve: { alias: { '@': root + 'resources/js' } }, server: { middlewareMode: true, watch: null } });
    ({ paginateRecords } = await server.ssrLoadModule('/resources/js/components/admin/ResourceEditor.tsx'));
});
after(async () => { await server?.close(); });
test('589 records are split into 30 pages with correct global reorder indices', () => {
    const records = Array.from({ length: 589 }, (_, id) => ({ id }));
    const first = paginateRecords(records, 1), second = paginateRecords(records, 2), last = paginateRecords(records, 30);
    assert.equal(first.pages, 30); assert.equal(first.rows.length, 20);
    assert.equal(second.rows[0].item.id, 20); assert.equal(second.rows[0].index, 20);
    assert.equal(last.rows.length, 9); assert.equal(last.rows.at(-1).index, 588);
});
test('deleting the last page or filtering clamps to an existing page', () => {
    assert.equal(paginateRecords([1, 2], 30).page, 1);
    assert.equal(paginateRecords([], 9).page, 1);
    assert.deepEqual(paginateRecords([], 9).rows, []);
    assert.equal(paginateRecords(Array(40).fill(1), 3).page, 2);
});
