/** Only real interaction in a visible CMS tab can refresh idle time. */
export function trackAdminActivity(
    target: Pick<Document, 'addEventListener' | 'removeEventListener'>,
    allowed: () => boolean,
    refresh: () => Promise<void>,
    now: () => number = Date.now,
): () => void {
    let lastAttempt = -Infinity;
    let pending = false;
    let disposed = false;
    const events = ['keydown', 'input', 'pointerdown', 'pointermove', 'wheel', 'touchmove'];
    const activity = (event: Event) => {
        if (disposed || !event.isTrusted || !allowed() || pending) return;
        if (event.type === 'pointermove' && !(event as PointerEvent).buttons) return;
        if (now() - lastAttempt < 60000) return;
        lastAttempt = now();
        pending = true;
        // No timer: leaving a tab open must never keep its session alive.
        void refresh().catch(() => {}).finally(() => { pending = false; });
    };
    events.forEach(type => target.addEventListener(type, activity, { capture: true, passive: true }));
    return () => {
        disposed = true;
        events.forEach(type => target.removeEventListener(type, activity, true));
    };
}
