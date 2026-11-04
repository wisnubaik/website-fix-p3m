"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
    /** Kelas untuk <input>. Padding kanan ditambahkan otomatis untuk tombol mata. */
    inputClassName?: string;
};

/**
 * Kolom password dengan tombol pratinjau (tampilkan/sembunyikan).
 * Bawaannya tersembunyi; tombol hanya mengubah `type` input, nilai tidak pernah
 * disimpan atau dikirim ke tempat lain. Tombol punya label dan `aria-pressed`
 * untuk pembaca layar.
 */
export default function PasswordInput({ inputClassName = "", ...props }: Props) {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative">
            <input {...props} type={visible ? "text" : "password"} className={`${inputClassName} pr-11`} />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
                aria-pressed={visible}
                title={visible ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[var(--color-graphite)] hover:text-[var(--color-absolute-zero)] focus-visible:outline-2 focus-visible:outline-[var(--color-absolute-zero)]"
            >
                {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
        </div>
    );
}
