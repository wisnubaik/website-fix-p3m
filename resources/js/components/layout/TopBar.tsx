import { usePage } from "@inertiajs/react";

export default function TopBar() {
    const { site: settings } = usePage<any>().props;
    const email = settings?.email ?? "p3m@pnm.ac.id";
    const phone = settings?.phone ?? "(0351) 452970";
    const instagram = settings?.instagram ?? "@p3m_pnm";
    return (
        <div className="bg-[var(--color-blackhole)] text-white/80 text-[13px]">
            <div className="max-w-[1280px] mx-auto px-5 md:px-14 py-2 flex flex-wrap items-center justify-end gap-4">
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                    <a href={`mailto:${email}`} className="hover:text-white transition-colors">{email}</a>
                    <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="hover:text-white transition-colors">{phone}</a>
                    <a href={`https://instagram.com/${instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{instagram}</a>
                </div>
            </div>
        </div>
    );
}
