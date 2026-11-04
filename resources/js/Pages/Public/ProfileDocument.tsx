import OrganisationScene from '@/components/ui/OrganisationScene';
import ConnectedOrganisation from '@/components/ui/ConnectedOrganisation';
import { organisationRole } from '@/lib/profile-organisation';
import InstitutionDiagram from '@/components/ui/InstitutionDiagram';
import { splitClusterTitle } from '@/lib/profile-headings';
import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import { createContext, useContext, useId, useState } from 'react';
import type { ProfileCell, ProfileContent, ProfileTable } from '@/lib/profile-tables';
import styles from './profile.module.css';

type Cell = ProfileCell | number | null;
type Row = Cell[];
export type ProfileDocumentKind = 'institution' | 'organisation' | 'process' | 'roles' | 'clusters' | 'indicators' | 'roadmap' | 'targets' | 'general';

export function documentKind(id: string, href: string): ProfileDocumentKind {
    const number = id.match(/^revision-profil-image-([1-9])$/)?.[1]
        ?? href.match(/\/profil\/profil-([1-9])\.png(?:[?#]|$)/)?.[1];
    return ({ 1: 'institution', 2: 'organisation', 3: 'process', 4: 'roles', 5: 'clusters',
        6: 'indicators', 7: 'roadmap', 8: 'targets', 9: 'targets' } as Record<string, ProfileDocumentKind>)[number ?? ''] ?? 'general';
}

function text(cell: Cell | undefined) {
    return cell !== null && typeof cell === 'object' ? cell.text : typeof cell === 'number' ? String(cell) : '';
}
function entries(cell: Cell | undefined) {
    if (cell === null || typeof cell !== 'object') return text(cell) ? [text(cell)] : [];
    return [...(cell.text ? [cell.text] : []), ...cell.items];
}

export function ProfileCellContent({ cell }: { cell: Cell }) {
    if (cell === null) return <span aria-label="Tidak dicantumkan">-</span>;
    if (typeof cell === 'number') return <>{cell}</>;
    const List = cell.ordered ? 'ol' : 'ul';
    return <div className={styles.cell}>
        {cell.text && <p>{cell.text}</p>}
        {cell.items.length > 0 && <List>{cell.items.map((item, i) => <li key={i}>{item}</li>)}</List>}
    </div>;
}

export type OrganisationEdit=(row:Row,column:number,entry?:number)=>void;
const OrganisationEditContext=createContext<OrganisationEdit|undefined>(undefined);
function OrgLabel({row,column=1,entry,children}:{row:Row;column?:number;entry?:number;children:React.ReactNode}) {
    const edit=useContext(OrganisationEditContext);if(!edit)return <>{children}</>;
    const label=entry===undefined?entries(row[column]).join(', '):entries(row[column])[entry];
    return <button type="button" className={styles.editOrgLabel} aria-label={`Ubah ${label||'bagian ini'}`} onClick={()=>edit(row,column,entry)}>{children}</button>;
}
function OrgCell({row,column=1}:{row:Row;column?:number}) {
    const cell=row[column];if(cell===null||typeof cell!=='object')return <ProfileCellContent cell={cell}/>;
    const List=cell.ordered?'ol':'ul';
    return <div className={styles.cell}>{cell.text&&<p><OrgLabel row={row} column={column} entry={0}>{cell.text}</OrgLabel></p>}{cell.items.length>0&&<List>{cell.items.map((item,i)=><li key={i}><OrgLabel row={row} column={column} entry={i+(cell.text?1:0)}>{item}</OrgLabel></li>)}</List>}</div>;
}
export function OrganisationDiagram({table,kind,onEdit}:{table:ProfileTable;kind:'institution'|'organisation';onEdit?:OrganisationEdit}) {
    return <OrganisationEditContext.Provider value={onEdit}>{kind==='institution'?<Institution table={table}/>:<Organisation table={table}/>}</OrganisationEditContext.Provider>;
}

function Records({ table, rows = table.rows }: { table: ProfileTable; rows?: Row[] }) {
    return <div className={styles.records}>{rows.map((row, i) => <section key={i} className={styles.record}>
        <h5><OrgLabel row={row} column={0}><ProfileCellContent cell={row[0]}/></OrgLabel></h5>
        <dl>{row.slice(1).map((cell, j) => <div key={j}>
            <dt>{table.headers[j + 1]}</dt><dd><OrgCell row={row} column={j+1}/></dd>
        </div>)}</dl>
    </section>)}</div>;
}

function Organisation({ table }: { table: ProfileTable }) {
    const edit = useContext(OrganisationEditContext);
    if(table.diagram)return <OrganisationScene scene={table.diagram} title={table.caption}/>;
    if(table.connections!==undefined)return <ConnectedOrganisation table={table} onEdit={edit}/>;
    const find = (role:ReturnType<typeof organisationRole>) => table.rows.find((_,i)=>organisationRole(table,i)===role);
    const leader = find('leader');
    const operator = find('operator');
    const groups = find('groups');
    // Unknown or renamed roles stay visible without inventing a new reporting relationship.
    if (!leader || table.headers.length !== 2) return <Records table={table} />;
    const remaining = table.rows.filter(row => row !== leader && row !== operator && row !== groups);
    return <>
        <div className={styles.p3mTree} aria-label={table.caption}>
            <div className={`${styles.orgNode} ${styles.orgHead}`}><OrgCell row={leader}/></div>
            {operator && <div className={styles.operatorBranch}><div className={styles.orgNode}><OrgCell row={operator}/></div></div>}
            {groups&&<ul className={styles.orgBranches} aria-label={text(groups[0])}>
                {entries(groups[1]).map((name, i) => <li key={i}><div className={styles.orgNode}><OrgLabel row={groups} entry={i}>{name}</OrgLabel></div></li>)}
            </ul>}
        </div>
        {remaining.length > 0 && <Records table={table} rows={remaining} />}
    </>;
}

function Institution({ table }: { table: ProfileTable }) {
    const edit = useContext(OrganisationEditContext);
    if(table.diagram)return <OrganisationScene scene={table.diagram} title={table.caption}/>;
    if(table.connections!==undefined)return <ConnectedOrganisation table={table} onEdit={edit}/>;
    if (!table.rows.some((_, i) => organisationRole(table, i) === 'leader') || table.headers.length !== 2) return <Records table={table} />;
    const supported = new Set(['leader', 'council', 'inspection', 'department', 'administration', 'centres', 'support', 'functional']);
    const seen = new Set<string>();
    const remaining = table.rows.filter((_, i) => {
        const role = organisationRole(table, i);
        if (!supported.has(role)) return true;
        if (['department', 'administration'].includes(role)) return false;
        if (seen.has(role)) return true;
        seen.add(role);
        return false;
    });
    return <>
        <InstitutionDiagram table={table} onEdit={edit} />
        {remaining.length > 0 && <Records table={table} rows={remaining} />}
    </>;
}

function Process({ table }: { table: ProfileTable }) {
    if (table.headers.length !== 2) return <Records table={table} />;
    return <ol className={styles.process}>{table.rows.map((row, i) => <li key={i}>
        <span className={styles.stepNumber} aria-hidden="true">{i + 1}</span>
        <h5><ProfileCellContent cell={typeof row[0] === 'object' && row[0] !== null
            ? { ...row[0], text: row[0].text.replace(/^\d+[.)]\s*/, '') } : row[0]} /></h5>
        <ProfileCellContent cell={row[1]} />
    </li>)}</ol>;
}

function RoleFlows({ table }: { table: ProfileTable }) {
    if (table.headers.length !== 2) return <Records table={table} />;
    return <div className={styles.roleFlows}>{table.rows.map((row, i) => {
        const cell = row[1];
        return <section key={i} className={styles.roleFlow}>
            <h5><ProfileCellContent cell={row[0]} /></h5>
            {cell !== null && typeof cell === 'object' ? <div>
                {cell.text && <p>{cell.text}</p>}
                <ol className={styles.flowSteps}>{cell.items.map((item, j) => <li key={j}><span aria-hidden="true">{j + 1}</span>{item}</li>)}</ol>
            </div> : <ProfileCellContent cell={cell} />}
        </section>;
    })}</div>;
}

function Timeline({ table }: { table: ProfileTable }) {
    const cms = useCms();

    const [selected, setSelected] = useState(0);
    const [all, setAll] = useState(false);
    const id = useId();
    const active = Math.min(selected, Math.max(0, table.rows.length - 1));
    if (table.headers.length !== 2 || !table.rows.every(row => /^(19|20)\d{2}\b/.test(text(row[0])))) return <Records table={table} />;
    return <div className={styles.timeline}>
        <div className={styles.timelineToolbar}>
            <div className={styles.yearButtons} role="group" aria-label={`Pilih tahun ${table.caption}`}>
                {table.rows.map((row, i) => <button key={i} type="button" aria-pressed={!all && active === i}
                    aria-controls={`${id}-panels`} onClick={() => { setSelected(i); setAll(false); }}>
                    {text(row[0]).slice(0, 4)}
                </button>)}
            </div>
            <button type="button" className={styles.allYears} aria-pressed={all} aria-controls={`${id}-panels`} onClick={() => setAll(!all)}>
                {all ? cms.text("x_87e39e340fbf50", "Tampilkan satu tahun") : cms.text("x_891fe5dc0984da", "Lihat semua tahun")}
            </button>
        </div>
        <div id={`${id}-panels`} className={styles.yearPanels}>
            {table.rows.map((row, i) => {
                const first = row[0];
                const heading = text(first);
                return <section key={i} className={styles.yearPanel} hidden={!all && active !== i} aria-labelledby={`${id}-year-${i}`}>
                    <div className={styles.yearHeading}><span className={styles.year}>{heading.slice(0, 4)}</span>
                        <h5 id={`${id}-year-${i}`}>{heading.slice(4).trim()}</h5>
                        {first !== null && typeof first === 'object' && first.items.length > 0 && <ProfileCellContent cell={{ ...first, text: '' }} />}
                    </div>
                    <div><p className={styles.eyebrow}>{table.headers[1]}</p><ProfileCellContent cell={row[1]} /></div>
                </section>;
            })}
        </div>
    </div>;
}

function Targets({ table }: { table: ProfileTable }) {
    return <div className={styles.targets}>{table.rows.map((row, i) => <section key={i} className={styles.targetRow}>
        <h5><ProfileCellContent cell={row[0]} /></h5>
        <dl className={styles.targetValues}>{row.slice(1).map((value, j) => <div key={j} className={styles.targetValue}>
            <dt>{table.headers[j + 1]}</dt><dd><ProfileCellContent cell={value} /></dd>
        </div>)}</dl>
    </section>)}</div>;
}

function TableBody({ table, kind }: { table: ProfileTable; kind: ProfileDocumentKind }) {
    if (table.numeric) return <Targets table={table} />;
    switch (kind) {
        case 'institution': return <Institution table={table} />;
        case 'organisation': return <Organisation table={table} />;
        case 'process': return <Process table={table} />;
        case 'roles': return <RoleFlows table={table} />;
        case 'indicators': case 'roadmap': return <Timeline table={table} />;
        default: return <Records table={table} />;
    }
}

export default function ProfileDocument({ content, kind }: { content: ProfileContent; kind: ProfileDocumentKind }) {
    const cms = useCms();

    return <div className={styles.documentContent}>{content.tables.map((table, i) => {
        if (kind === 'clusters' && !table.numeric) {
            const heading = splitClusterTitle(table.title);
            return <details key={i} className={styles.clusterDisclosure} open={i === 0}>
                <summary>{heading.label && <span className={styles.clusterLabel}>{heading.label}</span>}
                    <h4>{heading.title || table.caption}</h4><span className={styles.disclosureIcon} aria-hidden="true" /></summary>
                <div className={styles.clusterBody}>
                    {table.intro && <p>{table.intro}</p>}
                    {table.rows.map((row, ri) => <dl className={styles.clusterColumns} key={ri}>
                        {row.map((cell, ci) => <div key={ci}><dt>{table.headers[ci]}</dt><dd><ProfileCellContent cell={cell} /></dd></div>)}
                    </dl>)}
                    {table.note && <p className={styles.note}>{table.note === 'Tanda “-” mengikuti dokumen sumber dan tidak berarti nol.' ? cms.text("x_48fdd34826c25e", "Tanda “-” berarti target belum dicantumkan, bukan nol.") : table.note}</p>}
                </div>
            </details>;
        }
        return <section key={i} aria-label={table.caption}>
            {table.title && kind !== 'institution' && <h4 className={styles.tableTitle}>{table.title}</h4>}
            {table.intro && <p className={styles.documentIntro}>{table.intro}</p>}
            <TableBody table={table} kind={kind} />
            {table.note && <p className={styles.note}>{table.note === 'Tanda “-” mengikuti dokumen sumber dan tidak berarti nol.' ? cms.text("x_8d123fa2cc559d", "Tanda “-” berarti target belum dicantumkan, bukan nol.") : table.note}</p>}
        </section>;
    })}</div>;
}
