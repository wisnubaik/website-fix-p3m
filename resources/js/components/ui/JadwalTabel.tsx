import type { DocItem } from '@/lib/doc-types';
import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
"use client";

import { useState } from "react";
import type { JadwalJurusan } from "@/lib/monev-content";
import { formatTanggal, formatWaktu } from "@/lib/format-tanggal";

/**
 * Tabel jadwal paparan, dipakai bersama oleh /layanan/monev dan
 * /layanan/semhas karena bentuk datanya identik.
 *
 * Barisnya DIKELOMPOKKAN PER TANGGAL, bukan sekadar diberi rentang tanggal
 * di tingkat jurusan. Jurusan Teknik berlangsung empat hari; tanpa
 * pengelompokan ini pembaca tidak tahu pemakalah nomor 45 tampil hari yang
 * mana. Satu hari ditampilkan per halaman, tanpa kolom nomor urut.
 */
export default function JadwalTabel({ data, parallelDocuments = [] }: { data: JadwalJurusan[]; parallelDocuments?: DocItem[] }) {
    const cms = useCms();

    const [aktif, setAktif] = useState(data[0]?.id ?? "");
    const [sesi, setSesi] = useState<"penelitian" | "pkm">("penelitian");

    const [day, setDay] = useState(0);
    const jur = data.find((j) => j.id === aktif) ?? data[0];
    if (!jur) return null;
    const activeSession = (sesi === "penelitian" ? jur.penelitian : jur.pkm).length ? sesi : (jur.penelitian.length ? "penelitian" : "pkm");
    const daftar = activeSession === "penelitian" ? jur.penelitian : jur.pkm;

    // Kelompokkan menurut tanggal. Baris bertanggal SAMA selalu masuk ke
    // satu tabel walau letaknya berjauhan di data. kalau digabung hanya saat
    // berurutan, satu tanggal bisa muncul sebagai dua tabel terpisah.
    // Tanggal ISO diurutkan menaik; baris tanpa tanggal ditaruh di akhir.
    const peta = new Map<string, typeof daftar>();
    for (const slot of daftar) {
        const t = slot.tanggal || "";
        if (!peta.has(t)) peta.set(t, []);
        peta.get(t)!.push(slot);
    }
    const perTanggal = Array.from(peta.entries())
        .sort((a, b) => (a[0] === "" ? 1 : b[0] === "" ? -1 : a[0].localeCompare(b[0])))
        .map(([tanggal, slot]) => ({ tanggal, slot }));
    const activeDay = Math.min(day, Math.max(0, perTanggal.length - 1));
    const semuaTanggal = Array.from(peta.keys()).filter(Boolean);

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-7">
                {data.map((j) => {
                    const on = j.id === jur.id;
                    return (
                        <button
                            key={j.id}
                            onClick={() => { setAktif(j.id); setDay(0); }}
                            aria-pressed={on}
                            className={`px-4 py-2.5 text-[14px] font-medium border transition-colors ${
                                on
                                    ? "bg-[var(--color-absolute-zero)] text-white border-[var(--color-absolute-zero)]"
                                    : "bg-white text-[var(--color-graphite)] border-[var(--color-outline-gray)] hover:border-[var(--color-absolute-zero)]"
                            }`}
                        >
                            {cms.text("jadwal_jurusan_"+j.id, j.jurusan)}
                            <span className={on ? "text-white/60" : "text-[var(--color-silver-mist)]"}>
                                {" "}
                                {j.penelitian.length + j.pkm.length}
                            </span>
                        </button>
                    );
                })}
            </div>

            {jur.id === 'teknik' && !!parallelDocuments.length && <div className="flex flex-wrap gap-3 mb-5">{parallelDocuments.filter(doc => doc.href).map(doc => <a key={doc.id ?? doc.href} href={doc.href} target="_blank" rel="noopener noreferrer" className="border border-[var(--color-outline-gray)] px-4 py-3 font-medium text-[var(--color-absolute-zero)] hover:bg-[var(--color-whisper-white)]">{doc.name}<span className="sr-only"> (PDF, membuka tab baru)</span></a>)}</div>}
            {perTanggal.length > 1 && <nav aria-label="Pilih hari pelaksanaan" className="flex flex-wrap items-center gap-3 mb-4">
                <button type="button" className="border px-3 py-2 disabled:opacity-40" disabled={activeDay === 0} onClick={() => setDay(activeDay - 1)}>Hari sebelumnya</button>
                <label className="flex items-center gap-2">Tanggal <select aria-label="Tanggal pelaksanaan" className="border px-3 py-2" value={activeDay} onChange={event => setDay(Number(event.target.value))}>{perTanggal.map((entry, index) => <option key={entry.tanggal} value={index}>{formatTanggal(entry.tanggal) || 'Tanggal belum tercatat'}</option>)}</select></label>
                <span aria-live="polite">Hari {activeDay + 1} dari {perTanggal.length}</span>
                <button type="button" className="border px-3 py-2 disabled:opacity-40" disabled={activeDay === perTanggal.length - 1} onClick={() => setDay(activeDay + 1)}>Hari berikutnya</button>
            </nav>}
            <div className="border border-[var(--color-outline-gray)]">
                <div className="p-5 md:p-7 border-b border-[var(--color-outline-gray)] bg-[var(--color-whisper-white)]">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
                        <div>
                            <h3 className="font-display text-[22px] md:text-[26px] font-bold tracking-[-0.03em] text-[var(--color-absolute-zero)] leading-tight"><CmsText field="f_aab74516a5b84c" fallback="Jurusan" />{" "}{jur.jurusan}
                            </h3>
                            <p className="text-[14px] text-[var(--color-graphite)] mt-1">
                                {semuaTanggal.length > 0
                                    ? `${semuaTanggal.length} hari pelaksanaan`
                                    : cms.text("x_22bbb7e95d458c", "Tanggal belum tercatat")}
                            </p>
                        </div>
                        <dl className="flex gap-8">
                            <div>
                                <dd className="font-display text-[26px] font-bold tabular-nums text-[var(--color-absolute-zero)] leading-none">
                                    {jur.penelitian.length}
                                </dd>
                                <dt className="text-[12px] text-[var(--color-graphite)] mt-1"><CmsText field="f_c72a24abcc9529" fallback="penelitian" /></dt>
                            </div>
                            <div>
                                <dd className="font-display text-[26px] font-bold tabular-nums text-[var(--color-absolute-zero)] leading-none">
                                    {jur.pkm.length}
                                </dd>
                                <dt className="text-[12px] text-[var(--color-graphite)] mt-1"><CmsText field="f_5807bb263d9bd5" fallback="pengabdian" /></dt>
                            </div>
                        </dl>
                    </div>
                    <div className="flex gap-6 mt-6 -mb-5 md:-mb-7">
                        {(["penelitian", "pkm"] as const).filter(s => (s === "penelitian" ? jur.penelitian : jur.pkm).length > 0).map((s) => (
                            <button
                                key={s}
                                onClick={() => { setSesi(s); setDay(0); }}
                                aria-pressed={activeSession === s}
                                className={`pb-3 text-[14px] font-semibold border-b-2 transition-colors ${
                                    activeSession === s
                                        ? "border-[var(--color-cosmic-candy)] text-[var(--color-absolute-zero)]"
                                        : "border-transparent text-[var(--color-graphite)] hover:text-[var(--color-absolute-zero)]"
                                }`}
                            >
                                {s === "penelitian" ? cms.text("x_a7aecbfc47428d", "Penelitian") : cms.text("x_c9ac96977c2061", "Pengabdian kepada Masyarakat")}
                            </button>
                        ))}
                    </div>
                </div>

                {daftar.length === 0 ? (
                    <p className="px-5 md:px-7 py-10 text-[14px] text-[var(--color-graphite)]"><CmsText field="f_040b754fc7e889" fallback="Belum ada jadwal untuk sesi ini." /></p>
                ) : (
                    perTanggal.slice(activeDay, activeDay + 1).map((hari) => (
                        <div key={hari.tanggal || "tanpa-tanggal"}>
                            <div className="px-5 md:px-7 py-2.5 bg-[var(--color-absolute-zero)] text-white text-[13px] font-semibold tracking-wide">
                                {formatTanggal(hari.tanggal) || "Tanggal belum tercatat"}
                                <span className="text-white/60 font-normal">  {hari.slot.length}<CmsText field="f_4c8aac4944f885" fallback=" pemakalah" /></span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-[14px] min-w-[560px]">
                                    <thead>
                                        <tr className="border-b border-[var(--color-outline-gray)]">
                                            <th scope="col" className="text-left font-semibold text-[var(--color-graphite)] px-5 md:px-7 py-2.5 w-40"><CmsText field="f_31b4614fa972c2" fallback="Waktu" /></th>
                                            <th scope="col" className="text-left font-semibold text-[var(--color-graphite)] py-2.5"><CmsText field="f_d2989f57917aeb" fallback="Pemakalah" /></th>
                                            <th scope="col" className="text-left font-semibold text-[var(--color-graphite)] px-5 md:px-7 py-2.5 w-[16rem]"><CmsText field="f_6205f68bba7281" fallback="Program studi" /></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {hari.slot.map((r, i) => (
                                            <tr key={`${hari.tanggal}-${i}`} className="border-b border-[var(--color-outline-gray)] last:border-0">
                                                <td className="px-5 md:px-7 py-3 text-[var(--color-graphite)] tabular-nums whitespace-nowrap">{formatWaktu(r.mulai, r.selesai)}</td>
                                                <td className="py-3 pr-5 font-medium text-[var(--color-absolute-zero)]">{r.nama}{r.tempat && <p className="mt-1 text-sm font-normal text-[var(--color-graphite)]">Lokasi: {r.tempat}</p>}{r.reviewer && <p className="text-sm font-normal text-[var(--color-graphite)]">Reviewer: {r.reviewer}</p>}{r.catatan && <p className="mt-1 text-sm font-normal text-[var(--color-graphite)]">{r.catatan}</p>}</td>
                                                <td className="px-5 md:px-7 py-3 text-[var(--color-graphite)]">{r.prodi}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
