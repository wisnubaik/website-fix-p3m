import { CmsText, CmsElement } from '@/components/ui/ManagedContent';
"use client";

import Link from "./SiteLink";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

export default function HubCard({
    href,
    index,
    title,
    desc,
    accent,
    bg,
}: {
    href: string;
    index: string;
    title: string;
    desc: string;
    accent: string;
    bg: string;
}) {
    const ref = useRef<HTMLAnchorElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useTransform(mouseY, [-50, 50], [3, -3]);
    const rotateY = useTransform(mouseX, [-50, 50], [-3, 3]);

    const springX = useSpring(rotateX, { stiffness: 200, damping: 22 });
    const springY = useSpring(rotateY, { stiffness: 200, damping: 22 });

    const handleMouse = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left - rect.width / 2);
        mouseY.set(e.clientY - rect.top - rect.height / 2);
    };

    const reset = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    return (
        <motion.div style={{ perspective: 1000 }}>
            <motion.div
                style={{
                    rotateX: springX,
                    rotateY: springY,
                    transformStyle: "preserve-3d",
                }}
            >
                <Link
                    ref={ref}
                    href={href}
                    onMouseMove={handleMouse}
                    onMouseLeave={reset}
                    className="group relative block bg-white border border-[var(--color-outline-gray)] rounded-none p-4 min-h-[240px] hover:border-[var(--color-absolute-zero)] transition-colors duration-200 overflow-hidden"
                >
                    {/* Accent stripe grow */}
                    <span
                        className="absolute top-0 left-0 right-0 h-1 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out"
                        style={{ background: accent }}
                    />

                    {/* Index */}
                    <div
                        className="tabular-nums text-[10px] tracking-[0.04em] font-bold mb-6 inline-block px-2.5 py-0.5 rounded-full text-white"
                        style={{ background: accent }}
                    >
                        {index}
                    </div>

                    {/* Title */}
                    <div className="font-display text-[24px] font-bold text-[var(--color-absolute-zero)] tracking-[-0.025em] leading-[1.1] mb-3">
                        {title}
                    </div>

                    {/* Desc */}
                    <div className="text-sm text-[var(--color-graphite)] leading-relaxed mb-6 tracking-[-0.35px]">
                        {desc}
                    </div>

                    {/* CTA */}
                    <div
                        className="inline-flex items-center gap-1.5 tabular-nums text-[11px] font-bold  tracking-[0.02em]"
                        style={{ color: accent }}
                    ><CmsText field="f_832b14b76b54d5" fallback="Buka halaman" /><span className="transition-transform duration-300 group-hover:translate-x-1">
                            →
                        </span>
                    </div>
                </Link>
            </motion.div>
        </motion.div>
    );
}
