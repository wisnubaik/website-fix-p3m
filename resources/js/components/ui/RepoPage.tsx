import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { StaggerContainer, StaggerItem } from "@/components/animation/RevealStagger";
import PageHero from "./PageHero";
import Section from "./Section";
import Toolbar from "./Toolbar";
import DocItemCard from "./DocItem";
import TrendChart, { TrendPoint } from "./TrendChart";
import { Crumb } from "./Crumbs";
import type { DocSection as DocSectionType, FilterChip } from "@/lib/doc-types";
import type { ReactNode } from "react";

function trendFromSections(sections: DocSectionType[]): TrendPoint[] {
    const counts = new Map<string, number>();
    sections.forEach((sec) =>
        sec.items.forEach((item) => {
            if (!item.year) return;
            counts.set(item.year, (counts.get(item.year) ?? 0) + 1);
        })
    );
    return Array.from(counts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([year, value]) => ({ year, value }));
}

export default function RepoPage({
    crumbs,
    title,
    lead,
    chips,
    sections,
    trend,
    trendTitle = "Tren per Tahun",
    trendSubtitle = "Jumlah dokumen & kegiatan tercatat per tahun",
    trendData: trendDataProp,
}: {
    crumbs: Crumb[];
    title: ReactNode;
    lead: string;
    chips: FilterChip[];
    sections: DocSectionType[];
    /** Tampilkan chart tren dengan data auto-count dari `year` tiap dokumen (fallback, dipakai kalau `trendData` tidak diisi). */
    trend?: boolean;
    trendTitle?: string;
    trendSubtitle?: string;
    /** Data resmi/terverifikasi (mis. hasil rekap tabel RisetEntry). Kalau diisi, ini dipakai dan menggantikan auto-count. */
    trendData?: TrendPoint[];
}) {
    const cms = useCms();

    const [search, setSearch] = useState("");
    const [chip, setChip] = useState("all");

    const autoTrendData = useMemo(
        () => (trend && !trendDataProp ? trendFromSections(sections) : []),
        [trend, trendDataProp, sections]
    );
    const trendData = trendDataProp ?? autoTrendData;
    const showTrend = Boolean(trendDataProp) || trend;

    const yearChips = useMemo<FilterChip[]>(() => {
        const years = new Set<string>();
        sections.forEach((sec) => sec.items.forEach((item) => item.year && years.add(item.year)));
        return Array.from(years)
            .sort((a, b) => b.localeCompare(a))
            .map((y) => ({ id: `year:${y}`, label: y }));
    }, [sections]);

    // Chip kategori tambahan yang otomatis muncul dari data. sama seperti
    // yearChips di atas. `chips` (prop) berisi kategori yang sudah dikurasi
    // manual (label rapi, mis. "Panduan & Skema"). Kalau admin isi field
    // "Kategori filter" di /admin/dokumen dengan nilai BARU yang belum ada
    // di daftar itu (mis. "baru"), chip untuk kategori itu tetap otomatis
    // muncul di sini (label di-Title Case-kan dari nilai mentahnya), // supaya dokumennya beneran bisa difilter, bukan cuma nyantol di "Semua".
    const autoCatChips = useMemo<FilterChip[]>(() => {
        const knownIds = new Set(chips.map((c) => c.id));
        const cats = new Set<string>();
        sections.forEach((sec) =>
            sec.items.forEach((item) => item.cat && !knownIds.has(item.cat) && cats.add(item.cat))
        );
        return Array.from(cats)
            .sort((a, b) => a.localeCompare(b))
            .map((c) => ({
                id: c,
                label: c.replace(/[-_]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
            }));
    }, [sections, chips]);

    const effectiveChips = useMemo(
        () => [...chips, ...autoCatChips, ...yearChips],
        [chips, autoCatChips, yearChips]
    );

    // Klik chip "Semua" (id "all") harus benar-benar mengembalikan ke daftar
    // penuh. termasuk mengosongkan kotak pencarian. Sebelumnya chip "all"
    // cuma reset filter kategori/tahun, sementara teks yang masih tersisa di
    // search box (mis. bekas ketik "2024") tetap aktif dan bikin hasil
    // kelihatan "kosong" lagi walau chip sudah balik ke Semua.
    const handleChipChange = (id: string) => {
        setChip(id);
        if (id === "all") setSearch("");
    };

    const resetFilters = () => {
        setChip("all");
        setSearch("");
    };

    const filteredSections = useMemo(() => {
        const q = search.toLowerCase().trim();
        return sections
            .map((sec) => {
                const items = sec.items.filter((item) => {
                    const matchSearch =
                        !q ||
                        item.name.toLowerCase().includes(q) ||
                        (item.year ?? "").toLowerCase().includes(q) ||
                        item.kind.toLowerCase().includes(q);
                    const matchChip =
                        chip === "all" ||
                        item.cat === chip ||
                        (chip.startsWith("year:") && item.year === chip.slice(5));
                    return matchSearch && matchChip;
                });
                return { ...sec, items };
            })
            .filter((sec) => sec.items.length > 0);
    }, [sections, search, chip]);

    return (
        <>
            <PageHero crumbs={crumbs} title={title} lead={lead} />

            {showTrend && trendData.length > 1 && (
                <Section className="!py-0 !pb-10 md:!pb-12">
                    <TrendChart title={trendTitle} subtitle={trendSubtitle} data={trendData} />
                </Section>
            )}

            <Section className={showTrend ? "!pt-0" : undefined}>
                <Toolbar
                    searchValue={search}
                    onSearchChange={setSearch}
                    chips={effectiveChips}
                    activeChip={chip}
                    onChipChange={handleChipChange}
                />

                {filteredSections.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                    >
                        <div className="font-display text-3xl font-bold tracking-[-0.025em] text-[var(--color-absolute-zero)] mb-2"><CmsText field="f_6f4b39920e5a12" fallback="Tidak ada hasil" /></div>
                        <div className="text-[var(--color-graphite)] tracking-[-0.35px] mb-5"><CmsText field="f_c9583482041b26" fallback="Coba kata kunci atau filter yang berbeda." /></div>
                        {(chip !== "all" || search) && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="inline-flex items-center px-4 py-2 rounded-none border border-[var(--color-outline-gray)] text-sm font-semibold text-[var(--color-absolute-zero)] hover:border-[var(--color-absolute-zero)] transition-colors"
                            ><CmsText field="f_c450daaf7c2f92" fallback="Reset filter & pencarian" /></button>
                        )}
                    </motion.div>
                ) : (
                    filteredSections.map((sec, idx) => (
                        <motion.div
                            // Remount penuh tiap kali filter (chip/search) berubah. bukan cuma
                            // kunci per-section. Sebelumnya key hanya `sec.title + idx`, jadi
                            // instance StaggerContainer di bawahnya (yang pakai
                            // `whileInView + viewport once:true`) tetap dipertahankan lintas
                            // perubahan filter. Begitu animasi masuknya sudah "terpakai" sekali
                            // (mis. saat lihat "Semua" pertama kali / filter ke 2025), Framer
                            // Motion tidak menganimasikan ulang container itu, dan item-item yang
                            // baru muncul lagi (mis. balik ke "Semua" atau pindah ke tahun lain)
                            // bisa gagal tampil dengan benar. Key baru ini memaksa React membongkar
                            // & membangun ulang seluruh grid tiap filter ganti, jadi selalu
                            // konsisten dengan `filteredSections` yang sebenarnya.
                            key={`${sec.title}-${idx}-${chip}-${search}`}
                            layout
                            transition={{ type: "spring", stiffness: 100, damping: 22 }}
                            className="mb-12"
                        >
                            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[var(--color-outline-gray)]">
                                {sec.mark && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 bg-[var(--color-absolute-zero)] text-white rounded-full tabular-nums text-[10px] font-bold tracking-wider  shrink-0">
                                        {sec.mark}
                                    </span>
                                )}
                                <h3 className="font-display text-xl md:text-2xl font-bold text-[var(--color-absolute-zero)] tracking-[-0.025em]">
                                    {sec.title}
                                </h3>
                            </div>
                            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {sec.items.map((item, i) => (
                                    <StaggerItem key={item.name + i}>
                                        <DocItemCard
                                            name={item.name}
                                            kind={item.kind}
                                            year={item.year}
                                            href={item.href}
                                        />
                                    </StaggerItem>
                                ))}
                            </StaggerContainer>
                        </motion.div>
                    ))
                )}
            </Section>
        </>
    );
}