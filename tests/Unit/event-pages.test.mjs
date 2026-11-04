import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
let server, Schedule, Periods, Ki;
before(async () => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    server = await createServer({ configFile: false, root, plugins: [{name:'cms-test-values',enforce:'pre',resolveId(id){if(id==='@/components/ui/ManagedContent'||/\/resources\/js\/components\/ui\/ManagedContent(?:\.tsx)?$/.test(id))return '\0cms-test-values';},load(id){if(id==='\0cms-test-values')return 'export const useCms=()=>({text:(key,fallback)=>fallback}); export const CmsText=({fallback})=>fallback; export const CmsElement=()=>null;';}},react()], resolve: { alias: { '@': root + 'resources/js' } }, server: { middlewareMode:true,watch:null } });
    Schedule = (await server.ssrLoadModule('/resources/js/components/ui/JadwalTabel.tsx')).default;
    Periods = (await server.ssrLoadModule('/resources/js/components/ui/EventPeriods.tsx')).default;
    Ki = (await server.ssrLoadModule('/resources/js/components/ui/KiTabel.tsx')).default;
});
after(async()=>{await server?.close();});
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
const slot=(tanggal,nama)=>({tanggal,nama,mulai:'08:00',selesai:'08:20',prodi:'TI'});
const schedule=rows=>[{id:'teknik',jurusan:'Teknik',penelitian:rows,pkm:[]}];
test('multi-day schedule displays only the earliest day, offers day navigation, and has no number column',()=>{
    const html=render(Schedule,{data:schedule([slot('2026-08-19','Hari kedua'),slot('2026-08-18','Hari pertama')])});
    assert.match(html,/Hari pertama/);assert.doesNotMatch(html,/Hari kedua/);
    assert.match(html,/Hari 1 dari 2/);assert.match(html,/Hari berikutnya/);assert.match(html,/19 Agustus 2026/);
    assert.doesNotMatch(html,/>No<|>Nomor</);assert.equal((html.match(/<th scope=/g)||[]).length,3);
});
test('single-day schedule has no unnecessary pagination and an empty session remains readable',()=>{
    const html=render(Schedule,{data:schedule([slot('2026-08-18','Satu hari')])});
    assert.match(html,/Satu hari/);assert.doesNotMatch(html,/Hari berikutnya/);
    assert.match(render(Schedule,{data:schedule([])}),/Belum ada jadwal/);
});
test('period view includes the selected timeline and scheme content without mixing periods',()=>{
    const base={tanggalMulai:'2026-08-18',tanggalSelesai:null,tempat:null,keterangan:null,timeline:[{judul:'Paparan',tanggalMulai:'2026-08-18',tanggalSelesai:''}]};
    const periods=[{...base,id:'p1',tahun:2026,judul:'Monev 2026',schemes:[{id:'s1',nama:'Internal',keterangan:'Info internal',schedule:schedule([slot('2026-08-18','Peserta 2026')]),sections:[]}]},{...base,id:'p2',tahun:2027,judul:'Monev 2027',schemes:[{id:'s2',nama:'Eksternal',schedule:schedule([slot('2027-08-18','Peserta 2027')]),sections:[]}]}];
    const html=render(Periods,{periods,eventLabel:'Monev'});
    assert.match(html,/Timeline pelaksanaan/);assert.match(html,/Paparan/);assert.match(html,/Peserta 2026/);assert.doesNotMatch(html,/Peserta 2027/);
    assert.match(html,/Monev 2027/);
});
test('KI pagination labels have readable spaces',()=>{
    const data=Array.from({length:21},(_,i)=>({tahun:'2026',judul:`Karya ${i}`,ketua:'Nama',prodi:'TI',jenisKi:'Hak Cipta',bentuk:'Buku',status:''}));
    const html=render(Ki,{data});
    assert.match(html,/Halaman <strong[^>]*>1<\/strong> dari 2/);
});

test('KI counts have explicit spaces and separated filter badges',()=>{
    const data=Array.from({length:21},(_,i)=>({tahun:'2026',judul:`Karya ${i}`,ketua:'Nama',prodi:'TI',jenisKi:'Hak Cipta',bentuk:'Buku',status:''}));
    const html=render(Ki,{data});
    assert.match(html,/Menampilkan 1 sampai 20 dari 21 karya/);
    assert.match(html,/Semua program studi <span[^>]*>\(21\)<\/span>/);
    assert.match(render(Ki,{data:[]}),/Menampilkan 0 sampai 0 dari 0 karya/);
});

test('PkM-only schemes open their populated session and display editable schedule context',()=>{
    const data=[{id:'teknik',jurusan:'Teknik',penelitian:[],pkm:[{...slot('2026-10-19','Peserta gabungan'),tempat:'Kampus 1',reviewer:'Reviewer uji',catatan:'Sesi gabungan; hadir satu kali.'}]}];
    const html=render(Schedule,{data});
    assert.match(html,/Peserta gabungan/);assert.match(html,/Lokasi: Kampus 1/);assert.match(html,/Reviewer: Reviewer uji/);assert.match(html,/hadir satu kali/);
    assert.doesNotMatch(html,/Belum ada jadwal/);
});
