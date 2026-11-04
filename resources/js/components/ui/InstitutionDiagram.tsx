import { useId, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { ProfileCell, ProfileTable } from '@/lib/profile-tables';
import { cellEntries } from '@/lib/profile-organisation';
import { institutionLayout, type DiagramBox, type DiagramText } from '@/lib/institution-diagram';
import styles from './InstitutionDiagram.module.css';

type Edit = (row: ProfileTable['rows'][number], column: number, entry?: number) => void;

function Label({ box, text }: { box: DiagramBox; text: DiagramText }) {
    const x = box.align === 'center' ? box.x + box.width / 2 : box.x + 10;
    return <text className={styles.label} x={x} y={box.y + text.y} textAnchor={box.align === 'center' ? 'middle' : 'start'} fontSize={box.fontSize} fontWeight={box.bold ? 700 : 400}>
        {text.lines.map((line, i) => <tspan key={i} x={x + (i && box.align === 'left' ? text.indent ?? 0 : 0)} dy={i ? box.lineHeight : 0}>{line}</tspan>)}
    </text>;
}

function Node({ box, onEdit }: { box: DiagramBox; onEdit?: Edit }) {
    const interactive = (entry?: number) => {
        const values = cellEntries(box.row[box.column] as ProfileCell);
        return onEdit ? {
            role: 'button', tabIndex: 0, className: styles.editable,
            'aria-label': `Ubah ${entry === undefined ? values.join(', ') : values[entry]}`,
            onClick: () => onEdit(box.row, box.column, entry),
            onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onEdit(box.row, box.column, entry); }
            },
        } : {};
    };
    const list = box.align === 'left';
    return <g data-node={box.id} {...(list ? {} : interactive(box.texts[0].entry))}>
        {box.shape === 'ellipse'
            ? <ellipse className={styles.shape} cx={box.x + box.width / 2} cy={box.y + box.height / 2} rx={box.width / 2} ry={box.height / 2} />
            : <rect className={styles.shape} x={box.x} y={box.y} width={box.width} height={box.height} />}
        {box.texts.map((text, i) => list ? <g key={i} {...interactive(text.entry)}>
            {onEdit && <rect className={styles.entryTarget} x={box.x + 3} y={box.y + text.y - box.fontSize} width={box.width - 6} height={text.lines.length * box.lineHeight} />}
            <Label box={box} text={text} />
        </g> : <Label key={i} box={box} text={text} />)}
    </g>;
}

export default function InstitutionDiagram({ table, onEdit }: { table: ProfileTable; onEdit?: Edit }) {
    const diagram = institutionLayout(table);
    const [expanded, setExpanded] = useState(false);
    const id = useId();
    return <div className={styles.frame}>
        <div className={styles.toolbar}>
            <span className={styles.scrollHint}>Geser bagan ke samping untuk melihat seluruh bagian.</span>
            <button type="button" aria-pressed={expanded} aria-controls={`${id}-viewport`} onClick={() => setExpanded(value => !value)}>{expanded ? 'Sesuaikan lebar' : 'Perbesar bagan'}</button>
        </div>
        <div id={`${id}-viewport`} className={styles.viewport} tabIndex={0} role="region" aria-label={`${table.caption}. Bagan dapat digeser ke samping.`}>
            <svg className={`${styles.drawing} ${expanded ? styles.expanded : ''}`} style={{ '--diagram-width': `${Math.max(1600, diagram.width)}px` } as CSSProperties}
                viewBox={`0 0 ${diagram.width} ${diagram.height}`} role="group" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
                <title id={`${id}-title`}>{table.title || 'Struktur organisasi Politeknik Negeri Madiun'}</title>
                <desc id={`${id}-description`}>Garis hitam menunjukkan komando. Garis biru putus-putus menunjukkan koordinasi. {onEdit ? 'Pilih kotak atau nama program studi untuk mengubah isinya.' : 'Daftar program studi ditampilkan di bawah masing-masing jurusan.'}</desc>
                <svg x={diagram.spine - 68} y={10} width={136} height={140} viewBox="618 10 136 140" overflow="hidden" aria-hidden="true">
                    <defs><clipPath id={`${id}-logo`} clipPathUnits="userSpaceOnUse"><rect x={618} y={10} width={136} height={140} /></clipPath></defs>
                    <image href="/profil/profil-1.png" width={1280} height={913} clipPath={`url(#${id}-logo)`} />
                </svg>
                <text x={diagram.spine} y={175} textAnchor="middle" fontSize={20} fontWeight={700} className={styles.label}>
                    {diagram.titleLines.map((line, i) => <tspan key={i} x={diagram.spine} dy={i ? 24 : 0}>{line.toLocaleUpperCase('id-ID')}</tspan>)}
                </text>
                <g aria-hidden="true">{diagram.paths.map(path => <path key={path.id} d={path.d} className={path.coordination ? styles.coordination : styles.command} />)}</g>
                {diagram.boxes.map(box => <Node key={box.id} box={box} onEdit={onEdit} />)}
                <g fontSize={11} className={styles.label}>
                    <path d={`M ${diagram.width - 363} ${diagram.legendY} h 128`} className={styles.command} />
                    <text x={diagram.width - 225} y={diagram.legendY + 4}>Garis Komando</text>
                    <path d={`M ${diagram.width - 363} ${diagram.legendY + 26} h 128`} className={styles.coordination} />
                    <text x={diagram.width - 225} y={diagram.legendY + 30}>Garis Koordinasi</text>
                </g>
            </svg>
        </div>
    </div>;
}
