"use client";

import { motion, Variants } from "framer-motion";

const listVariants: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { type: "spring", stiffness: 120, damping: 20 },
    },
};

export default function NumberedList({ items }: { items: string[] }) {
    return (
        <motion.ol
            variants={listVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.05 }}
            className="flex flex-col gap-3 list-none"
        >
            {items.map((text, i) => (
                <motion.li
                    key={i}
                    variants={itemVariants}
                    whileHover={{ x: 4 }}
                    className="grid grid-cols-[56px_1fr] gap-4 items-stretch bg-white border border-[var(--color-outline-gray)] hover:border-[var(--color-absolute-zero)] transition-colors"
                >
                    <span className="tabular-nums text-[14px] font-bold tracking-wider text-white bg-[var(--color-absolute-zero)] grid place-items-center select-none">
                        {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="py-4 pr-6 text-[15px] leading-[1.5] text-[var(--color-absolute-zero)] tracking-[-0.35px] self-center">
                        {text}
                    </span>
                </motion.li>
            ))}
        </motion.ol>
    );
}
