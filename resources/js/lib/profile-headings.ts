export function splitClusterTitle(value: string) {
    const separator = value.indexOf(':');
    return separator < 0
        ? { label: '', title: value }
        : { label: value.slice(0, separator), title: value.slice(separator + 1).replace(/^ /, '') };
}

export function joinClusterTitle(label: string, title: string) {
    return label.trim() ? `${label}: ${title}` : title;
}

export function splitYearHeading(value: string) {
    const newline = value.indexOf('\n');
    if (newline >= 0 && /^\d{0,4}$/.test(value.slice(0, newline))) {
        return { year: value.slice(0, newline), title: value.slice(newline + 1) };
    }
    const complete = value.match(/^((?:19|20)\d{2})(?:\s+([\s\S]*))?$/);
    if (complete) return { year: complete[1], title: complete[2] ?? '' };
    return { year: '', title: value };
}
