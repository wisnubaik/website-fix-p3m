import { useCms } from '@/components/ui/ManagedContent';
"use client";

import { useId, useState } from "react";
import { parsePblText, previewPblText } from "@/lib/pbl-text";

export default function PblText({ text, label }: { text: string; label: string }) {
    const cms = useCms();

    const id = useId();
    const [expanded, setExpanded] = useState(false);
    const full = parsePblText(text);
    const preview = previewPblText(full);
    const content = expanded ? full : preview.content;
    if (!full.items.length) return null;
    const itemClass = "whitespace-pre-line break-words [overflow-wrap:anywhere]";
    return <div className="min-w-0 text-[14px] leading-[1.75] text-[var(--color-graphite)]">
        <div id={id}>
            {content.kind === "ordered" ? <ol className="list-decimal space-y-1.5 pl-5 marker:font-medium">{content.items.map((item, index) => <li key={index} className={`${itemClass} pl-1`}>{item}</li>)}</ol>
                : content.kind === "unordered" ? <ul className="list-none space-y-1.5 pl-5">{content.items.map((item, index) => <li key={index} className={`${itemClass} pl-1`}>{item}</li>)}</ul>
                : <div className="space-y-3">{content.items.map((item, index) => <p key={index} className={itemClass}>{item}</p>)}</div>}
        </div>
        {preview.shortened && <button type="button" aria-expanded={expanded} aria-controls={id}
            aria-label={`${expanded ? cms.text("pbl_ringkas", "Ringkas") : cms.text("pbl_selengkapnya", "Lihat selengkapnya")}: ${label}`}
            onClick={() => setExpanded(value => !value)}
            className="mt-2 py-1 text-[13px] font-semibold text-[var(--color-cosmic-candy)] underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-4">
            {expanded ? cms.text("pbl_ringkas", "Ringkas") : cms.text("pbl_selengkapnya", "Lihat selengkapnya")}
        </button>}
    </div>;
}
