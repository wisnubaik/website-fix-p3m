import { CmsActionText, CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { ContentProps } from "./content-types";

import PageHero from "@/components/ui/PageHero";

import Section from "@/components/ui/Section";

export default function Page({ researchGroups: groups }: Pick<ContentProps, "researchGroups">) {
    const cms = useCms();

return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_5f9ebd564ecf3c","lead":"f_b0aa7743e5a8cb"}}
                crumbs={[{ label: cms.text("x_a02b8df4b0da13", "Riset Grup") }]}
                title={
                    <>
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            Riset grup
                        </em>{" "}
                        Politeknik Negeri Madiun.
                    </>
                }
                lead="Kelompok riset di lingkungan Politeknik Negeri Madiun. fokus kajian, ketua, dan roadmap penelitian masing-masing."
            />

            <Section>
                <div className="overflow-x-auto border border-[var(--color-outline-gray)] rounded-2xl bg-white">
                    <table className="w-full min-w-[720px] text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--color-whisper-white)] border-b border-[var(--color-outline-gray)]">
                                <th className="px-5 py-4 font-display text-[13px] font-bold  tracking-wider text-[var(--color-graphite)]"><CmsText field="f_a9dc19c0554c4c" fallback="Nama Riset Grup" /></th>
                                <th className="px-5 py-4 font-display text-[13px] font-bold  tracking-wider text-[var(--color-graphite)]"><CmsText field="f_3f3a7dcffc8b5e" fallback="Ketua" /></th>
                                <th className="px-5 py-4 font-display text-[13px] font-bold  tracking-wider text-[var(--color-graphite)]"><CmsText field="f_b5efa70c51ff9d" fallback="Fokus Riset" /></th>
                                <th className="px-5 py-4 font-display text-[13px] font-bold  tracking-wider text-[var(--color-graphite)]"><CmsText field="f_a3441791b8084b" fallback="Anggota" /></th>
                                <th className="px-5 py-4 font-display text-[13px] font-bold  tracking-wider text-[var(--color-graphite)]"><CmsText field="f_4265b8165251a9" fallback="Roadmap" /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map((rg) => (
                                <tr
                                    key={rg.slug}
                                    className="border-b border-[var(--color-outline-gray)] last:border-0 hover:bg-[var(--color-whisper-white)] transition-colors align-top"
                                >
                                    <td className="px-5 py-4">
                                        <div className="font-display font-bold text-[15px] text-[var(--color-absolute-zero)]">
                                            {rg.nama}
                                        </div>
                                        <div className="text-[13px] text-[var(--color-graphite)] mt-1 max-w-[320px]">
                                            {rg.deskripsi}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-[14px] text-[var(--color-absolute-zero)] whitespace-nowrap">
                                        {rg.ketua}
                                    </td>
                                    <td className="px-5 py-4 text-[14px] text-[var(--color-graphite)] max-w-[240px]">
                                        {rg.fokus}
                                    </td>
                                    <td className="px-5 py-4 text-[14px] text-[var(--color-graphite)] whitespace-nowrap">
                                        {rg.anggota ? `${rg.anggota} orang` : "-"}
                                    </td>
                                    <td className="px-5 py-4 text-[14px] whitespace-nowrap">
                                        {rg.roadmapHref ? (
                                            <a
                                                href={rg.roadmapHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[var(--color-cosmic-candy)] font-medium hover:underline"
                                            ><CmsActionText field="f_3f8bcebabd1eff" fallback="Lihat roadmap" /></a>
                                        ) : (
                                            <span className="text-[var(--color-graphite)]"><CmsText field="f_0acfd49b8fdc95" fallback="Belum tersedia" /></span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>
        </>
    );
}
