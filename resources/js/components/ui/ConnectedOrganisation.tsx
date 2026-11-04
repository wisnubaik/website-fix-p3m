import type { ProfileTable } from '@/lib/profile-tables';
import { organisationNodes } from '@/lib/organisation-connections';
import styles from './connected-organisation.module.css';
export default function ConnectedOrganisation({table,onEdit,onSelectNode,selectedNode}:{table:ProfileTable;onSelectNode?:(id:string)=>void;selectedNode?:string;onEdit?:(row:ProfileTable['rows'][number],column:number,entry?:number)=>void}) {
    const nodes=organisationNodes(table), links=table.connections??[];
    const children=new Map<string,string[]>();
    links.forEach(link=>children.set(link.from,[...(children.get(link.from)??[]),link.to]));
    const targets=new Set(links.map(link=>link.to));
    const byId=new Map(nodes.map(node=>[node.id,node]));
    function render(id:string,visited=new Set<string>()):React.ReactNode {
        const node=byId.get(id);if(!node||visited.has(id))return null;
        const seen=new Set(visited);seen.add(id);
        return <li key={id} className={styles.branch}><div className={styles.box} data-arrow-node={node.id} style={selectedNode===node.id?{outline:'3px solid #1768b0'}:undefined}>
            {onSelectNode?<button type="button" style={{touchAction:'none'}} aria-pressed={selectedNode===node.id} onClick={()=>onSelectNode(node.id)}>{node.label}<span className="block text-xs mt-2">↗ Penghubung</span></button>:onEdit?<button type="button" onClick={()=>onEdit(table.rows[node.row],node.entry===-1?0:1,node.entry===-1?undefined:node.entry)} aria-label={`Ubah ${node.label}`}>{node.label}</button>:node.label}
        </div>{!!children.get(id)?.length&&<ul className={styles.children}>{children.get(id)!.map(child=>render(child,seen))}</ul>}</li>;
    }
    return <div className={styles.viewport} tabIndex={0} aria-label={`${table.caption}. Geser untuk melihat seluruh bagan.`}>
        <ul className={styles.roots}>{nodes.filter(node=>!targets.has(node.id)).map(node=>render(node.id))}</ul>
        <ul className="sr-only" aria-label="Hubungan antar kotak">{links.map(link=><li key={link.to}>{byId.get(link.from)?.label} menuju {byId.get(link.to)?.label}</li>)}</ul>
    </div>;
}
