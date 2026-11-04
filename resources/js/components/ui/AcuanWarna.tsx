import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import { ACUAN_PROPOSAL as ACUAN_PROPOSALDefault, ACUAN_LAPORAN as ACUAN_LAPORANDefault, ACUAN_CATATAN, type AcuanWarna } from "@/lib/panduan-content";

function Kartu({ a }: { a: AcuanWarna }) {
    return (
        <li className="border border-[var(--color-outline-gray)] bg-white flex">
            {/* Contoh warna. Dibuat blok penuh di sisi kiri, bukan titik kecil,
                supaya warnanya benar-benar terbaca saat dibandingkan. */}
            <span
                aria-hidden
                className="w-14 shrink-0 border-r border-[var(--color-outline-gray)]"
                style={{ backgroundColor: a.hex }}
            />
            <span className="px-4 py-3 min-w-0">
                <span className="block font-display font-bold text-[15px] text-[var(--color-absolute-zero)] leading-snug">
                    {a.skema}
                </span>
                <span className="block text-[14px] text-[var(--color-graphite)] mt-0.5">
                    {a.warna}
                </span>
                <span className="block text-[12px] text-[var(--color-graphite)] mt-1.5"><CmsText field="f_e18c25c2fa5d64" fallback="Kode" /><b className="text-[var(--color-absolute-zero)]">{a.kode}</b><CmsText field="f_b9063e56759e73" fallback="   font" />{" "}
                    {a.font}
                </span>
            </span>
        </li>
    );
}

/**
 * Acuan warna sampul. Dipisah dua kolom karena aturannya memang berbeda
 * antara proposal (tanpa laminasi) dan laporan (dengan laminasi), dan
 * salah pilih berarti menjilid ulang.
 */
export default function AcuanWarnaSampul() {
    const cms = useCms();
    const ACUAN_PROPOSAL = cms.data("collection_acuan_proposal", ACUAN_PROPOSALDefault);
    const ACUAN_LAPORAN = cms.data("collection_acuan_laporan", ACUAN_LAPORANDefault);

    return (
        <div>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                <div>
                    <h3 className="text-[13px] font-semibold tracking-wider  text-[var(--color-graphite)] pb-2 mb-4 border-b-2 border-[var(--color-absolute-zero)]"><CmsText field="f_d0ff5c0e3134a5" fallback="Proposal tanpa laminasi" /></h3>
                    <ul className="flex flex-col gap-2.5">
                        {ACUAN_PROPOSAL.map((a) => (
                            <Kartu key={a.skema} a={a} />
                        ))}
                    </ul>
                </div>
                <div>
                    <h3 className="text-[13px] font-semibold tracking-wider  text-[var(--color-graphite)] pb-2 mb-4 border-b-2 border-[var(--color-absolute-zero)]"><CmsText field="f_5652234e4664ed" fallback="Laporan dengan laminasi" /></h3>
                    <ul className="flex flex-col gap-2.5">
                        {ACUAN_LAPORAN.map((a) => (
                            <Kartu key={a.skema} a={a} />
                        ))}
                    </ul>
                </div>
            </div>
            <p className="text-[13px] text-[var(--color-graphite)] mt-6">{cms.text("static_acuan_catatan", ACUAN_CATATAN)}</p>
        </div>
    );
}
