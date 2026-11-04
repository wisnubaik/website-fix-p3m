"use client";

import { useEffect, useRef } from "react";
import { usePage } from "@inertiajs/react";
import Lenis from "lenis";

export default function SmoothScroll({
    children,
}: {
    children: React.ReactNode;
}) {
    const lenisRef = useRef<Lenis | null>(null);
    const pathname = usePage().url;

    useEffect(() => {
        // Hormatin setting "Reduce Motion" di OS/browser. jangan paksa
        // smooth-scroll custom kalau user udah minta animasi diminimalkan.
        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
        if (prefersReducedMotion) return;

        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            touchMultiplier: 2,
        });
        lenisRef.current = lenis;

        let frame: number;
        function raf(time: number) {
            lenis.raf(time);
            frame = requestAnimationFrame(raf);
        }
        frame = requestAnimationFrame(raf);

        return () => {
            cancelAnimationFrame(frame);
            lenis.destroy();
            lenisRef.current = null;
        };
    }, []);

    // Force scroll to top on route change (Lenis keeps native scroll API alive)
    useEffect(() => {
        lenisRef.current?.scrollTo(0, { immediate: true });
    }, [pathname]);

    return <>{children}</>;
}
