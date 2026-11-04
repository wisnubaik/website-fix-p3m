export type DocKind = "pdf" | "docx" | "xlsx" | "pptx" | "link";

export type DocItem = {
    id?: string;
    name: string;
    kind: DocKind;
    year?: string;
    cat?: string;
    href?: string;
};

export type DocSection = {
    title: string;
    mark?: string; // 3-letter mono badge
    items: DocItem[];
};

export type FilterChip = {
    id: string;
    label: string;
};