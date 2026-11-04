import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Wallet } from "lucide-react";
import type { RisetEntryView, YearSummary } from "@/lib/riset-entries";

/** Jumlah baris per halaman tabel. biar daftar 589 judul nggak memanjang ke bawah. */
const PER_PAGE = 15;

/** "Rp 5.300.000", dipakai di kolom tabel & baris rekap. */
function rupiah(n: number) {
    return "Rp " + new Intl.NumberFormat("id-ID").format(n);
}

/**
 * Versi ringkas buat kartu angka besar: "Rp 1,34 M" / "Rp 335,58 Jt".
 * Nominal total per tahun bisa sampai belasan digit. kalau ditulis penuh,
 * angkanya kepotong / turun baris di layar HP.
 */
function rupiahRingkas(n: number) {
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} Jt`;
    return rupiah(n);
}

function StatCard({
    icon,
    label,
    value,
    note,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    note: string;
}) {
    return (
        <div className="bg-white border border-[var(--color-outline-gray)] rounded-2xl p-5 md:p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-whisper-white)] flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-[13px] font-medium text-[var(--color-graphite)]">{label}</div>
                <div className="font-display text-2xl md:text-3xl font-bold text-[var(--color-absolute-zero)] tracking-[-0.03em] mt-0.5 break-words">
                    {value}
                </div>
                <div className="text-[12px] text-[var(--color-graphite)] mt-1">{note}</div>
            </div>
        </div>
    );
}

/** Kolom "Peneliti": ketua di baris paling atas, dua anggota di bawahnya. */
function Peneliti({ entry }: { entry: RisetEntryView }) {
    const anggota = [entry.member1, entry.member2].filter(Boolean);
    return (
        <div className="leading-snug">
            <div className="font-semibold text-[var(--color-absolute-zero)]">
                {entry.leader || <span className="text-[var(--color-graphite)] italic font-normal"><CmsText field="f_ce83cc4749d012" fallback="Belum tercatat" /></span>}
            </div>
            {anggota.map((a, i) => (
                <div key={i} className="text-[var(--color-graphite)] text-[13px] mt-0.5">
                    {a}
                </div>
            ))}
        </div>
    );
}

export default function RisetTable({
    entries,
    summary,
    /** Satuan lama dipertahankan sebagai nilai awal judul kartu. */
    unitLabel = "judul penelitian",
}: {
    entries: RisetEntryView[];
    summary: YearSummary[];
    unitLabel?: string;
}) {
    const cms = useCms();

    const [year, setYear] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    // Tiap kali filter berubah, balik ke halaman 1. kalau tidak, pengguna
    // yang sedang di halaman 8 lalu memfilter ke tahun berisi 5 baris akan
    // melihat tabel kosong padahal datanya ada.
    const pilihTahun = (y: string) => {
        setYear(y);
        setPage(1);
    };
    const ubahPencarian = (q: string) => {
        setSearch(q);
        setPage(1);
    };

    const years = useMemo(
        () => summary.map((s) => s.year).sort((a, b) => b.localeCompare(a)),
        [summary]
    );

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return entries.filter((e) => {
            const cocokTahun = year === "all" || e.year === year;
            const cocokCari =
                !q ||
                e.title.toLowerCase().includes(q) ||
                e.leader.toLowerCase().includes(q) ||
                e.member1.toLowerCase().includes(q) ||
                e.member2.toLowerCase().includes(q);
            return cocokTahun && cocokCari;
        });
    }, [entries, year, search]);

    // Kartu angka SELALU ikut filter yang sedang aktif. jadi "jumlah" dan
    // "nominal" yang dibaca pengunjung persis sama dengan isi tabel di bawahnya.
    // `currentPage` di-clamp ke totalPages supaya aman kalau jumlah hasil
    // menyusut (mis. hasil pencarian) sementara state `page` masih tinggi.
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const mulai = (currentPage - 1) * PER_PAGE;
    const paged = filtered.slice(mulai, mulai + PER_PAGE);

    const totalJudul = filtered.length;
    const totalDana = filtered.reduce((a, e) => a + e.funding, 0);
    const labelPeriode = year === "all" ? `${years.length} tahun terdata` : `Tahun ${year}`;

    return (
        <div>
            {/* --- Kartu rekap (ikut filter) --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <StatCard
                    icon={<FileText className="w-5 h-5 text-[var(--color-absolute-zero)]" strokeWidth={2} />}
                    label={cms.text("x_riset_count_label", `Jumlah ${unitLabel}`)}
                    value={String(totalJudul)}
                    note={labelPeriode}
                />
                <CmsElement as={StatCard} fields={{"label":"f_0ddcb002734903"}}
                    icon={<Wallet className="w-5 h-5 text-[var(--color-absolute-zero)]" strokeWidth={2} />}
                    label="Nominal pendanaan"
                    value={rupiahRingkas(totalDana)}
                    note={totalDana > 0 ? rupiah(totalDana) : cms.text("x_bfa3502643630b", "Nominal belum tercatat")}
                />
            </div>

            {/* --- Filter tahun + pencarian --- */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
                <div className="flex flex-wrap gap-2 flex-1">
                    <button
                        type="button"
                        onClick={() => pilihTahun("all")}
                        aria-pressed={year === "all"}
                        className={`px-3.5 py-1.5 text-[13px] font-semibold border transition-colors ${
                            year === "all"
                                ? "bg-[var(--color-absolute-zero)] text-white border-[var(--color-absolute-zero)]"
                                : "text-[var(--color-graphite)] border-[var(--color-outline-gray)] hover:border-[var(--color-absolute-zero)]"
                        }`}
                    ><CmsText field="f_9def42f1c7f7d6" fallback="Semua tahun" /></button>
                    {years.map((y) => (
                        <button
                            key={y}
                            type="button"
                            onClick={() => pilihTahun(y)}
                            aria-pressed={year === y}
                            className={`px-3.5 py-1.5 text-[13px] font-semibold border transition-colors ${
                                year === y
                                    ? "bg-[var(--color-absolute-zero)] text-white border-[var(--color-absolute-zero)]"
                                    : "text-[var(--color-graphite)] border-[var(--color-outline-gray)] hover:border-[var(--color-absolute-zero)]"
                            }`}
                        >
                            {y}
                        </button>
                    ))}
                </div>
                <CmsElement as={"input"} fields={{"placeholder":"f_510d945cffd8c8"}}
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => ubahPencarian(e.target.value)}
                    placeholder="Cari judul atau nama peneliti..."
                    aria-label="Cari judul atau nama peneliti"
                    className="md:w-72 border border-[var(--color-outline-gray)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-absolute-zero)]"
                />
            </div>

            {/* --- Tabel (desktop) --- */}
            {filtered.length === 0 ? (
                <div
                    role="status"
                    className="text-center py-16 border border-dashed border-[var(--color-outline-gray)]"
                >
                    <div className="font-display text-2xl font-bold text-[var(--color-absolute-zero)] mb-1"><CmsText field="f_744c29c7b53b11" fallback="Tidak ada hasil" /></div>
                    <div className="text-[var(--color-graphite)] text-sm mb-4"><CmsText field="f_20a0a478e1cfb6" fallback="Coba ganti tahun atau kata kunci pencarian." /></div>
                    <button
                        type="button"
                        onClick={() => {
                            setYear("all");
                            setSearch("");
                            setPage(1);
                        }}
                        className="inline-flex items-center px-4 py-2 border border-[var(--color-outline-gray)] text-sm font-semibold text-[var(--color-absolute-zero)] hover:border-[var(--color-absolute-zero)] transition-colors"
                    ><CmsText field="f_ce7f666243aeee" fallback="Reset filter & pencarian" /></button>
                </div>
            ) : (
                <>
                    <div className="hidden md:block border border-[var(--color-outline-gray)] overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[var(--color-whisper-white)] border-b border-[var(--color-outline-gray)]">
                                    <th className="text-left px-4 py-3 font-semibold text-[var(--color-graphite)] w-14"><CmsText field="f_031deefec77fdf" fallback="No" /></th>
                                    <th className="text-left px-4 py-3 font-semibold text-[var(--color-graphite)]"><CmsText field="f_becf83a5bf337a" fallback="Judul" /></th>
                                    <th className="text-left px-4 py-3 font-semibold text-[var(--color-graphite)] w-[280px]"><CmsText field="f_779408b9e06d7c" fallback="Peneliti" /></th>
                                    <th className="text-right px-4 py-3 font-semibold text-[var(--color-graphite)] w-[170px]"><CmsText field="f_c55e4d4a69dd34" fallback="Jumlah pendanaan" /></th>
                                </tr>
                            </thead>
                            <tbody>
                                {paged.map((e, i) => (
                                    <tr
                                        key={`${e.year}-${i}-${e.title}`}
                                        className="border-b border-[var(--color-outline-gray)] last:border-0 hover:bg-[var(--color-whisper-white)] align-top"
                                    >
                                        <td className="px-4 py-3 text-[var(--color-graphite)] tabular-nums text-[12px]">
                                            {mulai + i + 1}
                                        </td>
                                        <td className="px-4 py-3 text-[var(--color-absolute-zero)]">
                                            <div className="leading-snug">
                                                {e.title || (
                                                    <span className="italic text-[var(--color-graphite)]">Judul belum tercatat</span>
                                                )}
                                            </div>
                                            {year === "all" && (
                                                <span className="inline-block mt-1.5 tabular-nums text-[10px] font-bold tracking-wider text-[var(--color-graphite)] border border-[var(--color-outline-gray)] px-1.5 py-0.5">
                                                    {e.year}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Peneliti entry={e} />
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-[var(--color-absolute-zero)]">
                                            {e.funding > 0 ? (
                                                rupiah(e.funding)
                                            ) : (
                                                <span className="italic font-normal text-[var(--color-graphite)]"><CmsText field="f_a5c5382960b152" fallback="Belum tercatat" /></span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* --- Kartu (mobile). tabel 4 kolom nggak kebaca di layar sempit --- */}
                    <div className="md:hidden flex flex-col gap-3" data-research-cards>
                        {paged.map((e, i) => (
                            <article key={`${e.year}-${i}-${e.title}`}>
                                <div className="border border-[var(--color-outline-gray)] p-4 bg-white">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="tabular-nums text-[10px] font-bold tracking-wider text-white bg-[var(--color-absolute-zero)] px-1.5 py-0.5">
                                            {e.year}
                                        </span>
                                        <span className="tabular-nums text-[11px] text-[var(--color-graphite)]">
                                            #{mulai + i + 1}
                                        </span>
                                    </div>
                                    <div className="font-semibold text-[var(--color-absolute-zero)] leading-snug mb-2.5">
                                        {e.title || "Judul belum tercatat"}
                                    </div>
                                    <div className="text-[13px] mb-2.5">
                                        <Peneliti entry={e} />
                                    </div>
                                    <div className="text-sm font-semibold text-[var(--color-absolute-zero)] pt-2.5 border-t border-[var(--color-outline-gray)]">
                                        {e.funding > 0 ? rupiah(e.funding) : cms.text("x_2ddcc057c9da92", "Pendanaan belum tercatat")}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    {/* --- Navigasi halaman --- */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5">
                        <div data-research-pagination className="text-[13px] text-[var(--color-graphite)]"><CmsText field="f_473117b9f9f593" fallback="Menampilkan" />{" "}
                            <strong className="text-[var(--color-absolute-zero)]">
                                {mulai + 1}{" "}<CmsText field="f_9b3f24c8af68f4" fallback="-" />{" "}{mulai + paged.length}
                            </strong>{" "}<CmsText field="f_d0ccdf99f5a40f" fallback="dari" />{" "}{totalJudul}{" "}<CmsText field="f_6033e5e31a28f1" fallback="data" /></div>

                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    aria-label="Halaman sebelumnya"
                                    className="inline-flex items-center gap-1 px-3 py-2 text-[13px] font-semibold border border-[var(--color-outline-gray)] text-[var(--color-absolute-zero)] enabled:hover:border-[var(--color-absolute-zero)] transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" strokeWidth={2.5} /><CmsText field="f_0b2720830fe5af" fallback="Sebelumnya" /></button>

                                <span className="text-[13px] text-[var(--color-graphite)] px-2 whitespace-nowrap"><CmsText field="f_80cec222e498dc" fallback="Hal." />{" "}
                                    <strong className="text-[var(--color-absolute-zero)]">
                                        {currentPage}
                                    </strong>{" "}<CmsText field="f_7825fdd31d0fba" fallback="dari" />{" "}{totalPages}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => setPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    aria-label="Halaman berikutnya"
                                    className="inline-flex items-center gap-1 px-3 py-2 text-[13px] font-semibold border border-[var(--color-outline-gray)] text-[var(--color-absolute-zero)] enabled:hover:border-[var(--color-absolute-zero)] transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                                ><CmsText field="f_75198828f79cca" fallback="Berikutnya" /><ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* --- Rekap seluruh tahun --- */}
            {summary.length > 1 && (
                <div className="mt-10">
                    <h3 className="font-display text-lg font-bold text-[var(--color-absolute-zero)] mb-3"><CmsText field="f_7cfa7af20dc3d5" fallback="Rekap per tahun" /></h3>
                    <div className="border border-[var(--color-outline-gray)] overflow-x-auto">
                        <table className="w-full text-sm min-w-[380px]">
                            <thead>
                                <tr className="bg-[var(--color-whisper-white)] border-b border-[var(--color-outline-gray)]">
                                    <th className="text-left px-4 py-2.5 font-semibold text-[var(--color-graphite)]"><CmsText field="f_3725238212dcf1" fallback="Tahun" /></th>
                                    <th className="text-right px-4 py-2.5 font-semibold text-[var(--color-graphite)]"><CmsText field="f_58682755c41105" fallback="Jumlah" /></th>
                                    <th className="text-right px-4 py-2.5 font-semibold text-[var(--color-graphite)]"><CmsText field="f_9b44a26531643e" fallback="Nominal" /></th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...summary].reverse().map((s) => (
                                    <tr
                                        key={s.year}
                                        onClick={() => pilihTahun(year === s.year ? "all" : s.year)}
                                        className={`border-b border-[var(--color-outline-gray)] last:border-0 cursor-pointer transition-colors ${
                                            year === s.year
                                                ? "bg-[var(--color-whisper-white)]"
                                                : "hover:bg-[var(--color-whisper-white)]"
                                        }`}
                                    >
                                        <td className="px-4 py-2.5 font-medium text-[var(--color-absolute-zero)]">
                                            {s.year}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-[var(--color-absolute-zero)]">
                                            {s.count}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-[var(--color-absolute-zero)] whitespace-nowrap">
                                            {s.funding > 0 ? rupiah(s.funding) : "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[12px] text-[var(--color-graphite)] mt-2"><CmsText field="f_186655c8f4f614" fallback="Klik salah satu baris untuk memfilter tabel di atas ke tahun tersebut." /></p>
                </div>
            )}
        </div>
    );
}
