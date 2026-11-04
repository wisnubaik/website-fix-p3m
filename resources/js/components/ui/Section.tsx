import { ReactNode } from "react";
import { cn } from "@/lib/cn";

export default function Section({
    children,
    variant = "default",
    className,
    id,
}: {
    children: ReactNode;
    variant?: "default" | "soft" | "navy";
    className?: string;
    /** Dipakai halaman yang punya navigasi lompat antarbagian (mis. /layanan/monev). */
    id?: string;
}) {
    return (
        <section
            id={id}
            className={cn(
                "py-12 md:py-16 lg:py-24",
                variant === "default" && "bg-[var(--color-alabaster)]",
                variant === "soft" && "bg-[var(--color-whisper-white)]",
                variant === "navy" && "bg-[var(--color-blackhole)] text-white",
                className
            )}
        >
            <div className="max-w-[1280px] mx-auto px-5 md:px-14">{children}</div>
        </section>
    );
}
