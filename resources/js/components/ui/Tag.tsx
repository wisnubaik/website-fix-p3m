import { cn } from "@/lib/cn";
import { ReactNode } from "react";

const styles = {
    navy: "bg-[var(--color-absolute-zero)] text-white",
    gold: "bg-[var(--color-gold-600)] text-white",
    teal: "bg-[var(--color-teal-600)] text-white",
    rose: "bg-[var(--color-rose-600)] text-white",
    leaf: "bg-[var(--color-api-success-green)] text-white",
    violet: "bg-[var(--color-violet-600)] text-white",
};

export default function Tag({
    variant = "navy",
    children,
}: {
    variant?: keyof typeof styles;
    children: ReactNode;
}) {
    return (
        <span
            className={cn(
                "tabular-nums text-[10px] font-bold tracking-wider  px-2.5 py-0.5 rounded-full whitespace-nowrap",
                styles[variant]
            )}
        >
            {children}
        </span>
    );
}
