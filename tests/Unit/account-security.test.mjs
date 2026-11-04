import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const root = fileURLToPath(new URL('../../', import.meta.url));
let server, AccountSecurity, ToastProvider, deviceLabel;
before(async () => {
    server = await createServer({ configFile: false, root, plugins: [react()], resolve: { alias: { '@': root + 'resources/js' } }, server: { middlewareMode: true, watch: null } });
    const security = await server.ssrLoadModule('/resources/js/components/admin/AccountSecurity.tsx');
    AccountSecurity = security.default;
    deviceLabel = security.deviceLabel;
    ToastProvider = (await server.ssrLoadModule('/resources/js/components/admin/Toast.tsx')).ToastProvider;
});
after(async () => { await server?.close(); });
function render(connected, enabled = true) {
    return renderToStaticMarkup(React.createElement(ToastProvider, null, React.createElement(AccountSecurity, { account: { email: 'admin@example.test', googleConnected: connected, googleLoginEnabled: enabled } })));
}
test('linked account exposes a disconnect action and unlinked account explains first linking', () => {
    assert.match(render(true), /Putuskan koneksi Google/);
    assert.doesNotMatch(render(false), /Putuskan koneksi Google/);
    assert.match(render(false), /Konfirmasi dengan password CMS/);
    assert.match(render(true, false), /Login Google sedang tidak tersedia/);
});
test('device labels distinguish Edge from Chrome and mobile from desktop', () => {
    assert.equal(deviceLabel('Windows Chrome/130 Safari/537 Edg/130'), 'Edge di Windows');
    assert.equal(deviceLabel('Android Chrome/130 Safari/537'), 'Chrome di Android');
    assert.equal(deviceLabel('iPhone Safari/604'), 'Safari di iOS');
    assert.equal(deviceLabel('unknown'), 'Browser di perangkat lain');
});
