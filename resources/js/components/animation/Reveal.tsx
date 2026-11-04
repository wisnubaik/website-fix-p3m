"use client";

import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";

type Direction = "up" | "down" | "left" | "right" | "scale" | "none";

const offsets: Record<Direction, { x: number; y: number; scale?: number }> = {
    up: { x: 0, y: 32 },
    down: { x: 0, y: -32 },
    left: { x: 32, y: 0 },
    right: { x: -32, y: 0 },
    scale: { x: 0, y: 0, scale: 0.92 },
    none: { x: 0, y: 0 },
};

export default function Reveal({
    children,
    delay = 0,
    direction = "up",
    className,
    amount = 0.2,
}: {
    children: ReactNode;
    delay?: number;
    direction?: Direction;
    className?: string;
    amount?: number;
}) {
    const offset = offsets[direction];
    const variants: Variants = {
        hidden: { opacity: 0, ...offset },
        visible: {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 80,
                damping: 18,
                delay,
            },
        },
    };

    return (
        <motion.div
            variants={variants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount }}
            className={className}
        >
            {children}
        </motion.div>
    );
}