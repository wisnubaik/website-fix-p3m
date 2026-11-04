"use client";

import { motion } from "framer-motion";
import Tag from "./Tag";
import { ReactNode } from "react";

// ============ Winner Item ============
export function WinnerItem({
    name,
    skema,
    tag,
    tagVariant,
}: {
    name: string;
    skema: string;
    tag: string;
    tagVariant: "navy" | "gold" | "teal" | "violet" | "rose" | "leaf";
}) {
    return (
        <motion.div
            whileHover={{ x: 4, backgroundColor: "var(--color-whisper-white)" }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex justify-between items-center px-4 py-3 cursor-pointer border-b border-[var(--color-outline-gray)] last:border-b-0"
        >
            <div>
                <div className="text-[15px] font-semibold text-[var(--color-absolute-zero)] tracking-[-0.0125em]">
                    {name}
                </div>
                <div className="text-[12px] text-[var(--color-graphite)] mt-0.5">{skema}</div>
            </div>
            <Tag variant={tagVariant}>{tag}</Tag>
        </motion.div>
    );
}

// ============ Agenda Item ============
export function AgendaItem({
    status,
    title,
    accentColor = "var(--color-cosmic-candy)",
}: {
    status: string;
    title: string;
    accentColor?: string;
}) {
    return (
        <motion.div
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="p-4 bg-[var(--color-whisper-white)] border-l-[3px]"
            style={{ borderLeftColor: accentColor }}
        >
            <div
                className="tabular-nums text-[10px] font-bold  tracking-wider mb-1"
                style={{ color: accentColor }}
            >
                {status}
            </div>
            <div className="text-[14px] font-semibold text-[var(--color-absolute-zero)] leading-snug tracking-[-0.0125em]">
                {title}
            </div>
        </motion.div>
    );
}

// ============ Feed Item (Pengumuman) ============
export function FeedItem({
    num,
    title,
    meta,
    urgent,
    href = "/informasi/pengumuman",
}: {
    num: string;
    title: string;
    meta: string;
    urgent?: boolean;
    href?: string;
}) {
    return (
        <motion.a
            href={href}
            whileHover={{ paddingLeft: 8, paddingRight: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="grid grid-cols-[auto_1fr_auto] gap-4 items-center py-4 border-b border-[var(--color-outline-gray)] cursor-pointer hover:bg-[var(--color-whisper-white)] group"
        >
            <span
                className={`tabular-nums text-[12px] font-bold px-2.5 py-1 min-w-12 text-center tabular-nums ${
                    urgent
                        ? "bg-[var(--color-cosmic-candy)] text-white"
                        : "bg-[var(--color-absolute-zero)] text-white"
                }`}
            >
                {num}
            </span>
            <div>
                <div className="text-[15px] font-medium text-[var(--color-absolute-zero)] tracking-[-0.0125em]">
                    {title}
                </div>
                <div className="text-[12px] text-[var(--color-graphite)] mt-1">{meta}</div>
            </div>
            <span className="text-lg text-[var(--color-absolute-zero)] opacity-40 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all">
                →
            </span>
        </motion.a>
    );
}

// ============ Cluster Card ============
export function ClusterCard({
    index,
    title,
    desc,
    accent,
    bg,
}: {
    index: string;
    title: string;
    desc: string;
    accent: string;
    bg: string;
}) {
    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-white border border-[var(--color-outline-gray)] p-4 hover:border-[var(--color-absolute-zero)] transition-colors"
        >
            <span
                className="inline-block tabular-nums text-[11px] tracking-wide font-bold px-2.5 py-0.5 rounded-full mb-4"
                style={{ background: bg, color: accent }}
            >
                {index}
            </span>
            <div className="font-display text-[18px] font-semibold text-[var(--color-absolute-zero)] tracking-[-0.025em] leading-snug mb-2">
                {title}
            </div>
            <div className="text-[13px] text-[var(--color-graphite)] leading-[1.5]">
                {desc}
            </div>
        </motion.div>
    );
}

// ============ Stat Wrapper (visual frame for stat counter) ============
export function StatBox({
    children,
    hasDivider = true,
}: {
    children: ReactNode;
    hasDivider?: boolean;
}) {
    return (
        <div className="relative px-2 py-2">
            {children}
            {hasDivider && (
                <span className="absolute top-[10%] bottom-[10%] right-0 w-px bg-[var(--color-outline-gray)] hidden md:block" />
            )}
        </div>
    );
}
