"use client";

type MetaValue = string | number | boolean | null | MetaValue[] | { [key: string]: MetaValue };

// Pola khusus: array of { name, scheme, note? }, dipakai di daftar pemenang
// BIMA (mis. "Penelitian"). Dirender bernomor "1. Nama (scheme) note" biar
// kebaca, bukan dump "name: ... / scheme: ..." kayak object generik. `note`
// opsional buat kasus kayak "Nama (PDP) batch II", teks nempel di situs
// asli TAPI di luar tanda kurung skema, jadi nggak bisa dimasukin ke
// `scheme` begitu aja (bakal jadi "(PDP batch II)", beda tanda kurungnya).
function isNameSchemeArray(data: MetaValue): data is { name: string; scheme?: string; note?: string }[] {
    return (
        Array.isArray(data) &&
        data.length > 0 &&
        data.every(
            (item) =>
                typeof item === "object" &&
                item !== null &&
                !Array.isArray(item) &&
                typeof (item as Record<string, unknown>).name === "string"
        )
    );
}

// Pola khusus: object yang tiap value-nya array nama (mis. "PkM" yang punya
// beberapa sub-skema, tiap skema isinya daftar nama). Dirender bernomor,
// nomornya nyambung lintas sub-grup. sama kayak daftar bernomor di Google
// Docs/Sites yang jalan terus meski dipotong sub-heading.
function isGroupedNameLists(data: MetaValue): data is { [key: string]: (string | number)[] } {
    if (typeof data !== "object" || data === null || Array.isArray(data)) return false;
    const values = Object.values(data);
    return (
        values.length > 0 &&
        values.every((v) => Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string" || typeof x === "number"))
    );
}

/**
 * Render generik buat field `meta` (JSON) di ArchiveBlock. dipakai buat
 * blockType "highlight" dan "stat" yang bentuk datanya nested/beda-beda,
 * jadi nggak di-hardcode ke satu bentuk tertentu. Sengaja bukan
 * `<pre>{JSON.stringify()}</pre>` biar kebaca kayak daftar, bukan dump JSON.
 */
export default function MetaTree({ data, depth = 0 }: { data: MetaValue; depth?: number }) {
    if (data === null || data === undefined) return null;

    if (isNameSchemeArray(data)) {
        return (
            <ol className={depth > 0 ? "mt-1 ml-3 border-l border-[var(--color-outline-gray)] pl-3 space-y-1" : "space-y-1"}>
                {data.map((item, i) => (
                    <li key={i} className="text-[13px] text-[var(--color-graphite)]">
                        {i + 1}. {item.name}
                        {item.scheme ? ` (${item.scheme})` : ""}
                        {item.note ? ` ${item.note}` : ""}
                    </li>
                ))}
            </ol>
        );
    }

    if (isGroupedNameLists(data)) {
        let counter = 0;
        return (
            <div className={depth > 0 ? "mt-1 ml-3 border-l border-[var(--color-outline-gray)] pl-3 space-y-2" : "space-y-2"}>
                {Object.entries(data).map(([groupLabel, items]) => (
                    <div key={groupLabel}>
                        <div className="text-[13px] font-semibold text-[var(--color-absolute-zero)]">{groupLabel}</div>
                        <ol className="mt-1 space-y-1">
                            {items.map((name) => {
                                counter += 1;
                                return (
                                    <li key={counter} className="text-[13px] text-[var(--color-graphite)]">
                                        {counter}. {name}
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                ))}
            </div>
        );
    }

    if (Array.isArray(data)) {
        return (
            <ul className={depth > 0 ? "mt-1 ml-3 border-l border-[var(--color-outline-gray)] pl-3 space-y-1" : "space-y-1"}>
                {data.map((item, i) => (
                    <li key={i} className="text-[13px] text-[var(--color-graphite)]">
                        {typeof item === "object" && item !== null ? (
                            <MetaTree data={item} depth={depth + 1} />
                        ) : (
                            <> {String(item)}</>
                        )}
                    </li>
                ))}
            </ul>
        );
    }

    if (typeof data === "object") {
        const entries = Object.entries(data);
        return (
            <dl className={depth > 0 ? "mt-1 ml-3 border-l border-[var(--color-outline-gray)] pl-3 space-y-1.5" : "space-y-1.5"}>
                {entries.map(([key, value]) => {
                    const isPrimitive = typeof value !== "object" || value === null;
                    return (
                        <div key={key}>
                            <dt className="text-[13px] font-semibold text-[var(--color-absolute-zero)] inline">
                                {key}
                                {isPrimitive ? ": " : ""}
                            </dt>
                            {isPrimitive ? (
                                <dd className="inline text-[13px] text-[var(--color-graphite)]">{String(value)}</dd>
                            ) : (
                                <MetaTree data={value as MetaValue} depth={depth + 1} />
                            )}
                        </div>
                    );
                })}
            </dl>
        );
    }

    return <span className="text-[13px] text-[var(--color-graphite)]">{String(data)}</span>;
}
