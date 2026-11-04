import { CmsText, CmsElement } from '@/components/ui/ManagedContent';
import { Link } from "@inertiajs/react";
import { Fragment } from "react";

export type Crumb = { label: string; href?: string };

export default function Crumbs({ items }: { items: Crumb[] }) {
    return (
        <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-white/70 mb-6">
            <CmsElement as={Link} fields={{"href":"f_8ca2f071d9f1c4"}}
                href="/"
                className="hover:text-white transition-colors"
            ><CmsText field="f_8d31281b775ef7" fallback="Beranda" /></CmsElement>
            {items.map((c, i) => (
                <Fragment key={i}>
                    <span className="opacity-50">/</span>
                    {c.href ? (
                        <Link
                            href={c.href}
                            className="hover:text-white transition-colors"
                        >
                            {c.label}
                        </Link>
                    ) : (
                        <span>{c.label}</span>
                    )}
                </Fragment>
            ))}
        </div>
    );
}