import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { ContentProps } from "./content-types";

import PageHero from "@/components/ui/PageHero";

import Section from "@/components/ui/Section";

import EventPeriods from "@/components/ui/EventPeriods";

import MonevBerkas from "@/components/ui/MonevBerkas";

import { MONEV_BAGIAN } from "@/lib/monev-content";



export default function Page({ sections: semua, eventPeriods = [] }: Pick<ContentProps, "sections" | "eventPeriods">) {
    const cms = useCms();

const terpakai = new Set<string>();
const bagian = MONEV_BAGIAN.map((b) => {
        const sections = semua
            .map((sec) => ({
                ...sec,
                items: sec.items.filter((it) =>
                    it.cat ? it.cat === b.judul : b.grup.includes(sec.title)
                ),
            }))
            .filter((sec) => sec.items.length > 0);
        sections.forEach((sec) => sec.items.forEach(it => { if (it.id) terpakai.add(it.id); }));
        return { ...b, sections };
    });
const sisa = semua.map(sec => ({...sec, items:sec.items.filter(it => !it.id || !terpakai.has(it.id))})).filter(sec => sec.items.length);
if (sisa.length) bagian[bagian.length - 1].sections.push(...sisa);
const isi = (id: string) => bagian.find((b) => b.id === id)?.sections ?? [];
return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_582fd5dbd1ccd3"}}
                crumbs={[{ label: cms.text("x_3c0dc73053133a", "Layanan") }, { label: cms.text("x_b4bdd17094136f", "Monev") }]}
                title={
                    <>
                        Pantau progres{" "}
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            Monev
                        </em>{" "}
                        penelitian & PkM.
                    </>
                }
            />

            {/* Navigasi antarbagian. empat sub-menu Monev situs lama */}
            <div className="border-b border-[var(--color-outline-gray)] bg-white sticky top-0 z-30">
                <nav
                    aria-label="Bagian halaman Monev"
                    className="max-w-[1280px] mx-auto px-5 md:px-14 flex gap-7 overflow-x-auto"
                >
                    {MONEV_BAGIAN.map((b) => (
                        <a
                            key={b.id}
                            href={`#${b.id}`}
                            className="py-4 text-[14px] font-medium whitespace-nowrap text-[var(--color-graphite)] hover:text-[var(--color-absolute-zero)] border-b-2 border-transparent hover:border-[var(--color-absolute-zero)] transition-colors"
                        >
                            {cms.text("monev_nav_" + b.id, b.id === "monev-2026" ? "Periode Monev" : b.judul)}
                        </a>
                    ))}
                </nav>
            </div>

            {/* 1. Indikator Penilaian */}
            <Section id="indikator-penilaian" className="scroll-mt-16">
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-8"><CmsText field="f_31994e55916b46" fallback="Indikator Penilaian" /></h2>
                <MonevBerkas sections={isi("indikator-penilaian")} />
            </Section>

            {/* 2. Monev 2026 */}
            <Section id="monev-2026" variant="soft" className="scroll-mt-16">
                <EventPeriods periods={eventPeriods} eventLabel="Monev"/>
            </Section>

            {/* 4. Arsip halaman induk */}
            <Section id="monitoring-dan-evaluasi" variant="soft" className="scroll-mt-16">
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-9"><CmsText field="f_01a365d291b0fc" fallback="Monitoring dan Evaluasi" /></h2>
                <MonevBerkas sections={isi("monitoring-dan-evaluasi")} />
            </Section>
        </>
    );
}
