import { useState } from 'react';
import type { JadwalJurusan } from '@/lib/monev-content';
import type { DocItem, DocSection } from '@/lib/doc-types';
import { formatRentang } from '@/lib/format-tanggal';
import JadwalTabel from './JadwalTabel';
import MonevBerkas from './MonevBerkas';

export type EventTimeline = { judul: string; tanggalMulai: string; tanggalSelesai: string };
export type EventScheme = { id: string; nama: string; keterangan: string | null; schedule: JadwalJurusan[]; sections: DocSection[]; parallelDocuments?: DocItem[] };
export type EventPeriod = { id: string; tahun: number; judul: string; tanggalMulai: string; tanggalSelesai: string | null; tempat: string | null; keterangan: string | null; timeline: EventTimeline[]; schemes: EventScheme[] };

export default function EventPeriods({ periods, eventLabel }: { periods: EventPeriod[]; eventLabel: string }) {
    const [selected, setSelected] = useState(periods[0]?.id ?? '');
    const period = periods.find(item => item.id === selected) ?? periods[0];
    if (!period) return <p>Belum ada periode {eventLabel} yang diterbitkan.</p>;
    return <div>
        <label className="flex flex-wrap items-center gap-3 mb-6 font-medium">Periode {eventLabel}
            <select className="border border-[var(--color-outline-gray)] bg-white px-4 py-2 max-w-full" value={period.id} onChange={event => setSelected(event.target.value)}>{periods.map(item => <option key={item.id} value={item.id}>{item.tahun || 'Tahun belum diisi'} - {item.judul}</option>)}</select>
        </label>
        <h2 className="font-display text-3xl font-bold text-[var(--color-absolute-zero)]">{period.judul}</h2>
        <p className="mt-3 text-[var(--color-graphite)]">{formatRentang(period.tanggalMulai, period.tanggalSelesai) || 'Tanggal belum diisi'}{period.tempat ? ` ${period.tempat}` : ''}</p>
        {period.keterangan && <p className="mt-3 whitespace-pre-line">{period.keterangan}</p>}
        {!!period.timeline?.length && <div className="mt-7"><h3 className="font-semibold text-lg mb-3">Timeline pelaksanaan</h3><ol className="divide-y border-y border-[var(--color-outline-gray)]">{period.timeline.map((step,index) => <li key={index} className="py-3 grid gap-2 sm:grid-cols-[16rem_1fr]"><span className="text-sm text-[var(--color-graphite)]">{formatRentang(step.tanggalMulai,step.tanggalSelesai)}</span><span className="font-medium">{step.judul}</span></li>)}</ol></div>}
        <PeriodSchemes key={period.id} schemes={period.schemes}/>
    </div>;
}
function PeriodSchemes({ schemes }: { schemes: EventScheme[] }) {
    const [selected, setSelected] = useState(schemes[0]?.id ?? '');
    const scheme = schemes.find(item => item.id === selected) ?? schemes[0];
    if (!scheme) return <p className="mt-8">Belum ada skema yang diterbitkan untuk periode ini.</p>;
    const schedule = scheme.parallelDocuments?.length && !scheme.schedule.some(item => item.id === 'teknik') ? [...scheme.schedule, {id:'teknik',jurusan:'Teknik',penelitian:[],pkm:[]}] : scheme.schedule;
    return <div className="mt-8">
        <label className="flex flex-wrap items-center gap-3 font-medium mb-6">Skema
            <select className="border border-[var(--color-outline-gray)] bg-white px-4 py-2 max-w-full" value={scheme.id} onChange={event => setSelected(event.target.value)}>{schemes.map(item => <option key={item.id} value={item.id}>{item.nama}</option>)}</select>
        </label>
        <h3 className="font-semibold text-xl mb-2">{scheme.nama}</h3>
        {scheme.keterangan && <p className="whitespace-pre-line text-[var(--color-graphite)] mb-6">{scheme.keterangan}</p>}
        {schedule.length ? <JadwalTabel key={scheme.id} data={schedule} parallelDocuments={scheme.parallelDocuments}/> : <><p>Belum ada jadwal yang diterbitkan pada skema ini.</p>{!!scheme.parallelDocuments?.length && <JadwalTabel data={[{id:'teknik',jurusan:'Teknik',penelitian:[],pkm:[]}]} parallelDocuments={scheme.parallelDocuments}/>}</>}
        {!!scheme.sections.length && <div className="mt-10"><h3 className="font-semibold text-xl mb-5">Dokumen skema</h3><MonevBerkas sections={scheme.sections}/></div>}
    </div>;
}
