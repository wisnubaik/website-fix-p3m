import { ReactNode } from "react";

const accentMap = {
    navy: { dot: "var(--color-blackhole)", bg: "var(--color-blackhole)", fg: "#ffffff" },
    gold: { dot: "var(--color-gold-600)", bg: "var(--color-gold-600)", fg: "#ffffff" },
    leaf: { dot: "var(--color-leaf-600)", bg: "var(--color-leaf-600)", fg: "#ffffff" },
    violet: { dot: "var(--color-violet-600)", bg: "var(--color-violet-600)", fg: "#ffffff" },
};

export default function QuickAccessCard({
    href,
    icon,
    title,
    meta,
    accent = "navy",
}: {
    href: string;
    icon: ReactNode;
    title: string;
    meta: string;
    accent?: keyof typeof accentMap;
}) {
    const colors = accentMap[accent];

    return (
        <a
                href={href}
                className="block relative bg-white p-5 border border-[var(--color-outline-gray)] hover:border-[var(--color-absolute-zero)] transition-colors overflow-hidden group"
            >
                <span
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: colors.dot }}
                />

                <div
                    className="w-10 h-10 grid place-items-center mb-5"
                    style={{ background: colors.bg, color: colors.fg }}
                >
                    {icon}
                </div>

                <div className="font-display text-[16px] font-semibold text-[var(--color-absolute-zero)] tracking-[-0.025em] mb-1.5">
                    {title}
                </div>
                <div className="flex items-center gap-1.5 tabular-nums text-[11px] text-[var(--color-graphite)]">
                    {meta}
                </div>

                <span className="absolute bottom-5 right-5 text-sm text-[var(--color-absolute-zero)]" aria-hidden="true">→</span>
            </a>
    );
}
