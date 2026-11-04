import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createServer } from 'vite';
let server, track;
before(async () => {
    server = await createServer({ configFile: false, server: { middlewareMode: true, watch: null } });
    track = (await server.ssrLoadModule('/resources/js/lib/admin-activity.ts')).trackAdminActivity;
});
after(async () => { await server?.close(); });
function harness(refresh = async () => {}) {
    const handlers = new Map(); let time = 100000, allowed = true, calls = 0;
    const stop = track({ addEventListener: (type, fn) => handlers.set(type, fn), removeEventListener: type => handlers.delete(type) }, () => allowed, async () => { calls++; await refresh(); }, () => time);
    return { stop, handlers, get calls() { return calls; }, advance(ms) { time += ms; }, allow(value) { allowed = value; }, async event(type, extra = {}) { handlers.get(type)?.({ type, isTrusted: true, ...extra }); await new Promise(resolve => setImmediate(resolve)); } };
}
test('typing and dragging refresh at most once per minute, never on a timer', async () => {
    const h = harness(); assert.equal(h.calls, 0);
    await h.event('input'); await h.event('keydown'); assert.equal(h.calls, 1);
    h.advance(60000); assert.equal(h.calls, 1);
    await h.event('pointermove', { buttons: 1 }); assert.equal(h.calls, 2);
    h.stop(); await h.event('input'); assert.equal(h.calls, 2); assert.equal(h.handlers.size, 0);
});
test('hidden or ended sessions, synthetic events, and hovering do not refresh', async () => {
    const h = harness(); h.allow(false); await h.event('input');
    h.allow(true); await h.event('input', { isTrusted: false }); await h.event('pointermove', { buttons: 0 });
    assert.equal(h.calls, 0); await h.event('wheel'); assert.equal(h.calls, 1); h.stop();
});
test('clicks and touch gestures count as activity', async () => {
    const h = harness(); await h.event('pointerdown'); h.advance(60000); await h.event('touchmove');
    assert.equal(h.calls, 2); h.stop();
});
test('slow requests cannot overlap and failed requests require new interaction', async () => {
    let finish; const h = harness(() => new Promise((_, reject) => { finish = reject; }));
    await h.event('input'); h.advance(60000); await h.event('input'); assert.equal(h.calls, 1);
    finish(new Error('offline')); await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.calls, 1); await h.event('input'); assert.equal(h.calls, 2);
    finish(new Error('offline')); h.stop();
});
