import SiteLayout from "@/Layouts/SiteLayout";
import type { ContentProps } from "./content-types";
import Page0 from "./hubungi";
import Page1 from "./profil";
import Page2 from "./repository";
import Page3 from "./riset-grup";
import Page4 from "./kegiatan";
import Page5 from "./laporan-keuangan";
import Page6 from "./luaran";
import Page7 from "./mitra";
import Page8 from "./pengumuman";
import Page9 from "./sinta";
import Page10 from "./tkt";
import Page11 from "./asesmen";
import Page12 from "./ki";
import Page13 from "./monev";
import Page14 from "./panduan";
import Page15 from "./semhas";

const pages = {
  "hubungi": Page0,
  "profil": Page1,
  "repository": Page2,
  "riset-grup": Page3,
  "kegiatan": Page4,
  "laporan-keuangan": Page5,
  "luaran": Page6,
  "mitra": Page7,
  "pengumuman": Page8,
  "sinta": Page9,
  "tkt": Page10,
  "asesmen": Page11,
  "ki": Page12,
  "monev": Page13,
  "panduan": Page14,
  "semhas": Page15,
};
export default function ContentPage(props: ContentProps) {
 const Page = pages[props.page as keyof typeof pages];
 return <SiteLayout><Page {...props} /></SiteLayout>;
}
