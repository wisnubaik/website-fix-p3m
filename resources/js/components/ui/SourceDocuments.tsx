import { safeUrl } from "@/lib/read-json";
type Item = { id: string; name: string; href: string | null; category: string | null; groupTitle: string };
export default function SourceDocuments({ items }: { items: Item[] }) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.filter(item => item.href && safeUrl(item.href)).map(item => (
            <a key={item.id} href={item.href!} target="_blank" rel="noopener noreferrer"
                className="block min-w-0 border border-[var(--color-outline-gray)] bg-white p-4 hover:border-[var(--color-absolute-zero)] transition-colors">
                {item.category === "gambar" && (
                    // Gambar dokumen harus utuh; jangan crop struktur atau peta jalan.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.href!} alt={item.name} loading="lazy" className="w-full h-auto object-contain mb-4" />
                )}
                <span className="text-xs text-[var(--color-graphite)]">{item.groupTitle}</span>
                <span className="block mt-1 font-semibold text-[var(--color-absolute-zero)]">{item.name} <span aria-hidden="true">↗</span></span>
            </a>
        ))}
    </div>;
}
