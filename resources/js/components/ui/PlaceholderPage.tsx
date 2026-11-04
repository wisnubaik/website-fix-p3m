import { Link } from "@inertiajs/react";
import PageHero from "./PageHero";
import Section from "./Section";
import { Crumb } from "./Crumbs";

export default function PlaceholderPage({
    crumbs,
    title,
    lead,
    parentHref,
    parentLabel,
}: {
    crumbs: Crumb[];
    title: string;
    lead?: string;
    parentHref?: string;
    parentLabel?: string;
}) {
    return (
        <>
            <PageHero
                crumbs={crumbs}
                title={
                    <>
                        Halaman{" "}
                        <em className="font-serif italic font-normal text-[var(--color-cosmic-candy)]">
                            {title}
                        </em>
                        .
                    </>
                }
                lead={
                    lead ??
                    "Halaman ini sedang disiapkan. Konten dokumen, daftar, dan informasi terkait akan ditampilkan di sini."
                }
            />
            <Section>
                <div className="max-w-2xl mx-auto text-center py-8">
                    <div className="inline-flex items-center gap-2 tabular-nums text-[11px] font-bold  tracking-[0.08em] text-[var(--color-cosmic-candy)] mb-3">
                        <span className="w-6 h-0.5 bg-[var(--color-cosmic-candy)]" />
                        Sedang disiapkan
                    </div>
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--color-absolute-zero)] tracking-[-0.025em] mb-4">
                        Konten halaman ini sedang dalam pengembangan
                    </h2>
                    <p className="text-base text-[var(--color-graphite)] leading-relaxed tracking-[-0.4px] mb-8">
                        Daftar dokumen, template, dan informasi resmi akan tersedia di tahap selanjutnya. Sementara ini, kamu bisa kembali ke halaman utama atau halaman induk.
                    </p>
                    <div className="inline-flex flex-wrap gap-3 justify-center">
                        {parentHref && parentLabel && (
                            <Link
                                href={parentHref}
                                className="inline-flex items-center gap-2 bg-black text-white font-sans font-semibold text-base px-4 py-3 rounded-none hover:bg-[var(--color-cosmic-candy)] transition-colors"
                            >
                                ← Kembali ke {parentLabel}
                            </Link>
                        )}
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 bg-transparent border border-[var(--color-outline-gray)] text-[var(--color-absolute-zero)] font-sans font-semibold text-base px-4 py-3 rounded-none hover:border-[var(--color-absolute-zero)] transition-colors"
                        >
                            Beranda
                        </Link>
                    </div>
                </div>
            </Section>
        </>
    );
}