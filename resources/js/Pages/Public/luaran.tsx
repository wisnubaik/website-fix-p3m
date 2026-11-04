import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { ContentProps } from "./content-types";

import PageHero from "@/components/ui/PageHero";

import Section from "@/components/ui/Section";

import MonevBerkas from "@/components/ui/MonevBerkas";

import PblTabel from "@/components/ui/PblTabel";

export default function Page({ sections: berkas, pblData: pbl }: Pick<ContentProps, "sections" | "pblData">) {
    const cms = useCms();

return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_7655638e1a828a","lead":"f_34af7b7d588bdf"}}
                crumbs={[{ label: cms.text("x_dfec4e6693052f", "Informasi") }, { label: cms.text("x_fa6e0ce4e536a6", "Luaran") }]}
                title={
                    <>
                        Rekam{" "}
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            luaran
                        </em>{" "}
                        riset &amp; PkM dosen.
                    </>
                }
                lead="Formulir pendataan luaran penelitian dan pengabdian per tahun, serta daftar proyek Problem Based Learning yang dijalankan bersama mitra."
            />

            <Section variant="soft">
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight"><CmsText field="f_b17605b67a9da5" fallback="Pendataan Luaran" /></h2>
                <p className="text-[15px] md:text-base text-[var(--color-graphite)] mt-2 mb-9 max-w-[68ch] leading-relaxed"><CmsText field="f_a4626391c5f3e3" fallback="Dosen pelaksana penelitian dan pengabdian mengisi capaian luarannya melalui formulir sesuai tahun pelaksanaan." /></p>
                <MonevBerkas sections={berkas} />
            </Section>

            <Section>
                <h2 className="font-display text-[30px] md:text-[38px] font-bold tracking-[-0.035em] text-[var(--color-absolute-zero)] leading-tight"><CmsText field="f_fddb11e261d3c1" fallback="Problem Based Learning" /></h2>
                <p className="text-[15px] md:text-base text-[var(--color-graphite)] mt-2 mb-9 max-w-[68ch] leading-relaxed"><CmsText field="f_1e6ba6bb06b019" fallback="Proyek yang dikerjakan mahasiswa bersama mitra sebagai bagian dari pembelajaran berbasis masalah, beserta hasil dan pemanfaatannya." /></p>
                <PblTabel data={pbl} />
            </Section>
        </>
    );
}
