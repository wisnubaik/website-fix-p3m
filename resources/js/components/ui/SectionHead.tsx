import Reveal from "@/components/animation/Reveal";
import { ReactNode } from "react";
import { cn } from "@/lib/cn";

export default function SectionHead({
    eyebrow,
    title,
    lead,
    link,
    variant = "default",
}: {
    eyebrow?: string;
    title: ReactNode;
    lead?: string;
    link?: { label: string; href: string };
    variant?: "default" | "navy";
}) {
    const dark = variant === "navy";
    return (
        <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6 mb-10 md:mb-12">
                <div className="max-w-[640px]">
                    {/* Label bagian. Sengaja memakai huruf badan teks biasa, bukan
                        monospace berhuruf besar dengan garis di depannya: gaya itu
                        terbaca sebagai aksen desain, bukan sebagai keterangan resmi
                        sebuah lembaga. */}
                    {eyebrow && (
                        <p
                            className={cn(
                                "text-[13px] font-semibold tracking-[0.01em] mb-2.5",
                                dark ? "text-white/70" : "text-[var(--color-cosmic-candy)]"
                            )}
                        >
                            {eyebrow}
                        </p>
                    )}
                    <h2
                        className={cn(
                            "font-display text-[30px] md:text-[42px] lg:text-[48px] font-bold tracking-[-0.025em] leading-[1.1]",
                            dark ? "text-white" : "text-[var(--color-absolute-zero)]"
                        )}
                    >
                        {title}
                    </h2>
                    {lead && (
                        <p
                            className={cn(
                                "mt-4 text-[16px] leading-[1.5] tracking-[-0.4px]",
                                dark ? "text-white/80" : "text-[var(--color-graphite)]"
                            )}
                        >
                            {lead}
                        </p>
                    )}
                </div>
                {link && (
                    <a
                        href={link.href}
                        className={cn(
                            "group inline-flex items-center gap-2 text-[14px] font-semibold px-4 py-2.5 rounded-none border transition-colors",
                            dark
                                ? "text-white border-white/30 hover:bg-white hover:text-[var(--color-absolute-zero)]"
                                : "text-[var(--color-absolute-zero)] border-[var(--color-outline-gray)] hover:bg-[var(--color-blackhole)] hover:text-white hover:border-[var(--color-blackhole)]"
                        )}
                    >
                        {link.label}
                        <span className="transition-transform group-hover:translate-x-1">→</span>
                    </a>
                )}
            </div>
        </Reveal>
    );
}
