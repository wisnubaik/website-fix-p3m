import {useId,type ReactNode} from 'react';
import {cellRect,edgePath,type OrganisationScene as Scene} from '@/lib/organisation-scene';
import {wrapDiagramText} from '@/lib/institution-diagram';

export function SceneDrawing({scene,children,selectCell,selectEdge}:{scene:Scene;children?:ReactNode;selectCell?:(node:string,cell:string)=>void;selectEdge?:(id:string)=>void}){
    const id=useId().replace(/:/g,'');
    return <>
        <defs>{['command','coordination'].map(kind=><g key={kind}>
            <marker id={`${id}-${kind}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={kind==='coordination'?'#3285d2':'#344858'}/></marker>
            <marker id={`${id}-${kind}-dot`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6"><circle cx="5" cy="5" r="4" fill={kind==='coordination'?'#3285d2':'#344858'}/></marker>
        </g>)}</defs>
        {scene.institution&&<g pointerEvents="none"><svg x={scene.headingX-68} y={10} width={136} height={140} viewBox="618 10 136 140" overflow="hidden" aria-hidden="true"><image href="/profil/profil-1.png" width="1280" height="913"/></svg><text x={scene.headingX} y={175} textAnchor="middle" fontSize="20" fontWeight="700">{scene.heading.split('\n').map((line,i)=><tspan key={i} x={scene.headingX} dy={i?24:0}>{line.toLocaleUpperCase('id-ID')}</tspan>)}</text></g>}
        {scene.edges.map(edge=><g key={edge.id}>
            <path d={edgePath(scene,edge)} fill="none" stroke={edge.kind==='coordination'?'#3285d2':scene.institution?'#222':'#8ea6bf'} strokeWidth="1.25" strokeDasharray={edge.pattern==='dashed'?'5 5':edge.pattern==='dotted'?'1 5':undefined} strokeLinecap={edge.pattern==='dotted'?'round':'butt'} markerStart={edge.startMarker==='none'?undefined:`url(#${id}-${edge.kind}-${edge.startMarker})`} markerEnd={edge.endMarker==='none'?undefined:`url(#${id}-${edge.kind}-${edge.endMarker})`}/>
            {selectEdge&&<path data-edge-id={edge.id} d={edgePath(scene,edge)} fill="none" stroke="transparent" strokeWidth="16" style={{cursor:'pointer'}} role="button" tabIndex={0} aria-label={`Ubah garis ${edge.kind==='command'?'komando':'koordinasi'}`} onClick={()=>selectEdge(edge.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectEdge(edge.id);}}}/>}
        </g>)}
        {scene.nodes.map(node=><g key={node.id} data-node-id={node.id}>{node.cells.map(cell=>{
            const r=cellRect(node,cell),lineHeight=cell.align==='left'?cell.fontSize*1.43:cell.fontSize*1.2;
            const lines=wrapDiagramText(cell.text,r.width-(node.shape==='ellipse'?30:16),cell.fontSize);
            const y=cell.align==='left'?r.y+cell.fontSize+12:r.y+(r.height-lines.length*lineHeight)/2+cell.fontSize;
            const x=cell.align==='left'?r.x+10:r.x+r.width/2;
            return <g key={cell.id} data-cell-id={cell.id} role={selectCell?'button':undefined} tabIndex={selectCell?0:undefined} aria-label={selectCell?`Ubah ${cell.text}`:undefined} style={{cursor:selectCell?'pointer':undefined}} onClick={()=>selectCell?.(node.id,cell.id)} onKeyDown={e=>{if(selectCell&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectCell(node.id,cell.id);}}}>
                {node.shape==='ellipse'?<ellipse cx={r.x+r.width/2} cy={r.y+r.height/2} rx={r.width/2} ry={r.height/2} fill={node.dark?'#183249':'white'} stroke={scene.institution?'#222':'#aebfd0'}/>:<rect {...r} fill={node.dark?'#183249':'white'} stroke={scene.institution?'#222':'#aebfd0'}/>}
                <text x={x} y={y} fontSize={cell.fontSize} fontWeight={cell.bold?700:400} fill={node.dark?'white':scene.institution?'#111':'#183249'} textAnchor={cell.align==='left'?'start':'middle'} pointerEvents="none">{lines.map((line,i)=><tspan key={i} x={x} dy={i?lineHeight:0}>{line}</tspan>)}</text>
            </g>;
        })}</g>)}
        {scene.institution&&<g fontSize="11" pointerEvents="none"><path d={`M ${scene.width-363} ${scene.height-53} h 128`} stroke="#222"/><text x={scene.width-225} y={scene.height-49}>Garis Komando</text><path d={`M ${scene.width-363} ${scene.height-27} h 128`} stroke="#3285d2" strokeDasharray="5 5"/><text x={scene.width-225} y={scene.height-23}>Garis Koordinasi</text></g>}
        {children}
    </>;
}
export default function OrganisationScene({scene,title}:{scene:Scene;title:string}){
    return <div className="overflow-x-auto border border-slate-200 bg-white p-3" tabIndex={0} role="region" aria-label={`${title}. Geser untuk melihat seluruh bagan.`}><svg viewBox={`0 0 ${scene.width} ${scene.height}`} style={{display:'block',width:'100%',minWidth:Math.min(scene.width,1100),fontFamily:scene.institution?'Arial, sans-serif':'inherit'}} role="img" aria-label={title}><title>{title}</title><SceneDrawing scene={scene}/></svg></div>;
}
