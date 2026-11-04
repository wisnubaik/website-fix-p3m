import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { ContentProps } from "./content-types";

import PageHero from "@/components/ui/PageHero";

import Section from "@/components/ui/Section";

import MonevBerkas from "@/components/ui/MonevBerkas";

export default function Page({ sections }: Pick<ContentProps, "sections">) {
    const cms = useCms();

return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_5327d35123d354","lead":"f_f280e112dcc1dd"}}
                crumbs={[{ label: cms.text("x_64068bfa457f0d", "Informasi") }, { label: cms.text("x_c190b0e015a13a", "Mitra Kerja Sama") }]}
                title={
                    <>
                        Suara{" "}
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            mitra
                        </em>{" "}
                        kerja sama.
                    </>
                }
                lead="Kuesioner kepuasan mitra, dokumen kerja sama, dan format berita acara serah terima alat hasil penelitian dan pengabdian."
            />

            <Section variant="soft" className="!pb-10 md:!pb-12">
                <div className="border-l-2 border-[var(--color-cosmic-candy)] pl-5 md:pl-6 max-w-[72ch]">
                    <h2 className="font-display text-[21px] md:text-[24px] font-bold tracking-[-0.025em] text-[var(--color-absolute-zero)] leading-snug"><CmsText field="f_e391c2b446c230" fallback="Untuk mitra Politeknik Negeri Madiun" /></h2>
                    <p className="text-[15px] text-[var(--color-graphite)] mt-2.5 leading-relaxed"><CmsText field="f_ea60cc9abf2be3" fallback="Kuesioner di bawah diisi oleh mitra untuk menilai kepuasan atas kerja sama yang telah berjalan. Penilaian menggunakan skala empat tingkat, dari Sangat Puas hingga Tidak Puas. Hasilnya dipakai P3M sebagai bahan perbaikan layanan dan tidak dipublikasikan." /></p>
                </div>
            </Section>

            <Section className="!pt-0">
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-9"><CmsText field="f_6e8313c0515d47" fallback="Kuesioner dan Dokumen" /></h2>
                <MonevBerkas sections={sections} />
            </Section>
        </>
    );
}
