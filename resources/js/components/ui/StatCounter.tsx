"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

export default function StatCounter({
    value,
    label,
    sub,
}: {
    value: number;
    label: string;
    sub?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, amount: 0.6 });

    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, {
        damping: 24,
        stiffness: 60,
        restDelta: 0.5,
    });

    useEffect(() => {
        if (isInView) motionValue.set(value);
    }, [isInView, value, motionValue]);

    useEffect(() => {
        return springValue.on("change", (latest) => {
            if (ref.current) {
                ref.current.textContent = Math.round(latest).toLocaleString("id-ID");
            }
        });
    }, [springValue]);

    return (
        <div className="relative group">
            <div
                ref={ref}
                className="font-display text-4xl md:text-5xl lg:text-[56px] font-bold tracking-[-0.025em] text-[var(--color-absolute-zero)] leading-none tabular-nums"
            >
                0
            </div>
            <div className="mt-2.5 text-[13px]  tracking-[0.05em] font-semibold text-[var(--color-graphite)]">
                {label}
            </div>
            {sub && <div className="mt-1 text-[12px] text-[var(--color-graphite)]">{sub}</div>}
        </div>
    );
}
