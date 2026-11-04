"use client";

import { motion, useMotionValue, useSpring, animate } from "framer-motion";
import { usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";

export default function PageProgressBar() {
    const pathname = usePage().url;
    const [visible, setVisible] = useState(false);
    const progress = useMotionValue(0);
    const smoothProgress = useSpring(progress, {
        stiffness: 150,
        damping: 28,
        mass: 0.4,
    });
    const isFirst = useRef(true);

    useEffect(() => {
        // skip animation on initial mount
        if (isFirst.current) {
            isFirst.current = false;
            return;
        }

        // Start: show bar, animate to ~80% (we don't know real progress, fake the curve)
        setVisible(true);
        progress.set(0);
        const ramp = animate(progress, 0.8, { duration: 0.6, ease: "easeOut" });

        // Finish: jump to 100% then fade out
        const finishTimer = setTimeout(() => {
            ramp.stop();
            animate(progress, 1, { duration: 0.25, ease: "easeOut" });
            setTimeout(() => {
                setVisible(false);
                progress.set(0);
            }, 300);
        }, 400);

        return () => {
            ramp.stop();
            clearTimeout(finishTimer);
        };
    }, [pathname, progress]);

    return (
        <motion.div
            animate={{ opacity: visible ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 z-[300] pointer-events-none h-[3px]"
        >
            <motion.div
                style={{
                    scaleX: smoothProgress,
                    transformOrigin: "left",
                    background:
                        "linear-gradient(90deg, var(--color-gold-500) 0%, var(--color-gold-400) 50%, var(--color-gold-500) 100%)",
                    boxShadow: "0 0 12px rgba(245,166,35,0.6), 0 0 4px rgba(245,166,35,0.8)",
                }}
                className="h-full origin-left w-full"
            />
        </motion.div>
    );
}