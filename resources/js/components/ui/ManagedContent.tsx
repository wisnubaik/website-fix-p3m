import RichContent, { type RichParagraph } from './RichContent';
import { createElement, type ElementType, type ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

export type ContentBlock = { richText?:RichParagraph[]; id: string; type: 'text'|'image'|'links'|'cards'|'faq'|'table'; title: string; text: string; url: string; alt: string; items: {title:string;text:string;url:string}[]; headers: string[]; rows: string[][] };
export type PageDocument = {title:string;description:string;fields:Record<string,string>;collections:Record<string,unknown>;blocks:ContentBlock[];placement:'before'|'after'|'replace'};
export type PublicMenuItem = {id:string;label:string;href?:string;children?:PublicMenuItem[]};
export type ManagedProps = {fields:Record<string,string>;collections:Record<string,unknown>;document:PageDocument|null;pageId:string|null;preview:boolean;menu:PublicMenuItem[]};
export function useCms() {
    const cms = usePage().props.cms as ManagedProps | null;
    return {
        cms,
        text: (key:string, fallback:string) => cms?.fields?.[key] ?? fallback,
        data: <T,>(key:string, fallback:T):T => (cms?.collections?.[key] as T | undefined) ?? fallback,
    };
}
export function CmsText({field, fallback}:{field:string;fallback:string}) { return useCms().text(field, fallback); }
export function CmsActionText({field, fallback}:{field:string;fallback:string}) {
    const text = useCms().text(field, fallback).replace(/[←→↗↘↙↖↑↓➜➔➝•●▪]/g, '').trim();
    return <>{text}{" "}<span aria-hidden="true">→</span></>;
}
export function CmsElement({as,fields,children,...props}:{as:ElementType;fields:Record<string,string>;children?:ReactNode;[key:string]:any}) {
    const { cms } = useCms();
    const resolved = {...props};
    for (const [attribute, key] of Object.entries(fields)) {
        if (cms?.fields && Object.hasOwn(cms.fields, key)) resolved[attribute] = cms.fields[key];
    }
    return createElement(as, resolved, children);
}
export function ManagedBlocks({blocks}:{blocks:ContentBlock[]}) {
    const hasBody = (block: ContentBlock) => block.richText !== undefined
        ? block.richText.some(line => line.runs.some(run => run.text.trim()))
        : !!block.text.trim();
    const visible = blocks?.filter(block => block.title.trim() || hasBody(block) || (block.type==='image'&&block.url.trim()) || (['links','cards','faq'].includes(block.type)&&block.items.length>0) || (block.type==='table'&&block.rows.length>0));
    if (!visible?.length) return null;
    return <div className="managed-public-blocks max-w-[1280px] mx-auto px-5 md:px-14 py-[48px] md:py-[64px] space-y-[48px]">
        {visible.map(block => <section key={block.id} className="min-w-0">
            {block.title.trim() && <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--color-absolute-zero)] mb-5">{block.title.trim()}</h2>}
            {hasBody(block) && (block.richText !== undefined ? <RichContent value={block.richText}/> : <p className="whitespace-pre-line leading-relaxed text-[var(--color-graphite)] max-w-[78ch] mb-5">{block.text}</p>)}
            {block.type === 'image' && block.url && <figure><img src={block.url} alt={block.alt} className="max-w-full h-auto max-h-[700px] object-contain" loading="lazy" />{block.alt && <figcaption className="text-sm text-[var(--color-graphite)] mt-3">{block.alt}</figcaption>}</figure>}
            {block.type === 'links' && block.items.length > 0 && <ul className="divide-y border-y border-[var(--color-outline-gray)]">{block.items.map((item,i)=><li key={i} className="py-4 flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{item.title}</h3>{item.text && <p className="text-sm whitespace-pre-line text-[var(--color-graphite)] mt-1">{item.text}</p>}</div>{item.url && <a href={item.url} className="font-semibold underline underline-offset-4 text-[var(--color-absolute-zero)]">Buka<span className="sr-only"> {item.title}</span> ↗</a>}</li>)}</ul>}
            {block.type === 'cards' && block.items.length > 0 && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{block.items.map((item,i)=><article key={i} className="border border-[var(--color-outline-gray)] p-6"><h3 className="font-display text-xl font-semibold">{item.title}</h3><p className="text-sm whitespace-pre-line leading-relaxed mt-3">{item.text}</p>{item.url && <a href={item.url} className="inline-block font-semibold underline mt-5">Selengkapnya<span className="sr-only">: {item.title}</span> →</a>}</article>)}</div>}
            {block.type === 'faq' && block.items.length > 0 && <div className="divide-y border-y border-[var(--color-outline-gray)]">{block.items.map((item,i)=><details key={i} className="py-4"><summary className="font-semibold cursor-pointer">{item.title}</summary><p className="whitespace-pre-line mt-4 leading-relaxed">{item.text}</p>{item.url && <a href={item.url} className="underline inline-block mt-3">Selengkapnya</a>}</details>)}</div>}
            {block.type === 'table' && block.rows.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><caption className="sr-only">{block.title || 'Tabel informasi'}</caption><thead><tr>{block.headers.map((h,i)=><th key={i} scope="col" className="p-3 text-left bg-[var(--color-whisper-white)] border-b font-semibold">{h}</th>)}</tr></thead><tbody>{block.rows.map((row,i)=><tr key={i}>{row.map((value,j)=><td key={j} className="p-3 border-b align-top whitespace-pre-line">{value}</td>)}</tr>)}</tbody></table></div>}
        </section>)}
    </div>;
}
