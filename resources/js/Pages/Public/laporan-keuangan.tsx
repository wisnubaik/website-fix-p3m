import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { ContentProps } from "./content-types";

import PageHero from "@/components/ui/PageHero";

import Section from "@/components/ui/Section";

import MonevBerkas from "@/components/ui/MonevBerkas";

export default function Page({ sections }: Pick<ContentProps, "sections">) {
    const cms = useCms();

return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_062955be31b41a","lead":"f_b1c0b3a4ef8fd0"}}
                crumbs={[{ label: cms.text("x_9b0cd74ab77690", "Informasi") }, { label: cms.text("x_2836b0eaa46524", "Laporan Keuangan") }]}
                title={
                    <>
                        Format &amp; petunjuk{" "}
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            pelaporan
                        </em>{" "}
                        keuangan.
                    </>
                }
                lead="Format laporan realisasi belanja, surat pernyataan tanggung jawab belanja, petunjuk penyusunan LPj, dan rumus perhitungan pajak untuk pelaksana penelitian dan pengabdian."
            />

            <Section variant="soft" className="!pb-10 md:!pb-12">
                <div className="border-l-2 border-[var(--color-cosmic-candy)] pl-5 md:pl-6 max-w-[72ch]">
                    <h2 className="font-display text-[21px] md:text-[24px] font-bold tracking-[-0.025em] text-[var(--color-absolute-zero)] leading-snug"><CmsText field="f_12b74a16d740e4" fallback="Pengumpulan laporan pertanggungjawaban" /></h2>
                    <p className="text-[15px] text-[var(--color-graphite)] mt-2.5 leading-relaxed"><CmsText field="f_76af013a17284d" fallback="Berkas LPj diunggah ke folder yang alamatnya disampaikan melalui surat edaran kepada masing-masing pelaksana, bukan melalui halaman ini. Folder tersebut memuat laporan keuangan seluruh pelaksana, sehingga aksesnya dibatasi. Batas waktu pengumpulan diumumkan di halaman" />{" "}
                        <CmsElement as={"a"} fields={{"href":"f_02a04437724048"}}
                            href="/informasi/pengumuman"
                            className="font-medium text-[var(--color-absolute-zero)] underline underline-offset-4 hover:text-[var(--color-cosmic-candy)] transition-colors"
                        ><CmsText field="f_2fcdfe97efa8f7" fallback="Pengumuman" /></CmsElement>
                        .
                    </p>
                </div>
            </Section>

            <Section className="!pt-0">
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-9"><CmsText field="f_f81326e981176a" fallback="Berkas Panduan" /></h2>
                <MonevBerkas sections={sections} />
            </Section>
        </>
    );
}
