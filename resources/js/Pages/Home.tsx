import { CmsActionText, CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import { Link } from "@inertiajs/react";
import SiteLayout from "@/Layouts/SiteLayout";
import Hero, { type HeroProps } from "@/components/ui/Hero";
import StudyProgramLinks from "@/components/ui/StudyProgramLinks";
import WinnerPagination from "@/components/ui/WinnerPagination";
import Section from "@/components/ui/Section";
import SectionHead from "@/components/ui/SectionHead";
import Reveal from "@/components/animation/Reveal";
import { StaggerContainer, StaggerItem } from "@/components/animation/RevealStagger";
import QuickAccessCard from "@/components/ui/QuickAccessCard";
import { getQuickAccessIcon } from "@/components/ui/quick-access-icons";
import Marquee from "@/components/ui/Marquee";
import { AgendaItem } from "@/components/ui/HomeCards";
import { MotionLink } from "@/components/ui/MotionLink";
import type { WinnerRow } from "@/lib/get-stats";

type RecapRow = { label: string; value: number };
type HomeProps = {
    hero: HeroProps | null;
    quickAccess: Array<{ href: string; title: string; meta: string; accent?: string; iconName: string }>;
    marqueeItems: string[];
    winnersGrouped: Record<string, WinnerRow[]>;
    tautanPengusulan: Array<{ label: string; href: string }>;
    rekapBatch1Penelitian: RecapRow[];
    rekapBatch1Pkm: RecapRow[];
    rekapBatch2Penelitian: RecapRow[];
    rekapBatch2Pkm: RecapRow[];
    diterimaBatch2: RecapRow[];
    pendanaan: RecapRow[];
    agenda: Array<{ id: string; text: string; label: string | null }>;
    prodi: Array<{ id: string; name: string; href: string | null; groupTitle?: string | null }>;
};

export default function Home({ hero, quickAccess = [], marqueeItems = [], winnersGrouped = {}, tautanPengusulan = [], rekapBatch1Penelitian = [], rekapBatch1Pkm = [], rekapBatch2Penelitian = [], rekapBatch2Pkm = [], diterimaBatch2 = [], pendanaan = [], agenda = [], prodi = [] }: HomeProps) {
    const cms = useCms();

    const sum = (rows: RecapRow[]) => rows.reduce((a, r) => a + r.value, 0);

    return (
        <SiteLayout>
            
    <>
      <Hero {...hero} />

      {tautanPengusulan.length > 0 && (
        <div className="max-w-[1280px] mx-auto px-5 md:px-14 mt-6">
          <Reveal>
            <section aria-label={cms.text('f_fd095e662366d1', 'PPM Internal 2026') || 'Tautan pengusulan proposal'}
              className="bg-white border border-[var(--color-outline-gray)] px-6 py-5 md:px-8">
              {cms.text('f_fd095e662366d1', 'PPM Internal 2026').trim() && <h2 className="text-lg font-semibold text-[var(--color-absolute-zero)] whitespace-pre-line break-words">
                <CmsText field="f_fd095e662366d1" fallback="PPM Internal 2026" />
              </h2>}
              {cms.text('f_c1d8d581292cf4', '').trim() && <p className="text-sm text-[var(--color-graphite)] mt-2 whitespace-pre-line break-words">
                <CmsText field="f_c1d8d581292cf4" fallback="" />
              </p>}
              <ul className="mt-2 space-y-2">
                {tautanPengusulan.map((tautan, index) => <li key={`${index}:${tautan.href}`}>
                  <a href={tautan.href} target="_blank" rel="noopener noreferrer"
                    className="text-[var(--color-absolute-zero)] underline underline-offset-4 hover:text-[var(--color-cosmic-candy)] break-words">
                    {tautan.label}<span className="sr-only"> (membuka tab baru)</span>
                  </a>
                </li>)}
              </ul>
            </section>
          </Reveal>
        </div>
      )}

      {/* === QUICK ACCESS === */}
      <Section>
        <CmsElement as={SectionHead} fields={{"eyebrow":"f_2c09d22fe6aa6d","title":"f_3127001b2a0d3a","lead":"f_b112e955aaa289"}}
          eyebrow="Akses cepat"
          title={
            <>
              Paling sering{" "}
              <em className="font-serif italic font-normal text-[var(--color-gold-500)]">
                dicari
              </em>
              .
            </>
          }
          lead="Renstra, panduan, dan format pelaporan keuangan terbaru. satu klik dari halaman utama."
          link={{ label: cms.text("x_043c12bd356c6d", "Dokumen lengkap"), href: cms.text("x_948a7c9c9ccf93", "/repository") }}
        />

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickAccess.map((q, i) => (
            <StaggerItem key={q.href + q.title}>
              <QuickAccessCard
                href={q.href}
                icon={getQuickAccessIcon(q.iconName)}
                title={q.title}
                meta={q.meta}
                accent={(["navy", "gold", "leaf", "violet"] as const)[i % 4]}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>

      {/* === HIGHLIGHTS === */}
      <Section variant="soft">
        <CmsElement as={SectionHead} fields={{"eyebrow":"f_e3f405b4a6ad02","title":"f_f4cc3a0a0259d8"}}
          eyebrow="Highlight 2026"
          title={
            <>
              Penerima hibah{" "}
              <em className="font-serif italic font-normal text-[var(--color-gold-500)]">
                BIMA
              </em>{" "}
              dan Hilirisasi 2026
            </>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8">
          <Reveal>
            <div className="bg-white border border-[var(--color-outline-gray)] rounded-none p-6">
              <div className="flex justify-between items-center mb-5 pb-5 border-b border-[var(--color-outline-gray)]">
                <h3 className="font-display text-lg font-semibold text-[var(--color-absolute-zero)] tracking-[-0.025em]"><CmsText field="f_36618f401abe10" fallback="Pemenang BIMA dan Hilirisasi 2026" /></h3>
                <CmsElement as={Link} fields={{"href":"f_0259048c06e36b"}}
                  href="/penelitian/eksternal"
                  className="text-sm font-semibold text-[var(--color-absolute-zero)] hover:text-[var(--color-cosmic-candy)]"
                ><CmsActionText field="f_3db4e84330adc6" fallback="Lihat semua" /></CmsElement>
              </div>

              <WinnerPagination groups={Object.entries(winnersGrouped).map(([category, items]) => ({ category, items }))} />
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="bg-white border border-[var(--color-outline-gray)] rounded-none p-6">
              <div className="flex justify-between items-center mb-5 pb-5 border-b border-[var(--color-outline-gray)]">
                <h3 className="font-display text-lg font-semibold text-[var(--color-absolute-zero)] tracking-[-0.025em]"><CmsText field="f_78fab5513378fc" fallback="Agenda berjalan" /></h3>
                <CmsElement as={Link} fields={{"href":"f_917300b88bc4f2"}}
                  href="/informasi/kegiatan"
                  className="text-sm font-semibold text-[var(--color-absolute-zero)] hover:text-[var(--color-cosmic-candy)]"
                ><CmsActionText field="f_b3973ad0cd14bb" fallback="Kegiatan" /></CmsElement>
              </div>
              <div className="flex flex-col gap-3">
                {agenda.map(item => <AgendaItem key={item.id} status={item.label ?? "Agenda berjalan"} title={item.text} />)}
                {agenda.length === 0 && <p className="text-sm text-[var(--color-graphite)]"><CmsText field="f_761ded489ec657" fallback="Belum ada agenda yang dipublikasikan." /></p>}
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* === REKAP PROPOSAL MASUK === */}
      <Section variant="soft">
        <CmsElement as={SectionHead} fields={{"eyebrow":"f_ebad086e695bab","title":"f_4480a0d4c61eba","lead":"f_9e5d6525626703"}}
          eyebrow="Proposal masuk 2026"
          title={
            <>
              Berapa{" "}
              <em className="font-serif italic font-normal text-[var(--color-gold-500)]">
                proposal masuk
              </em>{" "}
              sejauh ini?
            </>
          }
          lead="Jumlah judul proposal Batch I yang tercatat, dipecah per kategori pengusul."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[var(--color-outline-gray)] rounded-none p-6 md:p-8">
            <div className="flex items-baseline justify-between mb-5 pb-4 border-b border-[var(--color-outline-gray)]">
              <span className="font-display text-lg font-bold text-[var(--color-absolute-zero)]"><CmsText field="f_fa01c75360cf17" fallback="Penelitian Internal" /></span>
              <span className="font-display text-3xl font-bold text-[var(--color-absolute-zero)]">{sum(rekapBatch1Penelitian)}</span>
            </div>
            <div className="flex flex-col gap-2.5 text-sm">
              {rekapBatch1Penelitian.map(({ label, value }) => (
                <div key={label} className="flex justify-between text-[var(--color-graphite)]">
                  <span>{label}</span>
                  <span className="tabular-nums text-[var(--color-absolute-zero)] font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[var(--color-outline-gray)] rounded-none p-6 md:p-8">
            <div className="flex items-baseline justify-between mb-5 pb-4 border-b border-[var(--color-outline-gray)]">
              <span className="font-display text-lg font-bold text-[var(--color-absolute-zero)]"><CmsText field="f_8886cb2760a93c" fallback="PkM Internal" /></span>
              <span className="font-display text-3xl font-bold text-[var(--color-absolute-zero)]">{sum(rekapBatch1Pkm)}</span>
            </div>
            <div className="flex flex-col gap-2.5 text-sm">
              {rekapBatch1Pkm.map(({ label, value }) => (
                <div key={label} className="flex justify-between text-[var(--color-graphite)]">
                  <span>{label}</span>
                  <span className="tabular-nums text-[var(--color-absolute-zero)] font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pendanaan eksternal. Angkanya dibuat sejajar dengan kartu di atas
            supaya terbaca sebagai bagian dari rekap yang sama, bukan catatan
            kaki yang terselip. */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {pendanaan.map((d) => (
            <div
              key={d.label}
              className="bg-white border border-[var(--color-outline-gray)] px-5 py-4 flex items-baseline justify-between gap-4"
            >
              <span className="text-[14px] text-[var(--color-graphite)] leading-snug">{d.label}</span>
              <span className="font-display text-[26px] font-bold tabular-nums text-[var(--color-absolute-zero)] leading-none">
                {d.value}
              </span>
            </div>
          ))}
        </div>

        {/* Batch II. nyambung langsung dari Batch I di atas, jadi
            dikelompokkan dalam section yang sama, bukan section terpisah. */}
        <div className="mt-10 pt-8 border-t border-[var(--color-outline-gray)]">
          <div className="flex items-baseline justify-between mb-5">
            <h3 className="font-display text-lg font-bold text-[var(--color-absolute-zero)]"><CmsText field="f_64e71b2bad5a19" fallback="Proposal PPM Batch II" /></h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-[var(--color-outline-gray)] rounded-none p-6">
              <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-[var(--color-outline-gray)]">
                <span className="font-semibold text-[var(--color-absolute-zero)]"><CmsText field="f_0e7518763e4c14" fallback="Penelitian" /></span>
                <span className="font-display text-2xl font-bold text-[var(--color-absolute-zero)]">{sum(rekapBatch2Penelitian)}</span>
              </div>
              <div className="flex flex-col gap-2 text-sm text-[var(--color-graphite)]">
                {rekapBatch2Penelitian.map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span>{label}</span>
                    <span className="tabular-nums text-[var(--color-absolute-zero)] font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[var(--color-outline-gray)] rounded-none p-6">
              <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-[var(--color-outline-gray)]">
                <span className="font-semibold text-[var(--color-absolute-zero)]"><CmsText field="f_2736435cfda969" fallback="PkM" /></span>
                <span className="font-display text-2xl font-bold text-[var(--color-absolute-zero)]">{sum(rekapBatch2Pkm)}</span>
              </div>
              <div className="flex flex-col gap-2 text-sm text-[var(--color-graphite)]">
                {rekapBatch2Pkm.map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span>{label}</span>
                    <span className="tabular-nums text-[var(--color-absolute-zero)] font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--color-blackhole)] text-white rounded-none p-6">
              <div className="tabular-nums text-[10px] font-bold  tracking-wider text-white/60 mb-3"><CmsText field="f_231595c3b726ea" fallback="Diterima Batch II" /></div>
              <div className="flex flex-col gap-2 text-sm">
                {diterimaBatch2.map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span>{label}</span>
                    <span className="tabular-nums font-bold">{value}{" "}<CmsText field="f_0a7ce2c329f8e8" fallback="judul" /></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>


      {/* === MARQUEE === */}
      <Marquee items={marqueeItems} />


      {/* === PROGRAM STUDI === */}
      <Section>
        <CmsElement as={SectionHead} fields={{"eyebrow":"f_931bab29678bdc","title":"f_b612019159fa21"}}
          eyebrow="Kolaborasi program studi"
          title={
            <>
              {prodi.filter(item => item.href).length}{" "}
              <em className="font-serif italic font-normal text-[var(--color-gold-500)]">
                program studi
              </em>
              , satu riset.
            </>
          }
        />

        <StudyProgramLinks items={prodi} />

      </Section>

      {/* === CTA STRIP === */}
      <Section variant="navy">
        <Reveal>
          <div className="text-center max-w-[820px] mx-auto">
            <div className="inline-flex items-center gap-2 tabular-nums text-[11px] font-bold  tracking-[0.04em] text-[var(--color-cosmic-candy)] mb-3"><CmsText field="f_cde61fffaeca53" fallback="Mulai langkah pertama" /></div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-[72px] font-bold tracking-[-0.025em] leading-[1.05] mb-5 text-white"><CmsText field="f_27e52688fff44b" fallback="Punya" />{" "}
              <em className="font-serif italic font-normal data-bloom-text"><CmsText field="f_da62fb55b61fc3" fallback="ide riset" /></em>{" "}<CmsText field="f_7f8a22bd6f3429" fallback="berikutnya?" /></h2>
            <p className="text-base md:text-[17px] text-white/80 leading-[1.5] mb-8 tracking-[-0.4px]"><CmsText field="f_972ba972407397" fallback="Pelajari panduan terbaru, lengkapi dokumen administratif, dan submit usulan Anda melalui kanal yang tersedia." /></p>
            <div className="inline-flex flex-wrap gap-3 justify-center">
              <CmsElement as={MotionLink} fields={{"href":"f_707d17eb2013fe"}}
                href="/layanan/panduan"
                whileHover={{ y: -3, boxShadow: "0 10px 24px rgba(0,0,0,0.2)" }}
                whileTap={{ y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="inline-flex items-center gap-2 bg-white text-[var(--color-absolute-zero)] font-semibold text-[16px] px-4 py-3 rounded-none"
              ><CmsText field="f_e0e372368f9697" fallback="Lihat panduan" /><span>→</span>
              </CmsElement>
              <CmsElement as={MotionLink} fields={{"href":"f_c0104c2e4d838b"}}
                href="/hubungi"
                whileHover={{ y: -3, borderColor: "rgba(255,255,255,1)", backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="inline-flex items-center gap-2 bg-transparent text-white border border-white/30 font-semibold text-[16px] px-4 py-3 rounded-none"
              ><CmsText field="f_d900f259e661fc" fallback="Hubungi tim P3M" /></CmsElement>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
        </SiteLayout>
    );
}
