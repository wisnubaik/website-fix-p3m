import { CmsActionText, CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { ContentProps } from "./content-types";

import PageHero from "@/components/ui/PageHero";

import Section from "@/components/ui/Section";

import MonevBerkas from "@/components/ui/MonevBerkas";

export default function Page({ sections }: Pick<ContentProps, "sections">) {
    const cms = useCms();

return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_301b29cdf96528","lead":"f_dee63d911907fb"}}
                crumbs={[{ label: cms.text("x_d1c7165881531a", "Repository") }]}
                title={
                    <>
                        Pustaka{" "}
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            dokumen
                        </em>{" "}
                        &amp; karya P3M.
                    </>
                }
                lead="Aplikasi Repository P3M untuk menelusuri karya ilmiah sivitas Politeknik Negeri Madiun, beserta pustaka dokumen penelitian dan pengabdian."
            />

            <Section variant="soft">
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-8"><CmsText field="f_5c15e4b95b3952" fallback="Aplikasi Repository P3M" /></h2>
                <div className="grid sm:grid-cols-2 gap-3">
                    <CmsElement as={"a"} fields={{"href":"f_e28f78453f4b96"}}
                        href="https://repository-p3m.pnm.ac.id/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group border border-[var(--color-outline-gray)] bg-white p-6 hover:border-[var(--color-absolute-zero)] transition-colors"
                    >
                        <span className="font-display text-[19px] font-bold tracking-[-0.02em] text-[var(--color-absolute-zero)] leading-snug block"><CmsText field="f_8a880cdc1a727f" fallback="Masuk ke Repository P3M" /></span>
                        <span className="text-[14px] text-[var(--color-graphite)] mt-1.5 block"><CmsText field="f_70a6213b4ef686" fallback="Telusuri dan unggah karya ilmiah sivitas Politeknik Negeri Madiun" /></span>
                        <span className="text-[13px] font-medium text-[var(--color-cosmic-candy)] mt-4 inline-block"><CmsText field="f_1eefdedf27f8ae" fallback="Buka aplikasi &rarr;" /></span>
                    </CmsElement>

                    <CmsElement as={"a"} fields={{"href":"f_cbf112e6b1819e"}}
                        href="https://drive.google.com/file/d/1DafChuuXqInQUMUVUg8dZW5-rzcorqW1/view"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group border border-[var(--color-outline-gray)] bg-white p-6 hover:border-[var(--color-absolute-zero)] transition-colors"
                    >
                        <span className="font-display text-[19px] font-bold tracking-[-0.02em] text-[var(--color-absolute-zero)] leading-snug block"><CmsText field="f_57372f8801df33" fallback="Buku Panduan Repository P3M" /></span>
                        <span className="text-[14px] text-[var(--color-graphite)] mt-1.5 block"><CmsText field="f_f386e49554970d" fallback="Petunjuk penggunaan aplikasi, dari pendaftaran akun sampai unggah karya" /></span>
                        <span className="text-[13px] font-medium text-[var(--color-cosmic-candy)] mt-4 inline-block"><CmsText field="f_1d06114562a8fc" fallback="Buka panduan &rarr;" /></span>
                    </CmsElement>
                </div>
            </Section>

            <Section>
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-9"><CmsText field="f_380e35fad5b910" fallback="Pustaka Dokumen" /></h2>
                <MonevBerkas sections={sections} />
            </Section>
        </>
    );
}
