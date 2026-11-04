import { CmsInput, CmsTextarea } from '@/components/admin/CmsInput';
import { useState } from 'react';
import type { PageDocument } from '@/components/ui/ManagedContent';
import { AssetInput, StructuredInput } from './ContentInputs';
import { EDITOR_LABELS, type ContentCollection, type ContentField } from './managed-site';

export type EditorSection = { label: string; fields: string[]; collections: string[]; editors: string[] };
const ITEM_LABELS: Record<string, string> = {
    collection_sinta_tautan: 'Tautan', collection_sinta_tutorial: 'Video', collection_sinta_cara_cek: 'Langkah',
    collection_sinta_ambang: 'Skema', collection_sinta_gambar: 'Gambar', collection_tkt_tingkat: 'Tingkat',
    collection_tkt_tahap: 'Tahap', collection_acuan_proposal: 'Sampul proposal', collection_acuan_laporan: 'Sampul laporan',
};

export default function PageContentEditor({ sections, fields, collections, document, onChange, editors, openEditor }: {
    sections: EditorSection[]; fields: ContentField[]; collections: ContentCollection[]; document: PageDocument;
    onChange: (document: PageDocument) => void; editors: string[]; openEditor: (editor: string) => void;
}) {
    const [selected, setSelected] = useState(sections[0]?.label ?? '');
    const [query, setQuery] = useState('');
    const search = query.trim().toLocaleLowerCase('id');
    const visible = search ? sections.filter(section => section.label.toLocaleLowerCase('id').includes(search)
        || fields.some(field => section.fields.includes(field.key) && `${field.label} ${document.fields[field.key] ?? field.default}`.toLocaleLowerCase('id').includes(search)))
        : sections.filter(section => section.label === selected);
    return <div className="cms-page-content">
        <p className="cms-help mb-4">Pilih bagian sesuai tampilan website. Judul dan keterangan disimpan sebagai draf halaman. Daftar data memiliki tombol simpan sendiri.</p>
        <div className="cms-row">
            <label className="cms-field"><span>Pilih bagian halaman</span><select aria-label="Pilih bagian halaman" value={selected} onChange={event => { setSelected(event.target.value); setQuery(''); }}>{sections.map(section => <option key={section.label}>{section.label}</option>)}</select></label>
            <label className="cms-field"><span>Cari teks halaman</span><CmsInput value={query} placeholder="Cari judul atau potongan teks" onChange={event => setQuery(event.target.value)} /></label>
        </div>
        {!visible.length && <p className="cms-notice">Tidak ada teks yang cocok. Coba kata lain atau kosongkan pencarian.</p>}
        {visible.map(section => <section key={section.label} className="cms-panel">
            <h2>{section.label}</h2>
            {section.editors.filter(editor => editors.includes(editor)).map(editor => <div className="cms-notice mt-4" key={editor}>
                <p>Isi daftar pada bagian ini dikelola melalui {EDITOR_LABELS[editor]?.toLowerCase()}.</p>
                <button type="button" className="cms-button small mt-2" onClick={() => openEditor(editor)}>Kelola {EDITOR_LABELS[editor]?.toLowerCase()} →</button>
            </div>)}
            <div className="mt-5">{section.fields.map(key => fields.find(field => field.key === key)).filter((field): field is ContentField => !!field).map(field => {
                const raw = document.fields[field.key] ?? field.default;
                const value = field.decoration === 'arrow' ? raw.replace(/[←→↗↘↙↖↑↓➜➔➝•●▪]/g, '') : raw;
                const update = (next: string) => onChange({ ...document, fields: { ...document.fields, [field.key]: field.decoration === 'arrow' ? next.replace(/[←→↗↘↙↖↑↓➜➔➝•●▪]/g, '') : next } });
                return <div className="cms-field" key={field.key}>
                    <label htmlFor={field.key}>{field.label}</label>
                    {field.type === 'text' ? <CmsTextarea id={field.key} rows={value.length > 120 ? 4 : 2} value={value} onChange={event => update(event.target.value)} />
                        : <AssetInput value={value} image={field.type === 'image'} internalOnly={field.internalOnly} onChange={update} />}
                    {field.help && <small>{field.help}</small>}
                    {field.decoration && <small>Ikon panah ditampilkan otomatis. Cukup isi tulisan tombolnya.</small>}
                    {Object.hasOwn(document.fields, field.key) && <button type="button" className="cms-link text-xs text-left w-fit" onClick={() => { const next = { ...document.fields }; delete next[field.key]; onChange({ ...document, fields: next }); }}>Gunakan isi awal</button>}
                </div>;
            })}</div>
            {section.collections.map(key => collections.find(collection => collection.key === key)).filter((collection): collection is ContentCollection => !!collection).map(collection => <details className="cms-section" key={collection.key}>
                <summary>{collection.label}</summary><div className="cms-section-body">
                    <p className="cms-help mb-4">Ubah isi, tambah, hapus, atau geser urutan melalui tombol yang tersedia. Perubahan mengikuti Simpan draf dan Terbitkan halaman.</p>
                    {collection.key.startsWith('collection_tkt_') && <p className="cms-notice">Nomor tingkat harus 1 sampai 9. Rentang tahap menentukan tingkat mana yang tampil di bawahnya. Pastikan setiap tingkat masuk tepat satu tahap.</p>}
                    <StructuredInput excelContext={collection.key} value={document.collections?.[collection.key] ?? collection.default} sample={collection.default} name={ITEM_LABELS[collection.key] ?? 'Item'} onChange={value => onChange({ ...document, collections: { ...document.collections, [collection.key]: value } })} />
                </div>
            </details>)}
        </section>)}
    </div>;
}
