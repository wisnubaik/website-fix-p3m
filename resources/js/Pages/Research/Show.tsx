import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import SiteLayout from "@/Layouts/SiteLayout";
import RisetPage from "@/components/ui/RisetPage";
import { summarizeByYear, trendFromSummary } from "@/lib/riset-entries";
function Page0({entries}: {entries: RisetEntryView[]}) {
    const cms = useCms();

const summary = summarizeByYear(entries);
return (
        <CmsElement as={RisetPage} fields={{"title":"f_3b80698b6f09e2","lead":"f_53f99a0f0799b3","trendTitle":"f_ad72c3098e8f4a","trendSubtitle":"f_61fe58be31a567","unitLabel":"f_9dc7ea6a25672e","tableTitle":"f_3e8b593582931e","tableNote":"f_5177266d24aa94"}}
            crumbs={[{ label: cms.text("x_976519dccb5040", "Penelitian"), href: cms.text("x_d5f2513aee2568", "/penelitian") }, { label: cms.text("x_3fd689cfc2996d", "Internal") }]}
            title={
                <>
                    Skema penelitian{" "}
                    <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                        kompetitif
                    </em>{" "}
                    dari DIPA internal.
                </>
            }
            lead="Skema penelitian yang didanai dari DIPA Politeknik Negeri Madiun untuk dosen seluruh program studi."
            entries={entries}
            summary={summary}
            trendData={trendFromSummary(summary)}
            trendTitle="Tren Penelitian Internal"
            trendSubtitle="Jumlah judul penelitian kompetitif internal per tahun"
            unitLabel="judul penelitian"
            tableTitle="Daftar Penelitian Internal"
            tableNote="Judul, tim peneliti, dan nominal pendanaan penelitian kompetitif internal. Gunakan filter tahun untuk melihat jumlah dan nominal pada tahun tertentu."
        />
    );
}
function Page1({entries}: {entries: RisetEntryView[]}) {
    const cms = useCms();

const summary = summarizeByYear(entries);
return (
        <CmsElement as={RisetPage} fields={{"title":"f_08fd5db8aac0b4","lead":"f_d11bb98f615c40","trendTitle":"f_4d432cd4f20fe2","trendSubtitle":"f_b1b3040afc6202","unitLabel":"f_d363a8f0f76910","tableTitle":"f_52ffcf36dc9b52","tableNote":"f_e4494adffdcb3e"}}
            crumbs={[{ label: cms.text("x_58ab3fd0b1a47f", "Penelitian"), href: cms.text("x_a9bf1868550225", "/penelitian") }, { label: cms.text("x_c23c28dc448455", "Eksternal") }]}
            title={
                <>
                    Didanai{" "}
                    <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                        eksternal
                    </em>{" "}
                    dari BIMA dan mitra industri.
                </>
            }
            lead="Pendanaan penelitian dari BIMA Kemdiktisaintek dan mitra eksternal lainnya."
            entries={entries}
            summary={summary}
            trendData={trendFromSummary(summary)}
            trendTitle="Tren Penelitian Eksternal"
            trendSubtitle="Jumlah judul penelitian berpendanaan eksternal per tahun"
            unitLabel="judul penelitian"
            tableTitle="Daftar Penelitian Eksternal"
            tableNote="Judul, tim peneliti, dan nominal pendanaan penelitian dari sumber eksternal. Gunakan filter tahun untuk melihat jumlah dan nominal pada tahun tertentu."
        />
    );
}
function Page2({entries}: {entries: RisetEntryView[]}) {
    const cms = useCms();

const summary = summarizeByYear(entries);
return (
        <CmsElement as={RisetPage} fields={{"title":"f_82eb4b703aaa5b","lead":"f_8697f762bad9c1","trendTitle":"f_0b59093aacbde9","trendSubtitle":"f_4cdc79c54b50ec","unitLabel":"f_ab63f017e7d868","tableTitle":"f_8f70c0b1210f3d","tableNote":"f_eccd51b9e1d6a9"}}
            crumbs={[{ label: cms.text("x_e1e00908d2cf1f", "Penelitian"), href: cms.text("x_94c2214a983b17", "/penelitian") }, { label: cms.text("x_329af0035aba65", "Unggulan") }]}
            title={
                <>
                    Skema{" "}
                    <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                        unggulan
                    </em>{" "}
                    penelitian program studi.
                </>
            }
            lead="Skema unggulan dengan target output strategis dan kontribusi ke program studi."
            entries={entries}
            summary={summary}
            trendData={trendFromSummary(summary)}
            trendTitle="Tren Penelitian Unggulan"
            trendSubtitle="Jumlah judul penelitian unggulan per tahun"
            unitLabel="judul penelitian"
            tableTitle="Daftar Penelitian Unggulan"
            tableNote="Judul, tim peneliti, dan nominal pendanaan skema penelitian unggulan. Gunakan filter tahun untuk melihat jumlah dan nominal pada tahun tertentu."
        />
    );
}
function Page3({entries}: {entries: RisetEntryView[]}) {
    const cms = useCms();

const summary = summarizeByYear(entries);
return (
        <CmsElement as={RisetPage} fields={{"title":"f_442597bcd15b89","lead":"f_f802e9f7348a7d","trendTitle":"f_b9a18967565c20","trendSubtitle":"f_c3c3e12a93f7f4","unitLabel":"f_56df643d4cedb1","tableTitle":"f_270ffb3cd15353","tableNote":"f_f9b2ab2f7211e9"}}
            crumbs={[{ label: cms.text("x_785c37d9ab27d4", "PkM"), href: cms.text("x_406d750df9db39", "/pkm") }, { label: cms.text("x_9466bcd2c0b889", "Internal") }]}
            title={
                <>
                    PkM dari{" "}
                    <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                        DIPA
                    </em>{" "}
                    internal Politeknik.
                </>
            }
            lead="Skema pengabdian masyarakat yang didanai dari DIPA Politeknik Negeri Madiun."
            entries={entries}
            summary={summary}
            trendData={trendFromSummary(summary)}
            trendTitle="Tren PkM Internal"
            trendSubtitle="Jumlah judul pengabdian kompetitif internal per tahun"
            unitLabel="judul pengabdian"
            tableTitle="Daftar PkM Internal"
            tableNote="Judul, tim pelaksana, dan nominal pendanaan pengabdian kompetitif internal. Gunakan filter tahun untuk melihat jumlah dan nominal pada tahun tertentu."
        />
    );
}
function Page4({entries}: {entries: RisetEntryView[]}) {
    const cms = useCms();

const summary = summarizeByYear(entries);
return (
        <CmsElement as={RisetPage} fields={{"title":"f_cc339e61c5599d","lead":"f_73decbed574cfb","trendTitle":"f_f5f879b46bdac8","trendSubtitle":"f_ff5257f3914831","unitLabel":"f_bf492280e0a541","tableTitle":"f_77fccbf4e088b8","tableNote":"f_d266bd849a974b"}}
            crumbs={[{ label: cms.text("x_21967bae617a40", "PkM"), href: cms.text("x_b436f5a8235eb6", "/pkm") }, { label: cms.text("x_42015a392a6f2d", "Eksternal") }]}
            title={
                <>
                    Pendanaan PkM di luar{" "}
                    <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                        kampus
                    </em>
                    .
                </>
            }
            lead="Pendanaan pengabdian masyarakat dari BIMA dan mitra eksternal lainnya."
            entries={entries}
            summary={summary}
            trendData={trendFromSummary(summary)}
            trendTitle="Tren PkM Eksternal"
            trendSubtitle="Jumlah judul pengabdian berpendanaan eksternal per tahun"
            unitLabel="judul pengabdian"
            tableTitle="Daftar PkM Eksternal"
            tableNote="Judul, tim pelaksana, dan nominal pendanaan pengabdian dari sumber eksternal. Gunakan filter tahun untuk melihat jumlah dan nominal pada tahun tertentu."
        />
    );
}
function Page5({entries}: {entries: RisetEntryView[]}) {
    const cms = useCms();

const summary = summarizeByYear(entries);
return (
        <CmsElement as={RisetPage} fields={{"title":"f_b14c6c310af5e8","lead":"f_ccf8a61ad0f909","trendTitle":"f_7e0067f327fa11","trendSubtitle":"f_9b4498566f9f9c","unitLabel":"f_aa96d3fb0f2ca9","tableTitle":"f_a3a3c73a38fa75","tableNote":"f_031c06d2083964"}}
            crumbs={[{ label: cms.text("x_8b280d309fd051", "PkM"), href: cms.text("x_7b3291f7d8c7fb", "/pkm") }, { label: cms.text("x_3f3563a312da57", "Unggulan") }]}
            title={
                <>
                    <em className="font-serif italic font-normal text-[var(--color-gold-400)]">
                        Unggulan
                    </em>{" "}
                    untuk PkM berdampak strategis.
                </>
            }
            lead="Skema unggulan untuk pengabdian dengan dampak strategis dan berkelanjutan."
            entries={entries}
            summary={summary}
            trendData={trendFromSummary(summary)}
            trendTitle="Tren PkM Unggulan"
            trendSubtitle="Jumlah judul pengabdian unggulan per tahun"
            unitLabel="judul pengabdian"
            tableTitle="Daftar PkM Unggulan"
            tableNote="Judul, tim pelaksana, dan nominal pendanaan skema pengabdian unggulan. Gunakan filter tahun untuk melihat jumlah dan nominal pada tahun tertentu."
        />
    );
}
import type { RisetEntryView } from "@/lib/riset-entries";
const pages = {"penelitian-internal": Page0,"penelitian-eksternal": Page1,"penelitian-unggulan": Page2,"pkm-internal": Page3,"pkm-eksternal": Page4,"pkm-unggulan": Page5};
export default function Show({category,entries,label}: {category: keyof typeof pages; entries: RisetEntryView[]; label?: string}) { const Page=pages[category]; return <SiteLayout><Page entries={entries} /></SiteLayout>; }
