import { useEffect, useRef, useState } from 'react';
import type { RichParagraph, TextRun } from '@/components/ui/RichContent';
import { safeTextLink } from '@/components/ui/RichContent';
import LinkInput from './LinkInput';

function readEditor(root:HTMLElement):RichParagraph[] {
    const result:RichParagraph[]=[];
    function inline(node:Node,marks:Omit<TextRun,'text'>={}):TextRun[]{
        if(node.nodeType===Node.TEXT_NODE)return [{text:node.textContent??'',...marks}];
        if(!(node instanceof HTMLElement))return [];
        if(node.tagName==='BR')return [{text:'\n',...marks}];
        const next={...marks,...(['B','STRONG'].includes(node.tagName)?{bold:true}:{}),...(['I','EM'].includes(node.tagName)?{italic:true}:{}),...(node.tagName==='A'?{url:node.getAttribute('href')??''}:{})};
        return Array.from(node.childNodes).flatMap(child=>inline(child,next));
    }
    let pending:TextRun[]=[];
    function flush(){if(pending.length){result.push({type:'paragraph',runs:pending});pending=[];}}
    function block(node:Node){
        if(node instanceof HTMLElement&&['UL','OL'].includes(node.tagName)){flush();Array.from(node.children).forEach(li=>result.push({type:node.tagName==='OL'?'number':'bullet',runs:inline(li)}));}
        else if(node instanceof HTMLElement&&['DIV','P'].includes(node.tagName)){flush();if(Array.from(node.children).some(child=>['UL','OL','DIV','P'].includes(child.tagName))){Array.from(node.childNodes).forEach(block);flush();}else result.push({type:'paragraph',runs:inline(node)});}
        else pending.push(...inline(node));
    }
    Array.from(root.childNodes).forEach(block);flush();return result;
}
function writeEditor(root:HTMLElement,value:RichParagraph[]){
    root.replaceChildren();let list:HTMLElement|null=null;let listType='';
    value.forEach(line=>{let block:HTMLElement;
        if(line.type==='paragraph'){list=null;listType='';block=document.createElement('p');root.append(block);}
        else{if(!list||listType!==line.type){list=document.createElement(line.type==='number'?'ol':'ul');root.append(list);listType=line.type;}block=document.createElement('li');list.append(block);}
        line.runs.forEach(run=>{let node:Node=document.createTextNode(run.text);for(const tag of [...(run.bold?['strong']:[]),...(run.italic?['em']:[])]){const wrap=document.createElement(tag);wrap.append(node);node=wrap;}if(run.url&&safeTextLink(run.url)){const a=document.createElement('a');a.setAttribute('href',run.url);a.append(node);node=a;}block.append(node);});
        if(!block.textContent)block.append(document.createElement('br'));
    });
}
export default function RichTextEditor({value,text,onChange,disabled=false}:{disabled?:boolean;value?:RichParagraph[];text:string;onChange:(value:RichParagraph[],text:string)=>void}) {
    const editor=useRef<HTMLDivElement>(null);const last=useRef('');const range=useRef<Range|null>(null);const [linkOpen,setLinkOpen]=useState(false);const [url,setUrl]=useState('');const [error,setError]=useState('');
    useEffect(()=>{const signature=JSON.stringify([value,text]);if(editor.current&&last.current!==signature){writeEditor(editor.current,value??text.split('\n').map(text=>({type:'paragraph',runs:[{text}]})));last.current=signature;}},[value,text]);
    function sync(){if(!editor.current)return;const rich=readEditor(editor.current);const plain=rich.map(line=>line.runs.map(run=>run.text).join('')).join('\n');last.current=JSON.stringify([rich,plain]);onChange(rich,plain);setError(plain.length>15000?'Teks maksimal 15.000 karakter. Ringkas sebelum menyimpan.':'');}
    function command(name:string,argument?:string){editor.current?.focus();document.execCommand(name,false,argument);sync();}
    function startLink(){const selection=window.getSelection();if(!selection?.rangeCount||selection.isCollapsed||!editor.current?.contains(selection.anchorNode)){setError('Blok teks yang ingin dijadikan tautan terlebih dahulu.');return;}range.current=selection.getRangeAt(0).cloneRange();setError('');setUrl('');setLinkOpen(true);}
    function applyLink(){if(!range.current||!safeTextLink(url))return;editor.current?.focus();const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range.current);command('createLink',url);setLinkOpen(false);}
    return <div className="cms-rich-editor"><div role="toolbar" aria-label="Format teks" className="cms-actions border-b p-2">
        {[['bold','Tebal'],['italic','Miring'],['insertUnorderedList','Daftar poin'],['insertOrderedList','Daftar nomor']].map(([cmd,label])=><button type="button" className="cms-button small" key={cmd} onMouseDown={e=>e.preventDefault()} onClick={()=>command(cmd)}>{label}</button>)}
        <button type="button" className="cms-button small" onMouseDown={e=>e.preventDefault()} onClick={startLink}>Tautan</button><button type="button" className="cms-button small" onMouseDown={e=>e.preventDefault()} onClick={()=>command('unlink')}>Lepas tautan</button>
    </div>{linkOpen&&<div className="p-3 border-b"><LinkInput value={url} onChange={setUrl}/><div className="cms-actions mt-3"><button type="button" className="cms-button small primary" disabled={!url||!safeTextLink(url)} onClick={applyLink}>Terapkan tautan</button><button type="button" className="cms-button small" onClick={()=>setLinkOpen(false)}>Batal</button></div></div>}
    <div ref={editor} contentEditable={!disabled} suppressContentEditableWarning role="textbox" aria-label="Isi teks" aria-multiline="true" className="cms-rich-input" onInput={sync} onDrop={e=>{e.preventDefault();if(!disabled)command('insertText',e.dataTransfer.getData('text/plain'));}} onPaste={e=>{e.preventDefault();command('insertText',e.clipboardData.getData('text/plain'));}}/>
    {error&&<p role="alert" className="cms-notice error">{error}</p>}<p className="cms-help px-3 pb-2">Blok teks untuk memberi format. Teks yang ditempel mengikuti gaya halaman.</p></div>;
}
