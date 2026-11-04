import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { ContentProps } from "./content-types";

import PageHero from "@/components/ui/PageHero";

import Section from "@/components/ui/Section";

import EventPeriods from "@/components/ui/EventPeriods";

import MonevBerkas from "@/components/ui/MonevBerkas";



import { SEMHAS_BAGIAN } from "@/lib/monev-content";

export default function Page({ sections, eventPeriods = [] }: Pick<ContentProps, "sections" | "eventPeriods">) {
    const cms = useCms();

const perBagian = (nama: string, termasukKosong = false) =>
        sections
            .map((sec) => ({
                ...sec,
                items: sec.items.filter((it) =>
                    termasukKosong ? !it.cat || it.cat === nama : it.cat === nama
                ),
            }))
            .filter((sec) => sec.items.length > 0);
const berkasDokumen = perBagian(SEMHAS_BAGIAN[1].judul, true);
return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_37f8c5ec68293f","lead":"f_6226e32efb5c1a"}}
                crumbs={[{ label: cms.text("x_c1f91ccf82d94c", "Layanan") }, { label: cms.text("x_479f2b22dc2bf1", "Semhas") }]}
                title={
                    <>
                        Seminar hasil{" "}
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            penelitian
                        </em>{" "}
                        & PkM.
                    </>
                }
                lead="Forum diseminasi hasil penelitian dan pengabdian dosen yang diselenggarakan oleh P3M."
            />

            <Section variant="soft">
                <EventPeriods periods={eventPeriods} eventLabel="Seminar Hasil"/>
            </Section>

            {berkasDokumen.length > 0 && <Section>
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight mb-9">
                    {cms.text("semhas_berkas_title", "Dokumen Seminar Hasil")}
                </h2>
                <MonevBerkas sections={berkasDokumen} />
            </Section>}

        </>
    );
}
