import { Link } from '@inertiajs/react';
import { EDITOR_LABELS } from '@/components/admin/managed-site';
import AdminLayout from "@/Layouts/AdminLayout";
import Page0 from "./Editors/acara-periode/page";
import Page1 from "./Editors/arsip/page";
import Page2 from "./Editors/asesmen/page";
import Page3 from "./Editors/beranda/page";
import Page4 from "./Editors/dokumen-informasi/page";
import Page5 from "./Editors/dokumen-layanan/page";
import Page6 from "./Editors/dokumen-repository/page";
import Page7 from "./Editors/hero/page";
import Page8 from "./Editors/hub-cards/page";
import Page9 from "./Editors/kegiatan/page";
import Page10 from "./Editors/ki-karya/page";
import Page11 from "./Editors/monev-slot/page";
import Page12 from "./Editors/pbl/page";
import Page13 from "./Editors/pemenang/page";
import Page14 from "./Editors/pengaturan/page";
import Page15 from "./Editors/pengumuman/page";
import Page16 from "./Editors/profil/page";
import Page17 from "./Editors/quick-access/page";
import Page18 from "./Editors/riset-entries/page";
import Page19 from "./Editors/riset-grup/page";
import Page20 from "./Editors/tautan-pengusulan/page";
import Page21 from "./Editors/tim/page";
import Account from "./Editors/akun/page";
import Accounts from "./Editors/kelola-akun/page";
export const editorPages = {
"akun":Account,"kelola-akun":Accounts,
"acara-periode":Page0,
"arsip":Page1,
"asesmen":Page2,
"beranda":Page3,
"dokumen-informasi":Page4,
"dokumen-layanan":Page5,
"dokumen-repository":Page6,
"hero":Page7,
"hub-cards":Page8,
"kegiatan":Page9,
"ki-karya":Page10,
"monev-slot":Page11,
"pbl":Page12,
"pemenang":Page13,
"pengaturan":Page14,
"pengumuman":Page15,
"profil":Page16,
"quick-access":Page17,
"riset-entries":Page18,
"riset-grup":Page19,
"tautan-pengusulan":Page20,
"tim":Page21
};
export default function Content({page}: {page: keyof typeof editorPages}) { const Page = editorPages[page];return <AdminLayout>{['arsip','akun','kelola-akun'].includes(page) ? <Page/> : <><div className="cms-overline"><Link href="/admin/halaman">Halaman</Link> / {EDITOR_LABELS[page] ?? page}</div><div className="cms-panel cms-editor-data"><Page/></div></>}</AdminLayout>; }
