import {validateProfileUpdate,type ProfileTableRecord} from './profile-tables';

export const PROFILE_DRAFT_MAX_BYTES=1_048_576;
export function exportProfileDraft(record:ProfileTableRecord,position:number){
    return {format:'p3m-profile-section',formatVersion:1,position,record:structuredClone(record)};
}
export function importProfileDraft(raw:unknown,current:ProfileTableRecord,groupCount:number):{record:ProfileTableRecord;position?:number}{
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Berkas bukan draf profil yang valid.');
    const root=raw as Record<string,unknown>;let value:unknown=root,position:number|undefined;
    if('format' in root){
        if(root.format!=='p3m-profile-section'||root.formatVersion!==1)throw new Error('Format draf tidak didukung. Gunakan berkas dari Unduh draf (.json).');
        value=root.record;
        if(!Number.isInteger(root.position)||(root.position as number)<1||(root.position as number)>groupCount)throw new Error(`Urutan dalam draf harus antara 1 dan ${groupCount}.`);
        position=root.position as number;
    }
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Isi draf tidak valid.');
    const draft=value as Record<string,unknown>;
    if(draft.id!==current.id)throw new Error('Draf ini berasal dari bagian lain. Pilih bagian yang sesuai sebelum mengunggah.');
    const checked=validateProfileUpdate({
        name:draft.name,groupTitle:draft.groupTitle,published:draft.published,content:draft.content,
        order:current.order,version:current.version,documentUpdatedAt:current.documentUpdatedAt,
    });
    return {record:{...current,...checked,id:current.id},...(position===undefined?{}:{position})};
}
