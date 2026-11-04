import { cmsFetch } from "@/lib/cms-fetch";
"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/admin/Toast";
import { ARCHIVE_PAGES } from "@/lib/archive-config";
import BlockView, { ArchiveBlockData, ImageGallery } from "./BlockView";

function groupPages() {
    const order: string[] = [];
    const map = new Map<string, typeof ARCHIVE_PAGES>();
    for (const p of ARCHIVE_PAGES) {
        const groupLabel = p.label.includes(" / ") ? p.label.split(" / ")[0] : p.label;
        if (!map.has(groupLabel)) {
            map.set(groupLabel, []);
            order.push(groupLabel);
        }
        map.get(groupLabel)!.push(p);
    }
    return order.map((label) => ({ label, items: map.get(label)! }));
}

// Blok "image" yang berurutan (run) dikelompokkan jadi satu item galeri,
// biar 10 gambar arsip nggak ditumpuk satu-satu penuh lebar tapi tampil
// sebagai grid + lightbox lewat <ImageGallery>. Blok lain tetap render
// satu-satu lewat <BlockView> seperti biasa. nggak ada yang berubah
// urutan/isinya, cuma cara render blok "image" doang.
type RenderGroup =
    | { kind: "block"; key: string; block: ArchiveBlockData }
    | { kind: "images"; key: string; images: ArchiveBlockData[] };

function groupBlocksForRender(blocks: ArchiveBlockData[]): RenderGroup[] {
    const groups: RenderGroup[] = [];
    for (const b of blocks) {
        const last = groups[groups.length - 1];
        if (b.blockType === "image") {
            if (last && last.kind === "images") {
                last.images.push(b);
            } else {
                groups.push({ kind: "images", key: b.id, images: [b] });
            }
        } else {
            groups.push({ kind: "block", key: b.id, block: b });
        }
    }
    return groups;
}

function StatusBadge({ status }: { status: "done" | "pending" }) {
    return status === "done" ? (
        <span className="inline-block bg-[var(--color-leaf-100)] text-[var(--color-leaf-600)] text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 shrink-0">
            Selesai
        </span>
    ) : (
        <span className="inline-block bg-[var(--color-whisper-white)] text-[var(--color-graphite)] text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 shrink-0">
            Belum
        </span>
    );
}

/** Panel konten, di-remount tiap ganti halaman lewat `key={activeSlug}` di parent
 *  biar `loading` balik ke `true` otomatis dari initial state, tanpa perlu
 *  setState sinkron di awal body effect (react-hooks/set-state-in-effect). */
function ArchiveBlockPanel({ activePage }: { activePage: (typeof ARCHIVE_PAGES)[number] }) {
    const { showToast } = useToast();
    const [blocks, setBlocks] = useState<ArchiveBlockData[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cmsFetch(`/api/admin/archive?page=${activePage.slug}`)
            .then((r) => r.json())
            .then((d) => {
                setBlocks(Array.isArray(d) ? d : []);
                setLoading(false);
            })
            .catch(() => {
                showToast("Gagal memuat arsip.", "error");
                setLoading(false);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const renderGroups = useMemo(() => (blocks ? groupBlocksForRender(blocks) : []), [blocks]);

    return (
        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--color-outline-gray)]">
                <h2 className="font-display text-lg font-bold text-[var(--color-absolute-zero)]">{activePage.label}</h2>
                <a
                    href={activePage.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-[var(--color-sunset-burst)] hover:underline shrink-0"
                >
                    Lihat halaman asli ↗
                </a>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-10 bg-[var(--color-whisper-white)] animate-pulse" />
                    ))}
                </div>
            ) : activePage.status === "pending" ? (
                <div className="border border-dashed border-[var(--color-outline-gray)] px-5 py-8 text-center">
                    <p className="text-sm text-[var(--color-graphite)] mb-1">Halaman ini belum di-backup.</p>
                    <p className="text-[12px] text-[var(--color-graphite)]">
                        Cek langsung ke{" "}
                        <a
                            href={activePage.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-sunset-burst)] hover:underline"
                        >
                            halaman asli-nya
                        </a>{" "}
                        sementara ini.
                    </p>
                </div>
            ) : blocks && blocks.length > 0 ? (
                <div className="space-y-2.5">
                    {renderGroups.map((g) =>
                        g.kind === "images" ? (
                            <ImageGallery key={g.key} images={g.images} />
                        ) : (
                            <BlockView key={g.key} block={g.block} />
                        )
                    )}
                </div>
            ) : (
                <div className="border border-dashed border-[var(--color-outline-gray)] px-5 py-8 text-center text-sm text-[var(--color-graphite)]">
                    Belum ada data.
                </div>
            )}
        </div>
    );
}

export default function ArsipAdminPage() {
    const groups = useMemo(() => groupPages(), []);
    const [activeSlug, setActiveSlug] = useState(ARCHIVE_PAGES[0].slug);
    const activePage = ARCHIVE_PAGES.find((p) => p.slug === activeSlug)!;
    const doneCount = ARCHIVE_PAGES.filter((p) => p.status === "done").length;

    return (
        <div>
            <h1 className="font-display text-2xl font-bold text-[var(--color-absolute-zero)] mb-1">Data Internal P3M-PNM</h1>
            <p className="text-sm text-[var(--color-graphite)] mb-1 max-w-[640px]">
                Repositori data dan dokumen P3M PNM yang dihimpun dari situs sebelumnya (Google
                Sites). Halaman ini{" "}
                <strong>bersifat internal, dan tidak ditampilkan pada situs publik</strong>. Oleh
                karenanya hanya digunakan sebagai arsip dan cadangan untuk mengantisipasi apabila
                situs lama sudah tidak dapat diakses.
            </p>
            <p className="text-[13px] text-[var(--color-graphite)] mb-6">
                Progres pengarsipan: <strong className="text-[var(--color-absolute-zero)]">{doneCount}</strong> dari{" "}
                {ARCHIVE_PAGES.length} halaman.
            </p>

            <div className="flex gap-6 items-start">
                {/* Sub-nav kiri, dikelompokkan sesuai struktur sumber datanya */}
                <aside className="w-72 shrink-0 border border-[var(--color-outline-gray)] bg-white max-h-[75vh] overflow-y-auto overflow-x-hidden">
                    {groups.map((g) => (
                        <div key={g.label} className="border-b border-[var(--color-outline-gray)] last:border-b-0">
                            {g.items.length === 1 ? (
                                <button
                                    onClick={() => setActiveSlug(g.items[0].slug)}
                                    className={`w-full flex items-start justify-between gap-2 text-left px-3 py-2.5 text-[13px] transition-colors ${
                                        activeSlug === g.items[0].slug
                                            ? "bg-[var(--color-navy-100)] text-[var(--color-absolute-zero)] font-semibold"
                                            : "text-[var(--color-graphite)] hover:bg-[var(--color-whisper-white)]"
                                    }`}
                                >
                                    <span className="min-w-0 break-words">{g.label}</span>
                                    <StatusBadge status={g.items[0].status} />
                                </button>
                            ) : (
                                <div>
                                    <div className="px-3 pt-2.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--color-graphite)]">
                                        {g.label}
                                    </div>
                                    {g.items.map((p) => (
                                        <button
                                            key={p.slug}
                                            onClick={() => setActiveSlug(p.slug)}
                                            className={`w-full flex items-start justify-between gap-2 text-left pl-5 pr-3 py-2 text-[13px] transition-colors ${
                                                activeSlug === p.slug
                                                    ? "bg-[var(--color-navy-100)] text-[var(--color-absolute-zero)] font-semibold"
                                                    : "text-[var(--color-graphite)] hover:bg-[var(--color-whisper-white)]"
                                            }`}
                                        >
                                            <span className="min-w-0 break-words">{p.label.split(" / ")[1]}</span>
                                            <StatusBadge status={p.status} />
                                        </button>
                                    ))}
                                    <div className="pb-1" />
                                </div>
                            )}
                        </div>
                    ))}
                </aside>

                <ArchiveBlockPanel key={activeSlug} activePage={activePage} />
            </div>
        </div>
    );
}