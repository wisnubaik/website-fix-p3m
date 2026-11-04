/** Convert stored zero-based order only at the UI boundary. */
export function displayOrder(value: unknown): number | '' {
    if (value === '' || value === null || value === undefined) return '';
    const order = Number(value);
    return Number.isFinite(order) ? order + 1 : '';
}

export function storedOrder(value: string): number {
    return value.trim() === '' ? Number.NaN : Number(value) - 1;
}
