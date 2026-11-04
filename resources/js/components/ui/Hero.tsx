import { CmsText, CmsElement } from '@/components/ui/ManagedContent';
"use client";

import { motion, Variants } from "framer-motion";
import { MotionLink } from "@/components/ui/MotionLink";
import { HERO_DEFAULTS } from "@/lib/hero-defaults";

export type HeroProps = {
    badge: string;
    titleText: string;
    titleItalicWord?: string | null;
    lead: string;
    ctaPrimaryLabel: string;
    ctaPrimaryHref: string;
    ctaSecondaryLabel: string;
    ctaSecondaryHref: string;
};

const DEFAULT_PROPS: HeroProps = HERO_DEFAULTS;

const containerVariants: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.08, delayChildren: 0.3 },
    },
};

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 16 } },
};

const illustrationVariants: Variants = {
    hidden: { opacity: 0, x: 60, scale: 0.92 },
    visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { type: "spring", stiffness: 60, damping: 18, delay: 0.5 },
    },
};

export default function Hero(props: Partial<HeroProps> = {}) {
    const p = { ...DEFAULT_PROPS, ...props };

    return (
        <section className="relative data-bloom text-white py-20 md:py-28 lg:py-36 overflow-hidden">
            {/* Tint gelap yang sama kaya PageHero (dipakai di Tentang, Penelitian, dst). biar nuansa biru di Beranda nggak beda sendiri (nggak "tabrakan warna"). */}
            <div
                aria-hidden
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(180deg, rgba(11,36,71,0.15) 0%, rgba(11,36,71,0.6) 100%)",
                }}
            />
            <div className="relative max-w-[1280px] mx-auto px-5 md:px-14">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center">
                    {/* Left. Text content */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="max-w-2xl"
                    >
                        <motion.p
                            variants={fadeUp}
                            className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75 mb-6"
                        >
                            {p.badge}
                        </motion.p>

                        <motion.h1
                            variants={fadeUp}
                            className="font-display text-4xl md:text-6xl lg:text-7xl xl:text-[88px] font-bold leading-[1.02] tracking-[-0.025em] mb-7 max-w-4xl text-white"
                        >
                            {p.titleText}
                        </motion.h1>

                        {/* Lead */}
                        <motion.p
                            variants={fadeUp}
                            className="text-base md:text-lg leading-[1.5] text-white/90 max-w-[560px] mb-9 tracking-[-0.0125em]"
                        >
                            {p.lead}
                        </motion.p>

                        {/* CTAs */}
                        <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                            <MotionLink
                                href={p.ctaPrimaryHref}
                                whileHover={{ y: -3, boxShadow: "0 10px 24px rgba(0,0,0,0.18)" }}
                                whileTap={{ y: 0 }}
                                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                                className="inline-flex items-center gap-2 bg-black text-white font-semibold text-[16px] px-4 py-3 rounded-none"
                            >
                                {p.ctaPrimaryLabel} <span>→</span>
                            </MotionLink>
                            <MotionLink
                                href={p.ctaSecondaryHref}
                                whileHover={{ y: -3, boxShadow: "0 10px 24px rgba(0,0,0,0.12)" }}
                                whileTap={{ y: 0 }}
                                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                                className="inline-flex items-center gap-2 bg-white text-[var(--color-absolute-zero)] font-semibold text-[16px] px-4 py-3 rounded-none"
                            >
                                {p.ctaSecondaryLabel}
                            </MotionLink>
                        </motion.div>
                    </motion.div>

                    {/* Right. Illustration */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={illustrationVariants}
                        className="hidden lg:flex items-center justify-center"
                    >
                        <div className="w-[500px] xl:w-[580px]">
                            <CmsElement as={"img"} fields={{"src":"f_b0f023e38df8fb"}}
                                src="/business-team.svg"
                                alt=""
                                width={580}
                                height={500}
                                className="w-full h-auto"
                            />
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
