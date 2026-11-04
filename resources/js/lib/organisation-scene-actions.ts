import {wrapDiagramText} from './institution-diagram';
import {cellRect,edgePoints,removeCells,sceneId,validateScene,type DiagramCell,type DiagramNode,type DiagramEdge,type OrganisationScene} from './organisation-scene';

export type SceneSelection={node?:string;cell?:string;edge?:string};
export type SceneClipboard={kind:'node';node:DiagramNode;edges:DiagramEdge[]}|{kind:'edge';edge:DiagramEdge};
const sum=(values:number[])=>values.reduce((a,b)=>a+b,0);

export function copySceneSelection(scene:OrganisationScene,selection:SceneSelection):SceneClipboard|null {
    const node=scene.nodes.find(item=>item.id===selection.node);
    if(node){
        const ids=new Set(node.cells.map(cell=>cell.id));
        const edges=scene.edges.filter(edge=>edge.source&&edge.target&&ids.has(edge.source.cellId)&&ids.has(edge.target.cellId));
        return structuredClone({kind:'node',node,edges:edges.map(edge=>({...edge,points:edgePoints(scene,edge)}))});
    }
    const edge=scene.edges.find(item=>item.id===selection.edge);
    return edge?structuredClone({kind:'edge',edge:{...edge,points:edgePoints(scene,edge),source:null,target:null}}):null;
}

export function pasteSceneSelection(scene:OrganisationScene,clipboard:SceneClipboard,offset=30):{scene:OrganisationScene;selection:SceneSelection} {
    const next=structuredClone(scene),copy=structuredClone(clipboard);
    const edges=copy.kind==='edge'?[copy.edge]:copy.edges;
    const points=edges.flatMap(edge=>edge.points);
    const right=Math.max(0,...points.map(p=>p.x),copy.kind==='node'?copy.node.x+sum(copy.node.columns):0);
    const bottom=Math.max(0,...points.map(p=>p.y),copy.kind==='node'?copy.node.y+sum(copy.node.rows):0);
    const dx=Math.min(Math.max(0,offset),12000-right),dy=Math.min(Math.max(0,offset),12000-bottom);
    for(const edge of edges){edge.id=sceneId();edge.points=edge.points.map(p=>({x:p.x+dx,y:p.y+dy}));}
    let selection:SceneSelection;
    if(copy.kind==='node'){
        const node=copy.node,ids=new Map<string,string>();node.id=sceneId();node.x+=dx;node.y+=dy;
        node.cells.forEach(cell=>{const id=sceneId();ids.set(cell.id,id);cell.id=id;});
        for(const edge of edges)for(const key of ['source','target'] as const)if(edge[key])edge[key]!.cellId=ids.get(edge[key]!.cellId)!;
        next.nodes.push(node);selection={node:node.id,cell:node.cells[0]?.id};
    }else selection={edge:copy.edge.id};
    next.edges.push(...edges);
    next.width=Math.max(next.width,Math.min(12000,right+dx+30));next.height=Math.max(next.height,Math.min(12000,bottom+dy+30));
    return {scene:validateScene(next),selection};
}

export function deleteSceneSelection(scene:OrganisationScene,selection:SceneSelection):OrganisationScene {
    const next=structuredClone(scene),node=next.nodes.find(item=>item.id===selection.node);
    if(node){next.nodes=next.nodes.filter(item=>item.id!==node.id);removeCells(next,new Set(node.cells.map(cell=>cell.id)));}
    else if(selection.edge)next.edges=next.edges.filter(edge=>edge.id!==selection.edge);
    return validateScene(next);
}

export function updateSceneNode(scene:OrganisationScene,nodeId:string,patch:Partial<Pick<DiagramNode,'x'|'y'|'rows'|'columns'|'shape'|'dark'>>):OrganisationScene {
    const next=structuredClone(scene),node=next.nodes.find(item=>item.id===nodeId);
    if(!node)throw new Error('Kotak tidak ditemukan.');
    Object.assign(node,patch);
    next.width=Math.max(next.width,node.x+sum(node.columns));next.height=Math.max(next.height,node.y+sum(node.rows));
    return validateScene(next);
}

export function moveSceneEdge(scene:OrganisationScene,id:string,dx:number,dy:number):OrganisationScene {
    const next=structuredClone(scene),edge=next.edges.find(item=>item.id===id);
    if(!edge)throw new Error('Garis tidak ditemukan.');
    let points=edgePoints(scene,edge);
    if(points.length===2&&(edge.source||edge.target)){
        const [a,b]=points;points=[a,{x:a.x+(b.x-a.x)/3,y:a.y+(b.y-a.y)/3},{x:a.x+2*(b.x-a.x)/3,y:a.y+2*(b.y-a.y)/3},b];
    }
    const moves=(i:number)=>!(i===0&&edge.source)&&!(i===points.length-1&&edge.target);
    const free=points.filter((_,i)=>moves(i));
    const shiftX=Math.max(-Math.min(...free.map(p=>p.x)),Math.min(dx,scene.width-Math.max(...free.map(p=>p.x))));
    const shiftY=Math.max(-Math.min(...free.map(p=>p.y)),Math.min(dy,scene.height-Math.max(...free.map(p=>p.y))));
    edge.points=points.map((p,i)=>moves(i)?{x:p.x+shiftX,y:p.y+shiftY}:p);
    return next;
}

export function updateSceneCell(scene:OrganisationScene,nodeId:string,cellId:string,patch:Partial<DiagramCell>):OrganisationScene {
    const next=structuredClone(scene),node=next.nodes.find(item=>item.id===nodeId),cell=node?.cells.find(item=>item.id===cellId);
    if(!node||!cell)throw new Error('Kotak yang dipilih tidak ditemukan.');
    Object.assign(cell,patch);
    validateScene(next);
    const rect=cellRect(node,cell),lines=wrapDiagramText(cell.text,rect.width-(node.shape==='ellipse'?30:16),cell.fontSize);
    const height=lines.length*cell.fontSize*(cell.align==='left'?1.43:1.2)+24;
    if(height>rect.height)node.rows[cell.row+cell.rowSpan-1]+=height-rect.height;
    next.height=Math.max(next.height,node.y+node.rows.reduce((a,b)=>a+b,0));
    return validateScene(next);
}
