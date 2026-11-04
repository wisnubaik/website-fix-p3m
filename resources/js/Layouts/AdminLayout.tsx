import '@/components/admin/managed-site.css';
import { Head, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import type { SharedProps } from '@/types';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { ToastProvider } from '@/components/admin/Toast';
import { AdminSessionProvider } from '@/components/admin/AdminSessionContext';
import SessionGuard from '@/components/admin/SessionGuard';

export default function AdminLayout({ title, children }: PropsWithChildren<{ title?: string }>) {
    const page = usePage<SharedProps>();
    const { auth, flash } = page.props;
    const protectedArea = /^\/admin\/(arsip|akun|kelola-akun|log)(?:[/?]|$)/.test(page.url);
    if (!auth.user) return null;
    return <ToastProvider><AdminSessionProvider value={{ ...auth.user, setup: auth.user.mustChangePassword ? 'password' : null }}>
        <Head title={title ?? 'P3M Admin'}><meta name="robots" content="noindex,nofollow" /><meta name="cms-generation" content={String(page.props.cmsGeneration ?? 0)} /></Head>
        <SessionGuard />
        <div className="min-h-screen md:flex bg-[var(--color-whisper-white)]">
            <AdminSidebar />
            <main className={`flex-1 min-w-0 p-5 md:p-8 w-full mx-auto md:mx-0 ${protectedArea ? "max-w-[1100px]" : "max-w-[1520px] cms-workspace"}`}>
                    {title && <h1 className="font-display text-2xl font-bold text-[var(--color-absolute-zero)] mb-6">{title}</h1>}
                    {flash.success && <div role="status" className="bg-white border-l-4 border-[var(--color-cosmic-candy)] p-4 mb-5 text-sm">{flash.success}</div>}
                    {children}
            </main>
        </div>
    </AdminSessionProvider></ToastProvider>;
}
