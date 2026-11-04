import { useCms } from '@/components/ui/ManagedContent';
import { JENIS_BERKAS } from "@/lib/monev-content";
import type { DocSection } from "@/lib/doc-types";

/**
 * Daftar berkas satu bagian halaman Monev.
 *
 * Baris bergaris, bukan grid kartu. Dengan judul rata kiri di satu kolom
 * lurus, mata bisa memindai ke bawah tanpa melompat antar kotak. penting
 * karena judul berkas di sini panjang dan mirip satu sama lain
 * ("Berita Acara Monev PkM 2022" vs "… 2021").
 *
 * Jenis berkas ditulis dengan kata, bukan singkatan teknis: pembaca umum
 * tidak perlu tahu istilah XLSX atau LINK.
 */
export default function MonevBerkas({ sections }: { sections: DocSection[] }) {
    const cms = useCms();

    if (sections.length === 0) return null;

    return (
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-9">
            {sections.map((sec, si) => (
                <div key={`${si}-${sec.title}`}>
                    <h4 className="text-[13px] font-semibold text-[var(--color-graphite)] pb-2 border-b-2 border-[var(--color-absolute-zero)]">
                        {sec.title}
                    </h4>
                    <ul>
                        {sec.items.map((item, idx) => {
                            const ada = !!item.href && item.href.trim() !== "" && item.href !== "#";
                            const jenis = JENIS_BERKAS[item.kind] ?? "Berkas";
                            const isi = (
                                <>
                                    <span className="min-w-0">
                                        <span className="block text-[15px] font-medium leading-snug text-[var(--color-absolute-zero)]">
                                            {item.name}
                                        </span>
                                        <span className="block text-[13px] text-[var(--color-graphite)] mt-0.5">
                                            {jenis}
                                            {item.year && ` ${item.year}`}
                                            {!ada && cms.text("dokumen_belum", " belum tersedia")}
                                        </span>
                                    </span>
                                    <span
                                        aria-hidden
                                        className={
                                            ada
                                                ? "shrink-0 self-center text-[13px] font-medium text-[var(--color-cosmic-candy)] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
                                                : "shrink-0 self-center text-[13px] text-[var(--color-silver-mist)]"
                                        }
                                    >
                                        {ada ? cms.text("dokumen_buka", "Buka") : "-"}
                                    </span>
                                </>
                            );
                            const kelas =
                                "flex items-start justify-between gap-5 py-3.5 border-b border-[var(--color-outline-gray)]";
                            return (
                                <li key={`${sec.title}-${idx}-${item.name}`}>
                                    {ada ? (
                                        <a
                                            href={item.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`group ${kelas} -mx-3 px-3 hover:bg-[var(--color-whisper-white)] focus-visible:bg-[var(--color-whisper-white)] focus-visible:outline-2 focus-visible:outline-[var(--color-cosmic-candy)] transition-colors`}
                                        >
                                            {isi}
                                        </a>
                                    ) : (
                                        <div className={`${kelas} opacity-60`}>{isi}</div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </div>
    );
}
