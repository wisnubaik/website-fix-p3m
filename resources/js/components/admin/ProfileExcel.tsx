import ExcelImport, { appendUnique, type ExcelColumn } from './ExcelImport';
import { validateProfileContent, type ProfileTable, type ProfileCell } from '@/lib/profile-tables';

export default function ProfileExcel({ table, context, onChange }: { table: ProfileTable; context: string; onChange: (table: ProfileTable) => void }) {
    const columns: ExcelColumn[] = table.headers.flatMap((label,i): ExcelColumn[] => table.numeric && i > 0 ? [{ key:`c${i}`,label,type:'integer',nullable:true }] : [{key:`c${i}.text`,label:`${label}: teks`},{key:`c${i}.items`,label:`${label}: daftar`,type:'lines'},{key:`c${i}.ordered`,label:`${label}: daftar bernomor`,type:'boolean'}]);
    return <ExcelImport resource="rows" title={table.title||table.caption} columns={columns} context={context} maxRows={80} currentRows={table.rows.map(row=>Object.fromEntries(columns.map(col=>{const [cellKey,part]=col.key.split('.');const cell=row[Number(cellKey.slice(1))];return [col.key,part && cell && typeof cell==='object' ? cell[part as keyof ProfileCell] : cell];})))} onApply={(incoming, mode)=>{
        const rows = incoming.map(row=>table.headers.map((_,i): ProfileCell|number|null => table.numeric&&i>0 ? row[`c${i}`] : {text:row[`c${i}.text`],items:row[`c${i}.items`],ordered:row[`c${i}.ordered`]}));
        const next=appendUnique(mode === 'replace' ? [] : table.rows,rows,80); const updated={...table,rows:next.rows};
        validateProfileContent({tables:[updated]}); onChange(updated); return next.added;
    }}/>;
}
