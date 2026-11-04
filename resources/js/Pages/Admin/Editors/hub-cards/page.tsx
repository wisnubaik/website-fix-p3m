import { useEditedPage } from '@/components/admin/PageEditorContext';
"use client";

import { useState } from "react";
import ResourceEditor from "@/components/admin/ResourceEditor";
import { useRouteOptions } from "@/components/admin/managed-site";

export default function HubCardsAdminPage() {
    const ROUTE_OPTIONS = useRouteOptions();
    const pagePath = useEditedPage();
    const fixedHub = ["/penelitian", "/pkm"].includes(pagePath);
    const [tab, setTab] = useState<"penelitian" | "pkm">(pagePath === "/pkm" ? "pkm" : "penelitian");

    return (
        <div>
            <h1 className="font-display text-2xl font-bold text-[var(--color-absolute-zero)] mb-1">
                Pilihan skema
            </h1>
            <p className="text-sm text-[var(--color-graphite)] mb-6 max-w-[600px]">
                Kartu skema yang tampil di halaman{" "}
                <code className="bg-[var(--color-whisper-white)] px-1 py-0.5 text-[12px]">/penelitian</code> dan{" "}
                <code className="bg-[var(--color-whisper-white)] px-1 py-0.5 text-[12px]">/pkm</code>.
            </p>

            {!fixedHub && <div className="flex gap-1 mb-6 border-b border-[var(--color-outline-gray)]">
                {(["penelitian", "pkm"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`text-sm px-3.5 py-2.5 font-medium border-b-2 -mb-px transition-colors capitalize ${
                            tab === t
                                ? "border-[var(--color-absolute-zero)] text-[var(--color-absolute-zero)]"
                                : "border-transparent text-[var(--color-graphite)] hover:text-[var(--color-absolute-zero)]"
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>}

            <ResourceEditor
                key={tab}
                hasPublished
                apiPath="/api/admin/hub-cards"
                listPath={`/api/admin/hub-cards?hub=${tab}`}
                extraFields={{ hub: tab }}
                title={`Kartu ${tab}`}
                tableFields={["title", "desc", "href"]}
                publicHref={`/${tab}`}
                fields={[
                    { key: "order", label: "Urutan tampil", type: "number" },
                    { key: "title", label: "Judul", required: true },
                    { key: "desc", label: "Deskripsi", type: "textarea", required: true },
                    {
                        key: "href",
                        label: "Link tujuan",
                        type: "select",
                        options: ROUTE_OPTIONS.map((r) => r.href),
                        required: true,
                    },
                ]}
            />
        </div>
    );
}
