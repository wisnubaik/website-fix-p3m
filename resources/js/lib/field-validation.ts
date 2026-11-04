import catalog from './field-rules.json';

type Rule = { max: number; help: string; pattern?: string; partial?: string; minValue?: number; maxValue?: number; inputMode?: 'numeric' | 'email' | 'tel' };
export type FieldPolicy = keyof typeof catalog.rules;
export function fieldPolicy(resource: string, key: string, type?: string): FieldPolicy {
    return ((catalog.fields as Record<string, Record<string, FieldPolicy>>)[resource]?.[key]
        ?? (catalog.common as Record<string, FieldPolicy>)[key]
        ?? (type === 'number' || type === 'Int' ? 'integer' : 'text'));
}
export function labelPolicy(label: string): FieldPolicy {
    return (catalog.labels as Record<string, FieldPolicy>)[label.trim().toLowerCase()] ?? 'text';
}
export function fieldRule(policy: FieldPolicy): Rule { return catalog.rules[policy] as Rule; }
export function fieldError(policy: FieldPolicy, value: unknown, partial = false): string {
    if (value === '' || value === null || value === undefined) return '';
    const rule = fieldRule(policy);
    if (typeof value !== 'string' && (typeof value !== 'number' || !Number.isFinite(value))) return rule.help;
    const text = String(value);
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(text)) return 'Karakter kontrol tidak diperbolehkan.';
    if (Array.from(text).length > rule.max) return `Maksimal ${rule.max} karakter. ${rule.help}`;
    const pattern = partial ? rule.partial : rule.pattern;
    if (pattern && !new RegExp(pattern, 'u').test(text)) return rule.help;
    if (!partial && rule.maxValue !== undefined && (Number(text) > rule.maxValue || Number(text) < (rule.minValue ?? 0))) return rule.help;
    if (!partial && policy === 'phone' && text.replace(/\D/g, '').length < 6) return 'Nomor telepon harus memiliki sedikitnya 6 digit.';
    return '';
}
export function numericInput(value: string): number {
    return value !== '' && /^[0-9]+$/.test(value) ? Number(value) : Number.NaN;
}
