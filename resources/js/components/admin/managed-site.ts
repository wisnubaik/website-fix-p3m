import { usePage } from '@inertiajs/react';
import { cmsFetch } from '@/lib/cms-fetch';
import type { PageDocument } from '@/components/ui/ManagedContent';
export type ManagedPage = {id:string;path:string;archived?:boolean;title?:string;group?:string;builtin:boolean;template:string;published:boolean;hasChanges:boolean;version:number;updatedAt:string;document:PageDocument};
export type ContentField = {key:string;group:string;label:string;type:'text'|'url'|'image';default:string;internalOnly?:boolean;decoration?:'arrow';help?:string};
export type ContentCollection = {key:string;label:string;default:any};
export type MenuEntry = {id:string;label:string;pageId:string;href:string;visible:boolean;children:MenuEntry[]};
export const EDITOR_LABELS:Record<string,string>={hero:'Banner utama',beranda:'Bagian beranda','quick-access':'Akses cepat','tautan-pengusulan':'Tautan pengusulan',pemenang:'Pemenang hibah',profil:'Isi profil & bagan',tim:'Tim P3M',pengaturan:'Identitas & kontak',pengumuman:'Daftar pengumuman',kegiatan:'Dokumentasi kegiatan','riset-grup':'Kelompok riset','riset-entries':'Data penelitian & pengabdian','hub-cards':'Pilihan skema penelitian & PkM','dokumen-informasi':'Dokumen informasi','dokumen-layanan':'Dokumen layanan','dokumen-repository':'Dokumen repository','monev-slot':'Jadwal kegiatan','acara-periode':'Periode, skema, dan jadwal','ki-karya':'Daftar karya KI',asesmen:'Data asesmen',pbl:'Proyek PBL'};
export async function managedRequest(url:string,method:string,body:unknown) {
    const response=await cmsFetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat().join(' ') : data.error || data.message || 'Perubahan belum tersimpan. Silakan coba kembali.');
    return data;
}
export function emptyBlock(type:'text'|'image'|'links'|'cards'|'faq'|'table'='text') {return {id:crypto.randomUUID(),type,title:'',text:'',url:'',alt:'',items:[],headers:type==='table'?['Kolom 1','Kolom 2']:[],rows:[]};}
export function move<T>(items:T[],index:number,direction:number):T[] {const next=[...items];const target=index+direction;if(target<0||target>=items.length)return items;[next[index],next[target]]=[next[target],next[index]];return next;}

const EMPTY_ROUTES:{label:string;href:string}[] = [];
export function useRouteOptions():{label:string;href:string}[] {const options=usePage().props.cmsRoutes as {label:string;href:string}[];return options ?? EMPTY_ROUTES;}
