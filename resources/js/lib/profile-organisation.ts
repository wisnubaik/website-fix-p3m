import { organisationNodes, remapConnections } from './organisation-connections';
import type { ProfileCell, ProfileTable } from './profile-tables';
export const organisationRoles=['leader','operator','groups','council','inspection','department','administration','centres','support','functional','other'] as const;
export type OrganisationRole=typeof organisationRoles[number];
export const organisationRoleLabels:Record<OrganisationRole,string>={leader:'Pimpinan',operator:'Operator',groups:'Kelompok dosen',council:'Senat dan dewan',inspection:'Pengawasan',department:'Jurusan',administration:'Administrasi',centres:'Pusat',support:'Unit penunjang akademik',functional:'Jabatan fungsional',other:'Unit lainnya'};
export function cellEntries(cell:ProfileCell):string[]{return [...(cell.text?[cell.text]:[]),...cell.items];}
export function organisationRole(table:ProfileTable,index:number):OrganisationRole {
    if(table.rowRoles)return table.rowRoles[index];
    const name=(table.rows[index][0] as ProfileCell).text.toLowerCase();
    const exact:Record<string,OrganisationRole>={pimpinan:'leader',operator:'operator','kelompok dosen':'groups','senat dan dewan':'council',pengawasan:'inspection',pusat:'centres','unit penunjang akademik':'support','jabatan fungsional':'functional'};
    return exact[name]??(/^jurusan\b/i.test(name)?'department':/^administrasi (akademik|umum)$/i.test(name)?'administration':'other');
}
export function legacySupportLinks(table:ProfileTable):NonNullable<ProfileTable['supportLinks']> {
    const leaders=table.rows.find((_,i)=>organisationRole(table,i)==='leader')?.[1] as ProfileCell|undefined;
    const support=table.rows.find((_,i)=>organisationRole(table,i)==='support')?.[1] as ProfileCell|undefined;
    if(!leaders||!support)return [];
    const units=cellEntries(support),names=cellEntries(leaders);
    return [/bidang\s+akademik/i,/bidang\s+kemahasiswaan/i].flatMap((pattern,i)=>{const leader=names.findIndex((name,index)=>index>0&&pattern.test(name));if(leader<0)return [];const matched=units.flatMap((name,index)=>(i===0?/^UPA\s+(perpustakaan|bahasa|layanan.*uji kompetensi|penerbitan|teknologi informasi)/i:/^UPA\s+pengembangan karir/i).test(name)?[index]:[]);return matched.length?[{leader,units:matched}]:[];});
}
export function withOrganisationRoles(table:ProfileTable):ProfileTable {
    const next=structuredClone(table);next.rowRoles=table.rows.map((_,i)=>organisationRole(table,i));next.supportLinks=table.supportLinks?structuredClone(table.supportLinks):legacySupportLinks(table);return next;
}
export function assignSupport(table:ProfileTable,unit:number,leader:number|null):void {
    table.supportLinks=(table.supportLinks??[]).map(link=>({...link,units:link.units.filter(index=>index!==unit)})).filter(link=>link.units.length);
    if(leader===null)return;const group=table.supportLinks.find(link=>link.leader===leader);if(group)group.units.push(unit);else table.supportLinks.push({leader,units:[unit]});
}
export function remapOrganisationEntries(table:ProfileTable,row:number,previousIndices:number[]):void {
    const mapping=new Map(organisationNodes(table).flatMap(node=>{if(node.entry===-1)return [[node.id,node.id] as [string,string]];const entry=node.row===row?previousIndices.indexOf(node.entry):node.entry;return entry>=0?[[node.id,`${node.row}:${entry}`] as [string,string]]:[];}));
    remapConnections(table,mapping);
    const role=organisationRole(table,row);
    table.supportLinks=(table.supportLinks??[]).flatMap(link=>{const leader=role==='leader'?previousIndices.indexOf(link.leader):link.leader;const units=role==='support'?link.units.map(index=>previousIndices.indexOf(index)).filter(index=>index>=0):link.units;return leader>=0&&units.length?[{leader,units}]:[];});
}
