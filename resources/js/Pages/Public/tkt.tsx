import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { ContentProps } from "./content-types";

import PageHero from "@/components/ui/PageHero";

import Section from "@/components/ui/Section";

import MonevBerkas from "@/components/ui/MonevBerkas";

import { TKT_TINGKAT as TKT_TINGKATDefault, TKT_TAHAP as TKT_TAHAPDefault, TKT_PENGANTAR, TKT_DIAGRAM } from "@/lib/tkt-content";

export default function Page({ sections }: Pick<ContentProps, "sections">) {
    const cms = useCms();
    const TKT_TINGKAT = cms.data("collection_tkt_tingkat", TKT_TINGKATDefault);
    const TKT_TAHAP = cms.data("collection_tkt_tahap", TKT_TAHAPDefault);


return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_b0476ec5d08181"}}
                crumbs={[{ label: cms.text("x_8015df69a55055", "Informasi") }, { label: cms.text("x_505f69b673136e", "TKT") }]}
                title={
                    <>
                        Sembilan tingkat{" "}
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            kesiapan
                        </em>{" "}
                        teknologi.
                    </>
                }
                lead={cms.text("static_tkt_pengantar", TKT_PENGANTAR)}
            />

            <Section variant="soft">
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-9"><CmsText field="f_2b6ceb3266790f" fallback="Tahapan TKT" /></h2>

                <div className="flex flex-col gap-6">
                    {TKT_TAHAP.map((tahap) => (
                        <div key={tahap.nama}>
                            <div className="flex items-center gap-3 mb-3">
                                <span
                                    aria-hidden
                                    className="w-9 h-3 shrink-0"
                                    style={{ backgroundColor: tahap.warna }}
                                />
                                <h3 className="font-display text-[19px] font-bold tracking-[-0.02em] text-[var(--color-absolute-zero)]">
                                    {tahap.nama}
                                </h3>
                                <span className="text-[13px] text-[var(--color-graphite)]"><CmsText field="f_51902c65310a57" fallback="Tingkat" />{" "}{tahap.dari}{" "}<CmsText field="f_9a903cfc7b8771" fallback="sampai" />{" "}{tahap.sampai}
                                </span>
                            </div>

                            <ol className="border-t border-[var(--color-outline-gray)]">
                                {TKT_TINGKAT.filter(
                                    (t) => t.tingkat >= tahap.dari && t.tingkat <= tahap.sampai
                                ).map((t) => (
                                    <li
                                        key={t.tingkat}
                                        className="grid grid-cols-[3rem_1fr] gap-4 py-3.5 border-b border-[var(--color-outline-gray)] bg-white px-4"
                                    >
                                        <span
                                            className="font-display text-[17px] font-bold tabular-nums"
                                            style={{ color: tahap.warna }}
                                        >
                                            {t.tingkat}
                                        </span>
                                        <span className="text-[15px] text-[var(--color-absolute-zero)] leading-relaxed">
                                            {t.judul}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    ))}
                </div>

                <figure className="mt-10 border border-[var(--color-outline-gray)] bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element -- diagram lokal */}
                    <img
                        src={cms.text("static_tkt_diagram", TKT_DIAGRAM)}
                        alt="Diagram tahapan TKT"
                        loading="lazy"
                        className="w-full"
                    />
                    <figcaption className="text-[13px] text-[var(--color-graphite)] px-4 py-3 border-t border-[var(--color-outline-gray)]"><CmsText field="f_def366b952425c" fallback="Diagram alur TKT: penelitian dasar, penelitian terapan, dan penelitian pengembangan hingga penguasaan teknologi." /></figcaption>
                </figure>
            </Section>

            <Section>
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-9"><CmsText field="f_180e767be724af" fallback="Buku Panduan" /></h2>
                <MonevBerkas sections={sections} />
            </Section>
        </>
    );
}
