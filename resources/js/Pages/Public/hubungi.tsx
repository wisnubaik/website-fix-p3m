import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { ContentProps } from "./content-types";

import { MapPin, Mail, Phone, AtSign, Inbox } from "lucide-react";

import PageHero from "@/components/ui/PageHero";

import Section from "@/components/ui/Section";

import Reveal from "@/components/animation/Reveal";

import StaffAvatar from "@/components/ui/StaffAvatar";

type StaffRow = { initial: string; role: string; name: string; details: string[][]; photoUrl?: string };

export default function Page({ staff, contact }: Pick<ContentProps, "staff" | "contact">) {
    const cms = useCms();

const settings = {...{
        institution: "Pusat Penelitian dan Pengabdian Kepada Masyarakat Politeknik Negeri Madiun",
        officeTitle: "Kantor P3M PNM",
        officeDescription:
            "Pusat Penelitian dan Pengabdian Kepada Masyarakat. Kunjungi kami pada hari kerja untuk konsultasi langsung.",
        email: "p3m@pnm.ac.id",
        phone: "(0351) 452970",
        fax: "(0351) 452960",
        instagram: "@p3m_pnm",
        address: "Jl. Serayu No.84, Pandean, Taman, Kota Madiun, Jawa Timur 63133",
        mapsUrl:
            "https://www.google.com/maps/place/Politeknik+Negeri+Madiun/@-7.647663,111.526374,17z/data=!3m1!4b1!4m6!3m5!1s0x2e79be55b03d3d8f:0x1151682f4c35e5b4!8m2!3d-7.647663!4d111.526374!16s%2Fg%2F1hc0qyjt2?entry=ttu",
        poBox: "PO BOX 84 Madiun",
    }, ...contact};
const igHandle = settings.instagram.replace(/^@/, "");
const CONTACTS = [
        { icon: MapPin, label: cms.text("x_0a992a9c404b50", "Alamat"), value: settings.address, href: settings.mapsUrl || undefined, external: true },
        {
            icon: Mail,
            label: cms.text("x_cd05680f6d5d6a", "Email"),
            value: settings.email,
            href: `mailto:${settings.email}?subject=${encodeURIComponent("Pertanyaan untuk P3M PNM")}`,
        },
        {
            icon: Phone,
            label: cms.text("x_dce7f3836feaf2", "Telepon & Fax"),
            value: settings.fax ? `${settings.phone} Fax: ${settings.fax}` : settings.phone,
            href: `tel:${settings.phone.replace(/[^\d+]/g, "")}`,
        },
        {
            icon: AtSign,
            label: cms.text("x_440181d3931d9e", "Instagram"),
            value: settings.instagram,
            href: `https://instagram.com/${igHandle}`,
            external: true,
        },
        ...(settings.poBox ? [{ icon: Inbox, label: cms.text("x_e295ed83d6adb7", "PO BOX"), value: settings.poBox, href: undefined, external: false }] : []),
    ];
return (
        <>
            <CmsElement as={PageHero} fields={{"title":"f_898a3fa66bbb33","lead":"f_bee19486a8674b"}}
                crumbs={[{ label: cms.text("x_d991010bd6759c", "Hubungi kami") }]}
                title={
                    <>
                        Hubungi{" "}
                        <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                            Kami!
                        </em>
                    </>
                }
                lead="Silahkan untuk menghubungi kontak di bawah untuk informasi seputar penelitian, pengabdian, kerjasama industri, atau layanan kekayaan intelektual."
            />

            <Section>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10">
                    {/* Contact info card */}
                    <Reveal>
                        <div className="relative data-bloom text-white rounded-none p-10 overflow-hidden">
                            <div
                                aria-hidden
                                className="absolute -bottom-1/3 -right-[10%] w-[400px] h-[400px] rounded-full pointer-events-none mix-blend-screen"
                                style={{
                                    background:
                                        "radial-gradient(circle, rgba(91,192,255,0.45) 0%, transparent 60%)",
                                    filter: "blur(30px)",
                                }}
                            />
                            <div className="relative">
                                <h3 className="font-display text-[30px] font-bold tracking-[-0.025em] mb-3">
                                    {settings.officeTitle}
                                </h3>
                                <p className="text-white/85 text-[14px] leading-[1.5] mb-8 tracking-[-0.35px]">
                                    {settings.officeDescription}
                                </p>
                                <ul className="flex flex-col gap-5">
                                    {CONTACTS.map(({ icon: Icon, label, value, href, external }) => (
                                        <li key={label} className="flex gap-3.5 items-start">
                                            <div className="w-9 h-9 bg-black/30 rounded-none grid place-items-center shrink-0 text-white">
                                                <Icon size={18} />
                                            </div>
                                            <div>
                                                <div className="tabular-nums text-[10px]  tracking-[0.04em] text-white/80 font-bold mb-0.5">
                                                    {label}
                                                </div>
                                                {href ? (
                                                    <a
                                                        href={href}
                                                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                                        className="text-[14px] leading-snug underline decoration-white/30 underline-offset-2 hover:decoration-white transition-colors"
                                                    >
                                                        {value}
                                                    </a>
                                                ) : (
                                                    <div className="text-[14px] leading-snug">{value}</div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Reveal>

                    {/* Staff cards */}
                    <div className="flex flex-col gap-5">
                        <Reveal>
                            <div>
                                <div className="inline-flex items-center gap-2 tabular-nums text-[11px] font-bold  tracking-[0.04em] text-[var(--color-cosmic-candy)] mb-3"><CmsText field="f_75390cf2162b56" fallback="Tim P3M" /></div>
                                <h2 className="font-display text-[30px] md:text-[42px] font-bold text-[var(--color-absolute-zero)] tracking-[-0.025em] leading-[1.1]"><CmsText field="f_4aabbc453a2d67" fallback="Siapa yang bisa" />{" "}
                                    <em className="font-serif italic font-normal text-[var(--color-cosmic-candy)]"><CmsText field="f_9053cd82334c04" fallback="dihubungi" /></em>
                                    ?
                                </h2>
                            </div>
                        </Reveal>

                        {staff.map((s, i) => (
                            <Reveal key={s.name} delay={i * 0.1}>
                                <div className="bg-white border border-black/[0.08] rounded-none p-7 flex gap-7 items-center shadow-[0_1px_4px_rgba(11,23,58,0.05)] transition-all duration-300 hover:border-[var(--color-absolute-zero)]/30 hover:shadow-[0_16px_40px_-20px_rgba(11,23,58,0.35)] hover:-translate-y-0.5">
                                    <StaffAvatar photoUrl={s.photoUrl} name={s.name} initial={s.initial} />
                                    <div className="pl-7 border-l border-black/[0.08]">
                                        <div className="tabular-nums text-[11px]  tracking-[0.08em] font-bold text-[var(--color-cosmic-candy)] mb-1">
                                            {s.role}
                                        </div>
                                        <div className="font-display text-[18px] font-semibold text-[var(--color-absolute-zero)] tracking-[-0.025em] mb-3">
                                            {s.name}
                                        </div>
                                        <div className="text-[13px] text-[var(--color-graphite)] leading-[1.5] space-y-1">
                                            {s.details.map(([k, v]) => (
                                                <div key={k}>
                                                    <strong className="text-[var(--color-absolute-zero)] font-semibold">
                                                        {k}
                                                    </strong>{" "}
                                                     {v}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </Section>
        </>
    );
}
