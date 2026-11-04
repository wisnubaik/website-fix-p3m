import { CmsInput } from '@/components/admin/CmsInput';
import { Head, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import type { SharedProps } from '@/types';

export default function Account() {
    const { auth } = usePage<SharedProps>().props;
    const form = useForm({ current_password: '', password: '', password_confirmation: '' });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.put('/admin/akun/password', { onSuccess: () => form.reset(), onError: () => form.reset('current_password') });
    }
    return <AdminLayout title="Akun Saya">
        <Head title="Akun Saya" />
        {auth.user?.mustChangePassword && <p role="status" className="bg-amber-50 border border-amber-200 p-4 mb-6">Ganti password sementara sebelum mengakses pengelolaan konten.</p>}
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-6 max-w-xl space-y-5">
            <h2 className="font-bold text-xl">Ganti password</h2>
            <p className="text-sm text-slate-500">Minimal {auth.user?.role === 'SUPERADMIN' ? 12 : 8} karakter, maksimal 72 byte. Hindari password umum, nama, dan email Anda.</p>
            {([['current_password', 'Password saat ini'], ['password', 'Password baru'], ['password_confirmation', 'Ulangi password baru']] as const).map(([key, label]) => <label key={key} className="block">
                {label}<CmsInput className="cms-input" type="password" autoComplete={key === 'current_password' ? 'current-password' : 'new-password'} required value={form.data[key]} onChange={e => form.setData(key, e.target.value)} />
                {form.errors[key] && <span role="alert" className="cms-error">{form.errors[key]}</span>}
            </label>)}
            <button disabled={form.processing} className="cms-button">Simpan password</button>
        </form>
    </AdminLayout>;
}
