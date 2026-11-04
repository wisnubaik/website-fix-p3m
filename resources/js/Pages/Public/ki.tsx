import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { ContentProps } from "./content-types";

import PageHero from "@/components/ui/PageHero";

import Section from "@/components/ui/Section";

import KiTabel from "@/components/ui/KiTabel";

import MonevBerkas from "@/components/ui/MonevBerkas";

export default function Page({ kiData: karya, sections: berkas }: Pick<ContentProps, "kiData" | "sections">) {
    const cms = useCms();

return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_88ac4ee53db0c2","lead":"f_49cadd568f3cf7"}}
                crumbs={[{ label: cms.text("x_f1e129606e7a84", "Layanan") }, { label: cms.text("x_85725ef2d0a13e", "Kekayaan Intelektual") }]}
                title={
                    <>
                        Karya yang{" "}
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            dilindungi
                        </em>{" "}
                        hak kekayaan intelektual.
                    </>
                }
                lead="Pencatatan hak cipta, paten, dan kekayaan intelektual lain atas karya dosen Politeknik Negeri Madiun, beserta formulir pengajuan insentifnya."
            />

            <Section variant="soft">
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight"><CmsText field="f_e20280bd60faaf" fallback="Karya yang Tercatat" /></h2>
                <p className="text-[15px] md:text-base text-[var(--color-graphite)] mt-2 mb-9 max-w-[68ch] leading-relaxed"><CmsText field="f_f0bab2b0b392ea" fallback="Seluruh karya sivitas Politeknik Negeri Madiun yang telah memperoleh pencatatan Kekayaan Intelektual. Gunakan filter di bawah untuk menelusuri per program studi atau per tahun." /></p>
                <KiTabel data={karya} />
            </Section>

            <Section>
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-9"><CmsText field="f_047235dedcbfc3" fallback="Formulir dan Dokumen Pendukung" /></h2>
                <MonevBerkas sections={berkas} />
            </Section>
        </>
    );
}
