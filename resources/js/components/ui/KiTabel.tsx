import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
"use client";

import { useMemo, useState } from "react";
import type { KaryaKi } from "@/lib/ki-content";

/**
 * Tabel karya Kekayaan Intelektual dengan penyaring program studi dan tahun.
 *
 * Program studi dipakai sebagai penyaring utama karena begitulah rekap
 * aslinya dikelompokkan, dan itu pertanyaan yang paling sering dibawa
 * pengunjung: karya apa saja yang lahir dari program studi tertentu.
 */
export default function KiTabel({ data }: { data: KaryaKi[] }) {
    const cms = useCms();

    const [jenis, setJenis] = useState("semua");
    const [prodi, setProdi] = useState("semua");
    const [tahun, setTahun] = useState("semua");
    const [cari, setCari] = useState("");
    const [hal, setHal] = useState(1);
    const PER_HAL = 20;

    // Tiap kali penyaring berubah, kembali ke halaman 1 supaya pengguna
    // tidak melihat tabel kosong karena masih berada di halaman jauh.
    const ganti = <T,>(set: (v: T) => void) => (v: T) => {
        set(v);
        setHal(1);
    };

    const daftarJenis = useMemo(
        () => Array.from(new Set(data.map((d) => d.jenisKi))).sort((a, b) => a.localeCompare(b)),
        [data]
    );
    const daftarProdi = useMemo(
        () => Array.from(new Set(data.map((d) => d.prodi))).sort((a, b) => a.localeCompare(b)),
        [data]
    );
    const daftarTahun = useMemo(
        () => Array.from(new Set(data.map((d) => d.tahun))).sort((a, b) => b.localeCompare(a)),
        [data]
    );

    const hasil = useMemo(() => {
        const q = cari.toLowerCase().trim();
        return data.filter(
            (d) =>
                (jenis === "semua" || d.jenisKi === jenis) &&
                (prodi === "semua" || d.prodi === prodi) &&
                (tahun === "semua" || d.tahun === tahun) &&
                (!q || d.judul.toLowerCase().includes(q) || d.ketua.toLowerCase().includes(q))
        );
    }, [data, jenis, prodi, tahun, cari]);

    const totalHal = Math.max(1, Math.ceil(hasil.length / PER_HAL));
    const halAktif = Math.min(hal, totalHal);
    const mulai = (halAktif - 1) * PER_HAL;
    const tampil = hasil.slice(mulai, mulai + PER_HAL);

    return (
        <div>
            {/* Penyaring jenis perlindungan. Sembunyi selama jenisnya cuma satu,
                supaya tidak ada baris penyaring yang tidak berguna. */}
            {daftarJenis.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {["semua", ...daftarJenis].map((j) => {
                        const on = j === jenis;
                        return (
                            <button
                                key={j}
                                onClick={() => ganti(setJenis)(j)}
                                aria-pressed={on}
                                className={`px-3.5 py-2 text-[13px] font-semibold border transition-colors ${
                                    on
                                        ? "bg-[var(--color-cosmic-candy)] text-white border-[var(--color-cosmic-candy)]"
                                        : "bg-white text-[var(--color-graphite)] border-[var(--color-outline-gray)] hover:border-[var(--color-cosmic-candy)]"
                                }`}
                            >
                                {j === "semua" ? cms.text("x_537a838005950c", "Semua jenis") : j}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Penyaring program studi */}
            <div className="flex flex-wrap gap-2 mb-4">
                {["semua", ...daftarProdi].map((p) => {
                    const on = p === prodi;
                    const jml = p === "semua" ? data.length : data.filter((d) => d.prodi === p).length;
                    return (
                        <button
                            key={p}
                            onClick={() => ganti(setProdi)(p)}
                            aria-pressed={on}
                            className={`px-3.5 py-2 text-[13px] font-medium border transition-colors ${
                                on
                                    ? "bg-[var(--color-absolute-zero)] text-white border-[var(--color-absolute-zero)]"
                                    : "bg-white text-[var(--color-graphite)] border-[var(--color-outline-gray)] hover:border-[var(--color-absolute-zero)]"
                            }`}
                        >
                            {p === "semua" ? cms.text("x_d90dda001a266d", "Semua program studi") : p}
                            {" "}<span className={`ml-1 ${on ? "text-white/60" : "text-[var(--color-silver-mist)]"}`}>({jml})</span>
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-3">
                <CmsElement as={"input"} fields={{"placeholder":"f_162f681acf9f8b"}}
                    value={cari}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => ganti(setCari)(e.target.value)}
                    placeholder="Cari judul karya atau nama pencipta"
                    aria-label="Cari karya"
                    className="flex-1 min-w-0 border border-[var(--color-outline-gray)] px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[var(--color-absolute-zero)]"
                />
                <select
                    value={tahun}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => ganti(setTahun)(e.target.value)}
                    aria-label="Saring menurut tahun"
                    className="border border-[var(--color-outline-gray)] px-3.5 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[var(--color-absolute-zero)] sm:w-44"
                >
                    <option value="semua"><CmsText field="f_1b79d1afa45999" fallback="Semua tahun" /></option>
                    {daftarTahun.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
            </div>
            <p className="text-[13px] text-[var(--color-graphite)] mb-6"><CmsText field="f_0abf6551eac401" fallback="Menampilkan" />{" "}{hasil.length === 0 ? 0 : mulai + 1}{" "}<CmsText field="f_b5a7ab29d21897" fallback="sampai" />{" "}{mulai + tampil.length}{" "}<CmsText field="f_9466d527dae772" fallback="dari" />{" "}
                {hasil.length}{" "}<CmsText field="f_9c522b319b2d37" fallback="karya" /></p>

            {hasil.length === 0 ? (
                <div className="border border-dashed border-[var(--color-outline-gray)] py-14 text-center text-[14px] text-[var(--color-graphite)]"><CmsText field="f_2595af7113b5d9" fallback="Tidak ada karya yang cocok dengan penyaringan yang dipilih." /></div>
            ) : (
                <div className="border border-[var(--color-outline-gray)] overflow-x-auto">
                    <table className="w-full text-[14px] min-w-[860px]">
                        <thead>
                            <tr className="bg-[var(--color-whisper-white)] border-b border-[var(--color-outline-gray)]">
                                <th scope="col" className="text-left font-semibold text-[var(--color-graphite)] px-5 py-3 w-14"><CmsText field="f_be0126cb1fd29b" fallback="No" /></th>
                                <th scope="col" className="text-left font-semibold text-[var(--color-graphite)] py-3 pr-5 w-20"><CmsText field="f_ef2049ebad994c" fallback="Tahun" /></th>
                                <th scope="col" className="text-left font-semibold text-[var(--color-graphite)] py-3 pr-5"><CmsText field="f_cd1372dd085433" fallback="Judul karya" /></th>
                                <th scope="col" className="text-left font-semibold text-[var(--color-graphite)] py-3 pr-5 w-[17rem]"><CmsText field="f_6bcc31660b44a6" fallback="Pencipta" /></th>
                                <th scope="col" className="text-left font-semibold text-[var(--color-graphite)] py-3 pr-5 w-[13rem]"><CmsText field="f_cdecaa145deaa0" fallback="Program studi" /></th>
                                <th scope="col" className="text-left font-semibold text-[var(--color-graphite)] px-5 py-3 w-[12rem]"><CmsText field="f_2947d780d44c13" fallback="Jenis" /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tampil.map((d, i) => (
                                <tr key={`${d.tahun}-${d.judul}-${i}`} className="border-b border-[var(--color-outline-gray)] last:border-0 align-top">
                                    <td className="px-5 py-3 text-[var(--color-silver-mist)] tabular-nums">{mulai + i + 1}</td>
                                    <td className="py-3 pr-5 text-[var(--color-graphite)] tabular-nums">{d.tahun}</td>
                                    <td className="py-3 pr-5 font-medium text-[var(--color-absolute-zero)] leading-snug">{d.judul}</td>
                                    <td className="py-3 pr-5 text-[var(--color-graphite)] leading-snug">
                                        {d.ketua.split(";").map((n, j) => (
                                            <span key={j} className="block">
                                                {n.trim()}
                                            </span>
                                        ))}
                                    </td>
                                    <td className="py-3 pr-5 text-[var(--color-graphite)]">{d.prodi}</td>
                                    <td className="px-5 py-3 text-[var(--color-graphite)] leading-snug">
                                        <span className="block font-medium text-[var(--color-absolute-zero)]">
                                            {d.jenisKi}
                                        </span>
                                        <span className="block text-[13px]">{d.bentuk}</span>
                                        {d.status !== "Tidak tercatat" && (
                                            <span className="inline-block mt-1 tabular-nums text-[10px] font-bold tracking-wider  text-[var(--color-absolute-zero)] border border-[var(--color-outline-gray)] px-1.5 py-0.5">
                                                {d.status}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {totalHal > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5">
                    <span className="text-[13px] text-[var(--color-graphite)]"><CmsText field="f_f904b8e8ad9ec4" fallback="Halaman" />{" "}<strong className="text-[var(--color-absolute-zero)]">{halAktif}</strong>{" "}<CmsText field="f_95ba41e5ce9623" fallback="dari" />{" "}{totalHal}
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setHal(halAktif - 1)}
                            disabled={halAktif === 1}
                            className="px-3.5 py-2 text-[13px] font-semibold border border-[var(--color-outline-gray)] text-[var(--color-absolute-zero)] enabled:hover:border-[var(--color-absolute-zero)] transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                        ><CmsText field="f_3bd44f421ace08" fallback="Sebelumnya" /></button>
                        <button
                            type="button"
                            onClick={() => setHal(halAktif + 1)}
                            disabled={halAktif === totalHal}
                            className="px-3.5 py-2 text-[13px] font-semibold border border-[var(--color-outline-gray)] text-[var(--color-absolute-zero)] enabled:hover:border-[var(--color-absolute-zero)] transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                        ><CmsText field="f_1c97d824b75a85" fallback="Berikutnya" /></button>
                    </div>
                </div>
            )}
        </div>
    );
}
