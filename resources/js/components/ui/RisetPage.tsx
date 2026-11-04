import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import PageHero from "./PageHero";
import Section from "./Section";
import TrendChart from "./TrendChart";
import RisetTable from "./RisetTable";
import type { Crumb } from "./Crumbs";
import type { ReactNode } from "react";
import type { RisetEntryView, YearSummary } from "@/lib/riset-entries";
import type { TrendPoint } from "./TrendChart";

/**
 * Kerangka halaman Penelitian / PkM (Internal, Eksternal, Unggulan).
 *
 * Yang DIPUBLIKASIKAN cuma tiga hal: grafik tren, angka rekap (jumlah &
 * nominal, bisa difilter per tahun), dan tabel judul-peneliti-pendanaan.
 * File dokumen mentahnya TIDAK ditampilkan di sini. semuanya disimpan di
 * Data Internal P3M-PNM di panel admin.
 *
 * Menggantikan RepoPage yang dulu dipakai halaman-halaman ini (RepoPage
 * sendiri masih dipakai halaman lain, jadi tidak dihapus).
 */
export default function RisetPage({
    crumbs,
    title,
    lead,
    entries,
    summary,
    trendData,
    trendTitle,
    trendSubtitle,
    unitLabel = "judul penelitian",
    tableTitle = "Daftar Penelitian",
    tableNote,
}: {
    crumbs: Crumb[];
    title: ReactNode;
    lead: string;
    entries: RisetEntryView[];
    summary: YearSummary[];
    trendData: TrendPoint[];
    trendTitle: string;
    trendSubtitle: string;
    unitLabel?: string;
    tableTitle?: string;
    tableNote?: string;
}) {
    const cms = useCms();

    return (
        <>
            <PageHero crumbs={crumbs} title={title} lead={lead} />

            {trendData.length > 1 && (
                <Section className="!py-0 !pb-10 md:!pb-12">
                    <TrendChart title={trendTitle} subtitle={trendSubtitle} data={trendData} />
                </Section>
            )}

            <Section className={trendData.length > 1 ? "!pt-0" : undefined}>
                <div className="mb-6">
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--color-absolute-zero)] tracking-[-0.025em]">
                        {tableTitle}
                    </h2>
                    {tableNote && (
                        <p className="text-[var(--color-graphite)] tracking-[-0.35px] mt-1.5 max-w-[70ch]">
                            {tableNote}
                        </p>
                    )}
                </div>

                {entries.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-[var(--color-outline-gray)]">
                        <div className="font-display text-2xl font-bold text-[var(--color-absolute-zero)] mb-1"><CmsText field="f_7ded7b1037bbf8" fallback="Data belum tersedia" /></div>
                        <div className="text-[var(--color-graphite)] text-sm"><CmsText field="f_9e2e238d72e876" fallback="Daftar untuk kategori ini belum diisi di panel admin." /></div>
                    </div>
                ) : (
                    <RisetTable entries={entries} summary={summary} unitLabel={unitLabel} />
                )}
            </Section>
        </>
    );
}
