import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import SiteLayout from "@/Layouts/SiteLayout";
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHead from "@/components/ui/SectionHead";
import HubCard from "@/components/ui/HubCard";
import { StaggerContainer, StaggerItem } from "@/components/animation/RevealStagger";
function Page0({cards: items}: {cards: HubItem[]}) {
    const cms = useCms();

return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_8bf5358d55ef7b","lead":"f_7ee67c74e1768a"}}
                crumbs={[{ label: cms.text("x_a88546951b6c38", "Penelitian") }]}
                title={
                    <>
                        Mau meneliti apa{" "}
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            tahun ini
                        </em>
                        ?
                    </>
                }
                lead="Akses skema penelitian internal, eksternal, unggulan, dan dokumen pendukung dalam satu halaman."
            />

            <Section>
                <CmsElement as={SectionHead} fields={{"eyebrow":"f_d4a5ccadf9faef","title":"f_508d390678749c","lead":"f_038a8fb829eff8"}}
                    eyebrow="Skema pendanaan"
                    title={
                        <>
                            Tiga jalur,{" "}
                            <em className="font-serif italic font-normal text-[var(--color-gold-500)]">
                                satu tujuan
                            </em>
                            .
                        </>
                    }
                    lead="P3M PNM menyediakan beberapa jalur pendanaan riset terapan untuk dosen di seluruh program studi."
                />

                <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {items.map((item) => (
                        <StaggerItem key={item.href}>
                            <HubCard {...item} />
                        </StaggerItem>
                    ))}
                </StaggerContainer>
            </Section>
        </>
    );
}
function Page1({cards: items}: {cards: HubItem[]}) {
    const cms = useCms();

return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_e47bac399d5f64","lead":"f_c751314c5c979a"}}
                crumbs={[{ label: cms.text("x_5801bbf9f124d4", "PkM") }]}
                title={
                    <>
                        Mengabdi untuk{" "}
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            masyarakat
                        </em>
                        .
                    </>
                }
                lead="Skema PkM untuk pemberdayaan masyarakat, desa binaan, dan kemitraan dengan industri."
            />

            <Section>
                <CmsElement as={SectionHead} fields={{"eyebrow":"f_9129fae9dcbd2d","title":"f_df9c28a37b1453","lead":"f_2d9e7c05d0ab36"}}
                    eyebrow="Skema PkM"
                    title={
                        <>
                            Internal, eksternal, atau{" "}
                            <em className="font-serif italic font-normal text-[var(--color-gold-500)]">
                                unggulan
                            </em>
                            ?
                        </>
                    }
                    lead="Pilih skema yang paling sesuai dengan ide pengabdian dan target dampak masyarakat."
                />

                <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item) => (
                        <StaggerItem key={item.href}>
                            <HubCard {...item} />
                        </StaggerItem>
                    ))}
                </StaggerContainer>
            </Section>
        </>
    );
}
import type { HubItem } from "@/lib/hub-content";
const pages = {"penelitian": Page0,"pkm": Page1};
export default function Hub({hub,cards,label}: {hub: keyof typeof pages; cards: HubItem[]; label?: string}) { const Page=pages[hub]; return <SiteLayout><Page cards={cards} /></SiteLayout>; }
