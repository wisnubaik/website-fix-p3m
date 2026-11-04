import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { ProyekPbl } from "@/lib/pbl-content";
import PblText from "@/components/ui/PblText";

const PAGE_SIZE = 4;

/**
 * Tabel proyek Problem Based Learning.
 *
 * Disajikan sebagai kartu bertumpuk, bukan tabel lebar, karena tiap proyek
 * punya delapan keterangan yang panjangnya tidak seragam. Dipaksa masuk
 * tabel, kolom "Hasil" dan "Pemanfaatan" jadi terlalu sempit untuk dibaca.
 */
export default function PblTabel({ data }: { data: ProyekPbl[] }) {
    const cms = useCms();

    const [prodi, setProdi] = useState("semua");
    const [sumber, setSumber] = useState("semua");
    const [page, setPage] = useState(1);
    const listId = useId();
    const summaryRef = useRef<HTMLParagraphElement>(null);

    const daftarProdi = useMemo(
        () => Array.from(new Set(data.map((d) => d.prodi))).sort((a, b) => a.localeCompare(b)),
        [data]
    );
    const daftarSumber = useMemo(
        () => Array.from(new Set(data.map((d) => d.sumber))).sort((a, b) => a.localeCompare(b)),
        [data]
    );

    const hasil = useMemo(
        () =>
            data.filter(
                (d) =>
                    (prodi === "semua" || d.prodi === prodi) &&
                    (sumber === "semua" || d.sumber === sumber)
            ),
        [data, prodi, sumber]
    );

    const pageCount = Math.max(1, Math.ceil(hasil.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const start = (currentPage - 1) * PAGE_SIZE;
    const visible = hasil.slice(start, start + PAGE_SIZE);
    const paginationButtonClass = "border border-[var(--color-outline-gray)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-whisper-white)] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed";

    function changePage(next: number) {
        setPage(Math.max(1, Math.min(next, pageCount)));
        summaryRef.current?.focus({ preventScroll: true });
        summaryRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }

    const tombol = (aktif: boolean) =>
        `px-3.5 py-2 text-[13px] font-medium border transition-colors ${
            aktif
                ? "bg-[var(--color-absolute-zero)] text-white border-[var(--color-absolute-zero)]"
                : "bg-white text-[var(--color-graphite)] border-[var(--color-outline-gray)] hover:border-[var(--color-absolute-zero)]"
        }`;

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-3">
                {["semua", ...daftarProdi].map((p) => (
                    <button type="button" key={p} onClick={() => { setProdi(p); setPage(1); }} aria-pressed={p === prodi} className={tombol(p === prodi)}>
                        {p === "semua" ? cms.text("x_38df02148afbf8", "Semua program studi") : p}
                        <span className={p === prodi ? "text-white/60" : "text-[var(--color-silver-mist)]"}>
                            {" "}
                            {p === "semua" ? data.length : data.filter((d) => d.prodi === p).length}
                        </span>
                    </button>
                ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
                {["semua", ...daftarSumber].map((x) => (
                    <button
                        key={x}
                        type="button"
                        onClick={() => { setSumber(x); setPage(1); }}
                        aria-pressed={x === sumber}
                        className={`px-3.5 py-1.5 text-[13px] font-semibold border transition-colors ${
                            x === sumber
                                ? "bg-[var(--color-cosmic-candy)] text-white border-[var(--color-cosmic-candy)]"
                                : "bg-white text-[var(--color-graphite)] border-[var(--color-outline-gray)] hover:border-[var(--color-cosmic-candy)]"
                        }`}
                    >
                        {x === "semua" ? cms.text("x_3ed7af8d9beb74", "Semua sumber") : x}
                    </button>
                ))}
            </div>

            <p ref={summaryRef} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true" className="scroll-mt-[160px] text-[13px] text-[var(--color-graphite)] mb-5 focus-visible:outline-2 focus-visible:outline-offset-4">
                {hasil.length > 0 ? `Menampilkan ${start + 1}-${Math.min(start + PAGE_SIZE, hasil.length)} dari ${hasil.length} proyek` : cms.text("x_7513ab22b5e6ab", "0 proyek ditampilkan")}
            </p>

            {hasil.length === 0 ? (
                <div className="border border-dashed border-[var(--color-outline-gray)] py-14 text-center text-[14px] text-[var(--color-graphite)]"><CmsText field="f_8f5c4832df214e" fallback="Tidak ada proyek yang cocok dengan penyaringan yang dipilih." /></div>
            ) : (
                <ul id={listId} className="grid items-start md:grid-cols-2 gap-5">
                    {visible.map((d, i) => (
                        <li
                            key={`${d.prodi}-${d.proyek}-${start + i}`}
                            className="min-w-0 border border-[var(--color-outline-gray)] bg-white p-5 sm:p-6 flex flex-col"
                        >
                            <div className="flex flex-wrap items-center gap-2 mb-2.5">
                                <span className="tabular-nums text-[10px] font-bold tracking-wider  text-white bg-[var(--color-absolute-zero)] px-1.5 py-0.5">
                                    {d.sumber}
                                </span>
                                <span className="text-[12px] text-[var(--color-graphite)]">{d.prodi}</span>
                            </div>

                            <h3 className="font-display text-[17px] font-bold leading-snug tracking-normal break-words text-[var(--color-absolute-zero)]">
                                {d.proyek}
                            </h3>

                            <dl className="mt-5 space-y-4">
                                {[
                                    { label: cms.text("x_50df4dd4326325", "Mitra"), text: d.mitra },
                                    { label: cms.text("x_1c15c672b40f4a", "Bidang usaha mitra"), text: d.bidang },
                                    { label: cms.text("x_64acd0634af15d", "Hasil PBL"), text: d.hasil },
                                ].filter(field => field.text?.trim()).map(field => <div key={field.label}>
                                    <dt className="mb-1.5 text-[12px] font-semibold text-[var(--color-absolute-zero)]">{field.label}</dt>
                                    <dd><PblText key={field.text} text={field.text} label={`${field.label} - ${d.proyek}`} /></dd>
                                </div>)}
                            </dl>

                            {/* Status pemanfaatan dibedakan warnanya karena itu
                                pembeda paling penting antara proyek yang sudah
                                dipakai mitra dan yang masih diuji. */}
                            {(d.sudah || d.belum) && (
                                <div
                                    className={`text-[13px] mt-5 leading-relaxed border-l-2 pl-3 ${
                                        d.sudah
                                            ? "border-[var(--color-cosmic-candy)] text-[var(--color-absolute-zero)]"
                                            : "border-[var(--color-outline-gray)] text-[var(--color-graphite)]"
                                    }`}
                                >
                                    <span className="font-semibold">
                                        {d.sudah ? cms.text("x_2f1644e7fc650a", "Sudah dimanfaatkan. ") : cms.text("x_0085fd22982918", "Belum dimanfaatkan. ")}
                                    </span>
                                    <PblText key={d.sudah || d.belum} text={d.sudah || d.belum} label={`Pemanfaatan - ${d.proyek}`} />
                                </div>
                            )}

                            {d.mahasiswa && (
                                <div className="mt-3.5 pt-3.5 border-t border-[var(--color-outline-gray)]">
                                    <p className="text-[12px] font-semibold tracking-wider  text-[var(--color-graphite)]">
                                        {d.peranNama === "ketua" ? cms.text("x_8de1377cdc9653", "Ketua pelaksana") : cms.text("x_e7bdec0cf9496f", "Mahasiswa pelaksana")}
                                    </p>
                                    <div className="mt-1.5"><PblText key={d.mahasiswa} text={d.mahasiswa.split(/[;\r\n]+/).map(n => n.trim()).filter(Boolean).join("\n")} label={`Mahasiswa pelaksana - ${d.proyek}`} /></div>
                                    {d.peranNama === "ketua" && Number(d.jumlahMahasiswa) > 1 && (
                                        <p className="text-[12px] text-[var(--color-graphite)] mt-1"><CmsText field="f_d39b415e53a19e" fallback="bersama" />{" "}{Number(d.jumlahMahasiswa) - 1}{" "}<CmsText field="f_b922887e676ef0" fallback="mahasiswa lainnya" /></p>
                                    )}
                                </div>
                            )}

                            <dl className="flex flex-wrap gap-x-6 gap-y-1 mt-auto pt-4 text-[12px] text-[var(--color-graphite)]">
                                {d.waktu && (
                                    <div className="flex gap-1.5">
                                        <dt className="font-semibold"><CmsText field="f_6266a9b71040ab" fallback="Waktu" /></dt>
                                        <dd>{d.waktu}</dd>
                                    </div>
                                )}
                                {d.jumlahMahasiswa && (
                                    <div className="flex gap-1.5">
                                        <dt className="font-semibold"><CmsText field="f_b2b5321678c29f" fallback="Mahasiswa" /></dt>
                                        <dd>{d.jumlahMahasiswa}{" "}<CmsText field="f_e7abf724ed75e3" fallback=" orang" /></dd>
                                    </div>
                                )}
                                {d.jumlahProdi && Number(d.jumlahProdi) > 1 && (
                                    <div className="flex gap-1.5">
                                        <dt className="font-semibold"><CmsText field="f_dadee0884ee676" fallback="Program studi" /></dt>
                                        <dd>{d.jumlahProdi}{" "}<CmsText field="f_4ca9020eab5b3e" fallback=" prodi" /></dd>
                                    </div>
                                )}
                            </dl>
                        </li>
                    ))}
                </ul>
            )}
            {pageCount > 1 && <nav aria-label="Halaman proyek Problem Based Learning" className="mt-6 border-t border-[var(--color-outline-gray)] pt-4 flex flex-wrap items-center justify-between gap-3">
                <button type="button" aria-controls={listId} className={paginationButtonClass} disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}><CmsText field="f_9b6ddb135bcd57" fallback="Sebelumnya" /></button>
                <span className="text-xs tabular-nums text-[var(--color-graphite)]"><CmsText field="f_d244e0f2281f90" fallback="Halaman " />{currentPage}<CmsText field="f_c2e5ec59a08888" fallback=" dari " />{pageCount}</span>
                <button type="button" aria-controls={listId} className={paginationButtonClass} disabled={currentPage === pageCount} onClick={() => changePage(currentPage + 1)}><CmsText field="f_2571f570885703" fallback="Berikutnya" /></button>
            </nav>}
        </div>
    );
}
