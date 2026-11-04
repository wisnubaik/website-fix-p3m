import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import { useId, useState, type ReactNode } from 'react';
import type { ContentProps } from './content-types';
import PageHero from '@/components/ui/PageHero';
import { validateProfileContent, type ProfileContent } from '@/lib/profile-tables';
import ProfileDocument, { documentKind, ProfileCellContent } from './ProfileDocument';
import styles from './profile.module.css';

type TextItem = { id: string; text: string };
type MediaItem = ContentProps['media'][number] & { content: ProfileContent | null };
type Section = { id: string; title: string; nav: string; content: ReactNode };

function readContent(raw?: string) {
    if (!raw) return null;
    try { return validateProfileContent(JSON.parse(raw)); }
    catch { return null; }
}

function Paragraphs({ items }: { items: TextItem[] }) {
    return <div className={styles.paragraphs}>{items.map(item => <p key={item.id}>{item.text}</p>)}</div>;
}
function TextList({ items }: { items: TextItem[] }) {
    return <ol className={styles.textList}>{items.map(item => <li key={item.id}>{item.text}</li>)}</ol>;
}
function Disclosure({ title, children }: { title: string; children: ReactNode }) {
    return <details className={styles.textDisclosure}><summary>{title}<span className={styles.disclosureIcon} aria-hidden="true" /></summary><div className={styles.disclosureBody}>{children}</div></details>;
}
function ProfileMedia({ items }: { items: MediaItem[] }) {
    return <div className={styles.mediaList}>{items.map(item => <article key={item.id} id={`media-${item.id}`} className={styles.media} aria-labelledby={`title-${item.id}`}>
        <h3 id={`title-${item.id}`} className={styles.mediaTitle}>{item.name}</h3>
        {item.content && <ProfileDocument content={item.content} kind={documentKind(item.id, item.href)} />}
    </article>)}</div>;
}
function DocumentChoice({ items, label }: { items: MediaItem[]; label: string }) {
    const cms = useCms();

    const [selected, setSelected] = useState(0);
    const id = useId();
    const active = Math.min(selected, Math.max(0, items.length - 1));
    const labels: Record<string, string> = { institution: cms.text('profil_institution', 'Politeknik Negeri Madiun'), organisation: cms.text('profil_organisation', 'P3M') };
    const choiceLabel = (item: MediaItem) => {
        const number = item.id.match(/^revision-profil-image-([89])$/)?.[1]
            ?? item.href.match(/\/profil\/profil-([89])\.png(?:[?#]|$)/)?.[1];
        if (number === '8') return cms.text('profil_penelitian', 'Penelitian');
        if (number === '9') return cms.text('x_836d2df4cc9db8', 'Pengabdian kepada masyarakat');
        return labels[documentKind(item.id, item.href)] ?? item.name;
    };
    return <div>
        {items.length > 1 && <div className={styles.choices} role="group" aria-label={label}>{items.map((item, i) => <button type="button" key={item.id}
            aria-pressed={active === i} aria-controls={`${id}-${i}`} onClick={() => setSelected(i)}>
            {choiceLabel(item)}
        </button>)}</div>}
        {items.map((item, i) => <div key={item.id} id={`${id}-${i}`} className={styles.choicePanel} hidden={active !== i}><ProfileMedia items={[item]} /></div>)}
    </div>;
}

export function ResearchRoadmap({ items }: { items: MediaItem[] }) {
    const tables = items.flatMap(item => item.content?.tables.map(table => ({ item, table })) ?? []);
    const compatible = tables.every(({ table }) => !table.numeric && table.headers.length === 2 && table.rows.every(row =>
        row[0] !== null && typeof row[0] === 'object' && /^(19|20)\d{2}\b/.test(row[0].text)));
    if (!compatible || !tables.length) return <ProfileMedia items={items.map(item => ({ ...item, content: item.content ? { ...item.content, tables: item.content.tables.map(table => ({ ...table, intro: '', note: '' })) } : null }))} />;
    const years = [...new Set(tables.flatMap(({ table }) => table.rows.map(row => (row[0] as { text: string }).text.slice(0, 4))))];
    return <div className={styles.roadmap}>
        {years.map((year, i) => {
            const matching = tables.flatMap(({ item, table }) => table.rows.filter(row => (row[0] as { text: string }).text.startsWith(year))
                .map(row => ({ item, table, row })));
            const primary = matching[0].row[0] as { text: string };
            const heading = primary.text.slice(4).trim();
            return <details key={year} className={styles.roadmapYear} open={i === 0}>
                <summary><span className={styles.yearLabel}>{year}</span><h3>{heading}</h3><span className={styles.disclosureIcon} aria-hidden="true" /></summary>
                <div className={styles.roadmapColumns}>{matching.map(({ item, table, row }, j) => <section key={`${item.id}-${j}`}>
                    <h4>{table.title || table.headers[1]}</h4>
                    {row[0] !== null && typeof row[0] === 'object' && (row[0].text.slice(4).trim() !== heading || row[0].items.length > 0) &&
                        <ProfileCellContent cell={{ ...row[0], text: row[0].text.slice(4).trim() === heading ? '' : row[0].text.slice(4).trim() }} />}
                    <ProfileCellContent cell={row[1]} />
                </section>)}</div>
            </details>;
        })}
    </div>;
}

export default function Page({ profileLists, media, focusClusters }: Pick<ContentProps, 'profileLists' | 'media' | 'focusClusters'>) {
    const cms = useCms();

    const [intro, visi, misi, tujuan, tupoksi, ketua, sekretaris] = ['pengantar', 'visi', 'misi', 'tujuan', 'tupoksi', 'ketua', 'sekretaris']
        .map(key => profileLists[`profil-${key}`] ?? []);
    const usable = media.map(item => ({ ...item, href: item.href?.trim() ?? '', content: readContent(item.profileTable?.content) }))
        .filter(item => item.content && item.content.tables.length > 0);
    const byKind = (...kinds: ReturnType<typeof documentKind>[]) => usable.filter(item => kinds.includes(documentKind(item.id, item.href)));
    const organisation = byKind('organisation', 'institution');
    const process = byKind('process', 'roles');
    const research = byKind('clusters');
    const roadmap = [...byKind('roadmap'), ...byKind('indicators')];
    const targets = byKind('targets');
    const additional = byKind('general');
    const roles = [{ title: cms.text("profil_tugas_ketua", `Tugas ${cms.text("x_e9b512b596d9c1", "Ketua P3M")}`), items: ketua }, { title: cms.text("profil_tugas_sekretaris", `Tugas ${cms.text("x_b92594dca13c69", "Sekretaris P3M")}`), items: sekretaris }].filter(role => role.items.length > 0);
    const sections: Section[] = [];
    if (intro.length || visi.length || misi.length || tujuan.length) sections.push({
        id: 'tentang-p3m', title: cms.text("x_db6c74673bb95a", "Tentang P3M"), nav: cms.text("x_d44c9cfc7f8ba6", "Tentang P3M"), content: <>
            {intro.length > 0 && <div className={styles.introduction}><Paragraphs items={intro} /></div>}
            {visi.length > 0 && <section className={styles.vision}><h3><CmsText field="f_f19ddc3d54f8ba" fallback="Visi" /></h3><Paragraphs items={visi} /></section>}
            {misi.length > 0 && <section className={styles.mission}><h3><CmsText field="f_d6afa77e231d32" fallback="Misi" /></h3><TextList items={misi} /></section>}
            {tujuan.length > 0 && <CmsElement as={Disclosure} fields={{"title":"f_f1d0019d565ad3"}} title="Tujuan P3M"><TextList items={tujuan} /></CmsElement>}
        </>,
    });
    if (organisation.length || tupoksi.length || roles.length) sections.push({
        id: 'struktur-organisasi', title: cms.text("x_859406aed8e33b", "Organisasi dan tata kerja"), nav: cms.text("x_6108762e7e8b4b", "Organisasi"), content: <>
            <CmsElement as={DocumentChoice} fields={{"label":"f_3f5310b423bbf2"}} items={organisation} label="Pilih struktur organisasi" />
            <div className={styles.responsibilities}>
                {tupoksi.length > 0 && <CmsElement as={Disclosure} fields={{"title":"f_0a1b8385c95336"}} title="Tugas pokok dan fungsi"><TextList items={tupoksi} /></CmsElement>}
                {roles.map(role => <Disclosure key={role.title} title={role.title}><TextList items={role.items} /></Disclosure>)}
            </div>
        </>,
    });
    if (process.length) sections.push({ id: 'pelaksanaan', title: cms.text("x_a42c8cd5b2c272", "Pelaksanaan penelitian dan pengabdian"), nav: cms.text("x_82a7c1878b4340", "Pelaksanaan"), content: <ProfileMedia items={process} /> });
    if (research.length || focusClusters.length) sections.push({
        id: 'bidang-fokus', title: cms.text("x_e71537b1193c7f", "Bidang fokus dan klaster riset"), nav: cms.text("x_fd0624d166f72a", "Klaster riset"), content: <>
            {focusClusters.length > 0 && <CmsElement as={Disclosure} fields={{"title":"f_5b0aced5b097d8"}} title="Bidang fokus riset"><dl className={styles.focusAreas}>{focusClusters.map(item => <div key={item.id}><dt>{item.title}</dt><dd>{item.desc}</dd></div>)}</dl></CmsElement>}
            <ProfileMedia items={research} />
        </>,
    });
    if (roadmap.length) sections.push({ id: 'peta-jalan', title: cms.text("x_b03b23c9987f48", "Peta jalan penelitian"), nav: cms.text("x_fc4c836725541d", "Peta jalan"), content: <ResearchRoadmap items={roadmap} /> });
    if (targets.length) sections.push({ id: 'target-luaran', title: cms.text("x_55da661dedc7b9", "Target luaran"), nav: cms.text("x_93ba0ec1c06098", "Target luaran"), content: <CmsElement as={DocumentChoice} fields={{"label":"f_7d5129a9d66e57"}} items={targets} label="Pilih jenis target luaran" /> });
    if (additional.length) sections.push({ id: 'informasi-lain', title: cms.text("x_a1f2e410fd7fcb", "Informasi lainnya"), nav: cms.text("x_2387ae04a9e977", "Informasi lainnya"), content: <ProfileMedia items={additional} /> });
    return <>
        <CmsElement as={PageHero} fields={{"title":"f_fb7295b9f53d79","lead":"f_1d92cc3e8cb81a"}} crumbs={[{ label: cms.text("x_f47e08eb3a6ec7", "Profil P3M") }]} title="Profil P3M" lead="Pusat Penelitian dan Pengabdian kepada Masyarakat Politeknik Negeri Madiun" />
        <div className={styles.page}>
            {sections.length > 0 && <nav aria-label="Daftar isi profil" className={styles.contents}><div className={styles.contentsInner}>
                <ul>{sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.nav}</a></li>)}</ul>
            </div></nav>}
            <div className={styles.container}>
                {sections.length === 0 ? <p><CmsText field="f_0edf6dc2459148" fallback="Informasi profil belum tersedia." /></p> : sections.map(section => <section key={section.id} id={section.id}
                    aria-labelledby={`${section.id}-title`} className={styles.section}>
                    <h2 id={`${section.id}-title`} className={styles.sectionHeading}>{section.title}</h2>
                    {section.content}
                </section>)}
            </div>
        </div>
    </>;
}
