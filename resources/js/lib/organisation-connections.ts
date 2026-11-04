import type { ProfileCell, ProfileTable } from './profile-tables';
import { cellEntries, organisationRole } from './profile-organisation';
export type OrganisationConnection = { from: string; to: string };
export function organisationNodes(table: ProfileTable) {
    return table.rows.flatMap((row, ri) => [...(['department','administration'].includes(organisationRole(table,ri)) ? [{id:`${ri}:h`,label:cellEntries(row[0] as ProfileCell).join(' '),row:ri,entry:-1}] : []), ...cellEntries(row[1] as ProfileCell).map((label, entry) => ({id:`${ri}:${entry}`,label,row:ri,entry}))]);
}
export function validateConnections(table: ProfileTable, links: OrganisationConnection[]) {
    if (!Array.isArray(links) || links.length > 500) throw new Error('Maksimal 500 hubungan pada satu bagan.');
    const nodes=new Set(organisationNodes(table).map(node=>node.id)), parents=new Map<string,string>();
    for(const link of links) {
        if(!link || Object.keys(link).sort().join(',')!=='from,to' || !nodes.has(link.from)||!nodes.has(link.to)||link.from===link.to||parents.has(link.to)) throw new Error('Pilih dua kotak berbeda. Setiap kotak tujuan hanya boleh memiliki satu induk.');
        parents.set(link.to,link.from);
    }
    for(const node of nodes) {
        const seen=new Set<string>();let current:string|undefined=node;
        while(current!==undefined){if(seen.has(current))throw new Error('Hubungan tidak boleh membentuk lingkaran.');seen.add(current);current=parents.get(current);}
    }
    return links;
}
export function defaultConnections(table: ProfileTable, kind: string): OrganisationConnection[] {
    if(kind==='institution')return organisationNodes(table).filter(node=>node.entry>=0&&['department','administration'].includes(organisationRole(table,node.row))).map(node=>({from:`${node.row}:h`,to:node.id}));
    if(kind!=='organisation')return [];
    const leader=table.rows.findIndex((_,i)=>organisationRole(table,i)==='leader');
    if(leader<0)return [];
    const nodes=organisationNodes(table);if(!nodes.some(n=>n.id===`${leader}:0`))return [];
    return nodes.filter(n=>['operator','groups'].includes(organisationRole(table,n.row))).map(n=>({from:`${leader}:0`,to:n.id}));
}
export function remapConnections(table: ProfileTable, mapping: Map<string,string>) {
    if(!table.connections)return;
    table.connections=table.connections.flatMap(link=>{const from=mapping.get(link.from),to=mapping.get(link.to);return from&&to?[{from,to}]:[];});
}

/** Reconnect an existing destination without leaving a duplicate parent. */
export function connectOrganisation(table: ProfileTable, from: string, to: string) {
    const next=[...(table.connections??[]).filter(link=>link.to!==to),{from,to}];
    validateConnections(table,next);
    return {...table,connections:next};
}
