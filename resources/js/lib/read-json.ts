export function safeUrl(value: string): boolean {
    if (/[\\\x00-\x20]/.test(value)) return false;
    if (value.startsWith("/") && !value.startsWith("//")) return true;
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
    } catch {
        return false;
    }
}
