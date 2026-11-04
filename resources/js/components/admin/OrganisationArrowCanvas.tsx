import {useRef, useState} from 'react';
import type {ProfileTable} from '@/lib/profile-tables';
import {connectOrganisation, organisationNodes} from '@/lib/organisation-connections';
import ConnectedOrganisation from '@/components/ui/ConnectedOrganisation';

export default function OrganisationArrowCanvas({table,onChange}:{table:ProfileTable;onChange:(table:ProfileTable)=>void}) {
    const nodes=organisationNodes(table);
    const [source,setSource]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
    const suppressClick=useRef(false);
    const drag=useRef<{id:string;x:number;y:number}|null>(null);
    const [line,setLine]=useState<{x1:number;y1:number;x2:number;y2:number}|null>(null);
    function connect(from:string,to:string){
        try {onChange(connectOrganisation(table,from,to));setSource('');setError('');setMessage('Panah diterapkan ke draf. Klik Simpan bagian ini untuk menampilkan perubahan di website.');}
        catch(e){setError((e as Error).message);}
    }
    return <section className="cms-panel my-4" aria-label="Atur panah secara visual">
        <p className="cms-help mb-3">Seret tombol penghubung dari kotak asal ke kotak tujuan. Bisa juga klik kotak asal, lalu klik tujuan. Jika tujuan sudah memiliki induk, panahnya akan dipindahkan. Posisi kotak tersusun otomatis.</p>
        <div onPointerDown={event=>{const id=(event.target as HTMLElement).closest<HTMLElement>('[data-arrow-node]')?.dataset.arrowNode;if(event.button!==0||!id)return;drag.current={id,x:event.clientX,y:event.clientY};(event.target as HTMLElement).closest('button')?.setPointerCapture(event.pointerId);}}
            onPointerMove={event=>{if(drag.current&&Math.hypot(event.clientX-drag.current.x,event.clientY-drag.current.y)>6)setLine({x1:drag.current.x,y1:drag.current.y,x2:event.clientX,y2:event.clientY});}}
            onPointerUp={event=>{const start=drag.current;drag.current=null;setLine(null);if(!start)return;const element=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-arrow-node]');const target=element&&event.currentTarget.contains(element)?element.dataset.arrowNode:undefined;if(target&&target!==start.id){suppressClick.current=true;window.setTimeout(()=>{suppressClick.current=false;},0);connect(start.id,target);}}}
            onPointerCancel={()=>{drag.current=null;setLine(null);}}>
            <ConnectedOrganisation table={table} selectedNode={source} onSelectNode={id=>{if(suppressClick.current){suppressClick.current=false;return;}if(source&&source!==id)connect(source,id);else setSource(source===id?'':id);}}/>
        </div>
        {source&&<p role="status" className="cms-help my-3">Asal: {nodes.find(node=>node.id===source)?.label}. Pilih kotak tujuan. <button type="button" className="cms-link" onClick={()=>setSource('')}>Batal</button></p>}
        {error&&<p role="alert" className="cms-notice error">{error}</p>}
        {message&&<p role="status" className="cms-notice success">{message}</p>}
        {line&&<svg aria-hidden="true" style={{position:'fixed',inset:0,width:'100vw',height:'100vh',pointerEvents:'none',zIndex:100}}><line {...line} stroke="#1768b0" strokeWidth="3" strokeDasharray="6 4"/></svg>}

    </section>;
}
