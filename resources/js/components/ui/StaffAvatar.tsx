"use client";

import { useState } from "react";

export default function StaffAvatar({
    photoUrl,
    name,
    initial,
}: {
    photoUrl?: string;
    name: string;
    initial: string;
}) {
    const [failed, setFailed] = useState(false);

    if (photoUrl && !failed) {
        return (
            <div className="w-28 h-28 md:w-36 md:h-36 shrink-0 overflow-hidden rounded-full shadow-[0_10px_30px_-10px_rgba(11,23,58,0.45)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- foto upload admin, bukan aset statis */}
                <img
                    src={photoUrl}
                    alt={name}
                    onError={() => setFailed(true)}
                    className="w-full h-full object-cover object-top"
                />
            </div>
        );
    }

    return (
        <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-[var(--color-absolute-zero)] to-[var(--color-absolute-zero)]/75 grid place-items-center text-white font-display font-bold text-3xl md:text-4xl tracking-[-0.025em] shrink-0 shadow-[0_10px_30px_-10px_rgba(11,23,58,0.45)]">
            {initial}
        </div>
    );
}