import { router, usePage } from '@inertiajs/react';

export function usePathname() { return usePage().url.split('?')[0]; }
export function useSearchParams() { return new URLSearchParams(usePage().url.split('?')[1] ?? ''); }
export function useRouter() {
    return {
        push: (url: string) => router.visit(url),
        replace: (url: string, options?: { scroll?: boolean }) => router.visit(url, { replace: true, preserveScroll: options?.scroll === false }),
        refresh: () => router.reload(),
    };
}
