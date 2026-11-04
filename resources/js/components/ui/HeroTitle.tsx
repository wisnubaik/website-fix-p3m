export function findHeroEmphasis(title: string, phrase?: string | null) {
    const value = phrase?.trim();
    if (!value) return null;
    return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'iu').exec(title);
}

export default function HeroTitle({ title, phrase }: { title: string; phrase?: string | null }) {
    const match = findHeroEmphasis(title, phrase);
    if (!match) return <>{title}</>;
    return <>{title.slice(0, match.index)}<em className="font-serif italic font-normal">{match[0]}</em>{title.slice(match.index + match[0].length)}</>;
}
