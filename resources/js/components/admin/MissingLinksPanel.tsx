"use client";

import { useState } from "react";
import { Link } from "@inertiajs/react";
import { cn } from "@/lib/cn";

const KIND_COLORS: Record<string, string> = {
    pdf: "bg-[var(--color-rose-600)] text-white",
    docx: "bg-[var(--color-cosmic-candy)] text-white",
    xlsx: "bg-[var(--color-teal-600)] text-white",
    pptx: "bg-[var(--color-gold-600)] text-white",
    link: "bg-[var(--color-absolute-zero)] text-white",
};

type MissingDoc = { id: string; name: string; section: string; kind: string };
type MissingAnnouncement = { id: string; num: string; title: string; kind: string };

const PREVIEW_COUNT = 5;

/**
 * Halaman admin yang mengelola setiap section dokumen. Harus sama dengan
 * listPath di halaman admin dokumen-informasi, dokumen-layanan, dan
 * dokumen-repository. Sebelumnya semua
 * baris menaut ke /admin/dokumen yang tidak ada (404).
 */
const DOC_SECTION_PAGE: Record<string, string> = {
    luaran: "/admin/dokumen-informasi",
    "laporan-keuangan": "/admin/dokumen-informasi",
    mitra: "/admin/dokumen-informasi",
    kegiatan: "/admin/dokumen-informasi",
    sinta: "/admin/dokumen-informasi",
    tkt: "/admin/dokumen-informasi",
    monev: "/admin/dokumen-layanan",
    semhas: "/admin/dokumen-layanan",
    ki: "/admin/dokumen-layanan",
    panduan: "/admin/dokumen-layanan",
    asesmen: "/admin/dokumen-layanan",
    repository: "/admin/dokumen-repository",
};

function docEditHref(section: string, id: string) {
    const page = DOC_SECTION_PAGE[section] ?? "/admin/dokumen-informasi";
    return `${page}?edit=${encodeURIComponent(id)}`;
}

function Row({
    kind,
    title,
    subtitle,
    editHref,
}: {
    kind: string;
    title: string;
    subtitle: string;
    editHref: string;
}) {
    return (
        <Link
            href={editHref}
            className="group flex min-w-0 items-center gap-3 bg-white border border-[var(--color-outline-gray)] px-3 py-2.5 hover:border-[var(--color-absolute-zero)] transition-colors"
        >
            <span
                className={cn(
                    "shrink-0 w-7 h-7 grid place-items-center font-mono text-[9px] font-bold tracking-wider",
                    KIND_COLORS[kind] ?? KIND_COLORS.link
                )}
            >
                {kind.slice(0, 3).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-[var(--color-absolute-zero)] leading-snug truncate">
                    {title}
                </span>
                <span className="block text-[11px] text-[var(--color-graphite)] truncate">{subtitle}</span>
            </span>
            <span className="shrink-0 text-[11px] font-medium text-[var(--color-graphite)] group-hover:text-[var(--color-cosmic-candy)] transition-colors">
                Edit →
            </span>
        </Link>
    );
}

function Group({
    title,
    count,
    children,
}: {
    title: string;
    count: number;
    children: React.ReactNode;
}) {
    const [expanded, setExpanded] = useState(false);
    const items = children as React.ReactElement[];
    const list = Array.isArray(items) ? items : [items];
    const visible = expanded ? list : list.slice(0, PREVIEW_COUNT);
    const hiddenCount = list.length - visible.length;

    return (
        <div className="mb-3 last:mb-0">
            <div className="text-[12px] font-semibold text-[var(--color-absolute-zero)] mb-1.5">
                {title} ({count})
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-2">{visible}</div>
            {hiddenCount > 0 && (
                <button
                    onClick={() => setExpanded(true)}
                    className="mt-1.5 text-[12px] font-medium text-[var(--color-graphite)] hover:text-[var(--color-absolute-zero)] underline"
                >
                    Tampilkan {hiddenCount} lainnya
                </button>
            )}
        </div>
    );
}

export default function MissingLinksPanel({
    docs,
    announcements,
}: {
    docs: MissingDoc[];
    announcements: MissingAnnouncement[];
}) {
    const total = docs.length + announcements.length;
    if (total === 0) return null;

    return (
        <div className="mb-6 bg-[var(--color-gold-100)] border border-[var(--color-gold-500)]/30 p-4">
            <div className="flex items-start gap-2 mb-3 text-[13px] text-[var(--color-absolute-zero)]">
                <span aria-hidden>⚠️</span>
                <span>
                    Terdapat <b>{total}</b> entri Dokumen/Pengumuman yang belum memiliki tautan file. Akibatnya, ketika diklik oleh pengunjung, entri tersebut tidak mengarah ke halaman atau dokumen apa pun.
                </span>
            </div>

            {docs.length > 0 && (
                <Group title="Dokumen" count={docs.length}>
                    {docs.map((d) => (
                        <Row
                            key={d.id}
                            kind={d.kind}
                            title={d.name}
                            subtitle={d.section}
                            editHref={docEditHref(d.section, d.id)}
                        />
                    ))}
                </Group>
            )}

            {announcements.length > 0 && (
                <Group title="Pengumuman" count={announcements.length}>
                    {announcements.map((a) => (
                        <Row
                            key={a.id}
                            kind={a.kind}
                            title={a.title}
                            subtitle={`#${a.num}`}
                            editHref={`/admin/pengumuman?edit=${a.id}`}
                        />
                    ))}
                </Group>
            )}

            <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-[var(--color-gold-500)]/30">
                {docs.length > 0 && (
                    <Link
                        href="/admin/dokumen-layanan"
                        className="text-[12px] font-semibold text-[var(--color-absolute-zero)] hover:text-[var(--color-cosmic-candy)]"
                    >
                        Lengkapi Dokumen →
                    </Link>
                )}
                {announcements.length > 0 && (
                    <Link
                        href="/admin/pengumuman"
                        className="text-[12px] font-semibold text-[var(--color-absolute-zero)] hover:text-[var(--color-cosmic-candy)]"
                    >
                        Lengkapi Pengumuman →
                    </Link>
                )}
            </div>
        </div>
    );
}
