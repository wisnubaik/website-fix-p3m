import {copySceneSelection,pasteSceneSelection,deleteSceneSelection,updateSceneNode,updateSceneCell,moveSceneEdge,type SceneClipboard} from '@/lib/organisation-scene-actions';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ProfileTable} from '@/lib/profile-tables';
import {SceneDrawing} from '@/components/ui/OrganisationScene';
import {anchorPoint,nearestCellAnchor,addSceneRelation,edgePath,edgePoints,initialScene,makeNode,mergeCells,resizeGrid,sceneCells,sideLabels,sides,splitCell,validateScene,type Anchor,type DiagramCell,type DiagramEdge,type DiagramNode,type OrganisationScene,type Point,type Side} from '@/lib/organisation-scene';

type Props={table:ProfileTable;kind:'institution'|'organisation';onChange:(table:ProfileTable)=>void};
type Selection={node?:string;cell?:string;edge?:string};
type Gesture={type:'node'|'edge'|'point'|'new';start:Point;base:OrganisationScene;node?:string;edge?:string;index?:number;source?:Anchor};
const sideOptions=sides.map(side=><option key={side} value={side}>{sideLabels[side]}</option>);
const total=(values:number[])=>values.reduce((a,b)=>a+b,0);

export function handleRelationDeleteKey(event:React.KeyboardEvent<HTMLDivElement>,hasSelection:boolean,onDelete:()=>void){
    if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||event.nativeEvent.isComposing)return;
    if(event.key!=='Backspace'&&event.key!=='Delete')return;
    const target=event.target as Element;
    if(target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]')||!hasSelection)return;
    event.preventDefault();event.stopPropagation();onDelete();
}

type ShortcutActions={undo:()=>void;redo:()=>void;copy:()=>void;paste:()=>void;remove:()=>void};
export function handleSceneShortcut(event:React.KeyboardEvent<HTMLDivElement>,hasSelection:boolean,actions:ShortcutActions){
    const target=event.target as Element;
    if(event.defaultPrevented||event.altKey||event.nativeEvent.isComposing||target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]'))return;
    if(event.ctrlKey||event.metaKey){
        const key=event.key.toLowerCase();
        const action=key==='z'?(event.shiftKey?'redo':'undo'):key==='y'?'redo':key==='c'&&hasSelection?'copy':key==='v'?'paste':null;
        if(action){event.preventDefault();event.stopPropagation();if(!event.repeat)actions[action]();}
        return;
    }
    handleRelationDeleteKey(event,hasSelection,actions.remove);
}

export function CellForm({cell,onApply,simple=false}:{cell:DiagramCell;onApply:(patch:Partial<DiagramCell>)=>boolean;simple?:boolean}){
    const [text,setText]=useState(cell.text),[size,setSize]=useState(String(cell.fontSize)),[error,setError]=useState(''),[notice,setNotice]=useState('');
    useEffect(()=>setText(cell.text),[cell.id,cell.text]);
    useEffect(()=>setSize(String(cell.fontSize)),[cell.id,cell.fontSize]);
    function apply(patch:Partial<DiagramCell>){setError('');setNotice('');if(onApply(patch)){setNotice('Tulisan pada bagan diperbarui. Klik Simpan bagian ini untuk menyimpannya.');return true;}setError('Perubahan belum diterapkan. Periksa pesan pada editor bagan.');return false;}
    function applyText(){
        if(!text.trim()){setError('Nama jabatan atau unit wajib diisi.');return;}
        if(!simple&&(!size.trim()||!Number.isFinite(Number(size))||Number(size)<8||Number(size)>40)){setError('Ukuran tulisan harus antara 8 dan 40.');return;}
        apply({text:text.trim(),...(!simple?{fontSize:Number(size)}:{})});
    }
    return <div>
        <label className="cms-field"><span>Nama jabatan atau unit</span><textarea rows={4} required maxLength={4000} value={text} onChange={e=>{setText(e.target.value);setNotice('');}}/></label>
        {!simple&&<><div className="cms-row"><label className="cms-field"><span>Ukuran tulisan</span><input type="number" min="8" max="40" step="any" value={size} onChange={e=>{const value=e.target.value;setSize(value);if(value!==''&&Number(value)>=8&&Number(value)<=40)apply({fontSize:Number(value)});}} onBlur={()=>{if(size===''||!Number.isFinite(Number(size))||Number(size)<8||Number(size)>40)setError('Ukuran tulisan harus antara 8 dan 40.');}}/></label><label className="cms-field"><span>Perataan</span><select value={cell.align} onChange={e=>apply({align:e.target.value as DiagramCell['align']})}><option value="center">Tengah</option><option value="left">Kiri</option></select></label></div>
        <label className="flex gap-2 my-3"><input type="checkbox" checked={cell.bold} onChange={e=>apply({bold:e.target.checked})}/>Tulisan tebal</label><p className="cms-help my-2">Ukuran, perataan, dan ketebalan langsung terlihat di bagan.</p></>}
        <button className="cms-button primary" type="button" onClick={applyText}>Terapkan tulisan</button>
        {error&&<p role="alert" className="cms-notice error">{error}</p>}{notice&&<p role="status" className="cms-help mt-2">{notice}</p>}
    </div>;
}
export function NodeForm({node,onApply}:{node:DiagramNode;onApply:(patch:Partial<DiagramNode>)=>void}){
    return <div>
        <div className="cms-row"><label className="cms-field"><span>Bentuk kotak</span><select value={node.shape} onChange={e=>onApply({shape:e.target.value as DiagramNode['shape']})}><option value="rectangle">Persegi panjang</option><option value="ellipse">Oval</option></select></label><label className="cms-field"><span>Warna kotak</span><span><input type="checkbox" checked={node.dark} onChange={e=>onApply({dark:e.target.checked})}/> Latar gelap</span></label></div>
        <p className="cms-help my-2">Bentuk dan warna langsung terlihat di bagan. Pada kotak gabungan, pilihan berlaku untuk semua kotak di dalam kelompok.</p>
        <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);onApply({x:Number(f.get('x')),y:Number(f.get('y')),columns:node.columns.map((_,i)=>Number(f.get(`c${i}`))),rows:node.rows.map((_,i)=>Number(f.get(`r${i}`)))});}}>
            <div className="cms-row">{(['x','y'] as const).map((key,i)=><label className="cms-field" key={key}><span>{i?'Posisi dari atas':'Posisi dari kiri'}</span><input type="number" name={key} min="0" max="12000" step="any" required defaultValue={node[key]}/></label>)}</div>
            <details className="my-3"><summary>Ukuran baris dan kolom</summary><div className="grid grid-cols-2 gap-3 mt-3">{node.columns.map((value,i)=><label className="cms-field" key={`c${i}`}><span>Lebar kolom {i+1}</span><input type="number" min="10" max="2000" step="any" required name={`c${i}`} defaultValue={value}/></label>)}{node.rows.map((value,i)=><label className="cms-field" key={`r${i}`}><span>Tinggi baris {i+1}</span><input type="number" min="10" max="2000" step="any" required name={`r${i}`} defaultValue={value}/></label>)}</div></details>
            <button className="cms-button" type="submit">Terapkan posisi dan ukuran</button>
        </form>
    </div>;
}
export default function OrganisationSceneEditor({table,kind,onChange}:Props){
    const stored=useMemo(()=>initialScene(table,kind),[table,kind]);
    const [preview,setPreview]=useState<OrganisationScene|null>(null),[mode,setMode]=useState<'frame'|'form'>('form'),[tool,setTool]=useState<'select'|'connect'>('select'),[locked,setLocked]=useState(true),[zoom,setZoom]=useState(.65);
    const [selection,setSelection]=useState<Selection>({}),[checked,setChecked]=useState<string[]>([]),[error,setError]=useState(''),[message,setMessage]=useState('');
    const [addingRelation,setAddingRelation]=useState(false),[from,setFrom]=useState(''),[to,setTo]=useState(''),[addingBox,setAddingBox]=useState(false),[boxName,setBoxName]=useState('');
    const [source,setSource]=useState<Anchor|null>(null);const [revision,setRevision]=useState(0);
    const undo=useRef<OrganisationScene[]>([]),redo=useRef<OrganisationScene[]>([]),gesture=useRef<Gesture|null>(null),moved=useRef(false),svg=useRef<SVGSVGElement>(null),frame=useRef<HTMLDivElement>(null);
    const previewRef=useRef<OrganisationScene|null>(null),clipboard=useRef<SceneClipboard|null>(null),pasteCount=useRef(0);
    const scene=preview??stored;const node=scene.nodes.find(n=>n.id===selection.node),cell=node?.cells.find(c=>c.id===selection.cell),edge=scene.edges.find(e=>e.id===selection.edge),allCells=sceneCells(scene);
    function commit(next:OrganisationScene,history=true){try{const valid=validateScene(next);if(history){undo.current=[...undo.current.slice(-39),structuredClone(stored)];redo.current=[];}onChange({...table,diagram:valid});setPreview(null);setError('');setMessage('Perubahan masuk ke draf bagan. Klik Simpan bagian ini untuk memperbarui halaman profil.');setRevision(v=>v+1);return true;}catch(e){setPreview(null);setError((e as Error).message);return false;}}
    function change(edit:(next:OrganisationScene)=>void){try{const next=structuredClone(stored);edit(next);commit(next);}catch(e){setError((e as Error).message);}}
    function history(back:boolean){cancelGesture();const list=back?undo.current:redo.current;if(!list.length)return;const next=list.pop()!;(back?redo.current:undo.current).push(structuredClone(stored));commit(next,false);setSelection({});setChecked([]);}
    function selectNode(nodeId:string,cellId:string){if(moved.current)return;setSelection({node:nodeId,cell:cellId});setChecked([]);setError('');svg.current?.focus({preventScroll:true});}
    function point(event:{clientX:number;clientY:number}):Point{const matrix=svg.current?.getScreenCTM();if(!matrix)return{x:0,y:0};const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());return{x:Math.max(0,Math.min(stored.width,p.x)),y:Math.max(0,Math.min(stored.height,p.y))};}
    function port(target:Element|null):Anchor|null {const el=target?.closest('[data-port-cell]');if(!el)return null;return {cellId:el.getAttribute('data-port-cell')!,side:el.getAttribute('data-port-side') as Side,ratio:.5};}
    function newEdge(from:Anchor,to:Anchor){
        try {const next=addSceneRelation(stored,from,to);if(commit(next)){setSelection({edge:next.edges.at(-1)!.id});setSource(null);setAddingRelation(false);setFrom('');setTo('');svg.current?.focus({preventScroll:true});}} catch(e){setError((e as Error).message);}
    }
    function cancelGesture(){gesture.current=null;previewRef.current=null;setPreview(null);setSource(null);}
    function deleteSelection(){if(!node&&!edge)return;cancelGesture();if(commit(deleteSceneSelection(stored,selection))){setSelection({});setChecked([]);setMessage('Elemen dihapus. Tekan Ctrl+Z untuk mengembalikannya.');svg.current?.focus({preventScroll:true});}}
    function copySelection(){const copied=copySceneSelection(stored,selection);if(!copied)return;clipboard.current=copied;pasteCount.current=0;setMessage(copied.kind==='node'?'Kotak disalin. Tekan Ctrl+V untuk membuat salinannya.':'Garis disalin. Tekan Ctrl+V, lalu tarik ujung salinannya ke kotak yang dituju.');svg.current?.focus({preventScroll:true});}
    function pasteSelection(){if(!clipboard.current)return;cancelGesture();try{const result=pasteSceneSelection(stored,clipboard.current,(pasteCount.current+1)*30);if(commit(result.scene)){pasteCount.current++;setSelection(result.selection);setChecked([]);svg.current?.focus({preventScroll:true});const n=result.scene.nodes.find(n=>n.id===result.selection.node);const e=result.scene.edges.find(e=>e.id===result.selection.edge);const p=n??e?.points[0];if(p)window.requestAnimationFrame(()=>frame.current?.scrollTo({top:Math.max(0,p.y*zoom-100),left:Math.max(0,p.x*zoom-100),behavior:'smooth'}));setMessage(clipboard.current.kind==='edge'?'Garis ditempel tanpa sambungan. Tarik ujungnya ke kotak tujuan.':'Salinan kotak ditambahkan.');}}catch(e){setError((e as Error).message);}}
    function modeChange(value:'form'|'frame'){setMode(value);setSelection({});setSource(null);setAddingRelation(false);setAddingBox(false);setError('');}
    function pointerDown(event:React.PointerEvent<SVGSVGElement>){if(mode!=='frame'||event.button!==0)return;const target=event.target as Element,p=point(event),anchor=port(target);const handle=target.closest('[data-point-index]');const line=target.closest('[data-edge-id]')?.getAttribute('data-edge-id');
        moved.current=false;
        if(handle&&edge){gesture.current={type:'point',start:p,base:structuredClone(stored),edge:edge.id,index:Number(handle.getAttribute('data-point-index'))};}
        else if(anchor){gesture.current={type:'new',start:p,base:structuredClone(stored),source:anchor};}
        else if(line&&tool==='select'){setSelection({edge:line});setChecked([]);gesture.current={type:'edge',start:p,base:structuredClone(stored),edge:line};}
        else{const n=target.closest('[data-node-id]')?.getAttribute('data-node-id');if(!n||locked||tool!=='select')return;setSelection({node:n,cell:target.closest('[data-cell-id]')?.getAttribute('data-cell-id')??undefined});gesture.current={type:'node',start:p,base:structuredClone(stored),node:n};}
        event.preventDefault();svg.current?.focus({preventScroll:true});event.currentTarget.setPointerCapture(event.pointerId);
    }
    function pointerMove(event:React.PointerEvent<SVGSVGElement>){const g=gesture.current;if(!g)return;const p=point(event),dx=p.x-g.start.x,dy=p.y-g.start.y;if(Math.hypot(dx,dy)<2&&!moved.current)return;moved.current=true;let next=structuredClone(g.base);
        if(g.type==='node'){const n=next.nodes.find(n=>n.id===g.node)!;n.x=Math.max(0,Math.min(next.width-total(n.columns),n.x+dx));n.y=Math.max(0,Math.min(next.height-total(n.rows),n.y+dy));}
        else if(g.type==='edge'){next=moveSceneEdge(g.base,g.edge!,dx,dy);}
        else if(g.type==='point'){const e=next.edges.find(e=>e.id===g.edge)!;e.points=edgePoints(g.base,e);e.points[g.index!]=p;if(g.index===0)e.source=null;if(g.index===e.points.length-1)e.target=null;}
        else {next.edges.push({id:'drawing-preview',kind:'command',pattern:'dashed',startMarker:'none',endMarker:'arrow',source:g.source!,target:null,points:[anchorPoint(next,g.source!)!,p]});}
        previewRef.current=next;setPreview(next);
    }
    function pointerUp(event:React.PointerEvent<SVGSVGElement>){const g=gesture.current;if(!g)return;gesture.current=null;const targets=document.elementsFromPoint(event.clientX,event.clientY).filter(el=>svg.current?.contains(el));
        const direct=targets.map(port).find(Boolean);
        const targetCell=targets.map(el=>el.closest('[data-cell-id]')?.getAttribute('data-cell-id')).find(Boolean);
        const anchor=direct??(targetCell?nearestCellAnchor(stored,targetCell,point(event)):null);
        if(g.type==='new'){setPreview(null);if(moved.current&&anchor)newEdge(g.source!,anchor);else if(!moved.current){if(source)newEdge(source,g.source!);else setSource(g.source!);}}
        else if(moved.current&&previewRef.current){const next=structuredClone(previewRef.current);if(g.type==='point'&&anchor){const e=next.edges.find(e=>e.id===g.edge)!;if(g.index===0)e.source=anchor;else if(g.index===e.points.length-1)e.target=anchor;}commit(next);}
        previewRef.current=null;setPreview(null);window.setTimeout(()=>{moved.current=false;},0);
    }
    function addNode(group:boolean,name?:string){const bottom=Math.max(kind==='institution'?220:0,...stored.nodes.map(n=>n.y+total(n.rows)));const n=makeNode(40,bottom+40,group?2:1,group?3:1);if(name)n.cells[0].text=name;change(next=>{next.nodes.push(n);next.width=Math.max(next.width,n.x+total(n.columns)+30);next.height=Math.max(next.height,n.y+total(n.rows)+30);});setSelection({node:n.id,cell:n.cells[0].id});setChecked([]);window.requestAnimationFrame(()=>frame.current?.scrollTo({top:Math.max(0,n.y*zoom-40),left:0,behavior:'smooth'}));}
    function patchEdge(patch:Partial<DiagramEdge>){change(next=>Object.assign(next.edges.find(e=>e.id===edge!.id)!,patch));}
    function endpoint(key:'source'|'target',cellId:string,side?:Side){if(!edge)return;const anchor=cellId?{cellId,side:side??edge[key]?.side??(key==='source'?'bottom':'top'),ratio:.5}:null;change(next=>{const e=next.edges.find(e=>e.id===edge.id)!;e.points=edgePoints(next,e);e[key]=anchor;});}
    return <div className="min-w-0" data-revision={revision} onKeyDown={e=>handleSceneShortcut(e,!!(node||edge),{undo:()=>history(true),redo:()=>history(false),copy:copySelection,paste:pasteSelection,remove:deleteSelection})}>
        <div className="cms-actions mb-3"><button type="button" className={`cms-button ${mode==='form'?'primary':''}`} aria-pressed={mode==='form'} onClick={()=>modeChange('form')}>Lewat formulir</button><button type="button" className={`cms-button ${mode==='frame'?'primary':''}`} aria-pressed={mode==='frame'} onClick={()=>modeChange('frame')}>Langsung di bagan</button></div>
        <p className="cms-help mb-3">{mode==='form'?'Klik kotak untuk mengubah nama. Untuk menggeser kotak, membuat kotak gabungan, atau mengatur garis lebih bebas, pilih Langsung di bagan.':'Tarik titik pada kotak asal ke kotak tujuan. Klik garis untuk mengubah atau menghapusnya.'} Perubahan menunggu Simpan bagian ini.</p>
        {error&&<p className="cms-notice error" role="alert">{error}</p>}{message&&<p className="cms-notice success" role="status">{message}</p>}
        <div className="cms-actions mb-3"><button type="button" className="cms-button" onClick={()=>{setAddingBox(true);setBoxName('');setAddingRelation(false);}}>Tambah kotak</button>{mode==='frame'&&<button type="button" className="cms-button" onClick={()=>addNode(true)}>Tambah kotak gabungan</button>}<button type="button" className="cms-button" disabled={!undo.current.length} onClick={()=>history(true)}>Urungkan (Ctrl+Z)</button><button type="button" className="cms-button" disabled={!redo.current.length} onClick={()=>history(false)}>Ulangi (Ctrl+Y)</button><button type="button" className="cms-button" disabled={!node&&!edge} onClick={copySelection}>Salin</button><button type="button" className="cms-button" disabled={!clipboard.current} onClick={pasteSelection}>Tempel</button></div>
        <p className="cms-help mb-3">Klik kotak atau garis terlebih dahulu. Ctrl+C: salin. Ctrl+V: tempel. Backspace/Delete: hapus. Ctrl+Z: urungkan. Ctrl+Y: ulangi. Salin-tempel berlaku di editor bagan ini. Saat mengetik, pintasan berlaku pada teks.</p>
        {node&&node.cells.length>1&&<p className="cms-help mb-3">Kotak gabungan dipilih sebagai satu kelompok saat disalin atau dihapus. Penghapusan kotak juga menghapus garis yang terhubung; Ctrl+Z mengembalikan keduanya.</p>}
        {addingBox&&<form className="cms-panel mb-3" onSubmit={e=>{e.preventDefault();if(!boxName.trim())return;addNode(false,boxName.trim());setAddingBox(false);}}>
            <label className="cms-field"><span>Nama kotak baru</span><textarea autoFocus required maxLength={4000} rows={2} value={boxName} onChange={e=>setBoxName(e.target.value)}/></label>
            <div className="cms-actions"><button type="submit" className="cms-button primary" disabled={!boxName.trim()}>Tambahkan kotak</button><button type="button" className="cms-button" onClick={()=>setAddingBox(false)}>Batal</button></div>
        </form>}
        {mode==='form'&&<button type="button" className="cms-button mb-3" onClick={()=>{setAddingRelation(true);setAddingBox(false);setSelection({});setFrom('');setTo('');setError('');}}>Tambah hubungan</button>}
        {addingRelation&&<form className="cms-panel mb-3" onSubmit={e=>{e.preventDefault();if(from&&to)newEdge({cellId:from,side:'bottom',ratio:.5},{cellId:to,side:'top',ratio:.5});}}>
            <p className="cms-help mb-3">Pilih dua kotak yang ingin dihubungkan. Garis dibuat setelah Anda klik Hubungkan.</p>
            <div className="cms-row">{[['Kotak asal',from,setFrom],['Kotak tujuan',to,setTo]].map(([label,value,setter])=><label className="cms-field" key={label as string}><span>{label as string}</span><select required value={value as string} onChange={e=>(setter as (v:string)=>void)(e.target.value)}><option value="">Pilih kotak</option>{allCells.map(({cell},i)=><option key={cell.id} value={cell.id}>{i+1}. {cell.text}</option>)}</select></label>)}</div>
            <div className="cms-actions"><button type="submit" className="cms-button primary" disabled={!from||!to||from===to}>Hubungkan</button><button type="button" className="cms-button" onClick={()=>setAddingRelation(false)}>Batal</button></div>
        </form>}
        {mode==='frame'&&<div className="cms-actions mb-3"><button type="button" className={`cms-button ${tool==='select'?'primary':''}`} onClick={()=>{setTool('select');setSource(null);}}>Pilih / geser</button><button type="button" className={`cms-button ${tool==='connect'?'primary':''}`} onClick={()=>setTool('connect')}>Atur hubungan</button><label className="flex gap-2 items-center"><input type="checkbox" checked={locked} onChange={e=>setLocked(e.target.checked)}/>Kunci posisi kotak</label></div>}
        <div className="cms-actions mb-2"><button type="button" className="cms-button small" onClick={()=>setZoom(z=>Math.max(.2,z-.1))}>Perkecil</button><span>{Math.round(zoom*100)}%</span><button type="button" className="cms-button small" onClick={()=>setZoom(z=>Math.min(2,z+.1))}>Perbesar</button><button type="button" className="cms-button small" onClick={()=>setZoom(Math.max(.1,Math.min(1,(frame.current?.clientWidth??800)/scene.width)))}>Muat seluruh lebar</button></div>
        {mode==='frame'&&<p className="cms-help mb-2">{tool==='connect'?'Tarik titik biru ke titik pada sel tujuan, atau klik kedua titik bergantian. Pilih garis untuk menggeser ujung dan titik beloknya.':locked?'Kotak terkunci. Buka kunci untuk menggesernya. Garis tetap bisa dipilih dan diseret.':'Seret kotak atau badan garis untuk menggesernya. Ujung garis yang tersambung tetap menempel pada kotak.'}</p>}
        {source&&<p role="status" className="cms-notice">Titik asal dipilih. Pilih titik tujuan. <button type="button" className="cms-link" onClick={()=>setSource(null)}>Batal</button></p>}
        {edge&&<div className="cms-actions mb-3" role="status"><strong>Garis dipilih</strong><button type="button" className="cms-button danger" onClick={deleteSelection}>Hapus garis ini</button><span className="cms-help">Bisa juga tekan Backspace atau Delete. Garis lain tetap ada.</span></div>}
        <div ref={frame} className="border border-slate-300 overflow-auto bg-white max-w-full" style={{maxHeight:'70vh',minHeight:260}}>
            <svg ref={svg} tabIndex={0} viewBox={`0 0 ${scene.width} ${scene.height}`} width={scene.width*zoom} height={scene.height*zoom} style={{display:'block',maxWidth:'none',fontFamily:scene.institution?'Arial, sans-serif':'inherit',touchAction:mode==='frame'?'none':'auto'}} aria-label="Frame editor struktur organisasi" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={()=>{gesture.current=null;previewRef.current=null;setPreview(null);moved.current=false;}} onKeyDown={e=>{if(e.key==='Escape'){gesture.current=null;setPreview(null);setSource(null);setSelection({});}}}>
                <SceneDrawing scene={scene} selectCell={selectNode} selectEdge={id=>{if(!moved.current){setSelection({edge:id});setChecked([]);svg.current?.focus({preventScroll:true});}}}>
                    {edge&&<path d={edgePath(scene,edge)} fill="none" stroke="#1768b0" strokeWidth={3/zoom} pointerEvents="none"/>}
                    {node&&<rect x={node.x-3} y={node.y-3} width={total(node.columns)+6} height={total(node.rows)+6} fill="none" stroke="#1768b0" strokeWidth="3" pointerEvents="none"/>}
                    {mode==='frame'&&(tool==='connect'||!!edge)&&allCells.flatMap(({cell})=>sides.map(side=>{const p=anchorPoint(scene,{cellId:cell.id,side,ratio:.5})!;return <circle key={`${cell.id}-${side}`} data-port-cell={cell.id} data-port-side={side} cx={p.x} cy={p.y} r={5/zoom} fill="white" stroke="#1768b0" strokeWidth={1.5/zoom} role="button" tabIndex={0} aria-label={`${cell.text}, titik ${sideLabels[side]}`} style={{cursor:'crosshair'}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();const a={cellId:cell.id,side,ratio:.5};if(source)newEdge(source,a);else setSource(a);}}}/>;}))}
                    {mode==='frame'&&edge&&edgePoints(scene,edge).map((p,i)=><rect key={i} data-point-index={i} x={p.x-5/zoom} y={p.y-5/zoom} width={10/zoom} height={10/zoom} fill="#1768b0" stroke="white" style={{cursor:'move'}}/>)}
                </SceneDrawing>
            </svg>
        </div>
        {(node||edge)&&<div className="cms-panel mt-4">
            {node&&<>
                {mode==='frame'&&<label className="cms-field"><span>Pilih sel untuk diedit</span><select value={cell?.id??''} onChange={e=>setSelection({node:node.id,cell:e.target.value})}>{node.cells.map(c=><option key={c.id} value={c.id}>Baris {c.row+1}, kolom {c.column+1}: {c.text.slice(0,80)}</option>)}</select></label>}
                {cell&&<CellForm simple={mode==='form'} key={cell.id} cell={cell} onApply={patch=>{try{return commit(updateSceneCell(stored,node.id,cell.id,patch));}catch(e){setError((e as Error).message);return false;}}}/>}
                {mode==='frame'&&<><details className="my-4"><summary className="font-semibold">Posisi, ukuran, dan bentuk kelompok</summary><NodeForm key={JSON.stringify([node.id,node.x,node.y,node.columns,node.rows])} node={node} onApply={patch=>{try{commit(updateSceneNode(stored,node.id,patch));}catch(e){setError((e as Error).message);}}}/></details>
                <details className="my-4"><summary className="font-semibold">Gabungkan atau pisahkan sel</summary><p className="cms-help my-3">Pilih sel yang membentuk satu persegi panjang. Tulisan digabung, dan sambungan diarahkan ke sel hasil gabungan.</p><div className="space-y-2">{node.cells.map(c=><label key={c.id} className="flex gap-2"><input type="checkbox" checked={checked.includes(c.id)} onChange={e=>setChecked(e.target.checked?[...checked,c.id]:checked.filter(id=>id!==c.id))}/>Baris {c.row+1}, kolom {c.column+1}: {c.text.slice(0,80)}</label>)}</div><div className="cms-actions mt-3"><button type="button" className="cms-button" disabled={checked.length<2} onClick={()=>{if(!window.confirm('Gabungkan sel terpilih? Tulisan dipertahankan; garis di antara sel terpilih dihapus dan garis luar diarahkan ke sel gabungan.'))return;try{if(commit(mergeCells(stored,node.id,checked))){setChecked([]);setSelection({node:node.id});}}catch(e){setError((e as Error).message);}}}>Gabungkan sel terpilih</button><button type="button" className="cms-button" disabled={!cell||cell.rowSpan*cell.colSpan===1} onClick={()=>{if(!cell||!window.confirm('Pisahkan sel? Tulisan dan sambungan lama tetap pada sel kiri atas. Sel lainnya dapat diisi setelah dipisah.'))return;commit(splitCell(stored,node.id,cell.id));}}>Pisahkan sel yang sedang diedit</button></div></details>
                <div className="cms-actions my-4">{(['rows','columns'] as const).flatMap(axis=>([1,-1] as const).map(delta=><button key={`${axis}${delta}`} type="button" className="cms-button small" onClick={()=>{if(delta<0&&!window.confirm('Hapus baris/kolom terakhir? Isi sel yang dihapus dan garis terhubung ikut dihapus.'))return;try{commit(resizeGrid(stored,node.id,axis,delta));setChecked([]);}catch(e){setError((e as Error).message);}}}>{delta===1?'Tambah':'Hapus'} {axis==='rows'?'baris':'kolom'} {delta===-1?'terakhir':''}</button>))}</div>
                </>}<button type="button" className="cms-button danger" onClick={deleteSelection}>{node.cells.length>1?'Hapus kelompok kotak':'Hapus kotak ini'}</button>
            </>}
            {edge&&<>
                {mode==='frame'&&<div className="cms-row">{(['source','target'] as const).map(key=><div key={key}><label className="cms-field"><span>{key==='source'?'Sel asal':'Sel tujuan'}</span><select value={edge[key]?.cellId??''} onChange={e=>endpoint(key,e.target.value)}><option value="">Titik bebas / percabangan</option>{allCells.map(({node:n,cell})=><option key={cell.id} value={cell.id}>Kelompok {scene.nodes.findIndex(item=>item.id===n.id)+1}, sel {cell.row+1}/{cell.column+1}: {cell.text.slice(0,80)}</option>)}</select></label>{edge[key]&&<label className="cms-field"><span>Sisi sambungan</span><select value={edge[key]!.side} onChange={e=>endpoint(key,edge[key]!.cellId,e.target.value as Side)}>{sideOptions}</select></label>}</div>)}</div>}
                <div className="cms-row"><label className="cms-field"><span>Jenis hubungan</span><select value={edge.kind} onChange={e=>patchEdge({kind:e.target.value as DiagramEdge['kind'],pattern:e.target.value==='coordination'?'dashed':'solid'})}><option value="command">Komando</option><option value="coordination">Koordinasi</option></select></label><label className="cms-field"><span>Bentuk garis</span><select value={edge.pattern} onChange={e=>patchEdge({pattern:e.target.value as DiagramEdge['pattern']})}><option value="solid">Utuh</option><option value="dashed">Putus-putus</option><option value="dotted">Titik-titik</option></select></label></div>
                {mode==='frame'&&<><div className="cms-row">{(['startMarker','endMarker'] as const).map((key,i)=><label key={key} className="cms-field"><span>{i?'Penanda ujung':'Penanda awal'}</span><select value={edge[key]} onChange={e=>patchEdge({[key]:e.target.value})}><option value="none">Tanpa penanda</option><option value="arrow">Panah</option><option value="dot">Bulatan</option></select></label>)}</div>
                <div className="cms-actions my-3"><button type="button" className="cms-button" onClick={()=>{const p=edgePoints(stored,edge);patchEdge({points:[p[0],p[p.length-1]]});}}>Jalur lurus</button><button type="button" className="cms-button" onClick={()=>{const p=edgePoints(stored,edge),a=p[0],b=p[p.length-1],y=(a.y+b.y)/2;patchEdge({points:[a,{x:a.x,y},{x:b.x,y},b]});}}>Jalur bersiku</button><button type="button" className="cms-button" disabled={edge.points.length>=40} onClick={()=>{const p=edgePoints(stored,edge),a=p[0],b=p[1];p.splice(1,0,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});patchEdge({points:p});}}>Tambah titik belok</button></div>
                </>}
            </>}
        </div>}

    </div>;
}
