export type PblText = { kind: "paragraph" | "ordered" | "unordered"; items: string[] };

/** Recognize consecutive numbered lists without splitting decimal values or prose. */
export function parsePblText(value: string): PblText {
    const text = value.replace(/\r\n?/g, "\n").trim();
    if (!text) return { kind: "paragraph", items: [] };
    const numbers = [...text.matchAll(/(?:^|\s)(\d{1,2})[.)]\s+/g)];
    if (numbers.length > 0 && numbers[0].index === 0 && numbers.every((match, i) => Number(match[1]) === i + 1)) {
        const items = numbers.map((match, i) => text.slice(match.index! + match[0].length, numbers[i + 1]?.index ?? text.length).trim());
        if (items.every(Boolean)) return { kind: "ordered", items };
    }
    const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
    if (lines.every(line => /^[-*•]\s+\S/.test(line))) {
        return { kind: "unordered", items: lines.map(line => line.replace(/^[-*•]\s+/, "")) };
    }
    return { kind: "paragraph", items: text.split(/\n\s*\n/).filter(Boolean) };
}

export function previewPblText(content: PblText): { content: PblText; shortened: boolean } {
    let budget = 320;
    let shortened = false;
    const items: string[] = [];
    for (const item of content.items) {
        if (items.length >= 3 || budget <= 0) { shortened = true; break; }
        const limit = Math.min(budget, content.kind === "paragraph" ? 320 : 180);
        if (item.length > limit) {
            items.push(item.slice(0, limit).trimEnd() + "…");
            shortened = true;
        } else items.push(item);
        budget -= Math.min(item.length, limit);
    }
    if (items.length < content.items.length && items.length && !items.at(-1)!.endsWith("…")) {
        items[items.length - 1] += "…";
    }
    return { content: { ...content, items }, shortened };
}
