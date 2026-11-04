import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
let server, rules, Input, Textarea;
before(async () => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    server = await createServer({ configFile: false, root, plugins: [react()], resolve: { alias: { '@': root + 'resources/js' } }, server: { middlewareMode: true, watch: null } });
    rules = await server.ssrLoadModule('/resources/js/lib/field-validation.ts');
    const controls = await server.ssrLoadModule('/resources/js/components/admin/CmsInput.tsx');
    Input = controls.CmsInput;
    Textarea = controls.CmsTextarea;
});
after(async () => { await server?.close(); });
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
test('amounts block letters, exponent notation, decimals, signs and separators, including pasted strings', () => {
    for (const value of ['1e6', 'Rp 1000', '-12', '+12', '1.5', '1,000', '1 000']) {
        assert.notEqual(rules.fieldError('integer', value, true), '', value);
    }
    assert.equal(rules.fieldError('integer', '1000000'), '');
    assert.notEqual(rules.fieldError('integer', '2147483648'), '');
    assert.ok(Number.isNaN(rules.numericInput('')));
    assert.ok(Number.isNaN(rules.numericInput('1e6')));
    assert.equal(rules.numericInput('0'), 0);
});
test('person names support Unicode and academic punctuation while document and scheme names remain mixed text', () => {
    for (const value of ['Dr. Éva O’Neill, M.T.', 'Qimyatussa' + String.fromCharCode(96) + 'adah, S.E., M.SA', '李明']) {
        assert.equal(rules.fieldError('person', value), '', value);
    }
    assert.notEqual(rules.fieldError('person', 'Wisnu123', true), '');
    assert.equal(rules.fieldPolicy('staff', 'name'), 'person');
    assert.equal(rules.fieldPolicy('documents', 'name'), 'text');
    assert.equal(rules.fieldPolicy('acara-skema', 'nama'), 'text');
    assert.equal(rules.fieldError('text', 'Skema 1 / P3M 2026'), '');
});
test('contact details, identity numbers, years and letter numbers have distinct rules', () => {
    assert.equal(rules.fieldError('phone', '(0351) 452970'), '');
    assert.equal(rules.fieldError('phone', '+62 812-3456-7890'), '');
    assert.notEqual(rules.fieldError('phone', '0812abc'), '');
    assert.equal(rules.fieldError('digits', '001234567890123456'), '');
    assert.equal(rules.fieldError('documentNumber', 'B/001/PL33.9/2026'), '');
    assert.equal(rules.fieldError('year', '2026'), '');
    assert.notEqual(rules.fieldError('year', '26'), '');
    assert.notEqual(rules.fieldError('email', 'nama@'), '');
    assert.equal(rules.labelPolicy('NIDN'), 'digits');
    assert.equal(rules.labelPolicy('Jumlah'), 'integer');
    assert.equal(rules.fieldError('formattedInteger', '1.500'), '');
    assert.notEqual(rules.fieldError('formattedInteger', '1.5'), '');
});
test('numeric controls render a numeric keyboard and preserve an empty value instead of zero or NaN', () => {
    const html = render(Input, { type: 'number', value: Number.NaN, onChange() {} });
    assert.match(html, /type="text"/);
    assert.match(html, /inputMode="numeric"/);
    assert.match(html, /value=""/);
    assert.doesNotMatch(html, /NaN|value="0"/);
    const identifier = render(Input, { policy: 'digits', value: '001234', onChange() {} });
    assert.match(identifier, /value="001234"/);
});
test('passwords and file controls are not filtered as ordinary text', () => {
    const html = render(Input, { type: 'password', value: 'A1!@#%<>', onChange() {} });
    assert.match(html, /type="password"/);
    assert.doesNotMatch(html, /maxLength|inputMode/);
    assert.match(render(Input, { type: 'file', accept: '.xlsx' }), /type="file"/);
    assert.match(render(Textarea, { policy: 'people', value: 'Wisnu; Daffa', onChange() {} }), /Wisnu; Daffa/);
});
