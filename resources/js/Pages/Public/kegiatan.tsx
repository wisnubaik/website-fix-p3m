import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { ContentProps } from "./content-types";

import PageHero from "@/components/ui/PageHero";

import Section from "@/components/ui/Section";

import MonevBerkas from "@/components/ui/MonevBerkas";

import KegiatanKartu from "@/components/ui/KegiatanKartu";

export default function Page({ activities: kegiatan, sections: berkas }: Pick<ContentProps, "activities" | "sections">) {
    const cms = useCms();

return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_4fcaa81356ecf2","lead":"f_5b550efe321adc"}}
                crumbs={[{ label: cms.text("x_4158c14cd447d7", "Informasi") }, { label: cms.text("x_b4d6675d3ca692", "Kegiatan") }]}
                title={
                    <>
                        Jejak{" "}
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            kegiatan
                        </em>{" "}
                        P3M.
                    </>
                }
                lead="Workshop, sosialisasi, dan serah terima produk hilirisasi yang diselenggarakan P3M Politeknik Negeri Madiun, beserta dokumentasi pelaksanaannya."
            />

            {kegiatan.length > 0 && (
                <Section variant="soft">
                    <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-9"><CmsText field="f_db81e2493526b5" fallback="Pelaksanaan Kegiatan" /></h2>
                    <KegiatanKartu data={kegiatan} />
                </Section>
            )}

            <Section>
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-9"><CmsText field="f_47e306922623e4" fallback="Dokumentasi dan Berkas Pendukung" /></h2>
                <MonevBerkas sections={berkas} />
            </Section>
        </>
    );
}
