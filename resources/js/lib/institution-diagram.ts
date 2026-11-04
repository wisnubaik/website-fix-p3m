import type { ProfileCell, ProfileTable } from './profile-tables';
import { cellEntries, legacySupportLinks, organisationRole } from './profile-organisation';

export const INSTITUTION_HEADING = 'Struktur organisasi\nPoliteknik Negeri Madiun';
type Row = ProfileTable['rows'][number];
export type DiagramText = { lines: string[]; y: number; entry?: number; indent?: number };
export type DiagramBox = {
    id: string; row: Row; column: number; x: number; y: number; width: number; height: number;
    shape: 'rectangle' | 'ellipse'; fontSize: number; lineHeight: number;
    align: 'center' | 'left'; bold?: boolean; texts: DiagramText[];
};
export type DiagramPath = { id: string; d: string; coordination?: boolean };

/** Line breaks from the reference only apply while the CMS wording matches. */
function referenceLineBreaks(value: string): string {
    const labels = [
        ['Wadir', 'Bidang Akademik'],
        ['Wadir Bidang', 'Perencanaan,', 'Keuangan', 'dan Umum'],
        ['Wadir Bidang', 'Kemahasiswaan dan', 'Kerjasama'],
        ['UPA Layanan dan', 'Uji Kompetensi'],
        ['UPA Teknologi', 'Informasi dan', 'Komunikasi'],
        ['UPA Pengembangan', 'Karir dan', 'Kewirausahaan'],
        ['Kelompok', 'Jabatan Fungsional'],
        ['D4 Teknologi Rekayasa', 'Perangkat Lunak'],
    ];
    return labels.find(lines => lines.join(' ') === value)?.join('\n') ?? value;
}

/** Conservative Arial widths keep wrapping deterministic in the browser and SSR. */
function textWidth(text: string, size: number): number {
    return Array.from(text).reduce((sum, char) => sum + (/\s/.test(char) ? .28 : /[ilI.,:;!'|]/.test(char) ? .26 : /[mwMW@%]/.test(char) ? .86 : /[A-Z0-9]/.test(char) ? .64 : .52) * size, 0);
}

export function wrapDiagramText(text: string, width: number, size: number): string[] {
    return text.split(/\r?\n/).flatMap(paragraph => {
        const lines: string[] = [];
        let line = '';
        for (const word of paragraph.trim().split(/\s+/)) {
            const candidate = line ? `${line} ${word}` : word;
            if (textWidth(candidate, size) <= width) { line = candidate; continue; }
            if (line) { lines.push(line); line = ''; }
            for (const character of word) {
                if (line && textWidth(line + character, size) > width) { lines.push(line); line = ''; }
                line += character;
            }
        }
        lines.push(line);
        return lines;
    });
}

export function institutionLayout(table: ProfileTable) {
    const rows = (role: ReturnType<typeof organisationRole>) => table.rows.filter((_, i) => organisationRole(table, i) === role);
    const leader = rows('leader')[0], council = rows('council')[0], inspection = rows('inspection')[0];
    const departments = rows('department'), administration = rows('administration');
    const centres = rows('centres')[0], support = rows('support')[0], functional = rows('functional')[0];
    const names = (row?: Row) => row ? cellEntries(row[1] as ProfileCell) : [];
    const leaders = names(leader), supportNames = names(support);
    const leftSupportCount = Math.ceil(supportNames.length / 2);
    const spine = Math.max(686, departments.length > 3 ? 46 + departments.length * 220 : 0, 58 + leftSupportCount * 188);
    const width = spine + Math.max(594, 100 + administration.length * 171, 30 + (supportNames.length - leftSupportCount) * 188, 70 + names(centres).length * 102);
    const leaderWidth = 410;
    const leaderX = spine - leaderWidth / 2;
    const boxes: DiagramBox[] = [], paths: DiagramPath[] = [];
    const addPath = (id: string, d: string, coordination = false) => paths.push({ id, d, coordination });
    const labelBox = (id: string, row: Row, entry: number | undefined, x: number, y: number, w: number, minHeight: number, size = 11, shape: DiagramBox['shape'] = 'rectangle', column = 1, bold = false) => {
        const value = entry === undefined ? cellEntries(row[column] as ProfileCell).join('\n') : cellEntries(row[column] as ProfileCell)[entry];
        const lines = wrapDiagramText(referenceLineBreaks(bold ? value?.toLocaleUpperCase('id-ID') ?? '' : value ?? ''), w - (shape === 'ellipse' ? 30 : 14), size);
        const lineHeight = size * 1.2;
        const height = Math.max(minHeight, shape === 'ellipse' && lines.length > 2 ? lines.length * lineHeight / .65 + 8 : lines.length * lineHeight + 4);
        const box: DiagramBox = { id, row, column, x, y, width: w, height, fontSize: size, lineHeight, shape, bold, align: 'center', texts: [{ lines, y: (height - lines.length * lineHeight) / 2 + size, entry }] };
        boxes.push(box);
        return box;
    };
    const bottom = (box: DiagramBox) => box.y + box.height;
    const titleLines = wrapDiagramText(table.title || INSTITUTION_HEADING, 520, 20);
    const top = Math.max(220, 160 + titleLines.length * 24 + 12);
    const director = labelBox('director', leader, 0, leaderX, top, leaderWidth, 44, 18, 'rectangle', 1, true);
    const deputies: DiagramBox[] = [];
    let leaderBottom = bottom(director);
    for (let start = 1; start < leaders.length; start += 3) {
        const count = Math.min(3, leaders.length - start);
        const group = leaders.slice(start, start + count).map((_, i) => labelBox(`deputy-${start + i - 1}`, leader, start + i, leaderX + i * leaderWidth / count, leaderBottom, leaderWidth / count, 69, 12));
        const height = Math.max(...group.map(box => box.height));
        for (const box of group) {
            box.height = height;
            box.texts[0].y = (height - box.texts[0].lines.length * box.lineHeight) / 2 + box.fontSize;
        }
        deputies.push(...group);
        leaderBottom += height;
    }
    const councils: DiagramBox[] = [];
    let councilY = top;
    for (let start = 0; start < names(council).length; start += 2) {
        const group = names(council).slice(start, start + 2).map((_, i) => labelBox(`council-${start + i}`, council!, start + i, i === 0 ? 123 : width - 202, councilY, 138, 52, 16, 'ellipse'));
        councils.push(...group);
        councilY = Math.max(...group.map(bottom)) + 12;
    }
    for (const box of councils) {
        const left = box.x < spine;
        addPath(`council-link-${box.id}`, `M ${left ? box.x + box.width : leaderX + leaderWidth} ${box.y + box.height / 2} H ${left ? leaderX : box.x}`, true);
    }
    let inspectionY = Math.max(358, leaderBottom + 25, ...councils.map(box => bottom(box) + 20));
    for (let i = 0; i < names(inspection).length; i++) {
        const box = labelBox(`inspection-${i}`, inspection!, i, 157, inspectionY, 138, 52, 16, 'ellipse');
        addPath(`inspection-link-${i}`, `M ${box.x + box.width} ${box.y + box.height / 2} H ${spine}`);
        inspectionY = bottom(box) + 14;
    }
    const adminBranchY = Math.max(426, inspectionY + 2);
    const departmentY = adminBranchY + 51;
    const departmentBoxes = departments.map((row, i) => {
        const xs = [46, 268, 473], widths = [205, 188, 196];
        const x = departments.length === 3 ? xs[i] : 46 + i * 220;
        const w = departments.length === 3 ? widths[i] : 204;
        const head = labelBox(`department-${i}`, row, undefined, x, departmentY, w, 34, 10.5, 'rectangle', 0);
        const cell = row[1] as ProfileCell;
        const texts: DiagramText[] = [];
        let y = 26;
        for (const [entry, value] of cellEntries(cell).entries()) {
            const numbered = !cell.text || entry > 0;
            const number = entry + (cell.text ? 0 : 1);
            const lines = wrapDiagramText(referenceLineBreaks(value), w - 32, 10.5);
            if (numbered) lines[0] = `${number}. ${lines[0]}`;
            texts.push({ lines, y, entry, indent: numbered ? 13 : 0 });
            y += lines.length * 15;
        }
        const body: DiagramBox = { id: `programmes-${i}`, row, column: 1, x, y: bottom(head) + 9, width: w, height: Math.max(departments.length === 3 && i === 2 ? 171 : 94, y - 15 + 8), shape: 'rectangle', fontSize: 10.5, lineHeight: 15, align: 'left', texts };
        boxes.push(body);
        return { head, body };
    });
    if (departmentBoxes.length) {
        const branch = departmentY - 25;
        const anchor = (i: number) => departments.length === 3 ? [140, 366, 575][i] : departmentBoxes[i].head.x + departmentBoxes[i].head.width / 2;
        addPath('departments', `M ${spine} ${branch} H ${anchor(0)}`);
        departmentBoxes.forEach(({ head }, i) => addPath(`department-link-${i}`, `M ${anchor(i)} ${branch} V ${head.y}`));
    }
    const adminHeads: DiagramBox[] = [];
    let adminBottom = adminBranchY + 111;
    administration.forEach((row, i) => {
        let y = adminBranchY + 26;
        let previous: DiagramBox | undefined;
        names(row).forEach((_, j) => {
            const box = labelBox(`administration-${i}-${j}`, row, j, spine + 85 + i * 171, y, 154, j === 0 ? 43 : 26);
            if (!previous) adminHeads.push(box);
            else addPath(`administration-chain-${i}-${j}`, `M ${box.x + box.width / 2} ${bottom(previous)} V ${box.y}`);
            previous = box; y = bottom(box) + 16; adminBottom = Math.max(adminBottom, bottom(box));
        });
    });
    if (adminHeads.length) {
        const first = adminHeads[0], last = adminHeads[adminHeads.length - 1];
        const middle = (first.x + first.width / 2 + last.x + last.width / 2) / 2;
        addPath('administration', `M ${spine} ${adminBranchY} H ${middle} V ${adminBranchY + 13} M ${first.x + first.width / 2} ${adminBranchY + 13} H ${last.x + last.width / 2}`);
        adminHeads.forEach((box, i) => addPath(`administration-link-${i}`, `M ${box.x + box.width / 2} ${adminBranchY + 13} V ${box.y}`));
    }
    const centreY = adminBottom + 43;
    const centreBoxes = names(centres).map((_, i) => labelBox(`centre-${i}`, centres!, i, spine + 51 + i * 102, centreY, 85, 34));
    if (centreBoxes.length) {
        const last = centreBoxes[centreBoxes.length - 1];
        addPath('centres', `M ${spine} ${centreY - 30} H ${last.x + last.width / 2}`);
        centreBoxes.forEach((box, i) => addPath(`centre-link-${i}`, `M ${i === 0 && centreBoxes.length === 2 ? spine + 98 : box.x + box.width / 2} ${centreY - 30} V ${box.y}`));
    }
    const contentBottom = Math.max(691, adminBottom, ...departmentBoxes.map(({ body }) => bottom(body)), ...centreBoxes.map(bottom));
    const links = (table.supportLinks ?? legacySupportLinks(table)).filter(link => leaders[link.leader] !== undefined && link.units.some(index => supportNames[index] !== undefined));
    const supportY = contentBottom + 76 + Math.max(0, links.length - 2) * 18;
    const referenceSupport = supportNames.length === 6 && spine === 686 && width === 1280;
    const supportBoxes = supportNames.map((_, i) => {
        const x = referenceSupport ? [55, 243, 430, 703, 891, 1087][i] : (i < leftSupportCount ? 55 + i * 188 : spine + 17 + (i - leftSupportCount) * 188);
        return labelBox(`support-${i}`, support!, i, x, supportY, 171, 43, 10.5);
    });
    if (supportBoxes.length) {
        const anchor = (i: number) => referenceSupport ? [124, 328, 516, 788, 976, 1172][i] : supportBoxes[i].x + supportBoxes[i].width / 2;
        addPath('support-command', `M ${anchor(0)} ${supportY - 26} H ${anchor(supportBoxes.length - 1)}`);
        supportBoxes.forEach((box, i) => addPath(`support-command-${i}`, `M ${anchor(i)} ${supportY - 26} V ${box.y}`));
    }
    links.forEach((link, i) => {
        const source = link.leader === 0 ? director : deputies[link.leader - 1];
        const units = link.units.map(unit => supportBoxes[unit]).filter(Boolean);
        if (!source || !units.length) return;
        const right = source.x + source.width / 2 > spine + 5;
        if (right && units.length === 1 && units[0].x > spine) {
            const target = units[0];
            addPath(`coordination-${i}`, `M ${source.x + source.width / 2} ${bottom(source)} V ${leaderBottom + 60} H ${target.x + target.width * .6} V ${target.y}`, true);
        } else {
            const x = right ? width - 21 - i * 5 : 21 + i * 5;
            const branch = supportY - 51 - i * 18;
            const y = source.y + source.height / 2;
            const targets = units.map(box => referenceSupport ? [98, 294, 490, 763, 950, 1190][supportBoxes.indexOf(box)] : box.x + box.width * .25);
            addPath(`coordination-${i}`, `M ${right ? source.x + source.width : source.x} ${y} H ${x} V ${branch} H ${right ? Math.min(...targets) : Math.max(...targets)}`, true);
            units.forEach((box, j) => addPath(`coordination-unit-${i}-${j}`, `M ${targets[j]} ${branch} V ${box.y}`, true));
        }
    });
    let functionalY = Math.max(supportY + 68, ...supportBoxes.map(box => bottom(box) + 25));
    const functionalStart = functionalY;
    names(functional).forEach((_, i) => {
        const box = labelBox(`functional-${i}`, functional!, i, spine - 85, functionalY, 171, 35);
        if (i) addPath(`functional-link-${i}`, `M ${spine} ${functionalY - 18} V ${functionalY}`);
        functionalY = bottom(box) + 18;
    });
    const trunkBottom = functional ? functionalStart : supportBoxes.length ? supportY - 26 : Math.max(adminBottom, contentBottom);
    addPath('command-spine', `M ${spine} ${leaderBottom} V ${trunkBottom}`);
    const height = Math.max(914, functionalY + 26, supportY + 147);
    return { width, height, spine, titleLines, boxes, paths, legendY: height - 53 };
}
