import { fieldPolicy, fieldError, fieldRule } from '@/lib/field-validation';
import { numericInput } from '@/lib/field-validation';
import { CmsInput, CmsTextarea } from '@/components/admin/CmsInput';
import ExcelImport from './ExcelImport';
import PairListInput, { parseDetailPairs } from './PairListInput';
import { displayOrder, storedOrder } from '@/lib/display-order';
import LinkInput from './LinkInput';
import { useEditedPage } from './PageEditorContext';
import { cmsFetch } from "@/lib/cms-fetch";
"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatTanggal } from "@/lib/format-tanggal";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { useToast } from "./Toast";
import ConfirmDialog from "./ConfirmDialog";
import ActionDialog from "./ActionDialog";
import PblText from "@/components/ui/PblText";
import { useOptionalAdminSession } from "./AdminSessionContext";

export type FieldDef = {
    key: string;
    label: string;
    type?:
        | "text"
        | "number"
        | "boolean"
        | "textarea"
        | "file"
        | "image"
        | "select"
        | "date"
        | "time"
        /**
         * Daftar pilihan + kemungkinan mengetik nilai baru. Dipakai untuk kolom
         * yang nilainya HARUS seragam demi penyaringan, tapi daftarnya belum
         * tentu lengkap. mis. program studi. Pilihannya diambil otomatis dari
         * data yang sudah ada, ditambah opsi "Lainnya" untuk nilai baru.
         */
        | "combobox"
        /**
         * Hanya ditampilkan, tidak bisa diubah. Dipakai untuk kolom yang
         * nilainya sudah pasti dan tidak boleh diganti admin. mis. acara dan
         * judul periode, yang menentukan ke bagian mana halaman publik
         * membacanya. Mengubahnya akan memutus kaitan itu tanpa peringatan.
         */
        | "readonly"
        /**
         * Kumpulan gambar. Nilainya disimpan sebagai alamat berkas, satu per
         * baris, tetapi pengelola tidak perlu melihat alamat itu sama sekali:
         * gambar diunggah lewat tombol, tampil sebagai thumbnail, dan dapat
         * dihapus atau digeser urutannya lewat tombol di tiap gambar.
         */
        | "gallery"
        | "pairs";
    placeholder?: string;
    preview?: "pbl-text";
    /** Field wajib diisi. divalidasi sebelum simpan (client) dan ditandai bintang. */
    required?: boolean;
    /** Wajib diisi kalau `type: "select"`, daftar pilihan yang boleh dipilih (mencegah typo bebas). */
    options?: string[];
    optionLabels?: Record<string, string>;
    help?: string;
    /**
     * Pilihan yang BERGANTUNG pada nilai kolom lain. `field` menyebut kolom
     * penentunya, `map` memetakan nilai kolom itu ke daftar pilihan yang sah.
     * Dipakai mis. pada Dokumen: kategori filter yang tersedia berbeda-beda
     * tergantung halaman tujuannya, dan halaman yang tidak punya chip
     * penyaring sama sekali tidak menawarkan pilihan apa pun.
     *
     * Kalau kolom penentunya belum diisi, daftar pilihannya kosong.
     */
    optionsBy?: { field: string; map: Record<string, string[]> };
    /** Format nilai saat DITAMPILKAN di tabel (isian form tetap angka mentah). "currency" -> "Rp 9.000.000". */
    display?: "currency";
};

/**
 * Filter dropdown di atas tabel. Kalau `options` dikosongkan, pilihannya
 * diambil otomatis dari nilai unik yang ada di data (urut menurun). jadi
 * tahun baru langsung muncul sendiri tanpa perlu ubah kode.
 */
export type FilterDef = {
    key: string;
    label: string;
    options?: string[];
};

/** Format satu sel tabel sesuai `display` di FieldDef-nya. */
function formatCell(field: FieldDef, value: unknown) {
    const raw = String(field.key === "order" ? displayOrder(value) : value ?? "");
    if (field.type === "date") return formatTanggal(raw) || "-";
    if (field.display === "currency") {
        const n = Number(value);
        if (!raw.trim() || Number.isNaN(n)) return "-";
        return n === 0 ? "-" : "Rp " + new Intl.NumberFormat("id-ID").format(n);
    }
    return field.optionLabels?.[raw] ?? raw;
}

/**
 * Editor CRUD generik. dipakai buat semua jenis konten (Pengumuman, Riset
 * Grup, Dokumen, dst). Cukup kasih `apiPath` (mis. "/api/admin/announcements")
 * dan daftar field-nya, komponen ini otomatis render tabel + form
 * tambah/edit/hapus yang manggil API route yang sama.
 */
export function paginateRecords<T>(items: T[], requestedPage: number, size = 20) {
    const pages = Math.max(1, Math.ceil(items.length / size));
    const page = Math.max(1, Math.min(requestedPage, pages));
    const offset = (page - 1) * size;
    return { page, pages, offset, rows: items.slice(offset, offset + size).map((item, index) => ({ item, index: offset + index })) };
}

export default function ResourceEditor(props: Parameters<typeof ResourceEditorInner>[0]) {
    const pagePath = useEditedPage();
    const section = pagePath.split('/').pop() ?? '';
    const documentSections = ['luaran','laporan-keuangan','mitra','kegiatan','sinta','tkt','monev','semhas','ki','asesmen','panduan','repository'];
    if (props.apiPath === '/api/admin/documents' && documentSections.includes(section)) {
        const params = new URLSearchParams(props.listPath?.split('?')[1] ?? '');
        params.set('section', section);
        props = {...props, listPath: `/api/admin/documents?${params}`, publicHref: pagePath,
            extraFields: {...props.extraFields, section}, fields: props.fields.filter(f => f.key !== 'section'),
            filters: props.filters?.filter(f => f.key !== 'section')};
    }
    if (props.apiPath === '/api/admin/acara-periode' && ['monev','semhas'].includes(section)) {
        props = {...props, listPath: `/api/admin/acara-periode?acara=${section}`};
    }
    // useSearchParams() di dalam wajib dibungkus Suspense (aturan Next.js App
    // Router). dibungkus di sini biar semua halaman admin yang pakai
    // komponen ini otomatis aman tanpa perlu nambah <Suspense> satu-satu.
    return (
        <Suspense fallback={<div className="text-sm text-[var(--color-graphite)]">Memuat...</div>}>
            <ResourceEditorInner {...props} />
        </Suspense>
    );
}

function ResourceEditorInner({
    apiPath,
    listPath,
    fields,
    title,
    hasOrder = true,
    publicHref,
    extraFields,
    defaultUploadVisibility = "private",
    hasPublished = false,
    flagEmptyField,
    tableFields,
    filters,
    sortKeys,
    canCreate = true,
    canDelete = true,
}: {
    /** Base URL buat POST (tambah baru) dan PUT/DELETE per-item (`${apiPath}/${id}`). JANGAN pakai query string di sini. */
    apiPath: string;
    /** URL buat GET list, boleh beda dari apiPath (mis. pakai query string buat filter). Default: sama dengan apiPath. */
    listPath?: string;
    fields: FieldDef[];
    title: string;
    /** Set false kalau resource ini nggak punya kolom `order` (nonaktifkan tombol reorder). */
    hasOrder?: boolean;
    /** URL halaman publik yang menampilkan data ini. kalau diisi, muncul tombol "Lihat di situs". */
    publicHref?: string;
    /** Nilai default yang otomatis melekat pada data BARU (tidak muncul sebagai isian di formulir). mis. { section: "profil-misi" }. */
    extraFields?: Record<string, unknown>;
    defaultUploadVisibility?: "public" | "private";
    /** Set true kalau resource ini punya kolom `published`, nampilin toggle Draft/Publikasikan di form dan badge di tabel. */
    hasPublished?: boolean;
    /** Nama field yang kalau kosong ditandai badge merah "Belum ada link" di tabel. mis. "href". */
    flagEmptyField?: string;
    /**
     * Kolom mana saja yang ditampilkan di tabel, sesuai urutan yang ditulis
     * di sini. Default: 4 field pertama. cukup buat resource sederhana,
     * tapi kurang buat resource seperti Data Penelitian & PkM yang perlu
     * semua kolomnya kelihatan sekaligus.
     */
    tableFields?: string[];
    /** Filter dropdown di atas tabel (mis. filter Tahun). */
    filters?: FilterDef[];
    /**
     * Urutan tampil tabel kalau kolom `order` saja nggak cukup. mis. Data
     * Penelitian & PkM yang `order`-nya dihitung PER TAHUN, jadi harus
     * diurutkan tahun dulu baru order, kalau tidak barisnya kelihatan acak.
     */
    sortKeys?: { key: string; dir: "asc" | "desc" }[];
    /**
     * Matikan tombol Tambah untuk resource yang jumlah barisnya sudah pasti
     * dan tidak boleh bertambah. mis. Periode Acara, yang isinya tepat satu
     * baris per acara. Menyediakan tombol Tambah di sana hanya memancing
     * galat "acara sudah ada".
     */
    canCreate?: boolean;
    /** Set false kalau baris tidak boleh dihapus sama sekali (mis. Periode Acara: satu baris per acara). */
    canDelete?: boolean;
}) {
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const editIdFromUrl = searchParams.get("edit");
    const [autoOpenedFor, setAutoOpenedFor] = useState<string | null>(null);
    const [items, setItems] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [uploadVisibility, setUploadVisibility] = useState(defaultUploadVisibility);
    const loadController = useRef<AbortController | null>(null);
    const [orderScope, setOrderScope] = useState<string[]>([]);
    const [orderTouched, setOrderTouched] = useState(false);
    const [reordering, setReordering] = useState(false);
    const [showTrash, setShowTrash] = useState(false);
    const [confirmPermanentId, setConfirmPermanentId] = useState<string | null>(null);
    const [permanentBusy, setPermanentBusy] = useState(false);
    const session = useOptionalAdminSession();
    const isSuperadmin = session?.role === "SUPERADMIN";
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const openTriggerRef = useRef<HTMLElement | null>(null);

    function withTrashParam(url: string, trash: boolean) {
        const sep = url.includes("?") ? "&" : "?";
        return trash ? `${url}${sep}trash=1` : url;
    }

    async function load() {
        try {
        loadController.current?.abort();
        const controller = new AbortController(); loadController.current = controller;
        setLoading(true);
        const res = await cmsFetch(withTrashParam(listPath ?? apiPath, showTrash), {signal:controller.signal});
        if (res.ok) {
            setOrderScope((res.headers.get("X-CMS-Order-Scope") ?? "").split(",").filter(Boolean));
            setItems(await res.json());
        }
        else showToast("Gagal memuat data.", "error");
        setLoading(false);
        } catch(error) { if ((error as Error).name !== "AbortError") showToast("Permintaan gagal. Periksa koneksi lalu coba lagi.", "error"); } finally { setLoading(false); }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount/apiPath/showTrash berubah, bukan derived state
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiPath, listPath, showTrash]);

    useEffect(() => {
        if (!editIdFromUrl || loading || items.length === 0) return;
        if (autoOpenedFor === editIdFromUrl) return;
        const target = items.find((i) => i.id === editIdFromUrl);
        if (target) {
            openEdit(target);
        } else {
            showToast("Data yang dituju tidak ditemukan. Kemungkinan sudah dihapus.", "error");
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- penanda "sudah dibuka otomatis" agar tidak berulang tanpa henti, bukan derived state
        setAutoOpenedFor(editIdFromUrl);
        // Bersihin ?edit= dari URL biar nggak ke-trigger ulang kalau modal ditutup lalu dibuka manual.
        router.replace(window.location.pathname, { scroll: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editIdFromUrl, loading, items]);

    useEffect(() => {
        if (!editing) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") closeModal();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing]);

    // Fokus terkunci di dalam modal (focus trap) + fokus field pertama pas kebuka,
    // + balikin fokus ke tombol yang buka modal pas ditutup.
    //
    // PENTING: dependency-nya `Boolean(editing)` (cuma status buka/tutup),
    // BUKAN `editing` itu sendiri. `editing` adalah object baru tiap kali ada
    // field yang diketik (`setEditing({ ...editing, [f.key]: value })`), jadi
    // kalau effect ini bergantung ke `editing` langsung, dia ke-trigger ULANG
    // di SETIAP keystroke dan maksa fokus balik ke field pertama tiap kali, // makanya karakter kedua dst selalu "loncat" ke field paling atas.
    useEffect(() => {
        if (editing) {
            firstFieldRef.current?.focus();
        } else {
            openTriggerRef.current?.focus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Boolean(editing)]);

    function handleModalKeyDown(e: React.KeyboardEvent) {
        if (e.key !== "Tab" || !modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    function emptyForm() {
        const obj: Record<string, unknown> = { ...extraFields };
        if (hasPublished && obj.published === undefined) obj.published = true;
        fields.forEach((f) => {
            if (obj[f.key] !== undefined) return;
            obj[f.key] = f.type === "pairs" ? "[]" : f.type === "boolean" ? false : f.type === "number" ? 0 : "";
        });
        return obj;
    }

    function openNew(e: React.MouseEvent<HTMLElement>) {
        openTriggerRef.current = e.currentTarget;
        setFieldErrors({});
        setFormError("");
        setOrderTouched(false);
        setEditing(emptyForm());
    }

    function openEdit(item: Record<string, unknown>, e?: React.MouseEvent<HTMLElement>) {
        openTriggerRef.current = e?.currentTarget ?? null;
        setFieldErrors({});
        setFormError("");
        setOrderTouched(false);
        setEditing(item);
    }

    function sameOrderScope(a: Record<string, unknown>, b: Record<string, unknown>) {
        return orderScope.every(key => String(a[key] ?? "") === String(b[key] ?? ""));
    }

    const maximumOrder = editing ? items.filter(item => sameOrderScope(item, editing) && item.id !== editing.id).length + 1 : 1;
    const editingScope = JSON.stringify(orderScope.map(key => editing?.[key] ?? ""));
    useEffect(() => {
        if (!editing || editing.id || !hasOrder || orderTouched) return;
        const next = items.filter(item => sameOrderScope(item, editing)).length;
        if (editing.order !== next) setEditing(current => current ? { ...current, order: next } : current);
    }, [editingScope, editing?.id, Boolean(editing), items, hasOrder, orderTouched]);

    function closeModal() {
        if (saving) return;
        setEditing(null);
    }

    function validate(data: Record<string, unknown>) {
        const errs: Record<string, string> = {};
        if (hasOrder && (!Number.isInteger(Number(data.order)) || Number(data.order) < 0 || Number(data.order) >= maximumOrder)) errs.order = `Urutan harus antara 1 dan ${maximumOrder}, sesuai jumlah data pada bagian ini.`;
        fields.forEach((f) => {
            const policy = fieldPolicy(apiPath.split('/').pop() ?? '', f.key, f.type);
            const message = fieldError(policy, data[f.key]);
            if (message) { errs[f.key] = message; return; }

            if (f.key === "order") {
                const order = data[f.key];
                if (typeof order !== "number" || !Number.isInteger(order) || order < 0) errs[f.key] = "Urutan harus bilangan bulat minimal 1.";
                return;
            }
            if (f.type === "pairs") {
                const pairs = parseDetailPairs(String(data[f.key] ?? ''));
                if (!pairs || pairs.length > 30 || pairs.some(pair => pair.some(value => !value.trim()))) errs[f.key] = "Isi nama dan isi setiap keterangan, atau hapus baris yang kosong.";
                return;
            }
            if (f.optionsBy && !(f.optionsBy.map[String(data[f.optionsBy.field] ?? '')] ?? []).length) return;
            if (!f.required) return;
            const val = data[f.key];
            if (f.type === "number") {
                if (val === "" || val === null || val === undefined || Number.isNaN(Number(val))) {
                    errs[f.key] = "Wajib diisi angka.";
                }
            } else if (f.type !== "boolean") {
                if (!String(val ?? "").trim()) {
                    errs[f.key] = "Wajib diisi.";
                }
            }
        });
        return errs;
    }

    async function save() {
        try {
        if (!editing || saving) return;
        const errs = validate(editing);
        setFieldErrors(errs);
        if (Object.keys(errs).length > 0) {
            setFormError("Ada isian wajib yang belum lengkap. cek yang ditandai merah.");
            return;
        }
        setFormError("");
        setSaving(true);
        const isNew = !editing.id;
        const url = isNew ? apiPath : `${apiPath}/${editing.id}`;
        const method = isNew ? "POST" : "PUT";
        const body = { ...editing };
        if (apiPath === "/api/admin/pbl") {
            for (const key of ["jumlahMahasiswa", "jumlahProdi"]) {
                if (body[key] !== null && body[key] !== undefined) body[key] = String(body[key]);
            }
        }
        delete body.id;
        delete body.createdAt;
        delete body.updatedAt;
        delete body.deletedAt;
        if (isNew && hasOrder && !orderTouched) delete body.order;
        // Kolom warna lama dipertahankan di DB, tetapi bukan lagi konfigurasi CMS.
        if (apiPath === "/api/admin/quick-access") delete body.accent;
        if (apiPath === "/api/admin/hub-cards") delete body.accentName;

        const res = await cmsFetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        setSaving(false);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setFormError(data.errors ? Object.values(data.errors).flat().join(" ") : data.error ?? "Gagal menyimpan. Periksa kembali isian formulir.");
            return;
        }
        setEditing(null);
        showToast(isNew ? "Berhasil ditambahkan." : "Perubahan disimpan.");
        load();
        } catch(error) { if ((error as Error).name !== "AbortError") setFormError("Jaringan gagal. Draft tetap tersimpan di formulir."); } finally { setSaving(false); }
    }

    async function handleFileUpload(key: string, file: File) {
        try {
        if (!editing) return;
        setUploadingKey(key);
        const form = new FormData();
        form.append("file", file);
        form.append("visibility", uploadVisibility);
        const res = await cmsFetch("/api/admin/upload", { method: "POST", body: form });
        setUploadingKey(null);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showToast(err.error ?? "Gagal upload file.", "error");
            return;
        }
        const { url } = await res.json();
        setEditing((prev) => (prev ? { ...prev, [key]: url } : prev));
        showToast("File berhasil di-upload.");
        } catch(error) { if ((error as Error).name !== "AbortError") showToast("Permintaan gagal. Periksa koneksi lalu coba lagi.", "error"); } finally { setUploadingKey(null); }
    }

    /** Unggah beberapa gambar sekaligus, lalu tambahkan ke akhir daftar galeri. */
    async function handleGalleryUpload(key: string, files: FileList) {
        try {
        if (!editing) return;
        setUploadingKey(key);
        const terunggah: string[] = [];
        let gagal = 0;
        for (const file of Array.from(files)) {
            const form = new FormData();
            form.append("file", file);
        form.append("visibility", uploadVisibility);
            const res = await cmsFetch("/api/admin/upload", { method: "POST", body: form });
            if (!res.ok) {
                gagal += 1;
                continue;
            }
            const { url } = await res.json();
            terunggah.push(url);
        }
        setUploadingKey(null);
        if (terunggah.length) {
            setEditing((prev) => {
                if (!prev) return prev;
                const lama = String(prev[key] ?? "")
                    .split("\n")
                    .map((x) => x.trim())
                    .filter(Boolean);
                return { ...prev, [key]: [...lama, ...terunggah].join("\n") };
            });
        }
        if (gagal) showToast(`${gagal} gambar gagal diunggah.`, "error");
        else if (terunggah.length) showToast(`${terunggah.length} gambar ditambahkan.`);
        } catch(error) { if ((error as Error).name !== "AbortError") showToast("Permintaan gagal. Periksa koneksi lalu coba lagi.", "error"); } finally { setUploadingKey(null); }
    }

    /** Hapus atau geser satu gambar di dalam galeri. */
    function ubahGaleri(key: string, index: number, aksi: "hapus" | "kiri" | "kanan") {
        setEditing((prev) => {
            if (!prev) return prev;
            const daftar = String(prev[key] ?? "")
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean);
            if (aksi === "hapus") daftar.splice(index, 1);
            else {
                const tujuan = aksi === "kiri" ? index - 1 : index + 1;
                if (tujuan < 0 || tujuan >= daftar.length) return prev;
                [daftar[index], daftar[tujuan]] = [daftar[tujuan], daftar[index]];
            }
            return { ...prev, [key]: daftar.join("\n") };
        });
    }

    async function remove(id: string) {
        try {
        const res = await cmsFetch(`${apiPath}/${id}`, { method: "DELETE" });
        setConfirmDeleteId(null);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showToast(err.error ?? "Gagal menghapus item ini.", "error");
            return;
        }
        showToast("Item dipindah ke Sampah.");
        load();
        } catch(error) { if ((error as Error).name !== "AbortError") showToast("Permintaan gagal. Periksa koneksi lalu coba lagi.", "error"); } finally {  }
    }

    async function restore(id: string) {
        try {
        const res = await cmsFetch(`${apiPath}/${id}`, { method: "PATCH" });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showToast(err.error ?? "Gagal memulihkan item ini.", "error");
            return;
        }
        showToast("Item dipulihkan.");
        load();
        } catch(error) { if ((error as Error).name !== "AbortError") showToast("Permintaan gagal. Periksa koneksi lalu coba lagi.", "error"); } finally {  }
    }

    async function permanentDelete(id: string) {
        try {
        const res = await cmsFetch(`${apiPath}/${id}?permanent=1`, { method: "DELETE" });
        setConfirmPermanentId(null);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showToast(err.error ?? "Gagal menghapus permanen.", "error");
            return;
        }
        showToast("Item dihapus permanen.");
        load();
        } catch(error) { if ((error as Error).name !== "AbortError") showToast("Permintaan gagal. Periksa koneksi lalu coba lagi.", "error"); } finally {  }
    }

    async function move(index: number, direction: -1 | 1) {
        try {
        if (reordering) return;
        const target = index + direction;
        if (target < 0 || target >= filteredItems.length || !sameOrderScope(filteredItems[index], filteredItems[target])) return;
        const a = filteredItems[index];
        const b = filteredItems[target];
        const aOrder = a.order;
        const bOrder = b.order;

        setReordering(true);
        const res = await cmsFetch("/api/admin/reorder", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body:JSON.stringify({resource:apiPath.split("/").pop(),items:direction === -1 ? [{id:b.id,order:bOrder},{id:a.id,order:aOrder}] : [{id:a.id,order:aOrder},{id:b.id,order:bOrder}]}),
        });
        if(!res.ok) { const data=await res.json();showToast(data.error || "Gagal mengubah urutan.","error");return; }
        load();
        } catch(error) { if ((error as Error).name !== "AbortError") showToast("Permintaan gagal. Periksa koneksi lalu coba lagi.", "error"); } finally { setReordering(false); }
    }

    const [search, setSearch] = useState("");
    const [filterValues, setFilterValues] = useState<Record<string, string>>({});
    const [adminPage, setAdminPage] = useState(1);
    const ADMIN_PER_PAGE = 20;

    const activeFilters = Object.entries(filterValues).filter(([, v]) => v !== "");
    const adaFilterAktif = activeFilters.length > 0;

    // Kolom tabel: pakai `tableFields` kalau diisi (urutannya ikut yang
    // ditulis di sana), kalau tidak jatuh ke perilaku lama (4 field pertama).
    const tableCols = tableFields
        ? (tableFields
              .map((k) => fields.find((f) => f.key === k))
              .filter(Boolean) as FieldDef[])
        : fields.slice(0, 4);

    const sortedItems = (sortKeys?.length
        ? [...items].sort((x, y) => {
              for (const k of sortKeys) {
                  const cmp = String(x[k.key] ?? "").localeCompare(String(y[k.key] ?? ""), "id", {
                      numeric: true,
                  });
                  if (cmp !== 0) return k.dir === "desc" ? -cmp : cmp;
              }
              return 0;
          })
        : hasOrder
          ? [...items].sort((x, y) => Number(x.order ?? 0) - Number(y.order ?? 0))
          : items) as (Record<string, unknown> & { id: string; order?: number })[];

    // Reset halaman saat filter berubah
    const resetPage = () => setAdminPage(1);

    const q = search.trim().toLowerCase();
    const filteredItems = sortedItems.filter((item) => {
        const lolosFilter = activeFilters.every(([key, val]) => String(item[key] ?? "") === val);
        const lolosCari =
            !q || fields.some((f) => String(f.key === "order" ? displayOrder(item[f.key]) : item[f.key] ?? "").toLowerCase().includes(q));
        return lolosFilter && lolosCari;
    });

    const pagination = paginateRecords(filteredItems, adminPage, ADMIN_PER_PAGE);
    useEffect(() => { if (adminPage !== pagination.page) setAdminPage(pagination.page); }, [adminPage, pagination.page]);

    /** Pilihan tiap filter. dari `options` kalau ada, kalau tidak dari data. */
    /**
     * Pilihan sebuah filter dibatasi oleh filter SEBELUMNYA yang sudah aktif.
     * Tanpa ini, memilih halaman "semhas" lalu kelompok milik halaman lain
     * menghasilkan nol data tanpa penjelasan. persis jebakan yang membuat
     * pengguna mengira datanya hilang.
     */
    function filterOptions(f: FilterDef) {
        if (f.options) return f.options;
        const urutan = filters ?? [];
        const posisi = urutan.findIndex((x) => x.key === f.key);
        const pembatas = urutan
            .slice(0, posisi < 0 ? 0 : posisi)
            .map((x) => [x.key, filterValues[x.key]] as const)
            .filter(([, v]) => v);
        const sumber = items.filter((i) =>
            pembatas.every(([k, v]) => String(i[k] ?? "") === v)
        );
        return Array.from(new Set(sumber.map((i) => String(i[f.key] ?? "")).filter(Boolean))).sort(
            (a, b) => a.localeCompare(b)
        );
    }

    // Tombol naik/turun urutan cuma masuk akal kalau daftarnya nggak
    // sedang diacak filter/pencarian. Untuk resource yang punya filter,
    // tombolnya baru muncul setelah salah satu filter dipilih. mis.
    // setelah memilih satu tahun tertentu.
    const bolehReorder =
        hasOrder && !showTrash && !search.trim() && (!filters?.length || adaFilterAktif);

    const deletingItem = items.find((i) => i.id === confirmDeleteId);

    const excelResource = apiPath.split('/').pop() ?? '';
    const excelFields = fields.filter(field => field.type !== 'readonly' && field.key !== 'order');
    const excelParams = new URLSearchParams((listPath ?? '').split('?')[1] ?? '');
    const excelScope = Object.fromEntries(Object.entries(extraFields ?? {}).filter(([key,value]) => typeof value === 'string' && (excelParams.get(key) === value || !excelFields.some(field => field.key === key)))) as Record<string,string>;
    return (
        <div>
            {!showTrash && canCreate && !['hero','settings','acara-periode'].includes(excelResource) && <ExcelImport key={`${apiPath}:${JSON.stringify(excelScope)}`} resource={excelResource} title={title} scope={excelScope} columns={excelFields.map(field=>({key:field.key,label:field.label,required:field.required,options:field.type==='select'?(field.optionsBy?.map[excelScope[field.optionsBy.field]]??field.options):undefined}))} disabled={loading || !!editing || saving} onImported={load}/>}
            <div className="flex flex-wrap items-center justify-between mb-5 gap-3">
                <h2 className="font-display text-xl font-bold text-[var(--color-absolute-zero)]">{title}</h2>
                <div className="flex flex-wrap items-center gap-3">
                    {publicHref && !showTrash && (
                        <a
                            href={publicHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-[var(--color-cosmic-candy)] hover:underline"
                        >
                            Lihat di situs ↗
                        </a>
                    )}
                    <button
                        onClick={() => setShowTrash((v) => !v)}
                        className={`text-sm font-medium px-3 py-2 border transition-colors ${
                            showTrash
                                ? "bg-[var(--color-absolute-zero)] text-white border-[var(--color-absolute-zero)]"
                                : "text-[var(--color-graphite)] border-[var(--color-outline-gray)] hover:border-[var(--color-absolute-zero)]"
                        }`}
                    >
                        {showTrash ? "← Kembali" : "Sampah"}
                    </button>
                    {!showTrash && canCreate && (
                        <button
                            onClick={openNew}
                            className="bg-[var(--color-absolute-zero)] text-white text-sm font-semibold px-4 py-2 hover:bg-black transition-colors"
                        >
                            + Tambah
                        </button>
                    )}
                </div>
            </div>

            {(items.length > 5 || Boolean(filters?.length)) && (
                <div className="mb-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                        {filters?.map((f) => (
                            <select
                                key={f.key}
                                value={filterValues[f.key] ?? ""}
                                onChange={(e) => {
                                    resetPage();
                                    setFilterValues((prev) => {
                                        const next = { ...prev, [f.key]: e.target.value };
                                        // Kosongkan filter di bawahnya, karena pilihannya
                                        // ikut berubah mengikuti filter ini.
                                        const urutan = filters ?? [];
                                        const posisi = urutan.findIndex((x) => x.key === f.key);
                                        urutan.slice(posisi + 1).forEach((x) => {
                                            next[x.key] = "";
                                        });
                                        return next;
                                    });
                                }}
                                aria-label={`Filter ${f.label}`}
                                className="border border-[var(--color-outline-gray)] px-3 py-2 text-sm bg-white focus:outline-none focus:border-[var(--color-absolute-zero)] md:w-44"
                            >
                                <option value="">Semua {f.label}</option>
                                {filterOptions(f).map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        ))}
                        <CmsInput
                            value={search}
                            onChange={(e) => { resetPage(); setSearch(e.target.value); }}
                            placeholder="Cari data"
                            aria-label={`Cari di ${title}`}
                            className="flex-1 min-w-0 border border-[var(--color-outline-gray)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-absolute-zero)]"
                        />
                        {(adaFilterAktif || search.trim()) && (
                            <button
                                onClick={() => {
                                    resetPage();
                                    setFilterValues({});
                                    setSearch("");
                                }}
                                className="shrink-0 text-sm font-medium px-3 py-2 border border-[var(--color-outline-gray)] text-[var(--color-graphite)] hover:border-[var(--color-absolute-zero)] transition-colors"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                    <div className="text-[13px] text-[var(--color-graphite)] mt-2">
                        Menampilkan{" "}
                        <strong className="text-[var(--color-absolute-zero)]">
                            {filteredItems.length ? `${pagination.offset + 1}-${pagination.offset + pagination.rows.length}` : 0}
                        </strong>{" "}
                        dari {filteredItems.length} hasil ({items.length} data keseluruhan)
                        {filters?.length && !adaFilterAktif ? ", pilih filter dulu kalau ingin mengubah urutan." : ""}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-sm text-[var(--color-graphite)]">Memuat...</div>
            ) : items.length === 0 ? (
                <div className="text-sm text-[var(--color-graphite)] py-8 text-center border border-dashed border-[var(--color-outline-gray)]">
                    {showTrash ? "Sampah masih kosong." : "Belum ada data."}
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-sm text-[var(--color-graphite)] py-8 text-center border border-dashed border-[var(--color-outline-gray)]">
                    Tidak ada data yang cocok dengan penyaringan yang dipilih.
                </div>
            ) : (
                <>
                <div className="border border-[var(--color-outline-gray)] overflow-x-auto">
                    <table className="w-full text-sm min-w-[720px]">
                        <thead>
                            <tr className="bg-[var(--color-whisper-white)] border-b border-[var(--color-outline-gray)]">
                                {bolehReorder && <th className="w-16" />}
                                {tableCols.map((f) => (
                                    <th key={f.key} className="text-left px-4 py-2.5 font-semibold text-[var(--color-graphite)]">
                                        {f.label}
                                    </th>
                                ))}
                                <th className="sticky right-0 w-28 bg-[var(--color-whisper-white)] shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.12)]" />
                            </tr>
                        </thead>
                        <tbody>
                            {pagination.rows.map(({ item, index: i }) => (
                                <tr key={item.id as string} className="group border-b border-[var(--color-outline-gray)] last:border-0 hover:bg-[var(--color-whisper-white)]">
                                    {bolehReorder && (
                                        <td className="px-2 py-2.5 whitespace-nowrap">
                                            <div className="flex flex-col gap-0.5">
                                                <button
                                                    onClick={() => move(i, -1)}
                                                    disabled={i === 0 || reordering || !sameOrderScope(filteredItems[i], filteredItems[i - 1])}
                                                    aria-label={`Naikkan urutan ${String(item[fields[0]?.key] ?? "")}`}
                                                    className="text-[var(--color-graphite)] disabled:opacity-25 hover:text-[var(--color-absolute-zero)] leading-none text-[11px]"
                                                >
                                                    ▲
                                                </button>
                                                <button
                                                    onClick={() => move(i, 1)}
                                                    disabled={i === filteredItems.length - 1 || reordering || !sameOrderScope(filteredItems[i], filteredItems[i + 1])}
                                                    aria-label={`Turunkan urutan ${String(item[fields[0]?.key] ?? "")}`}
                                                    className="text-[var(--color-graphite)] disabled:opacity-25 hover:text-[var(--color-absolute-zero)] leading-none text-[11px]"
                                                >
                                                    ▼
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                    {tableCols.map((f, fi) => (
                                        <td key={f.key} className={`px-4 py-2.5 text-[var(--color-absolute-zero)] max-w-[260px] ${f.preview === "pbl-text" ? "min-w-[220px] whitespace-normal align-top" : "truncate"}`}>
                                            {fi === 0 && hasPublished && item.published === false && (
                                                <span className="inline-block bg-[var(--color-gold-100)] text-[var(--color-gold-700)] text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 mr-2 align-middle">
                                                    Draft
                                                </span>
                                            )}
                                            {fi === 0 && flagEmptyField && !item[flagEmptyField] && (
                                                <span className="inline-block bg-[var(--color-rose-600)]/10 text-[var(--color-rose-600)] text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 mr-2 align-middle">
                                                    Belum ada link
                                                </span>
                                            )}
                                            {f.preview === "pbl-text" ? <PblText key={String(item[f.key] ?? "")} text={String(item[f.key] ?? "")} label={f.label} /> : formatCell(f, item[f.key])}
                                        </td>
                                    ))}
                                    <td className="sticky right-0 bg-white group-hover:bg-[var(--color-whisper-white)] shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.12)] px-4 py-2.5 text-right whitespace-nowrap">
                                        {showTrash ? (
                                            <>
                                                <button onClick={() => restore(item.id as string)} className="text-[var(--color-teal-600)] font-medium hover:underline mr-3">
                                                    Pulihkan
                                                </button>
                                                {isSuperadmin && (
                                                    <button
                                                        onClick={() => setConfirmPermanentId(item.id as string)}
                                                        className="text-[var(--color-rose-600)] font-medium hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                                                    >
                                                        Hapus permanen
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={(e) => openEdit(item, e)} className="text-[var(--color-absolute-zero)] font-medium hover:underline mr-3">
                                                    Edit
                                                </button>
                                                {canDelete && (
                                                    <button onClick={() => setConfirmDeleteId(item.id as string)} className="text-[var(--color-rose-600)] font-medium hover:underline">
                                                        Hapus
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredItems.length > ADMIN_PER_PAGE && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-outline-gray)] text-[13px] text-[var(--color-graphite)]">
                        <span>
                            Hal. <strong className="text-[var(--color-absolute-zero)]">{pagination.page}</strong> dari{" "}
                            {pagination.pages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={pagination.page <= 1}
                                onClick={() => setAdminPage(pagination.page - 1)}
                                className="px-3 py-1.5 border border-[var(--color-outline-gray)] font-medium disabled:opacity-30 hover:border-[var(--color-absolute-zero)] transition-colors"
                            >
                                Sebelumnya
                            </button>
                            <button
                                disabled={pagination.page >= pagination.pages}
                                onClick={() => setAdminPage(pagination.page + 1)}
                                className="px-3 py-1.5 border border-[var(--color-outline-gray)] font-medium disabled:opacity-30 hover:border-[var(--color-absolute-zero)] transition-colors"
                            >
                                Berikutnya
                            </button>
                        </div>
                    </div>
                )}
                </>
            )}

            <AnimatePresence>
                {editing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-5"
                        onClick={closeModal}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 8 }}
                            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                            ref={modalRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="resource-editor-title"
                            onKeyDown={handleModalKeyDown}
                            className="bg-white w-full max-w-[480px] p-6 max-h-[85vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                        <h3
                            id="resource-editor-title"
                            className="font-display font-bold text-lg text-[var(--color-absolute-zero)] mb-4"
                        >
                            {editing.id ? "Edit item" : "Tambah item"}
                        </h3>
                        {fields.some(f => ["file", "image", "gallery"].includes(f.type ?? "")) && <label className="block text-sm mt-4">Akses berkas unggahan <select value={uploadVisibility} onChange={e => setUploadVisibility(e.target.value as "public" | "private")}><option value="private">Internal (perlu login)</option><option value="public">Publik (saat konten dipublikasikan)</option></select></label>}
                        <div className="flex flex-col gap-3">
                            {fields.map((f, idx) => {
                                const inputId = `field-${f.key}`;
                                const err = fieldErrors[f.key];
                                return (
                                    <div key={f.key}>
                                        <label htmlFor={inputId} className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">
                                            {f.label}
                                            {f.required && <span className="text-[var(--color-rose-600)]"> *</span>}
                                        </label>
                                        {f.help && <p className="cms-help mb-2">{f.help}</p>}
                                        {f.type === "pairs" ? <PairListInput value={String(editing[f.key] ?? '')} onChange={value => setEditing({...editing,[f.key]:value})}/> : /(href|url)$/i.test(f.key) && f.type !== "image" && f.type !== "file" ? (<LinkInput id={inputId} value={String(editing[f.key] ?? "")} onChange={value=>setEditing({...editing,[f.key]:value})}/>) : f.type === "gallery" ? (
                                            (() => {
                                                const daftar = String(editing[f.key] ?? "")
                                                    .split("\n")
                                                    .map((x) => x.trim())
                                                    .filter(Boolean);
                                                return (
                                                    <div>
                                                        {daftar.length > 0 && (
                                                            <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                                                                {daftar.map((src, gi) => (
                                                                    <li
                                                                        key={src + gi}
                                                                        className="relative border border-[var(--color-outline-gray)] bg-[var(--color-whisper-white)]"
                                                                    >
                                                                        {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau unggahan */}
                                                                        <img
                                                                            src={src}
                                                                            alt={`Gambar ${gi + 1}`}
                                                                            className="w-full aspect-[4/3] object-cover"
                                                                        />
                                                                        <div className="flex border-t border-[var(--color-outline-gray)]">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => ubahGaleri(f.key, gi, "kiri")}
                                                                                disabled={gi === 0}
                                                                                title="Geser ke kiri"
                                                                                aria-label={`Geser gambar ${gi + 1} ke kiri`}
                                                                                className="flex-1 py-1 text-[13px] text-[var(--color-graphite)] hover:bg-white disabled:opacity-30"
                                                                            >
                                                                                ←
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => ubahGaleri(f.key, gi, "hapus")}
                                                                                title="Hapus gambar"
                                                                                aria-label={`Hapus gambar ${gi + 1}`}
                                                                                className="flex-1 py-1 text-[13px] font-medium text-[var(--color-rose-600)] border-x border-[var(--color-outline-gray)] hover:bg-white"
                                                                            >
                                                                                Hapus
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => ubahGaleri(f.key, gi, "kanan")}
                                                                                disabled={gi === daftar.length - 1}
                                                                                title="Geser ke kanan"
                                                                                aria-label={`Geser gambar ${gi + 1} ke kanan`}
                                                                                className="flex-1 py-1 text-[13px] text-[var(--color-graphite)] hover:bg-white disabled:opacity-30"
                                                                            >
                                                                                →
                                                                            </button>
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                        <label className="inline-flex cursor-pointer items-center bg-[var(--color-absolute-zero)] text-white text-sm font-semibold px-4 py-2 hover:bg-black transition-colors">
                                                            {uploadingKey === f.key
                                                                ? "Mengunggah..."
                                                                : daftar.length
                                                                  ? "Tambah gambar"
                                                                  : "Pilih gambar"}
                                                            <CmsInput
                                                                type="file"
                                                                multiple
                                                                accept="image/*"
                                                                className="sr-only"
                                                                disabled={uploadingKey === f.key}
                                                                onChange={(e) => {
                                                                    if (e.target.files?.length)
                                                                        handleGalleryUpload(f.key, e.target.files);
                                                                    e.target.value = "";
                                                                }}
                                                            />
                                                        </label>
                                                        <p className="text-[12px] text-[var(--color-graphite)] mt-2">
                                                            {daftar.length
                                                                ? `${daftar.length} gambar. Urutan di sini menentukan urutan tampil di situs.`
                                                                : "Belum ada gambar. Beberapa berkas dapat dipilih sekaligus."}
                                                        </p>
                                                    </div>
                                                );
                                            })()
                                        ) : f.type === "file" || f.type === "image" ? (
                                            <div>
                                                {f.type === "image" && editing[f.key] ? (
                                                    // eslint-disable-next-line @next/next/no-img-element -- preview file upload, bukan next/image (nggak butuh optimisasi)
                                                    <img
                                                        src={String(editing[f.key])}
                                                        alt=""
                                                        className="w-24 h-24 object-cover border border-[var(--color-outline-gray)] mb-2"
                                                    />
                                                ) : f.type === "file" && editing[f.key] ? (
                                                    <a
                                                        href={String(editing[f.key])}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block text-[13px] text-[var(--color-cosmic-candy)] hover:underline mb-2 truncate"
                                                    >
                                                        {String(editing[f.key])}
                                                    </a>
                                                ) : null}
                                                <div className="flex gap-2">
                                                    {f.type === 'file' ? <div className="flex-1 min-w-0"><LinkInput id={inputId} value={String(editing[f.key] ?? '')} allowFile onChange={value=>setEditing({...editing,[f.key]:value})}/></div> : (                                                    <CmsInput
                                                        id={inputId}
                                                        value={String(editing[f.key] ?? "")}
                                                        onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                                                        placeholder="URL, atau upload file →"
                                                        aria-invalid={Boolean(err)}
                                                        aria-describedby={err ? `${inputId}-error` : undefined}
                                                        className={`flex-1 min-w-0 border px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-absolute-zero)] ${
                                                            err ? "border-[var(--color-rose-600)]" : "border-[var(--color-outline-gray)]"
                                                        }`}
                                                    />)}

                                                    <label className="shrink-0 cursor-pointer bg-[var(--color-whisper-white)] border border-[var(--color-outline-gray)] text-sm font-medium px-3 py-2 hover:border-[var(--color-absolute-zero)] transition-colors">
                                                        {uploadingKey === f.key ? "..." : "Upload"}
                                                        <CmsInput
                                                            type="file"
                                                            className="sr-only"
                                                            accept={f.type === "image" ? "image/*" : ".pdf,.docx,.xlsx,.pptx,image/*"}
                                                            disabled={uploadingKey === f.key}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleFileUpload(f.key, file);
                                                                e.target.value = "";
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        ) : f.type === "readonly" ? (
                                            <p className="text-sm font-medium text-[var(--color-absolute-zero)] border border-[var(--color-outline-gray)] bg-[var(--color-whisper-white)] px-3 py-2">
                                                {String(editing[f.key] ?? "-")}
                                            </p>
                                        ) : f.optionsBy &&
                                          (f.optionsBy.map[String(editing[f.optionsBy.field] ?? "")] ?? [])
                                              .length === 0 ? (
                                            // Dropdown tanpa satu pun pilihan lebih membingungkan
                                            // daripada keterangan singkat: pengguna mengira
                                            // datanya gagal dimuat. Tampilkan alasannya.
                                            <p className="text-[13px] text-[var(--color-graphite)] border border-dashed border-[var(--color-outline-gray)] px-3 py-2.5">
                                                {String(editing[f.optionsBy.field] ?? "")
                                                    ? "Halaman ini belum memakai pembagian bagian, jadi tidak ada judul periode yang perlu dipilih."
                                                    : "Pilih halaman terlebih dahulu untuk melihat judul periode yang tersedia."}
                                            </p>
                                        ) : f.type === "combobox" ? (
                                            (() => {
                                                // Pilihan diambil dari nilai yang SUDAH ADA di data,
                                                // supaya daftarnya tumbuh sendiri tanpa ubah kode.
                                                const pilihan = Array.from(
                                                    new Set(
                                                        items
                                                            .map((i) => String(i[f.key] ?? "").trim())
                                                            .filter(Boolean)
                                                    )
                                                ).sort((a, b) => a.localeCompare(b));
                                                const nilai = String(editing[f.key] ?? "");
                                                const manual = nilai !== "" && !pilihan.includes(nilai);
                                                const bentrok =
                                                    manual &&
                                                    pilihan.some(
                                                        (o) => o.toLowerCase() === nilai.trim().toLowerCase()
                                                    );
                                                return (
                                                    <div>
                                                        <select
                                                            id={inputId}
                                                            value={manual ? "__lainnya__" : nilai}
                                                            onChange={(e) =>
                                                                setEditing({
                                                                    ...editing,
                                                                    [f.key]:
                                                                        e.target.value === "__lainnya__"
                                                                            ? " "
                                                                            : e.target.value,
                                                                })
                                                            }
                                                            aria-invalid={Boolean(err)}
                                                            className={`w-full border px-3 py-2 text-sm bg-white focus:outline-none focus:border-[var(--color-absolute-zero)] ${
                                                                err
                                                                    ? "border-[var(--color-rose-600)]"
                                                                    : "border-[var(--color-outline-gray)]"
                                                            }`}
                                                        >
                                                            <option value="">Pilih salah satu</option>
                                                            {pilihan.map((opt) => (
                                                                <option key={opt} value={opt}>
                                                                    {opt}
                                                                </option>
                                                            ))}
                                                            <option value="__lainnya__">
                                                                Lainnya (ketik sendiri)
                                                            </option>
                                                        </select>
                                                        {manual && (
                                                            <>
                                                                <CmsInput
                                                                    type="text"
                                                                    autoFocus
                                                                    value={nilai.trimStart()}
                                                                    onChange={(e) =>
                                                                        setEditing({
                                                                            ...editing,
                                                                            [f.key]: e.target.value,
                                                                        })
                                                                    }
                                                                    placeholder="Tulis nilai baru"
                                                                    className="w-full border border-[var(--color-outline-gray)] px-3 py-2 text-sm mt-2 focus:outline-none focus:border-[var(--color-absolute-zero)]"
                                                                />
                                                                {bentrok && (
                                                                    <p className="text-[13px] text-[var(--color-rose-600)] mt-1.5">
                                                                        Nilai ini sudah tersedia pada daftar
                                                                        pilihan. Gunakan pilihan yang sudah ada
                                                                        agar penyaringan tetap konsisten.
                                                                    </p>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })()
                                        ) : f.type === "select" ? (
                                            <select
                                                id={inputId}
                                                ref={idx === 0 ? (firstFieldRef as unknown as React.RefObject<HTMLSelectElement>) : undefined}
                                                value={String(editing[f.key] ?? "")}
                                                onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                                                aria-invalid={Boolean(err)}
                                                aria-describedby={err ? `${inputId}-error` : undefined}
                                                className={`w-full border px-3 py-2 text-sm bg-white focus:outline-none focus:border-[var(--color-absolute-zero)] ${
                                                    err ? "border-[var(--color-rose-600)]" : "border-[var(--color-outline-gray)]"
                                                }`}
                                            >
                                                <option value="">Pilih salah satu</option>
                                                {(f.optionsBy
                                                    ? (f.optionsBy.map[
                                                          String(editing[f.optionsBy.field] ?? "")
                                                      ] ?? [])
                                                    : (f.options ?? [])
                                                ).map((opt) => (
                                                    <option key={opt} value={opt}>
                                                        {f.optionLabels?.[opt] ?? opt}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : f.type === "boolean" ? (
                                            <CmsInput
                                                policy={fieldPolicy(apiPath.split("/").pop() ?? "", f.key, f.type)}
                                                id={inputId}
                                                type="checkbox"
                                                checked={Boolean(editing[f.key])}
                                                onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked })}
                                            />
                                        ) : f.type === "textarea" ? (
                                            <><CmsTextarea
                                                policy={fieldPolicy(apiPath.split("/").pop() ?? "", f.key, f.type)}
                                                id={inputId}
                                                ref={idx === 0 ? (firstFieldRef as React.RefObject<HTMLTextAreaElement>) : undefined}
                                                value={String(editing[f.key] ?? "")}
                                                onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                                                placeholder={f.placeholder}
                                                rows={f.preview === "pbl-text" ? 5 : 3}
                                                aria-invalid={Boolean(err)}
                                                aria-describedby={err ? `${inputId}-error` : undefined}
                                                className={`w-full border px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-absolute-zero)] ${
                                                    err ? "border-[var(--color-rose-600)]" : "border-[var(--color-outline-gray)]"
                                                }`}
                                            />
                                            {f.preview === "pbl-text" && String(editing[f.key] ?? "").trim() && <div className="mt-2 bg-[var(--color-whisper-white)] p-3">
                                                <p className="mb-2 text-xs font-semibold text-[var(--color-graphite)]">Pratinjau</p>
                                                <PblText key={String(editing[f.key])} text={String(editing[f.key])} label={f.label} />
                                            </div>}</>
                                        ) : (
                                            <>
                                            <CmsInput
                                                policy={fieldPolicy(apiPath.split("/").pop() ?? "", f.key, f.type)}
                                                id={inputId}
                                                ref={idx === 0 ? (firstFieldRef as React.RefObject<HTMLInputElement>) : undefined}
                                                type={
                                                    f.type === "number"
                                                        ? "number"
                                                        : f.type === "date" || f.type === "time"
                                                          ? f.type
                                                          : "text"
                                                }
                                                min={f.key === "order" ? 1 : undefined}
                                                max={f.key === "order" ? maximumOrder : undefined}
                                                step={f.key === "order" ? 1 : undefined}
                                                value={f.key === "order" ? displayOrder(editing[f.key]) : String(editing[f.key] ?? "")}
                                                onChange={(e) => {
                                                    if (f.key === "order") setOrderTouched(true);
                                                    setEditing({
                                                        ...editing,
                                                        [f.key]: f.key === "order" ? storedOrder(e.target.value) : f.type === "number" && !(apiPath === "/api/admin/pbl" && ["jumlahMahasiswa", "jumlahProdi"].includes(f.key)) ? numericInput(e.target.value) : e.target.value,
                                                    });
                                                }}
                                                placeholder={f.placeholder}
                                                aria-invalid={Boolean(err)}
                                                aria-describedby={err ? `${inputId}-error` : undefined}
                                                className={`w-full border px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-absolute-zero)] ${
                                                    err ? "border-[var(--color-rose-600)]" : "border-[var(--color-outline-gray)]"
                                                }`}
                                            />
                                            {f.key === "order" && <p className="mt-1 text-xs text-[var(--color-graphite)]">Data baru otomatis ditempatkan paling akhir. Pilih posisi lain untuk memindahkannya; urutan data lainnya akan menyesuaikan dalam kelompok yang sama.</p>}
                                            </>
                                        )}
                                        {fieldPolicy(apiPath.split("/").pop() ?? "", f.key, f.type) !== 'text' && <p className="mt-1 text-xs text-[var(--color-graphite)]">{fieldRule(fieldPolicy(apiPath.split("/").pop() ?? "", f.key, f.type)).help}</p>}
                                        {err && (
                                            <p id={`${inputId}-error`} className="text-[12px] text-[var(--color-rose-600)] mt-1">
                                                {err}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {hasPublished && (
                            <label className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--color-outline-gray)] cursor-pointer">
                                <CmsInput
                                    type="checkbox"
                                    checked={editing.published !== false}
                                    onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                                />
                                <span className="text-[13px] text-[var(--color-graphite)]">
                                    {editing.published !== false
                                        ? "Dipublikasikan. langsung tampil di situs"
                                        : "Draft. disimpan tapi belum tampil di situs"}
                                </span>
                            </label>
                        )}

                        
                        {formError && <div className="text-sm text-[var(--color-rose-600)] mt-3">{formError}</div>}

                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={save}
                                disabled={saving}
                                className="bg-[var(--color-absolute-zero)] text-white text-sm font-semibold px-4 py-2 hover:bg-black transition-colors disabled:opacity-50"
                            >
                                {saving ? "Menyimpan..." : "Simpan"}
                            </button>
                            <button
                                onClick={closeModal}
                                disabled={saving}
                                className="text-sm font-medium text-[var(--color-graphite)] px-4 py-2 hover:bg-[var(--color-whisper-white)] transition-colors disabled:opacity-50"
                            >
                                Batal
                            </button>
                        </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ConfirmDialog
                open={Boolean(confirmDeleteId)}
                title="Pindahkan ke Sampah?"
                message={
                    deletingItem
                        ? `"${String(deletingItem[fields[0]?.key] ?? "Item")}" akan disembunyikan dari situs dan dipindah ke Sampah. Masih bisa dipulihkan kapan saja.`
                        : "Item ini akan dipindah ke Sampah dan masih bisa dipulihkan."
                }
                confirmLabel="Pindah ke Sampah"
                danger={false}
                onConfirm={() => confirmDeleteId && remove(confirmDeleteId)}
                onCancel={() => setConfirmDeleteId(null)}
            />

            <ActionDialog
                open={Boolean(confirmPermanentId)}
                tier={2}
                title="Hapus permanen?"
                consequences={[
                    "Data ini akan hilang selamanya dan tidak bisa dikembalikan lewat Sampah.",
                    "Data yang pernah diubah atau ditambahkan lewat CMS juga tidak bisa dikembalikan lewat seed.",
                    "Kalau ragu, biarkan saja di Sampah: data di Sampah tidak tampil di situs.",
                ]}
                confirmLabel="Hapus permanen"
                busy={permanentBusy}
                onConfirm={async () => {
                    if (!confirmPermanentId) return;
                    setPermanentBusy(true);
                    await permanentDelete(confirmPermanentId);
                    setPermanentBusy(false);
                }}
                onCancel={() => setConfirmPermanentId(null)}
            />
        </div>
    );
}
