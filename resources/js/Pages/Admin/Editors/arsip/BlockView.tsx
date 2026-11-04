"use client";

import { useState } from "react";
import MetaTree from "./MetaTree";

export type ArchiveBlockData = {
    id: string;
    page: string;
    order: number;
    blockType: string;
    title: string | null;
    date: string | null;
    body: string | null;
    url: string | null;
    meta: string | null;
};

const TYPE_ICON: Record<string, string> = {
    file: "\u{1F4C4}", // 📄
    link: "\u{1F517}", // 🔗
    bulletin: "\u{1F4F0}", // 📰
    highlight: "\u{1F3C6}", // 🏆
    stat: "\u{1F4CA}", // 📊
    table: "\u{1F4CB}", // 📋
    image: "\u{1F5BC}\u{FE0F}", // 🖼️
};

// Body block arsip ditulis literal persis teks situs asli, termasuk URL
// mentah inline dan "**label**" buat bagian yang di situs asli dicetak
// tebal. Fungsi ini yang bikin itu kebaca bener di layar: URL jadi link
// beneran (bisa diklik), "**...**" jadi <strong>, sisanya teks biasa.
// Dipakai SEKALI di body. makanya meta nggak perlu dirender lagi jadi
// daftar link terpisah (dulu sempat dobel, itu bug-nya).
function renderRichText(text: string) {
    const tokenPattern = /(\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g;
    return text.split(tokenPattern).map((token, i) => {
        if (!token) return null;
        if (token.startsWith("**") && token.endsWith("**")) {
            return (
                <strong key={i} className="font-semibold text-[var(--color-absolute-zero)]">
                    {token.slice(2, -2)}
                </strong>
            );
        }
        if (/^https?:\/\//.test(token)) {
            return (
                <a
                    key={i}
                    href={token}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-sunset-burst)] break-all hover:underline"
                >
                    {token}
                </a>
            );
        }
        return token;
    });
}

// --- Galeri gambar arsip -------------------------------------------------
// Blok "image" yang berurutan (rekap tabel/chart/galeri foto yang di situs
// asli ditempel sebagai gambar) dikelompokkan jadi satu galeri grid +
// lightbox oleh parent (lihat groupBlocks di halaman arsip), bukan
// ditumpuk satu-satu penuh lebar. Judul teknis ("Gambar arsip Home #1")
// dipakai sebagai alt-text/tooltip aja, nggak ditampilkan sebagai label
// di UI.
export function ImageGallery({ images }: { images: ArchiveBlockData[] }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    if (images.length === 0) return null;

    const close = () => setOpenIndex(null);
    const prev = () =>
        setOpenIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
    const next = () => setOpenIndex((i) => (i === null ? null : (i + 1) % images.length));

    return (
        <>
            {/* Layout masonry (CSS columns). tiap gambar tetap di aspect-ratio
                aslinya (nggak di-crop, nggak dipaksa tinggi sama), disusun
                ngepas kayak Pinterest biar rapi walau ukuran beda-beda. */}
            <div className="columns-1 sm:columns-2 gap-2 border border-[var(--color-outline-gray)] bg-white p-3">
                {images.map((img, i) => (
                    <button
                        key={img.id}
                        type="button"
                        onClick={() => setOpenIndex(i)}
                        title={img.title ?? "Gambar arsip"}
                        className="group relative block w-full mb-2 break-inside-avoid overflow-hidden border border-[var(--color-outline-gray)] bg-[var(--color-whisper-white)]"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={img.url ?? undefined}
                            alt={img.title ?? "Gambar arsip"}
                            className="w-full h-auto block"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1 flex items-center gap-1">
                                🔍 Perbesar
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            {openIndex !== null && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4"
                    onClick={close}
                    role="dialog"
                    aria-modal="true"
                >
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            close();
                        }}
                        className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl leading-none"
                        aria-label="Tutup"
                    >
                        ✕
                    </button>

                    {images.length > 1 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                prev();
                            }}
                            className="absolute left-3 sm:left-6 text-white/80 hover:text-white text-3xl leading-none px-2"
                            aria-label="Sebelumnya"
                        >
                            ‹
                        </button>
                    )}

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={images[openIndex].url ?? undefined}
                        alt={images[openIndex].title ?? "Gambar arsip"}
                        className="max-w-full max-h-[85vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {images.length > 1 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                next();
                            }}
                            className="absolute right-3 sm:right-6 text-white/80 hover:text-white text-3xl leading-none px-2"
                            aria-label="Berikutnya"
                        >
                            ›
                        </button>
                    )}

                    <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-[12px]">
                        {openIndex + 1} / {images.length}
                    </span>
                </div>
            )}
        </>
    );
}

// Bentuk meta buat blockType "table", dipakai buat data yang di situs asli
// ditempel sebagai gambar tabel (mis. rekap "Skema x Gelombang 1/2/Jumlah").
// `sections` opsional: kalau ada, tiap section dikasih baris judul+total
// (spanning semua kolom) sebelum baris datanya. buat tabel yang di gambar
// aslinya kebagi per kelompok (Penelitian / Pengabdian).
type TableSection = { label: string; total?: string; rows: string[][] };
type TableMeta = { columns: string[]; sections?: TableSection[]; rows?: string[][] };

function TableBlock({ block, meta }: { block: ArchiveBlockData; meta: TableMeta }) {
    const columns = meta.columns ?? [];
    return (
        <div className="border border-[var(--color-outline-gray)] bg-white px-4 py-3">
            <div className="flex items-center gap-2 mb-2.5">
                <span className="text-base leading-none">{TYPE_ICON.table}</span>
                <span className="text-sm font-semibold text-[var(--color-absolute-zero)]">{block.title}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                    <thead>
                        <tr className="bg-[var(--color-whisper-white)]">
                            {columns.map((col) => (
                                <th
                                    key={col}
                                    className="text-left font-semibold text-[var(--color-absolute-zero)] border border-[var(--color-outline-gray)] px-2.5 py-1.5"
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    {meta.sections
                        ? meta.sections.map((section) => (
                              // <tbody> boleh berulang sebagai sibling dalam satu <table> (valid HTML), // dipakai di sini biar tiap section bisa punya `key` tanpa perlu Fragment.
                              <tbody key={section.label}>
                                  <tr className="bg-[var(--color-navy-100)]/40">
                                      <td
                                          colSpan={columns.length}
                                          className="font-semibold text-[var(--color-absolute-zero)] border border-[var(--color-outline-gray)] px-2.5 py-1.5"
                                      >
                                          {section.label}
                                          {section.total ? `, ${section.total} judul` : ""}
                                      </td>
                                  </tr>
                                  {section.rows.map((row, i) => (
                                      <tr key={i}>
                                          {row.map((cell, j) => (
                                              <td
                                                  key={j}
                                                  className="text-[var(--color-graphite)] border border-[var(--color-outline-gray)] px-2.5 py-1.5"
                                              >
                                                  {cell || "-"}
                                              </td>
                                          ))}
                                      </tr>
                                  ))}
                              </tbody>
                          ))
                        : (
                              <tbody>
                                  {(meta.rows ?? []).map((row, i) => (
                                      <tr key={i}>
                                          {row.map((cell, j) => (
                                              <td
                                                  key={j}
                                                  className="text-[var(--color-graphite)] border border-[var(--color-outline-gray)] px-2.5 py-1.5"
                                              >
                                                  {cell || "-"}
                                              </td>
                                          ))}
                                      </tr>
                                  ))}
                              </tbody>
                          )}
                </table>
            </div>
        </div>
    );
}

export default function BlockView({ block }: { block: ArchiveBlockData }) {
    let meta: unknown = null;
    if (block.meta) {
        try {
            meta = JSON.parse(block.meta);
        } catch {
            meta = null;
        }
    }

    if (block.blockType === "heading") {
        return (
            <h3 className="font-display text-[14px] font-bold text-[var(--color-absolute-zero)] uppercase tracking-wide pt-5 pb-1.5 border-b border-[var(--color-outline-gray)] mt-1 first:mt-0 first:pt-0">
                {block.title}
            </h3>
        );
    }

    if (block.blockType === "file") {
        if (block.url) {
            return (
                <a
                    href={block.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 border border-[var(--color-outline-gray)] bg-white px-3.5 py-2.5 text-sm hover:border-[var(--color-cosmic-candy)] transition-colors"
                >
                    <span className="text-base leading-none shrink-0">{TYPE_ICON.file}</span>
                    <span className="text-[var(--color-absolute-zero)] flex-1 min-w-0 break-words">{block.title}</span>
                    <span className="text-[11px] text-[var(--color-sunset-burst)] shrink-0">Buka ↗</span>
                </a>
            );
        }
        // Belum ada URL Drive-nya. situs lama nge-render file ini lewat
        // widget "Embedded Files" (ikon Drive + nama file doang), bukan
        // hyperlink teks, jadi linknya nggak ke-extract dari crawl. Ditandai
        // jelas, bukan didiemin keliatan kayak link biasa yang mati.
        return (
            <div className="flex items-center gap-2.5 border border-[var(--color-outline-gray)] bg-white px-3.5 py-2.5 text-sm">
                <span className="text-base leading-none shrink-0 opacity-50">{TYPE_ICON.file}</span>
                <span className="text-[var(--color-absolute-zero)] flex-1 min-w-0 break-words">{block.title}</span>
                <span className="inline-block bg-[var(--color-rose-600)]/10 text-[var(--color-rose-600)] text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 shrink-0">
                    Belum ada link
                </span>
            </div>
        );
    }

    if (block.blockType === "link") {
        const resolvedUrl =
            meta && typeof meta === "object" && "resolvedUrl" in (meta as Record<string, unknown>)
                ? String((meta as Record<string, unknown>).resolvedUrl)
                : null;
        return (
            <a
                href={block.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-1 border border-[var(--color-outline-gray)] bg-white px-3.5 py-2.5 text-sm hover:border-[var(--color-cosmic-candy)] transition-colors"
            >
                <span className="flex items-center gap-2 text-[var(--color-absolute-zero)] font-medium">
                    <span className="text-base leading-none">{TYPE_ICON.link}</span> {block.title}
                </span>
                <span className="text-[12px] text-[var(--color-sunset-burst)] break-all pl-6">{block.url}</span>
                {resolvedUrl && <span className="text-[11px] text-[var(--color-graphite)] pl-6">→ {resolvedUrl}</span>}
            </a>
        );
    }

    if (block.blockType === "text") {
        return (
            <p className="text-sm text-[var(--color-graphite)] bg-[var(--color-whisper-white)] border border-[var(--color-outline-gray)] px-3.5 py-2.5 whitespace-pre-wrap">
                {block.body}
            </p>
        );
    }

    if (block.blockType === "bulletin") {
        return (
            <div className="border-l-[3px] border-l-[var(--color-cosmic-candy)] border-y border-r border-[var(--color-outline-gray)] bg-white px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="inline-block bg-[var(--color-navy-100)] text-[var(--color-navy-700)] text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5">
                        {block.date}
                    </span>
                    {block.title && <span className="text-sm font-semibold text-[var(--color-absolute-zero)]">{block.title}</span>}
                </div>
                {block.body && (
                    <p className="text-[13px] text-[var(--color-graphite)] whitespace-pre-wrap leading-relaxed">
                        {renderRichText(block.body)}
                    </p>
                )}
            </div>
        );
    }

    if (block.blockType === "highlight" || block.blockType === "stat") {
        return (
            <div className="border border-[var(--color-outline-gray)] bg-white px-4 py-3">
                <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-base leading-none">{TYPE_ICON[block.blockType]}</span>
                    <span className="text-sm font-semibold text-[var(--color-absolute-zero)]">{block.title}</span>
                </div>
                {meta ? (
                    <MetaTree data={meta as never} />
                ) : (
                    <span className="text-[13px] text-[var(--color-graphite)]">(kosong)</span>
                )}
            </div>
        );
    }

    if (block.blockType === "image" && block.url) {
        // Fallback untuk satu gambar berdiri sendiri (bukan bagian dari run
        // berurutan yang sudah dikelompokkan parent jadi <ImageGallery>).
        // Dipertahankan biar BlockView tetap aman dipakai di tempat lain
        // tanpa grouping logic.
        return <ImageGallery images={[block]} />;
    }

    if (block.blockType === "table" && meta && typeof meta === "object") {
        return <TableBlock block={block} meta={meta as TableMeta} />;
    }

    // Fallback generik. biar blockType baru yang belum ada tampilan
    // khususnya tetap kebaca, bukan ilang diam-diam.
    return (
        <div className="border border-dashed border-[var(--color-outline-gray)] px-3.5 py-2.5 text-sm text-[var(--color-graphite)]">
            <span className="text-[10px] uppercase font-bold text-[var(--color-graphite)] mr-2">{block.blockType}</span>
            {block.title}
            {block.body && <div className="mt-1 whitespace-pre-wrap">{block.body}</div>}
        </div>
    );
}