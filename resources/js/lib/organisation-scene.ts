import type {ProfileTable, ProfileCell} from './profile-tables';
import {institutionLayout} from './institution-diagram';
import {cellEntries, organisationRole} from './profile-organisation';
import {organisationNodes} from './organisation-connections';

export type Point={x:number;y:number};
export type Side='top'|'right'|'bottom'|'left';
export type Anchor={cellId:string;side:Side;ratio:number};
export type DiagramCell={id:string;row:number;column:number;rowSpan:number;colSpan:number;text:string;fontSize:number;bold:boolean;align:'left'|'center'};
export type DiagramNode={id:string;x:number;y:number;columns:number[];rows:number[];shape:'rectangle'|'ellipse';dark:boolean;cells:DiagramCell[]};
export type DiagramEdge={id:string;kind:'command'|'coordination';pattern:'solid'|'dashed'|'dotted';startMarker:'none'|'arrow'|'dot';endMarker:'none'|'arrow'|'dot';points:Point[];source:Anchor|null;target:Anchor|null};
export type OrganisationScene={version:1;width:number;height:number;institution:boolean;heading:string;headingX:number;nodes:DiagramNode[];edges:DiagramEdge[]};
export const sides:Side[]=['top','right','bottom','left'];
export const sideLabels:Record<Side,string>={top:'Atas',right:'Kanan',bottom:'Bawah',left:'Kiri'};
export const sceneId=()=>`d-${crypto.randomUUID()}`;
const sum=(a:number[])=>a.reduce((n,x)=>n+x,0);
export function cellRect(node:DiagramNode,cell:DiagramCell){return {x:node.x+sum(node.columns.slice(0,cell.column)),y:node.y+sum(node.rows.slice(0,cell.row)),width:sum(node.columns.slice(cell.column,cell.column+cell.colSpan)),height:sum(node.rows.slice(cell.row,cell.row+cell.rowSpan))};}
export function sceneCells(scene:OrganisationScene){return scene.nodes.flatMap(node=>node.cells.map(cell=>({node,cell,rect:cellRect(node,cell)})));}
export function anchorPoint(scene:OrganisationScene,anchor:Anchor):Point|null {
    const found=sceneCells(scene).find(item=>item.cell.id===anchor.cellId);if(!found)return null;
    const {x,y,width,height}=found.rect,r=anchor.ratio;
    return anchor.side==='top'?{x:x+width*r,y}:anchor.side==='bottom'?{x:x+width*r,y:y+height}:anchor.side==='left'?{x,y:y+height*r}:{x:x+width,y:y+height*r};
}
export function addSceneRelation(scene:OrganisationScene,source:Anchor,target:Anchor):OrganisationScene {
    const start=anchorPoint(scene,source),end=anchorPoint(scene,target);
    if(!start||!end)throw new Error('Pilih kotak asal dan kotak tujuan yang tersedia.');
    if(source.cellId===target.cellId)throw new Error('Kotak asal dan tujuan harus berbeda.');
    const same=(a:Anchor|null,b:Anchor)=>a?.cellId===b.cellId&&a.side===b.side&&a.ratio===b.ratio;
    if(scene.edges.some(e=>e.kind==='command'&&same(e.source,source)&&same(e.target,target)))throw new Error('Hubungan ini sudah ada. Klik garisnya jika ingin mengubah atau menghapusnya.');
    const next=structuredClone(scene);
    const middle=(start.y+end.y)/2;
    next.edges.push({id:sceneId(),kind:'command',pattern:'solid',startMarker:'none',endMarker:'none',source:{...source},target:{...target},points:[start,{x:start.x,y:middle},{x:end.x,y:middle},end]});
    return validateScene(next);
}
export function removeSceneRelation(scene:OrganisationScene,id:string):OrganisationScene {
    const next=structuredClone(scene);next.edges=next.edges.filter(edge=>edge.id!==id);return next;
}
export function nearestCellAnchor(scene:OrganisationScene,cellId:string,point:Point):Anchor|null {
    const candidates=sides.map(side=>({cellId,side,ratio:.5}));
    return candidates.map(anchor=>({anchor,point:anchorPoint(scene,anchor)})).filter(item=>item.point!==null)
        .sort((a,b)=>Math.hypot(a.point!.x-point.x,a.point!.y-point.y)-Math.hypot(b.point!.x-point.x,b.point!.y-point.y))[0]?.anchor??null;
}
export function edgePoints(scene:OrganisationScene,edge:DiagramEdge):Point[]{const p=edge.points.map(point=>({...point}));if(edge.source)p[0]=anchorPoint(scene,edge.source)??p[0];if(edge.target)p[p.length-1]=anchorPoint(scene,edge.target)??p[p.length-1];return p;}
export function edgePath(scene:OrganisationScene,edge:DiagramEdge){return edgePoints(scene,edge).map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');}
export function makeNode(x=40,y=260,rows=1,columns=1,shape:DiagramNode['shape']='rectangle'):DiagramNode {
    return {id:sceneId(),x,y,rows:Array(rows).fill(80),columns:Array(columns).fill(180),shape,dark:false,cells:Array.from({length:rows*columns},(_,i)=>({id:sceneId(),row:Math.floor(i/columns),column:i%columns,rowSpan:1,colSpan:1,text:rows*columns===1?'Bagian baru':`Bagian ${i+1}`,fontSize:14,bold:false,align:'center'}))};
}
export function validateScene(raw:unknown):OrganisationScene {
    const fail=(message='Data bagan tidak valid.'):never=>{throw new Error(message);};
    const obj=(v:any,keys:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join()!==[...keys].sort().join())fail();};
    const num=(v:any,min:number,max:number)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail('Posisi atau ukuran bagan di luar batas.');};
    const text=(v:any,max:number)=>{if(typeof v!=='string'||v.length>max)fail();};
    const id=(v:any)=>{if(typeof v!=='string'||!/^[-a-zA-Z0-9_:]{1,100}$/.test(v))fail();};
    const enumValue=(v:any,values:any[])=>{if(!values.includes(v))fail();};
    const scene=raw as OrganisationScene;obj(scene,['version','width','height','institution','heading','headingX','nodes','edges']);
    if(scene.version!==1||typeof scene.institution!=='boolean')fail();num(scene.width,320,12000);num(scene.height,240,12000);num(scene.headingX,0,12000);text(scene.heading,500);
    if(!Array.isArray(scene.nodes)||scene.nodes.length>200||!Array.isArray(scene.edges)||scene.edges.length>500)fail('Maksimal 200 kelompok kotak dan 500 garis.');
    const ids=new Set<string>();const unique=(v:string)=>{id(v);if(ids.has(v))fail('Identitas elemen bagan berulang.');ids.add(v);};const cellIds=new Set<string>();
    for(const node of scene.nodes){obj(node,['id','x','y','columns','rows','shape','dark','cells']);unique(node.id);num(node.x,0,12000);num(node.y,0,12000);enumValue(node.shape,['rectangle','ellipse']);if(typeof node.dark!=='boolean')fail();
        for(const sizes of [node.rows,node.columns]){if(!Array.isArray(sizes)||!sizes.length||sizes.length>12)fail('Maksimal 12 baris dan 12 kolom per kelompok.');sizes.forEach(v=>num(v,10,2000));}
        if(node.x+sum(node.columns)>scene.width||node.y+sum(node.rows)>scene.height)fail('Ada kotak di luar frame. Perbesar frame atau geser kotak ke dalam.');
        if(!Array.isArray(node.cells)||node.cells.length>144)fail();const grid=new Set<string>();
        for(const cell of node.cells){obj(cell,['id','row','column','rowSpan','colSpan','text','fontSize','bold','align']);unique(cell.id);cellIds.add(cell.id);text(cell.text,4000);if(!cell.text.trim())fail('Isi tulisan setiap sel.');num(cell.fontSize,8,40);if(typeof cell.bold!=='boolean')fail();enumValue(cell.align,['left','center']);
            for(const key of ['row','column','rowSpan','colSpan'] as const)if(!Number.isInteger(cell[key]))fail();
            if(cell.row<0||cell.column<0||cell.rowSpan<1||cell.colSpan<1||cell.row+cell.rowSpan>node.rows.length||cell.column+cell.colSpan>node.columns.length)fail();
            for(let r=cell.row;r<cell.row+cell.rowSpan;r++)for(let c=cell.column;c<cell.column+cell.colSpan;c++){const key=`${r}:${c}`;if(grid.has(key))fail('Sel bertumpuk.');grid.add(key);}
        }if(grid.size!==node.rows.length*node.columns.length)fail('Ada ruang kosong pada kotak gabungan.');
    }
    for(const edge of scene.edges){obj(edge,['id','kind','pattern','startMarker','endMarker','points','source','target']);unique(edge.id);enumValue(edge.kind,['command','coordination']);enumValue(edge.pattern,['solid','dashed','dotted']);for(const marker of [edge.startMarker,edge.endMarker])enumValue(marker,['none','arrow','dot']);
        if(!Array.isArray(edge.points)||edge.points.length<2||edge.points.length>40)fail('Garis memerlukan 2 sampai 40 titik.');
        for(const p of edge.points){obj(p,['x','y']);num(p.x,0,scene.width);num(p.y,0,scene.height);}
        for(const anchor of [edge.source,edge.target])if(anchor!==null){obj(anchor,['cellId','side','ratio']);if(!cellIds.has(anchor.cellId))fail('Garis menunjuk kotak yang sudah dihapus.');enumValue(anchor.side,sides);num(anchor.ratio,0,1);}
        if(edge.source&&edge.target&&edge.source.cellId===edge.target.cellId)fail('Hubungkan dua sel yang berbeda.');
    }
    if(JSON.stringify(scene).length>450000)fail('Bagan terlalu besar.');return structuredClone(scene);
}
export function removeCells(scene:OrganisationScene,ids:Set<string>){scene.edges=scene.edges.filter(e=>!ids.has(e.source?.cellId??'')&&!ids.has(e.target?.cellId??''));}
export function mergeCells(scene:OrganisationScene,nodeId:string,selected:string[]):OrganisationScene {
    const next=structuredClone(scene),node=next.nodes.find(n=>n.id===nodeId)!;const cells=node.cells.filter(c=>selected.includes(c.id));
    if(cells.length<2)throw new Error('Pilih minimal dua sel yang berdampingan.');
    const row=Math.min(...cells.map(c=>c.row)),column=Math.min(...cells.map(c=>c.column)),r2=Math.max(...cells.map(c=>c.row+c.rowSpan)),c2=Math.max(...cells.map(c=>c.column+c.colSpan));
    if(cells.reduce((s,c)=>s+c.rowSpan*c.colSpan,0)!==(r2-row)*(c2-column))throw new Error('Pilih sel yang membentuk satu persegi panjang, tanpa celah.');
    cells.sort((a,b)=>a.row-b.row||a.column-b.column);const first=cells[0],removed=new Set(cells.slice(1).map(c=>c.id));
    Object.assign(first,{row,column,rowSpan:r2-row,colSpan:c2-column,text:cells.map(c=>c.text).join('\n')});node.cells=node.cells.filter(c=>!removed.has(c.id));
    for(const e of next.edges)for(const key of ['source','target'] as const)if(e[key]&&removed.has(e[key]!.cellId))e[key]!.cellId=first.id;
    next.edges=next.edges.filter(e=>!e.source||!e.target||e.source.cellId!==e.target.cellId);return validateScene(next);
}
export function splitCell(scene:OrganisationScene,nodeId:string,cellId:string):OrganisationScene {
    const next=structuredClone(scene),node=next.nodes.find(n=>n.id===nodeId)!,cell=node.cells.find(c=>c.id===cellId)!;
    for(let r=cell.row;r<cell.row+cell.rowSpan;r++)for(let c=cell.column;c<cell.column+cell.colSpan;c++)if(r!==cell.row||c!==cell.column)node.cells.push({...cell,id:sceneId(),row:r,column:c,rowSpan:1,colSpan:1,text:'Bagian baru'});
    cell.rowSpan=1;cell.colSpan=1;return validateScene(next);
}
export function resizeGrid(scene:OrganisationScene,nodeId:string,axis:'rows'|'columns',change:1|-1):OrganisationScene {
    const next=structuredClone(scene),node=next.nodes.find(n=>n.id===nodeId)!;
    const size=node[axis].length;if(size+change<1||size+change>12)throw new Error('Jumlah baris dan kolom antara 1 dan 12.');
    if(change===1){node[axis].push(axis==='rows'?80:180);const count=axis==='rows'?node.columns.length:node.rows.length;for(let i=0;i<count;i++)node.cells.push({id:sceneId(),row:axis==='rows'?size:i,column:axis==='columns'?size:i,rowSpan:1,colSpan:1,text:'Bagian baru',fontSize:14,bold:false,align:'center'});}
    else {node[axis].pop();const key=axis==='rows'?'row':'column',span=axis==='rows'?'rowSpan':'colSpan';const removed=new Set(node.cells.filter(c=>c[key]>=size-1).map(c=>c.id));node.cells=node.cells.filter(c=>!removed.has(c.id));node.cells.forEach(c=>c[span]=Math.min(c[span],size-1-c[key]));removeCells(next,removed);}
    next.width=Math.max(next.width,node.x+sum(node.columns)+30);next.height=Math.max(next.height,node.y+sum(node.rows)+30);return validateScene(next);
}
export function initialScene(table:ProfileTable,kind:'institution'|'organisation'):OrganisationScene {
    if(table.diagram)return structuredClone(table.diagram);
    const scene:OrganisationScene={version:1,width:1280,height:914,institution:kind==='institution',heading:table.title||(kind==='institution'?'Struktur organisasi\nPoliteknik Negeri Madiun':''),headingX:686,nodes:[],edges:[]};
    // Existing custom links remain available, rather than being replaced by the reference.
    if(table.connections!==undefined){
        const nodes=organisationNodes(table),parents=new Map(table.connections.map(e=>[e.to,e.from]));const levels=new Map<string,number>();const depth=(id:string):number=>levels.get(id)??(levels.set(id,parents.has(id)?depth(parents.get(id)!)+1:0),levels.get(id)!);
        const counts=new Map<number,number>();for(const n of nodes){const level=depth(n.id),col=counts.get(level)??0;counts.set(level,col+1);scene.nodes.push({id:`node-${n.id}`,x:30+col*250,y:220+level*160,columns:[220],rows:[100],shape:'rectangle',dark:kind==='organisation'&&level===0,cells:[{id:`cell-${n.id}`,row:0,column:0,rowSpan:1,colSpan:1,text:n.label,fontSize:14,bold:false,align:'center'}]});}
        scene.width=Math.max(1280,...[...counts.values()].map(c=>c*250+30));scene.height=Math.max(914,...scene.nodes.map(n=>n.y+160));
        scene.edges=table.connections.map((e,i)=>({id:`edge-${i}`,kind:'command',pattern:'solid',startMarker:'none',endMarker:'arrow',source:{cellId:`cell-${e.from}`,side:'bottom',ratio:.5},target:{cellId:`cell-${e.to}`,side:'top',ratio:.5},points:[{x:0,y:0},{x:0,y:0}]}));return scene;
    }
    if(kind==='institution'){
        const layout=institutionLayout(table);scene.width=layout.width;scene.height=layout.height;scene.headingX=layout.spine;scene.heading=layout.titleLines.join('\n');
        const leaderBoxes=layout.boxes.filter(b=>b.id==='director'||b.id.startsWith('deputy-'));
        for(const b of layout.boxes.filter(b=>!leaderBoxes.includes(b))){scene.nodes.push({id:b.id,x:b.x,y:b.y,columns:[b.width],rows:[b.height],shape:b.shape,dark:false,cells:[{id:`cell-${b.id}`,row:0,column:0,rowSpan:1,colSpan:1,text:b.texts.map(t=>t.lines.join('\n')).join('\n'),fontSize:b.fontSize,bold:!!b.bold,align:b.align}]});}
        if(leaderBoxes.length){const boundaries=(values:number[])=>values.sort((a,b)=>a-b).filter((v,i,a)=>i===0||Math.abs(v-a[i-1])>.001);const xs=boundaries(leaderBoxes.flatMap(b=>[b.x,b.x+b.width])),ys=boundaries(leaderBoxes.flatMap(b=>[b.y,b.y+b.height]));const at=(values:number[],n:number)=>values.findIndex(v=>Math.abs(v-n)<.001);scene.nodes.push({id:'leadership',x:xs[0],y:ys[0],columns:xs.slice(1).map((x,i)=>x-xs[i]),rows:ys.slice(1).map((y,i)=>y-ys[i]),shape:'rectangle',dark:false,cells:leaderBoxes.map(b=>({id:`cell-${b.id}`,row:at(ys,b.y),column:at(xs,b.x),rowSpan:at(ys,b.y+b.height)-at(ys,b.y),colSpan:at(xs,b.x+b.width)-at(xs,b.x),text:b.texts.map(t=>t.lines.join('\n')).join('\n'),fontSize:b.fontSize,bold:!!b.bold,align:b.align}))});}
        const represented=new Set(layout.boxes.map(box=>box.row));let extraY=scene.height;
        table.rows.forEach((row,i)=>{if(represented.has(row))return;const text=cellEntries(row[1] as ProfileCell).join('\n');if(!text)return;scene.nodes.push({id:`additional-${i}`,x:40,y:extraY,columns:[360],rows:[Math.max(100,text.split('\n').length*20+30)],shape:'rectangle',dark:false,cells:[{id:`cell-additional-${i}`,row:0,column:0,rowSpan:1,colSpan:1,text,fontSize:14,bold:false,align:'left'}]});extraY+=scene.nodes.at(-1)!.rows[0]+30;});scene.height=Math.max(scene.height,extraY);
        for(const path of layout.paths){const tokens=path.d.match(/[MHV]|-?\d+(?:\.\d+)?/g)??[];let current:Point={x:0,y:0},points:Point[]=[];const flush=()=>{if(points.length>1)scene.edges.push({id:`${path.id}-${scene.edges.length}`,kind:path.coordination?'coordination':'command',pattern:path.coordination?'dashed':'solid',startMarker:'none',endMarker:'none',points,source:null,target:null});points=[];};for(let i=0;i<tokens.length;){const command=tokens[i++];if(command==='M'){flush();current={x:Number(tokens[i++]),y:Number(tokens[i++])};points.push(current);}else if(command==='H'){current={...current,x:Number(tokens[i++])};points.push(current);}else if(command==='V'){current={...current,y:Number(tokens[i++])};points.push(current);}}flush();}
    }else{
        scene.institution=false;scene.height=520;scene.heading='';const row=(role:string)=>table.rows.find((_,i)=>organisationRole(table,i)===role);const labels=(role:string)=>row(role)?cellEntries(row(role)![1] as ProfileCell):[];
        const make=(id:string,text:string,x:number,y:number,w:number,h:number,dark=false)=>scene.nodes.push({id,x,y,columns:[w],rows:[h],shape:'rectangle',dark,cells:[{id:`cell-${id}`,row:0,column:0,rowSpan:1,colSpan:1,text,fontSize:16,bold:dark,align:'center'}]});
        const leaders=labels('leader');if(leaders.length)make('leader',leaders.join('\n'),430,30,420,100,true);
        labels('operator').forEach((text,i)=>make(`operator-${i}`,text,760,155+i*90,260,75));
        const groups=labels('groups');scene.width=Math.max(1280,groups.length*300+40);groups.forEach((text,i)=>make(`group-${i}`,text,40+i*300,330,270,100));
        const add=(id:string,points:Point[])=>scene.edges.push({id,kind:'command',pattern:'solid',startMarker:'none',endMarker:'none',source:null,target:null,points});
        if(leaders.length){add('spine',[{x:640,y:130},{x:640,y:300}]);labels('operator').forEach((_,i)=>add(`op-line-${i}`,[{x:640,y:192.5+i*90},{x:760,y:192.5+i*90}]));if(groups.length){add('group-branch',[{x:175,y:300},{x:175+(groups.length-1)*300,y:300}]);groups.forEach((_,i)=>add(`group-line-${i}`,[{x:175+i*300,y:300},{x:175+i*300,y:330}]));}}
        let y=470;table.rows.forEach((r,i)=>{if(['leader','operator','groups'].includes(organisationRole(table,i)))return;make(`other-${i}`,cellEntries(r[1] as ProfileCell).join('\n'),40,y,300,100);y+=130;});scene.height=Math.max(520,y);
    }
    // Attach endpoints that visibly touch cells; branch junctions retain their exact coordinates.
    for(const edge of scene.edges)for(const [key,index] of [['source',0],['target',edge.points.length-1]] as const){const p=edge.points[index];outer:for(const {cell,rect:r} of sceneCells(scene)){for(const side of sides){const horizontal=side==='top'||side==='bottom',fixed=side==='top'?r.y:side==='bottom'?r.y+r.height:side==='left'?r.x:r.x+r.width,variable=horizontal?p.x:p.y,start=horizontal?r.x:r.y,length=horizontal?r.width:r.height;if(Math.abs((horizontal?p.y:p.x)-fixed)<.1&&variable>=start-.1&&variable<=start+length+.1){edge[key]={cellId:cell.id,side,ratio:Math.max(0,Math.min(1,(variable-start)/length))};break outer;}}}}
    return scene;
}
