import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import { useId, useMemo, useState } from 'react';
import { ArrowUpRight, FileText, Search, SearchX, X } from 'lucide-react';
import { safeUrl } from '@/lib/read-json';
import styles from './pengumuman.module.css';

export type Announcement = {
    num: string;
    title: string;
    kind: 'pdf' | 'docx';
    badge: string;
    urgent?: boolean;
    href?: string;
    tahun?: string;
};

export default function PengumumanList({ items }: { items: Announcement[] }) {
    const cms = useCms();

    const [page, setPage] = useState(1);
    const perPage = 10;
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const searchId = useId();
    const listId = useId();
    const categories = useMemo(() => [...new Set(items.map(item => item.badge).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'id')), [items]);
    const activeCategory = category && categories.includes(category) ? category : null;
    const filtered = useMemo(() => {
        const query = search.toLocaleLowerCase('id').trim();
        return items.filter(item => (!activeCategory || item.badge === activeCategory) &&
            (!query || [item.title, item.num, item.badge, item.tahun ?? '']
                .some(value => value.toLocaleLowerCase('id').includes(query))));
    }, [items, search, activeCategory]);
    const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
    const currentPage = Math.min(page, pageCount);
    const visible = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
    const hasFilter = !!search.trim() || activeCategory !== null;
    const resetFilters = () => { setSearch(''); setCategory(null); setPage(1); };

    return <div className={styles.announcements}>
        <div className={styles.heading}>
            <h2><CmsText field="f_890b682ee76ab1" fallback="Daftar pengumuman" /></h2>
            <p><CmsText field="f_407bb7016b5be8" fallback="Informasi resmi tentang penelitian, pengabdian, dan layanan P3M." /></p>
        </div>
        <div className={styles.filters}>
            <label htmlFor={searchId} className={styles.searchLabel}><CmsText field="f_7e20fdcafc27cd" fallback="Cari pengumuman" /></label>
            <div className={styles.searchField}>
                <Search size={19} aria-hidden="true" />
                <CmsElement as={"input"} fields={{"placeholder":"f_769e7ade5a9522"}} id={searchId} type="search" value={search} onChange={(event: React.ChangeEvent<HTMLInputElement>) => {setSearch(event.target.value);setPage(1);}}
                    placeholder="Judul, nomor surat, atau tahun" aria-controls={listId} />
                {search && <button type="button" onClick={() => { setSearch(''); setPage(1); document.getElementById(searchId)?.focus(); }}
                    aria-label="Hapus pencarian" className={styles.clearSearch}><X size={17} aria-hidden="true" /></button>}
            </div>
            <div className={styles.categoryFilter}>
                <span className={styles.categoryLabel}><CmsText field="f_f196bc528eff5b" fallback="Kategori" /></span>
                <div className={styles.categories} role="group" aria-label="Filter kategori pengumuman">
                    <button type="button" aria-pressed={activeCategory === null} aria-controls={listId} onClick={() => {setCategory(null);setPage(1);}}><CmsText field="f_4b3da87728546c" fallback="Semua" /></button>
                    {categories.map(label => <button type="button" key={label} aria-pressed={activeCategory === label}
                        aria-controls={listId} onClick={() => {setCategory(label);setPage(1);}}>{label}</button>)}
                </div>
            </div>
        </div>
        <div className={styles.resultsBar}>
            <p role="status" aria-live="polite" aria-atomic="true">
                {hasFilter ? <><strong>{filtered.length}</strong>{" "}<CmsText field="f_31334f5a5cde02" fallback="dari" />{" "}{items.length}{" "}<CmsText field="f_c9c94c674350e0" fallback="pengumuman" /></> : <><strong>{items.length}</strong>{" "}<CmsText field="f_a4880146c5be1d" fallback="pengumuman" /></>}
            </p>
            {hasFilter && <button type="button" onClick={resetFilters}><CmsText field="f_22a3d267b9bb41" fallback="Reset filter" /></button>}
        </div>
        <div id={listId}>
            {filtered.length === 0 ? <div className={styles.empty}>
                <SearchX size={30} strokeWidth={1.5} aria-hidden="true" />
                <h3>{hasFilter ? cms.text("x_86907a5a732d95", "Pengumuman tidak ditemukan") : cms.text("x_df39f2f2c9c292", "Belum ada pengumuman")}</h3>
                <p>{hasFilter ? cms.text("x_7ee682dd99b02b", "Coba kata kunci lain atau pilih kategori Semua.") : cms.text("x_710fc78ec4b534", "Pengumuman akan ditampilkan setelah diterbitkan.")}</p>
                {hasFilter && <button type="button" onClick={resetFilters}><CmsText field="f_006e95f3444310" fallback="Tampilkan semua pengumuman" /></button>}
            </div> : <ul className={styles.list} aria-label="Hasil pengumuman">
                {visible.map((item, index) => {
                    const href = item.href?.trim();
                    const canOpen = !!href && safeUrl(href);
                    const content = <>
                        <span className={styles.fileIcon} aria-hidden="true"><FileText size={23} strokeWidth={1.5} /></span>
                        <div className={styles.itemContent}>
                            <div className={styles.metadata}>
                                {item.badge && <span className={styles.category}>{item.badge}</span>}
                                {Boolean(item.urgent) && <span className={styles.important}><CmsText field="f_f60754cf6430ec" fallback="Penting" /></span>}
                                {item.tahun && <span>{item.tahun}</span>}
                            </div>
                            <h3>{item.title}</h3>
                            <p className={styles.documentMeta}>{item.num && <span><CmsText field="f_f34ee109913b2d" fallback="Nomor surat:" />{" "}{item.num}</span>}<span>{item.kind.toUpperCase()}</span></p>
                        </div>
                        <span className={canOpen ? styles.openDocument : styles.unavailable}>
                            {canOpen ? <><CmsText field="f_82d80d903e536d" fallback="Lihat dokumen " /><ArrowUpRight size={17} aria-hidden="true" /><span className="sr-only">(membuka tab baru)</span></> : cms.text("x_692db305bde2a1", "Dokumen belum tersedia")}
                        </span>
                    </>;
                    return <li key={`${item.num}-${index}`}>
                        {canOpen ? <a className={styles.item} href={href} target="_blank" rel="noopener noreferrer">{content}</a>
                            : <article className={styles.item}>{content}</article>}
                    </li>;
                })}
            </ul>}
        </div>
        {pageCount > 1 && <nav className={styles.pagination} aria-label="Navigasi halaman pengumuman">
            <button type="button" disabled={currentPage===1} aria-controls={listId} onClick={()=>setPage(currentPage-1)}><CmsText field="announcement_previous" fallback="Sebelumnya" /></button>
            <span><CmsText field="announcement_page" fallback="Halaman" />{" "}<strong>{currentPage}</strong>{" "}<CmsText field="announcement_page_of" fallback="dari" />{" "}{pageCount}</span>
            <button type="button" disabled={currentPage===pageCount} aria-controls={listId} onClick={()=>setPage(currentPage+1)}><CmsText field="announcement_next" fallback="Berikutnya" /></button>
        </nav>}
    </div>;
}
