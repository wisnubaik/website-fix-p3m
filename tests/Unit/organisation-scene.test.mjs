import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const root=fileURLToPath(new URL('../../',import.meta.url));
const defaults=JSON.parse(fs.readFileSync(root+'database/cms-default-content.json','utf8'));
const table=n=>JSON.parse(defaults.tables.ProfileTableContent.find(r=>r.documentId===`revision-profil-image-${n}`).content).tables[0];
let server,m,layout,Editor,Public,validate,deleteKey,actions,shortcut,NodeForm;
before(async()=>{server=await createServer({configFile:false,root,plugins:[react()],resolve:{alias:{'@':root+'resources/js'}},server:{middlewareMode:true,watch:null}});m=await server.ssrLoadModule('/resources/js/lib/organisation-scene.ts');layout=(await server.ssrLoadModule('/resources/js/lib/institution-diagram.ts')).institutionLayout;const editorModule=await server.ssrLoadModule('/resources/js/components/admin/OrganisationSceneEditor.tsx');Editor=editorModule.default;deleteKey=editorModule.handleRelationDeleteKey;shortcut=editorModule.handleSceneShortcut;NodeForm=editorModule.NodeForm;actions=await server.ssrLoadModule('/resources/js/lib/organisation-scene-actions.ts');Public=(await server.ssrLoadModule('/resources/js/components/ui/OrganisationScene.tsx')).default;validate=(await server.ssrLoadModule('/resources/js/lib/profile-tables.ts')).validateProfileContent;});
after(async()=>await server?.close());
test('PNM conversion retains every original box boundary, label, oval and line geometry',()=>{
 const source=table(1),before=JSON.stringify(source),scene=m.validateScene(m.initialScene(source,'institution')),original=layout(source);
 assert.equal(JSON.stringify(source),before);assert.equal(scene.nodes.filter(n=>n.shape==='ellipse').length,original.boxes.filter(b=>b.shape==='ellipse').length);
 for(const box of original.boxes){const match=m.sceneCells(scene).find(c=>c.cell.id===`cell-${box.id}`);assert.ok(match,box.id);for(const k of ['x','y','width','height'])assert.ok(Math.abs(match.rect[k]-box[k])<.001,`${box.id} ${k}`);assert.equal(match.cell.text,box.texts.map(t=>t.lines.join('\n')).join('\n'));}
 assert.equal(scene.edges.length,original.paths.reduce((n,p)=>n+(p.d.match(/M /g)||[]).length,0));
 assert.ok(scene.edges.some(e=>e.kind==='coordination'&&e.pattern==='dashed'));
 const leadership=scene.nodes.find(n=>n.id==='leadership');assert.equal(leadership.cells.find(c=>c.id==='cell-director').colSpan,3);
});
test('opening either editor mode does not mutate PNM or P3M content',()=>{
 for(const [n,kind] of [[1,'institution'],[2,'organisation']]){const source=table(n),before=JSON.stringify(source);const html=renderToStaticMarkup(React.createElement(Editor,{table:source,kind,onChange(){throw new Error('Opening editor must not change data');}}));assert.equal(JSON.stringify(source),before);assert.match(html,/Lewat formulir/);assert.match(html,/Langsung di bagan/);assert.match(html,/Tambah hubungan/);assert.doesNotMatch(html,/Tambah kotak gabungan|Pilih kelompok kotak|Pilih hubungan|Posisi titik garis|Excel|Lebar frame|Tinggi frame/);}
});
test('diagram survives validation and JSON round trip, renders the same merged cells publicly',()=>{
 const source=table(1);source.diagram=m.initialScene(source,'institution');const checked=validate(JSON.parse(JSON.stringify({tables:[source]}))).tables[0];assert.deepEqual(checked.diagram,source.diagram);
 const html=renderToStaticMarkup(React.createElement(Public,{scene:checked.diagram,title:'PNM'}));assert.match(html,/DIREKTUR/);assert.match(html,/Garis Koordinasi/);assert.doesNotMatch(html,/data-port-cell/);
});
test('new grouped boxes merge and split without losing text and preserve external connections',()=>{
 const scene=m.initialScene(table(2),'organisation'),node=m.makeNode(20,20,2,3);scene.nodes.push(node);
 const selected=node.cells.slice(0,3).map(c=>c.id);scene.edges.push({id:'test-edge',kind:'coordination',pattern:'dotted',startMarker:'dot',endMarker:'none',points:[{x:0,y:0},{x:10,y:10}],source:{cellId:scene.nodes[0].cells[0].id,side:'left',ratio:.5},target:{cellId:selected[2],side:'top',ratio:.5}});
 const merged=m.mergeCells(scene,node.id,selected),group=merged.nodes.find(n=>n.id===node.id);assert.equal(group.cells.length,4);assert.equal(group.cells[0].colSpan,3);assert.match(group.cells[0].text,/Bagian 1\nBagian 2\nBagian 3/);assert.equal(merged.edges.at(-1).target.cellId,selected[0]);
 const split=m.splitCell(merged,node.id,selected[0]);assert.equal(split.nodes.find(n=>n.id===node.id).cells.length,6);assert.equal(split.edges.at(-1).target.cellId,selected[0]);
});
test('invalid merges, overlapping cells, dangling edges, and out of frame coordinates are rejected',()=>{
 const scene=m.initialScene(table(2),'organisation'),node=m.makeNode(20,20,2,3);scene.nodes.push(node);
 assert.throws(()=>m.mergeCells(scene,node.id,[node.cells[0].id,node.cells[4].id]),/persegi panjang/);
 for(const mutate of [s=>s.nodes[0].x=-1,s=>s.nodes[0].cells.push({...s.nodes[0].cells[0],id:'extra'}),s=>s.edges[0].target={cellId:'missing',side:'top',ratio:.5}]){const bad=structuredClone(scene);mutate(bad);assert.throws(()=>m.validateScene(bad));}
});
test('adding and deleting grid rows removes only affected cells and their links',()=>{
 let scene=m.initialScene(table(2),'organisation');const node=m.makeNode(20,20,2,3);scene.nodes.push(node);scene=m.resizeGrid(scene,node.id,'rows',1);assert.equal(scene.nodes.at(-1).cells.length,9);
 const last=scene.nodes.at(-1).cells.at(-1).id;scene.edges.push({id:'tail',kind:'command',pattern:'solid',startMarker:'none',endMarker:'arrow',source:{cellId:scene.nodes[0].cells[0].id,side:'bottom',ratio:.5},target:{cellId:last,side:'top',ratio:.5},points:[{x:0,y:0},{x:10,y:10}]});scene=m.resizeGrid(scene,node.id,'rows',-1);assert.equal(scene.nodes.at(-1).cells.length,6);assert.ok(!scene.edges.some(e=>e.id==='tail'));
});
test('moving a merged group keeps cell-specific line attachments and permits simultaneous coordination',()=>{
 const scene=m.initialScene(table(1),'institution'),node=scene.nodes.find(n=>n.id==='leadership'),cell=node.cells[1];
 const e={id:'custom-coordination',kind:'coordination',pattern:'dashed',startMarker:'none',endMarker:'none',source:{cellId:cell.id,side:'bottom',ratio:.5},target:null,points:[{x:0,y:0},{x:100,y:500}]};scene.edges.push(e);
 const before=m.edgePoints(scene,e)[0];node.x+=40;node.y+=20;const after=m.edgePoints(scene,e)[0];assert.equal(after.x-before.x,40);assert.equal(after.y-before.y,20);m.validateScene(scene);
});

test('explicit relation creation rejects missing, self and repeated endpoints without changing the original',()=>{
 const scene=m.initialScene(table(2),'organisation'),source={cellId:scene.nodes[0].cells[0].id,side:'bottom',ratio:.5},target={cellId:scene.nodes[1].cells[0].id,side:'top',ratio:.5};
 const original=JSON.stringify(scene);assert.throws(()=>m.addSceneRelation(scene,source,{...target,cellId:''}),/tersedia/);assert.throws(()=>m.addSceneRelation(scene,source,source),/berbeda/);
 const added=m.addSceneRelation(scene,source,target);assert.equal(added.edges.length,scene.edges.length+1);assert.equal(JSON.stringify(scene),original);
 assert.throws(()=>m.addSceneRelation(added,source,target),/sudah ada/);
});
test('deleting one selected relation retains all other edges, boxes, labels and saved layout',()=>{
 const scene=m.initialScene(table(2),'organisation'),source={cellId:scene.nodes[0].cells[0].id,side:'bottom',ratio:.5},target={cellId:scene.nodes[1].cells[0].id,side:'top',ratio:.5};
 const added=m.addSceneRelation(scene,source,target),other=m.addSceneRelation(added,source,{...target,cellId:scene.nodes[2].cells[0].id});
 const deleted=m.removeSceneRelation(other,added.edges.at(-1).id);
 assert.deepEqual(deleted.nodes,scene.nodes);assert.deepEqual(deleted.edges,[...scene.edges,other.edges.at(-1)]);assert.equal(other.edges.length,scene.edges.length+2);m.validateScene(deleted);
 assert.deepEqual(m.removeSceneRelation(other,'unknown'),other);
});
test('dropping a relation onto a box selects its nearest connection side',()=>{
 const scene=m.initialScene(table(2),'organisation'),{cell,rect}=m.sceneCells(scene)[0];
 assert.equal(m.nearestCellAnchor(scene,cell.id,{x:rect.x+rect.width,y:rect.y+rect.height/2}).side,'right');
 assert.equal(m.nearestCellAnchor(scene,cell.id,{x:rect.x+rect.width/2,y:rect.y}).side,'top');
 assert.equal(m.nearestCellAnchor(scene,'missing',{x:0,y:0}),null);
});

test('Backspace and Delete remove only an active relation and never consume text editing or shortcuts',()=>{
 for(const key of ['Backspace','Delete']){
  for(const field of [null,'input','textarea','select','contenteditable']){
   let deleted=0,prevented=0,stopped=0;
   const event={key,target:{closest:()=>field},nativeEvent:{},preventDefault(){prevented++;},stopPropagation(){stopped++;}};
   deleteKey(event,true,()=>deleted++);
   assert.equal(deleted,field?0:1);assert.equal(prevented,field?0:1);assert.equal(stopped,field?0:1);
  }
 }
 for(const overrides of [{key:'Enter'},{ctrlKey:true},{metaKey:true},{altKey:true},{defaultPrevented:true},{nativeEvent:{isComposing:true}}]){
  const event={key:'Backspace',target:{closest:()=>null},nativeEvent:{},preventDefault(){throw new Error('Must not intercept');},...overrides};deleteKey(event,true,()=>assert.fail('Must not delete'));
 }
 deleteKey({key:'Delete',target:{closest:()=>null},nativeEvent:{}},false,()=>assert.fail('No selected relation'));
});

test('copy and paste a group preserve merged text and styles with fresh IDs and only internal relations',()=>{
 const scene=m.initialScene(table(1),'institution'),node=scene.nodes.find(n=>n.id==='leadership');
 scene.edges.push({id:'internal',kind:'coordination',pattern:'dotted',startMarker:'dot',endMarker:'arrow',source:{cellId:node.cells[1].id,side:'bottom',ratio:.5},target:{cellId:node.cells[2].id,side:'bottom',ratio:.5},points:[{x:0,y:0},{x:0,y:0}]});
 const before=JSON.stringify(scene),clip=actions.copySceneSelection(scene,{node:node.id});assert.equal(clip.kind,'node');
 const pasted=actions.pasteSceneSelection(scene,clip),copy=pasted.scene.nodes.at(-1);
 assert.notEqual(copy.id,node.id);assert.deepEqual(copy.cells.map(c=>c.text),node.cells.map(c=>c.text));assert.equal(copy.cells[0].colSpan,node.cells[0].colSpan);assert.equal(copy.dark,node.dark);assert.equal(copy.x,node.x+30);
 assert.ok(copy.cells.every(c=>!node.cells.some(old=>old.id===c.id)));
 const internal=pasted.scene.edges.at(-1);assert.equal(internal.pattern,'dotted');assert.equal(internal.source.cellId,copy.cells[1].id);assert.equal(internal.target.cellId,copy.cells[2].id);
 assert.equal(JSON.stringify(scene),before);m.validateScene(pasted.scene);
 const twice=actions.pasteSceneSelection(pasted.scene,clip,60);assert.notEqual(twice.scene.nodes.at(-1).id,copy.id);m.validateScene(twice.scene);
});
test('copied lines paste separately without moving old endpoints or retaining stale links',()=>{
 const scene=m.initialScene(table(2),'organisation'),id=scene.edges[0].id,clip=actions.copySceneSelection(scene,{edge:id});
 const result=actions.pasteSceneSelection(scene,clip),edge=result.scene.edges.at(-1),points=m.edgePoints(scene,scene.edges[0]);
 assert.equal(edge.source,null);assert.equal(edge.target,null);assert.equal(edge.points[0].x,points[0].x+30);assert.notEqual(edge.id,id);assert.deepEqual(result.scene.edges.slice(0,-1),scene.edges);
 const withoutSource=actions.deleteSceneSelection(scene,{node:scene.nodes[0].id});m.validateScene(actions.pasteSceneSelection(withoutSource,clip).scene);
});
test('deleting a selected group removes its cells and connected lines while preserving unrelated elements',()=>{
 const scene=m.initialScene(table(1),'institution'),node=scene.nodes.find(n=>n.id==='leadership'),ids=new Set(node.cells.map(c=>c.id)),before=JSON.stringify(scene);
 const result=actions.deleteSceneSelection(scene,{node:node.id});assert.equal(result.nodes.length,scene.nodes.length-1);
 assert.deepEqual(result.edges,scene.edges.filter(e=>!ids.has(e.source?.cellId)&&!ids.has(e.target?.cellId)));assert.equal(JSON.stringify(scene),before);m.validateScene(result);
});
test('grouped oval and dark appearance preserve all cells and links and render on the public page',()=>{
 const scene=m.initialScene(table(1),'institution'),node=scene.nodes.find(n=>n.id==='leadership');
 const result=actions.updateSceneNode(scene,node.id,{shape:'ellipse',dark:true}),changed=result.nodes.find(n=>n.id===node.id);
 assert.deepEqual(changed.cells,node.cells);assert.deepEqual(result.edges,scene.edges);assert.equal(changed.shape,'ellipse');assert.equal(changed.dark,true);
 const html=renderToStaticMarkup(React.createElement(Public,{scene:result,title:'PNM'}));assert.ok((html.match(/<ellipse /g)||[]).length>=node.cells.length);assert.match(html,/fill="#183249"/);
 const form=renderToStaticMarkup(React.createElement(NodeForm,{node:changed,onApply(){}}));assert.match(form,/<option value="ellipse" selected="">Oval/);assert.doesNotMatch(form,/disabled/);assert.match(form,/checked=""/);
 const grown=actions.updateSceneNode(result,node.id,{x:result.width});assert.ok(grown.width>result.width);m.validateScene(grown);
 const resized=m.resizeGrid(result,node.id,'columns',1);assert.equal(resized.nodes.find(n=>n.id===node.id).columns.length,node.columns.length+1);
});
test('dragging a connected line shifts its route while keeping its attached endpoints',()=>{
 const scene=m.initialScene(table(2),'organisation'),source={cellId:scene.nodes[0].cells[0].id,side:'bottom',ratio:.5},target={cellId:scene.nodes[1].cells[0].id,side:'top',ratio:.5};
 const added=m.addSceneRelation(scene,source,target),edge=added.edges.at(-1);edge.points=[m.anchorPoint(added,source),m.anchorPoint(added,target)];
 const points=m.edgePoints(added,edge),moved=actions.moveSceneEdge(added,edge.id,20,15),result=moved.edges.at(-1),after=m.edgePoints(moved,result);
 assert.equal(after.length,4);assert.deepEqual(after[0],points[0]);assert.deepEqual(after.at(-1),points.at(-1));assert.equal(after[1].x,points[0].x+(points[1].x-points[0].x)/3+20);assert.deepEqual(result.source,source);assert.deepEqual(result.target,target);m.validateScene(moved);
 const free=actions.pasteSceneSelection(added,actions.copySceneSelection(added,{edge:edge.id})).scene,freeEdge=free.edges.at(-1);
 const freeMoved=actions.moveSceneEdge(free,freeEdge.id,10,10);assert.equal(freeMoved.edges.at(-1).points[0].x,freeEdge.points[0].x+10);
 m.validateScene(actions.moveSceneEdge(free,freeEdge.id,-100000,-100000));
});
test('diagram keyboard shortcuts dispatch undo redo copy paste delete without stealing text shortcuts',()=>{
 for(const [key,options,expected] of [['z',{ctrlKey:true},'undo'],['y',{ctrlKey:true},'redo'],['z',{ctrlKey:true,shiftKey:true},'redo'],['c',{ctrlKey:true},'copy'],['v',{ctrlKey:true},'paste'],['Backspace',{},'remove'],['Delete',{},'remove'],['z',{metaKey:true},'undo']]){
  let called=[],prevented=0;const actions=Object.fromEntries(['undo','redo','copy','paste','remove'].map(name=>[name,()=>called.push(name)]));
  const event={key,target:{closest:()=>null},nativeEvent:{},preventDefault(){prevented++;},stopPropagation(){},...options};
  shortcut(event,true,actions);assert.deepEqual(called,[expected]);assert.equal(prevented,1);
  called=[];prevented=0;shortcut({...event,target:{closest:()=>({})}},true,actions);assert.deepEqual(called,[]);assert.equal(prevented,0);
 }
});

test('text size alignment and weight updates survive persistence and change public SVG output',()=>{
 const source=table(2),scene=m.initialScene(source,'organisation'),node=scene.nodes[0],cell=node.cells[0];
 const next=actions.updateSceneCell(scene,node.id,cell.id,{text:'Tulisan revisi',fontSize:24,bold:true,align:'left'});
 const saved=validate(JSON.parse(JSON.stringify({tables:[{...source,diagram:next}]}))).tables[0].diagram;
 const html=renderToStaticMarkup(React.createElement(Public,{scene:saved,title:'P3M'}));assert.match(html,/font-size="24"/);assert.match(html,/font-weight="700"/);assert.match(html,/text-anchor="start"/);assert.match(html,/Tulisan revisi/);
 const again=actions.updateSceneCell(saved,node.id,cell.id,{fontSize:12,bold:false,align:'center'}).nodes[0].cells[0];assert.equal(again.fontSize,12);assert.equal(again.bold,false);assert.equal(again.align,'center');assert.notEqual(cell.text,'Tulisan revisi');
 assert.throws(()=>actions.updateSceneCell(scene,node.id,cell.id,{text:''}));assert.throws(()=>actions.updateSceneCell(scene,node.id,cell.id,{fontSize:0}));
});
