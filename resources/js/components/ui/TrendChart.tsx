import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
"use client";

import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

export type TrendPoint = {
    year: string;
    value: number;
};

function buildSmoothPath(points: { x: number; y: number }[]) {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] ?? points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] ?? p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
}

export default function TrendChart({
    title = "Tren per Tahun",
    subtitle,
    data,
    color = "var(--color-absolute-zero)",
}: {
    title?: string;
    subtitle?: string;
    data: TrendPoint[];
    color?: string;
}) {
    const cms = useCms();

    const [hover, setHover] = useState<number | null>(null);

    const width = 1000;
    const height = 340;
    const padL = 44;
    const padR = 44;
    const padT = 42;
    const padB = 36;

    const { linePath, areaPath, points, yTicks, maxVal } = useMemo(() => {
        const values = data.map((d) => d.value);
        const rawMax = Math.max(1, ...values);
        // round max up to a nice step
        const step = rawMax <= 10 ? 2 : rawMax <= 50 ? 10 : rawMax <= 200 ? 20 : 50;
        const maxVal = Math.ceil((rawMax * 1.15) / step) * step;

        const innerW = width - padL - padR;
        const innerH = height - padT - padB;

        const pts = data.map((d, i) => {
            const x = padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
            const y = padT + innerH - (d.value / maxVal) * innerH;
            return { x, y, ...d };
        });

        const linePath = buildSmoothPath(pts);
        const areaPath = pts.length ? `${linePath} L ${pts[pts.length - 1].x} ${padT + innerH} L ${pts[0].x} ${padT + innerH} Z` : "";

        const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxVal * f));

        return { linePath, areaPath, points: pts, yTicks, maxVal };
    }, [data, width, height]);

    const innerH = height - padT - padB;
    const gradId = `trend-grad-${useId().replace(/:/g, "")}`;

    return (
        <div className="bg-white rounded-2xl border border-[var(--color-outline-gray)] overflow-hidden">
            <div className="flex items-start gap-3 p-6 md:p-7 pb-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-whisper-white)] flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-[var(--color-absolute-zero)]" strokeWidth={2} />
                </div>
                <div>
                    <div className="font-display text-lg font-bold text-[var(--color-absolute-zero)] tracking-[-0.02em]">
                        {title}
                    </div>
                    {subtitle && (
                        <div className="text-sm text-[var(--color-graphite)] mt-0.5">{subtitle}</div>
                    )}
                </div>
            </div>

            <div className="px-3 md:px-6 pb-6 overflow-x-auto" tabIndex={0} role="region" aria-label={`${title}, geser untuk melihat semua tahun`}>
                {data.length === 0 && <p className="py-6 text-sm text-[var(--color-graphite)]"><CmsText field="f_a9ab1fcbf2bb07" fallback="Belum ada data untuk ditampilkan." /></p>}
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto min-w-[640px]"
                    preserveAspectRatio="xMidYMid meet"
                    role="img"
                    aria-label={title}
                >
                    <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* gridlines + y labels */}
                    {yTicks.map((t, i) => {
                        const y = padT + innerH - (t / maxVal) * innerH;
                        return (
                            <g key={i}>
                                <line
                                    x1={padL}
                                    x2={width - padR}
                                    y1={y}
                                    y2={y}
                                    stroke="var(--color-outline-gray)"
                                    strokeDasharray="4 5"
                                    strokeWidth="1"
                                />
                                <text
                                    x={padL - 10}
                                    y={y + 4}
                                    textAnchor="end"
                                    fontSize="12"
                                    fill="var(--color-graphite)"
                                >
                                    {t}
                                </text>
                            </g>
                        );
                    })}
                    {/* baseline */}
                    <line
                        x1={padL}
                        x2={width - padR}
                        y1={padT + innerH}
                        y2={padT + innerH}
                        stroke="var(--color-silver-mist)"
                        strokeWidth="1.5"
                    />

                    <motion.path
                        d={areaPath}
                        fill={`url(#${gradId})`}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    />
                    <motion.path
                        d={linePath}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />

                    {points.map((p, i) => (
                        <g key={i}>
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r={hover === i ? 6 : 4}
                                fill="white"
                                stroke={color}
                                strokeWidth="2.5"
                                style={{ transition: "r 0.15s ease" }}
                            />
                            {hover === i && (
                                <g>
                                    <rect
                                        x={p.x - 26}
                                        y={p.y - 34}
                                        width="52"
                                        height="22"
                                        rx="6"
                                        fill="var(--color-absolute-zero)"
                                    />
                                    <text
                                        x={p.x}
                                        y={p.y - 19}
                                        textAnchor="middle"
                                        fontSize="12"
                                        fontWeight="700"
                                        fill="white"
                                    >
                                        {p.value}
                                    </text>
                                </g>
                            )}
                            <rect
                                x={p.x - (width / data.length) / 2}
                                y={padT}
                                width={width / data.length}
                                height={innerH}
                                fill="transparent"
                                onMouseEnter={() => setHover(i)}
                                onMouseLeave={() => setHover(null)}
                            />
                            <text
                                x={p.x}
                                y={height - 12}
                                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                                fontSize="12"
                                fill="var(--color-graphite)"
                            >
                                {p.year}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
}
