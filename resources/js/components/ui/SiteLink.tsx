import { Link } from "@inertiajs/react";
import { forwardRef, type ComponentPropsWithoutRef, type MouseEvent } from "react";

/** Only application pages use Inertia; document and external links use normal navigation. */
const SiteLink = forwardRef<HTMLAnchorElement, Omit<ComponentPropsWithoutRef<"a">, "onProgress" | "onError"> & { href: string }>(
    function SiteLink({ href, children, onClick, ...props }, ref) {
        const path = href.split(/[?#]/)[0];
        const isPage = /^\/(?:$|profil$|hubungi$|repository$|riset-grup$|(?:penelitian|pkm)(?:\/(?:internal|eksternal|unggulan))?$|informasi\/(?:kegiatan|laporan-keuangan|luaran|mitra|pengumuman|sinta|tkt)$|layanan\/(?:asesmen|ki|monev|panduan|semhas)$)/.test(path);
        return isPage
            ? <Link ref={ref} href={href} {...props} onClick={event => onClick?.(event as MouseEvent<HTMLAnchorElement>)}>{children}</Link>
            : <a ref={ref} href={href} {...props} onClick={onClick}>{children}</a>;
    },
);

export default SiteLink;
