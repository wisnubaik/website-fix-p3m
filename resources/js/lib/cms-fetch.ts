/** Same-origin session requests, including Laravel's CSRF protection. */
export async function cmsFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    headers.set('X-CMS-Generation', cmsGeneration());
    const token = document.cookie.split('; ').find(value => value.startsWith('XSRF-TOKEN='))?.slice(11);
    if (token) headers.set('X-XSRF-TOKEN', decodeURIComponent(token));
    const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
    if ([401, 419].includes(response.status)) {
        window.dispatchEvent(new Event('admin-session-expired'));
    }
    if (!response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.clone().json();
        return new Response(JSON.stringify({ ...data, error: data.error ?? data.message }), {
            status: response.status, headers: response.headers,
        });
    }
    return response;
}

export function cmsGeneration(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="cms-generation"]')?.content ?? '0';
}
