import {validateScene,type OrganisationScene} from './organisation-scene';
import { validateConnections, type OrganisationConnection } from './organisation-connections';
import { organisationRoles, type OrganisationRole } from './profile-organisation';
import { ApiError } from "./api-error";

export type ProfileCell = { text: string; items: string[]; ordered: boolean };
export type ProfileTable = {
    title: string; caption: string; intro: string; note: string;
    diagram?: OrganisationScene;
    connections?: OrganisationConnection[]; rowRoles?: OrganisationRole[]; supportLinks?: {leader:number;units:number[]}[];
    numeric: boolean; headers: string[]; rows: (ProfileCell | number | null)[][];
};
export type ProfileContent = { tables: ProfileTable[] };
export type ProfileTableRecord = {
    id: string; name: string; groupTitle: string; published: boolean; order: number;
    documentUpdatedAt: string; version: number; content: ProfileContent;
};
export const PROFILE_CONTENT_LIMIT = 512_000;

function invalid(message: string): never { throw new ApiError(400, message); }
function object(value: unknown, keys: string[], label: string, optionalKeys: string[] = []): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) invalid(`${label} tidak valid.`);
    const item = value as Record<string, unknown>;
    if (Object.keys(item).some(key => !keys.includes(key) && !optionalKeys.includes(key)) || keys.some(key => !(key in item))) invalid(`Kolom ${label} tidak sesuai.`);
    return item;
}
function text(value: unknown, label: string, required = false, limit = 4000): string {
    if (typeof value !== "string" || value.length > limit) invalid(`${label} harus berupa teks maksimal ${limit} karakter.`);
    const result = value.trim();
    if (required && !result) invalid(`${label} wajib diisi.`);
    return result;
}
function integer(value: unknown, label: string): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 2147483647) invalid(`${label} harus bilangan bulat 0-2147483647.`);
    return value;
}
function boolean(value: unknown, label: string): boolean {
    if (typeof value !== "boolean") invalid(`${label} harus boolean.`);
    return value;
}

/** Whitelist seluruh tingkat JSON; teks selalu dirender oleh React, bukan HTML. */
export function validateProfileContent(value: unknown): ProfileContent {
    const body = object(value, ["tables"], "isi tabel");
    if (!Array.isArray(body.tables) || body.tables.length > 12) invalid("Maksimal 12 tabel per dokumen.");
    const tables = body.tables.map((raw, index): ProfileTable => {
        const label = `Tabel ${index + 1}`;
        const t = object(raw, ["title", "caption", "intro", "note", "numeric", "headers", "rows"], label, ["rowRoles", "supportLinks", "connections", "diagram"]);
        const numeric = boolean(t.numeric, "Jenis tabel");
        if (!Array.isArray(t.headers) || t.headers.length < 2 || t.headers.length > 12) invalid(`${label}: jumlah kolom harus 2-12.`);
        const headers = t.headers.map(h => text(h, "Judul kolom", true, 300));
        if (numeric && headers.slice(1).some((h, i, all) => !/^(19|20)\d{2}$/.test(h) || (i > 0 && Number(h) <= Number(all[i - 1])))) invalid("Tahun harus 1900-2099, berurutan naik, dan tidak berulang.");
        if (!Array.isArray(t.rows) || t.rows.length > 80) invalid(`${label}: maksimal 80 baris.`);
        const rows = t.rows.map((row, rowIndex) => {
            if (!Array.isArray(row) || row.length !== headers.length) invalid(`${label}, baris ${rowIndex + 1}: jumlah sel tidak sesuai kolom.`);
            return row.map((rawCell, col) => {
                if (numeric && col > 0) return rawCell === null ? null : integer(rawCell, `Target ${headers[col]}`);
                const c = object(rawCell, ["text", "items", "ordered"], "sel tabel");
                if (!Array.isArray(c.items) || c.items.length > 40) invalid("Maksimal 40 butir daftar dalam satu sel.");
                const result = { text: text(c.text, "Isi sel"), items: c.items.map(item => text(item, "Butir daftar", true, 2000)), ordered: boolean(c.ordered, "Penomoran daftar") };
                if (!result.text && !result.items.length) invalid(`${label}, baris ${rowIndex + 1}: isi ${headers[col]} wajib diisi.`);
                return result;
            });
        });
        const extra:Pick<ProfileTable,'rowRoles'|'supportLinks'|'connections'|'diagram'>={};
        if('diagram' in t){if(numeric||headers.length!==2)invalid('Bagan hanya tersedia untuk struktur organisasi.');extra.diagram=validateScene(t.diagram);}
        if('rowRoles' in t){
            if(numeric||headers.length!==2||!Array.isArray(t.rowRoles)||t.rowRoles.length!==rows.length||t.rowRoles.some(role=>!organisationRoles.includes(role as OrganisationRole)))invalid('Jenis bagian organisasi tidak valid.');
            extra.rowRoles=t.rowRoles as OrganisationRole[];
        }
        if('supportLinks' in t){
            if(!extra.rowRoles||!Array.isArray(t.supportLinks)||t.supportLinks.length>41)invalid('Koordinasi unit tidak valid.');
            const size=(role:OrganisationRole)=>{const row=rows[extra.rowRoles!.indexOf(role)];if(!row)return 0;const cell=row[1] as ProfileCell;return cell.items.length+(cell.text?1:0);};
            const seen=new Set<number>();const leaders=new Set<number>();
            extra.supportLinks=t.supportLinks.map(raw=>{const link=object(raw,['leader','units'],'koordinasi');
                if(!Number.isInteger(link.leader)||(link.leader as number)<0||(link.leader as number)>=size('leader')||leaders.has(link.leader as number)||!Array.isArray(link.units)||!link.units.length||link.units.some(unit=>!Number.isInteger(unit)||unit<0||unit>=size('support')||seen.has(unit)||(seen.add(unit),false)))invalid('Koordinasi unit tidak valid.');
                leaders.add(link.leader as number);return {leader:link.leader as number,units:link.units as number[]};});
        }
        if('connections' in t){
            if(numeric||headers.length!==2)invalid('Panah hanya tersedia untuk bagan organisasi dua kolom.');
            try { extra.connections=validateConnections({...extra,rows} as ProfileTable,t.connections as OrganisationConnection[]); }
            catch(error){invalid((error as Error).message);}
        }
        return { ...extra, title: text(t.title, "Subjudul", false, 500), caption: text(t.caption, "Nama tabel", true, 500), intro: text(t.intro, "Pengantar"), note: text(t.note, "Catatan"), numeric, headers, rows };
    });
    const result = { tables };
    if (new TextEncoder().encode(JSON.stringify(result)).length > PROFILE_CONTENT_LIMIT) invalid("Isi tabel terlalu besar.");
    return result;
}

export function validateProfileUpdate(value: unknown) {
    const b = object(value, ["version", "documentUpdatedAt", "name", "groupTitle", "published", "order", "content"], "permintaan", ["groupPosition"]);
    const stamp = text(b.documentUpdatedAt, "Versi dokumen", true, 40);
    if (!Number.isFinite(Date.parse(stamp)) || new Date(stamp).toISOString() !== stamp) invalid("Versi dokumen tidak valid.");
    const version = integer(b.version, "Versi tabel");
    if (version < 1) invalid("Versi tabel tidak valid.");
    return {
        ...(b.groupPosition===undefined?{}:{groupPosition:integer(b.groupPosition,"Urutan bagian")}),
        version, documentUpdatedAt: stamp, name: text(b.name, "Judul dokumen", true, 500),
        groupTitle: text(b.groupTitle, "Kelompok", true, 300), published: boolean(b.published, "Publikasi"),
        order: integer(b.order, "Urutan"), content: validateProfileContent(b.content),
    };
}
