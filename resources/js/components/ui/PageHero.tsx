import { CmsText, CmsElement } from '@/components/ui/ManagedContent';
"use client";

import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";
import Crumbs, { Crumb } from "./Crumbs";

const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 80, damping: 18 },
    },
};

export default function PageHero({
    crumbs,
    title,
    lead,
}: {
    crumbs: Crumb[];
    title: ReactNode;
    lead?: string;
}) {
    return (
        <section className="relative text-white py-16 md:py-24 lg:py-28 overflow-hidden bg-[var(--color-blackhole)]">
            {/* Foto gedung PNM berada di belakang tint dan isi hero. */}
            <CmsElement as={"img"} fields={{"src":"f_f9e1416e79539f"}}
                src="/gedung-pnm.jpg"
                alt=""
                aria-hidden
                sizes="100vw"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: "center 60%" }}
            />
            {/* Tint gradient brand di atas foto. cukup transparan biar foto
                tetap kebaca, tapi tetap konsisten sama warna Data Bloom. */}
            <div
                aria-hidden
                className="absolute inset-0 data-bloom mix-blend-multiply opacity-90"
            />
            <div
                aria-hidden
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(180deg, rgba(11,36,71,0.15) 0%, rgba(11,36,71,0.6) 100%)",
                }}
            />

            {/* Living gradient highlights */}
            <motion.div
                aria-hidden
                animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-1/2 -right-[10%] w-[600px] h-[600px] rounded-full pointer-events-none mix-blend-screen"
                style={{
                    background:
                        "radial-gradient(circle, rgba(91,192,255,0.45) 0%, transparent 60%)",
                    filter: "blur(40px)",
                }}
            />

            <div className="relative max-w-[1280px] mx-auto px-5 md:px-14">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    <motion.div variants={fadeUp}>
                        <Crumbs items={crumbs} />
                    </motion.div>
                    <motion.h1
                        variants={fadeUp}
                        className="font-display text-4xl md:text-6xl lg:text-[72px] font-bold tracking-[-0.025em] leading-[1.05] max-w-[900px] text-white"
                    >
                        {title}
                    </motion.h1>
                    {lead && (
                        <motion.p
                            variants={fadeUp}
                            className="mt-5 text-base md:text-[17px] text-white/90 leading-[1.5] max-w-[700px] tracking-[-0.4px]"
                        >
                            {lead}
                        </motion.p>
                    )}
                </motion.div>
            </div>
        </section>
    );
}
