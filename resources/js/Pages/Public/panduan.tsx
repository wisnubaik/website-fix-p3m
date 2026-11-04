import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { ContentProps } from "./content-types";

import PageHero from "@/components/ui/PageHero";

import Section from "@/components/ui/Section";

import MonevBerkas from "@/components/ui/MonevBerkas";



export default function Page({ sections }: Pick<ContentProps, "sections">) {
    const cms = useCms();

return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_4d67d60e0f4ff6","lead":"f_41781c48ad0c1c"}}
                crumbs={[{ label: cms.text("x_5043430f557699", "Layanan") }, { label: cms.text("x_994e3aa9ac0b4f", "Panduan") }]}
                title={
                    <>
                        Panduan &amp;{" "}
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            acuan
                        </em>{" "}
                        pelaksanaan.
                    </>
                }
                lead="Buku panduan penelitian dan pengabdian, rencana strategis P3M, panduan pelaporan keuangan dan monev, serta acuan teknis penyusunan dokumen."
            />



            <Section>
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-9"><CmsText field="f_d5fcc01e1f8d1e" fallback="Dokumen Panduan" /></h2>
                <MonevBerkas sections={sections} />
            </Section>
        </>
    );
}
