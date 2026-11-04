import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import { DEFAULT_FOOTER_SOCIAL, FOOTER_SOCIAL_TYPES, footerSocialHref, type FooterSocial } from '@/lib/footer-social';
import { Link, usePage } from "@inertiajs/react";

export default function Footer() {
    const cms = useCms();

    const { site: settings } = usePage<any>().props;
    const social = cms.data<FooterSocial[]>("footer_social", DEFAULT_FOOTER_SOCIAL);

    return (
        <footer className="relative bg-[var(--color-blackhole)] text-white/80 pt-16 pb-8 overflow-hidden">
            <div className="relative max-w-[1280px] mx-auto px-5 md:px-14">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 pb-12 border-b border-white/10">
                    <div className="sm:col-span-2 md:col-span-1">
                        <div className="flex items-center gap-3 mb-3">
                            <img src={cms.text('footer_logo', '/logo/p3m-pnm.png')} alt="" className="w-14 h-14 object-contain shrink-0" />
                            <h4 className="font-display text-[24px] font-bold text-white tracking-[-0.025em]"><CmsText field="f_786395fb993fa7" fallback="P3M PNM" /></h4>
                        </div>
                        <p className="text-[14px] leading-[1.5] mb-4 max-w-[320px] tracking-[-0.35px]"><CmsText field="f_7ef5cbc465668f" fallback="Pusat Penelitian dan Pengabdian Kepada Masyarakat. Mendorong riset terapan, hilirisasi, dan kolaborasi industri di Politeknik Negeri Madiun." /></p>
                        <div className="flex gap-2">
                            {social.map((item, index) => ({label: FOOTER_SOCIAL_TYPES[item.type], href: footerSocialHref(item, settings), type: item.type, index})).filter(s => s.label && s.href).map((s) => (
                                <a
                                    key={`${s.type}-${s.index}`}
                                    href={s.href}
                                    className="w-9 h-9 border border-white/15 grid place-items-center text-white hover:bg-[var(--color-cosmic-candy)] hover:border-[var(--color-cosmic-candy)] transition-colors"
                                    aria-label={s.label}
                                    title={s.label}
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={1.7}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="w-4 h-4"
                                        aria-hidden
                                    >
                                        <SocialIcon type={s.type} />
                                    </svg>
                                </a>
                            ))}
                        </div>
                    </div>

                    <CmsElement as={FooterCol} fields={{"title":"f_97a7354bb2c07b"}}
                        title="Navigasi"
                        links={cms.data("footer_links_0", [
                            { label: "Beranda", href: "/" },
                            { label: "Tentang P3M", href: "/profil" },
                            { label: "Penelitian", href: "/penelitian/internal" },
                            { label: "PkM", href: "/pkm/internal" },
                            { label: "Repository", href: "/repository" },
                        ])}
                    />
                    <CmsElement as={FooterCol} fields={{"title":"f_b1811f030140ee"}}
                        title="Layanan"
                        links={cms.data("footer_links_1", [
                            { label: "Monev", href: "/layanan/monev" },
                            { label: "Seminar hasil", href: "/layanan/semhas" },
                            { label: "Kekayaan intelektual", href: "/layanan/ki" },
                            { label: "Panduan", href: "/layanan/panduan" },
                            { label: "Asesmen", href: "/layanan/asesmen" },
                        ])}
                    />
                    <CmsElement as={FooterCol} fields={{"title":"f_24de9fa9ae3519"}}
                        title="Tautan eksternal"
                        links={cms.data("footer_links_2", [
                            { label: "BIMA", href: "https://bima.kemdikbud.go.id" },
                            { label: "SINTA", href: "https://sinta.kemdikbud.go.id" },
                            { label: "PDDIKTI", href: "https://pddikti.kemdikbud.go.id" },
                            { label: "BRIN", href: "https://brin.go.id" },
                            { label: "PNM", href: "https://pnm.ac.id" },
                        ])}
                        external
                    />
                </div>

                <div className="pt-6 flex flex-wrap justify-between gap-3 text-[12px] tabular-nums">
                    <span><CmsText field="f_ae2aff19687db0" fallback="&copy; 2026 P3M Politeknik Negeri Madiun. Seluruh hak dilindungi." /></span>
                    <span className="flex flex-wrap gap-x-4 gap-y-2">
                        <a
                            className="text-[var(--color-cosmic-candy)] hover:underline"
                            href={`mailto:${settings?.email}`}
                        >
                            {settings?.email}
                        </a>{" "}
                          {settings?.phone && <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">{settings.phone}</a>}
                        {settings?.mapsUrl ? (
                            <a
                                href={settings?.mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-[var(--color-cosmic-candy)] hover:underline"
                            >
                                {settings?.address}
                            </a>
                        ) : (
                            settings?.address
                        )}
                    </span>
                </div>
            </div>
        </footer>
    );
}

function FooterCol({
    title,
    links,
    external,
}: {
    title: string;
    links: { label: string; href: string }[];
    external?: boolean;
}) {
    return (
        <div>
            <h5 className="tabular-nums text-[11px] font-bold tracking-wide text-white mb-4">
                {title}
            </h5>
            <ul className="flex flex-col gap-2.5">
                {links.map((l) =>
                    external ? (
                        <li key={l.href}>
                            <a
                                href={l.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[14px] hover:text-[var(--color-cosmic-candy)] transition-colors"
                            >
                                {l.label}
                            </a>
                        </li>
                    ) : (
                        <li key={l.href}>
                            <Link
                                href={l.href}
                                className="text-[14px] hover:text-[var(--color-cosmic-candy)] transition-colors"
                            >
                                {l.label}
                            </Link>
                        </li>
                    )
                )}
            </ul>
        </div>
    );
}

function SocialIcon({type}: {type: FooterSocial['type']}) {
    switch(type) {
        case 'instagram': return <><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></>;
        case 'email': return <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 6 9 7 9-7"/></>;
        case 'phone': return <path d="M4 3h4l2 5-3 2a14 14 0 0 0 7 7l2-3 5 2v4a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1z"/>;
        case 'whatsapp': return <><path d="M21 11.5a9 9 0 0 1-13.5 8L3 21l1.5-4.5A9 9 0 1 1 21 11.5Z"/><path d="m8 7 2 3-1 1 4 4 1-1 3 2"/></>;
        case 'youtube': return <><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z"/></>;
        case 'facebook': return <path d="M14 22V13h3l1-4h-4V7c0-1 0-2 2-2h2V1h-3c-4 0-6 2-6 6v2H6v4h3v9"/>;
        case 'linkedin': return <><rect x="3" y="9" width="4" height="12"/><circle cx="5" cy="4" r="2"/><path d="M11 21V9h4v2c3-4 6-2 6 2v8h-4v-7c0-2-2-2-2 0v7Z"/></>;
        default: return <><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><path d="M2 12h20"/></>;
    }
}
