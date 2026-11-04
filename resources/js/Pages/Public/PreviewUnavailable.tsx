import {Head} from '@inertiajs/react';
export default function PreviewUnavailable({publicPath}:{publicPath:string}) {
    return <main className="max-w-2xl mx-auto px-6 py-20"><Head title="Pratinjau belum dapat dibuka"/>
        <h1 className="text-2xl font-semibold mb-4">Pratinjau belum dapat dibuka</h1>
        <p className="mb-3">Pratinjau draf hanya tersedia untuk superadmin dengan sesi yang masih aktif. Sesi Anda mungkin sudah berakhir atau akun yang digunakan tidak memiliki akses pratinjau.</p>
        <p className="mb-6">Masuk kembali melalui CMS, lalu buka pratinjau dari halaman yang sedang diedit. Gunakan alamat situs yang sama saat login dan membuka pratinjau.</p>
        <div className="flex flex-wrap gap-4"><a className="underline" href="/admin/login">Masuk ke CMS</a><a className="underline" href={publicPath}>Buka halaman publik</a></div>
    </main>;
}
