import { type FieldPolicy } from '@/lib/field-validation';
import { CmsInput, CmsTextarea } from '@/components/admin/CmsInput';
import { useId } from 'react';
import type { ProfileCell } from '@/lib/profile-tables';
import type { ProfileDocumentKind } from '@/Pages/Public/ProfileDocument';
import { joinClusterTitle, splitClusterTitle, splitYearHeading } from '@/lib/profile-headings';

export function ProfileField({ label, value, onChange, multiline = false, help, rows = 4, policy = 'text' }: {
    label: string; value: string; onChange: (value: string) => void; multiline?: boolean; help?: string; rows?: number; policy?: FieldPolicy;
}) {
    const id = useId();
    return <div className="cms-field">
        <label htmlFor={id}>{label}</label>
        {multiline ? <CmsTextarea policy={policy} id={id} rows={rows} value={value} onChange={event => onChange(event.target.value)} aria-describedby={help ? `${id}-help` : undefined} />
            : <CmsInput policy={policy} id={id} value={value} onChange={event => onChange(event.target.value)} aria-describedby={help ? `${id}-help` : undefined} />}
        {help && <small id={`${id}-help`}>{help}</small>}
    </div>;
}

export function ClusterHeadingFields({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const { label, title } = splitClusterTitle(value);
    return <div className="cms-profile-heading-fields">
        <ProfileField label="Label klaster" value={label} onChange={next => onChange(joinClusterTitle(next.replace(/:/g, ''), title))} />
        <ProfileField label="Judul klaster" value={title} onChange={next => onChange(joinClusterTitle(label, next))} multiline rows={2} />
        <div className="cms-profile-heading-preview" aria-label="Pratinjau judul klaster"><span>{label}</span><strong>{title}</strong></div>
    </div>;
}

function cellMode(kind: ProfileDocumentKind, column: number, reference: ProfileCell): 'text' | 'list' | 'both' {
    if (kind === 'roles') return column === 0 ? 'text' : 'both';
    if (['process', 'roadmap', 'indicators'].includes(kind)) return column === 0 ? 'text' : 'list';
    if (kind === 'clusters') return 'list';
    if (kind === 'targets' || column === 0) return 'text';
    if (['institution', 'organisation'].includes(kind) && !reference.text && !reference.items.length) return 'list';
    if (reference.text && reference.items.length) return 'both';
    return reference.items.length ? 'list' : 'text';
}

export function ProfileCellFields({ cell, original, label, kind, column, onChange }: {
    cell: ProfileCell; original?: ProfileCell; label: string; kind: ProfileDocumentKind; column: number; onChange: (cell: ProfileCell) => void;
}) {
    const reference = original ?? cell;
    const mode = cellMode(kind, column, reference);
    const isYear = ['roadmap', 'indicators'].includes(kind) && column === 0;
    const yearHeading = splitYearHeading(cell.text);
    const showText = mode !== 'list' || !!reference.text || !!cell.text;
    const showList = mode !== 'text' || reference.items.length > 0 || cell.items.length > 0;
    const boxes = ['institution', 'organisation'].includes(kind) && column > 0;
    const processTitle = kind === 'process' && column === 0;
    const prefix = processTitle ? cell.text.match(/^\d+[.)]\s*/)?.[0] ?? '' : '';
    const listLabel = kind === 'roles' && column === 1 ? 'Tahapan' : showText ? `Daftar ${label.toLowerCase()}` : label;
    const previewItems = [cell.text, ...cell.items].filter(item => item.trim());
    return <div className="cms-profile-cell-fields">
        {isYear ? <div className="cms-profile-year-fields">
            <ProfileField policy="year" label="Tahun" value={yearHeading.year} onChange={year => onChange({ ...cell, text: `${year}\n${yearHeading.title}` })} help="Isi 4 digit, misalnya 2025." />
            <ProfileField label="Judul arah pengembangan" value={yearHeading.title} multiline rows={2} onChange={title => onChange({ ...cell, text: `${yearHeading.year}\n${title}` })} />
        </div> : showText && <ProfileField label={processTitle ? 'Nama tahap' : kind === 'roles' && column === 1 ? 'Ringkasan fungsi' : label}
            value={processTitle ? cell.text.slice(prefix.length) : cell.text} multiline rows={mode === 'both' ? 3 : 2}
            onChange={text => onChange({ ...cell, text: prefix + text })} />}
        {showList && <ProfileField label={listLabel} value={cell.items.join('\n')} multiline rows={Math.min(10, Math.max(4, cell.items.length + 1))}
            help={boxes ? 'Tekan Enter untuk membuat kotak berikutnya. Teks yang membungkus otomatis ke baris bawah masih berada dalam satu kotak.' : 'Satu butir per baris. Tekan Enter untuk menambahkan butir berikutnya.'}
            onChange={value => onChange({ ...cell, items: value.split(/\r?\n/) })} />}
        {boxes && previewItems.length > 0 && <div className="cms-profile-box-preview" aria-label="Pratinjau isi kotak">
            <p>Pratinjau isi kotak</p><div>{previewItems.map((item, index) => <span key={index}>{item}</span>)}</div>
        </div>}
    </div>;
}
