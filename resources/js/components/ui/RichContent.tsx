import type { ReactNode } from 'react';
export type TextRun = {text:string;bold?:boolean;italic?:boolean;url?:string};
export type RichParagraph = {type:'paragraph'|'bullet'|'number';runs:TextRun[]};
export function safeTextLink(url:string):boolean {return !/[\s\\\x00-\x1f]/.test(url)&&(/^(https?:\/\/[^/]+|mailto:[^@]+@|tel:[+0-9])/i.test(url)||(/^\/(?!\/)/.test(url)));}
export default function RichContent({value}:{value:RichParagraph[]}) {
    const result:ReactNode[]=[];
    const runs=(line:RichParagraph)=>line.runs.map((run,i)=>{let child:ReactNode=run.text;if(run.bold)child=<strong>{child}</strong>;if(run.italic)child=<em>{child}</em>;if(run.url&&safeTextLink(run.url))child=<a href={run.url} className="underline underline-offset-4">{child}</a>;return <span key={i}>{child}</span>;});
    for(let i=0;i<value.length;i++){
        const line=value[i];if(line.type==='paragraph'){result.push(<p key={i} className="whitespace-pre-wrap mb-4">{runs(line)}</p>);continue;}
        const start=i;const children:ReactNode[]=[];while(i<value.length&&value[i].type===line.type){children.push(<li key={i} className="pl-1 mb-2 whitespace-pre-wrap">{runs(value[i])}</li>);i++;}i--;
        result.push(line.type==='number'?<ol key={start} className="list-decimal pl-6 mb-4">{children}</ol>:<ul key={start} className="list-none pl-6 mb-4">{children}</ul>);
    }
    return <div className="max-w-[78ch] leading-relaxed text-[var(--color-graphite)]">{result}</div>;
}
