import { CmsActionText, CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { ContentProps } from "./content-types";

import PageHero from "@/components/ui/PageHero";

import Section from "@/components/ui/Section";

import MonevBerkas from "@/components/ui/MonevBerkas";

import {
    SINTA_PERHITUNGAN,
    SINTA_TAUTAN as SINTA_TAUTANDefault,
    SINTA_TUTORIAL as SINTA_TUTORIALDefault,
    SINTA_CARA_CEK as SINTA_CARA_CEKDefault,
    SINTA_AMBANG as SINTA_AMBANGDefault,
    SINTA_GAMBAR as SINTA_GAMBARDefault,
} from "@/lib/sinta-content";

export default function Page({ sections: templat }: Pick<ContentProps, "sections">) {
    const SINTA_TAUTAN = useCms().data("collection_sinta_tautan", SINTA_TAUTANDefault);
    const SINTA_TUTORIAL = useCms().data("collection_sinta_tutorial", SINTA_TUTORIALDefault);
    const SINTA_CARA_CEK = useCms().data("collection_sinta_cara_cek", SINTA_CARA_CEKDefault);
    const SINTA_AMBANG = useCms().data("collection_sinta_ambang", SINTA_AMBANGDefault);
    const SINTA_GAMBAR = useCms().data("collection_sinta_gambar", SINTA_GAMBARDefault);

    const cms = useCms();
    const perhitungan = cms.data("collection_sinta_perhitungan", SINTA_PERHITUNGAN);

return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_b2933c6b630289","lead":"f_913008d217762f"}}
                crumbs={[{ label: cms.text("x_a879a86a448f42", "Informasi") }, { label: cms.text("x_a02edb6d8610ba", "SINTA") }]}
                title={
                    <>
                        Kinerja publikasi di{" "}
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            SINTA
                        </em>
                        .
                    </>
                }
                lead="Science and Technology Index memeringkat kinerja publikasi peneliti, lembaga, dan jurnal di Indonesia berdasarkan publikasi, penelitian, pengabdian, kekayaan intelektual, buku, dan jejaring."
            />

            {/* Profil SINTA */}
            <Section variant="soft">
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-8"><CmsText field="f_c7d7e6110df770" fallback="Profil SINTA PNM" /></h2>
                <ul className="grid sm:grid-cols-2 gap-3">
                    {SINTA_TAUTAN.map((t) => (
                        <li key={t.label}>
                            <a
                                href={t.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block h-full border border-[var(--color-outline-gray)] bg-white p-6 hover:border-[var(--color-absolute-zero)] transition-colors"
                            >
                                <span className="font-display text-[19px] font-bold tracking-[-0.02em] text-[var(--color-absolute-zero)] leading-snug block">
                                    {t.label}
                                </span>
                                <span className="text-[14px] text-[var(--color-graphite)] mt-1.5 block">
                                    {t.keterangan}
                                </span>
                                <span className="text-[13px] font-medium text-[var(--color-cosmic-candy)] mt-4 inline-block"><CmsText field="f_02b17723627e24" fallback="Buka di SINTA &rarr;" /></span>
                            </a>
                        </li>
                    ))}
                </ul>
            </Section>

            {/* Pendataan */}
            <Section>
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight"><CmsText field="f_859e9469b6a6ff" fallback="Pendataan Capaian" /></h2>
                <p className="text-[15px] md:text-base text-[var(--color-graphite)] mt-2 mb-9 max-w-[68ch] leading-relaxed"><CmsText field="f_c2d20230256958" fallback="Unduh templat sesuai jenis kegiatan, isi seluruh kolomnya, lalu serahkan ke P3M untuk diverifikasi. Data buku, kekayaan intelektual, produk, dan prototipe diisi langsung melalui akun SINTA masing-masing." /></p>
                <MonevBerkas sections={templat} />

                <div className="grid sm:grid-cols-2 gap-3 mt-10">
                    {SINTA_GAMBAR.map((g) => (
                        <figure key={g.src} className="border border-[var(--color-outline-gray)] bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element -- gambar panduan lokal */}
                            <img src={g.src} alt={g.judul} loading="lazy" className="w-full" />
                            <figcaption className="text-[13px] text-[var(--color-graphite)] px-4 py-3 border-t border-[var(--color-outline-gray)]">
                                {g.judul}
                            </figcaption>
                        </figure>
                    ))}
                </div>
            </Section>

            {/* Tutorial */}
            <Section variant="soft">
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-8"><CmsText field="f_577de91f22c20c" fallback="Tutorial Pengelolaan Akun" /></h2>
                <ol className="grid md:grid-cols-2 gap-2.5">
                    {SINTA_TUTORIAL.map((t, i) => (
                        <li key={t.href}>
                            <a
                                href={t.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-4 border border-[var(--color-outline-gray)] bg-white px-5 py-4 hover:border-[var(--color-absolute-zero)] transition-colors"
                            >
                                <span className="font-display text-[15px] font-bold text-white bg-[var(--color-absolute-zero)] w-7 h-7 flex items-center justify-center shrink-0">
                                    {i + 1}
                                </span>
                                <span className="text-[15px] font-medium text-[var(--color-absolute-zero)] leading-snug">
                                    {t.label}
                                </span>
                            </a>
                        </li>
                    ))}
                </ol>
            </Section>

            <Section variant="soft"><div className="max-w-4xl space-y-8">{perhitungan.map((item,i)=><article key={i} className="border-b border-[var(--color-outline-gray)] pb-6 last:border-0"><h2 className="text-2xl font-semibold text-[var(--color-absolute-zero)] mb-3">{item.judul}</h2><p className="whitespace-pre-line leading-relaxed text-[var(--color-graphite)]">{item.isi}</p></article>)}</div></Section>
            {/* Ambang skor hibah */}
            <Section>
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight"><CmsText field="f_3dcd67aa6de7ad" fallback="Ambang Skor untuk Pengajuan Hibah" /></h2>
                <p className="text-[15px] md:text-base text-[var(--color-graphite)] mt-2 mb-9 max-w-[68ch] leading-relaxed"><CmsText field="f_4dfc14df91811d" fallback="SINTA Score Overall menjadi salah satu syarat ketua pengusul pada hibah DRTM. Tabel ini merangkum ketentuan hibah tahun 2023 yang dimuat pada situs P3M lama. Periksa panduan tahun pengajuan sebelum menggunakannya." /></p>
                <div className="border border-[var(--color-outline-gray)] overflow-x-auto">
                    <table className="w-full text-[14px] min-w-[720px]">
                        <thead>
                            <tr className="bg-[var(--color-whisper-white)] border-b border-[var(--color-outline-gray)]">
                                <th scope="col" className="text-left font-semibold text-[var(--color-graphite)] px-5 py-3"><CmsText field="f_a4efd0b0717847" fallback="Skema" /></th>
                                <th scope="col" className="text-left font-semibold text-[var(--color-graphite)] py-3 pr-5"><CmsText field="f_93d5ce89acb046" fallback="Ruang lingkup" /></th>
                                <th scope="col" className="text-left font-semibold text-[var(--color-graphite)] py-3 pr-5 w-[9rem]"><CmsText field="f_9e3de341669580" fallback="Jabatan minimal" /></th>
                                <th scope="col" className="text-right font-semibold text-[var(--color-graphite)] py-3 pr-5 w-[7rem]"><CmsText field="f_8f6dbe4e1b7fec" fallback="Saintek" /></th>
                                <th scope="col" className="text-right font-semibold text-[var(--color-graphite)] px-5 py-3 w-[9rem]"><CmsText field="f_d155cffe5b614c" fallback="Soshum & seni" /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {SINTA_AMBANG.map((a, i) => (
                                <tr key={i} className="border-b border-[var(--color-outline-gray)] last:border-0 align-top">
                                    <td className="px-5 py-3 font-medium text-[var(--color-absolute-zero)] leading-snug">{a.skema}</td>
                                    <td className="py-3 pr-5 text-[var(--color-graphite)] leading-snug">{a.lingkup}</td>
                                    <td className="py-3 pr-5 text-[var(--color-graphite)]">{a.jabatan}</td>
                                    <td className="py-3 pr-5 text-right tabular-nums font-medium text-[var(--color-absolute-zero)]">{a.saintek}</td>
                                    <td className="px-5 py-3 text-right tabular-nums font-medium text-[var(--color-absolute-zero)]">{a.soshum}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            {/* Cara cek skor */}
            <Section variant="soft">
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-8"><CmsText field="f_deb0a9e8973b8f" fallback="Cara Memeriksa SINTA Score" /></h2>
                <ol className="border-t border-[var(--color-outline-gray)] max-w-[74ch]">
                    {SINTA_CARA_CEK.map((langkah, i) => (
                        <li
                            key={i}
                            className="grid grid-cols-[2rem_1fr] gap-4 py-4 border-b border-[var(--color-outline-gray)]"
                        >
                            <span className="font-display text-[15px] font-bold text-[var(--color-cosmic-candy)] tabular-nums">
                                {i + 1}
                            </span>
                            <span className="text-[15px] text-[var(--color-graphite)] leading-relaxed">
                                {langkah}
                            </span>
                        </li>
                    ))}
                </ol>
            </Section>
        </>
    );
}
