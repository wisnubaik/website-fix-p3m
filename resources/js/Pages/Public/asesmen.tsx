import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { ContentProps } from "./content-types";

import PageHero from "@/components/ui/PageHero";

import Section from "@/components/ui/Section";

import MonevBerkas from "@/components/ui/MonevBerkas";



export default function Page({ sections }: Pick<ContentProps, "sections">) {
    const cms = useCms();

return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_e0b74e4ed3c050","lead":"f_891a4b1a3d6b16"}}
                crumbs={[{ label: cms.text("x_3bd21c85c40929", "Layanan") }, { label: cms.text("x_7218914463ff68", "Asesmen") }]}
                title={
                    <>
                        Berkas pendukung{" "}
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            asesmen
                        </em>{" "}
                        lapangan.
                    </>
                }
                lead="Dokumen yang dihimpun P3M sebagai bukti pendukung asesmen lapangan akreditasi program studi."
            />



            <Section>
                <h2 className="font-display text-[26px] md:text-[30px] font-bold tracking-[-0.03em] text-[var(--color-absolute-zero)] leading-tight mb-9"><CmsText field="f_5e67d8e2446139" fallback="Dokumen Pendukung" /></h2>
                <MonevBerkas sections={sections} />
            </Section>
        </>
    );
}
