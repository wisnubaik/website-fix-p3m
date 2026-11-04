export type AdminUser = { id: string; email: string; name: string; role: 'ADMIN' | 'SUPERADMIN'; mustChangePassword: boolean };
export type SharedProps = {
    seo: { title: string; description: string; path: string; url: string; image: string } | null;
    auth: { user: AdminUser | null };
    site: { institution: string; email: string; phone: string; address: string; logoUrl: string | null } | null;
    flash: { success: string | null };
    [key: string]: unknown;
};
export type ResearchEntry = {
    id: string; category: string; year: string; title: string; leader: string;
    member1: string | null; member2: string | null; funding: number; order: number; published: boolean;
};
export type ResearchForm = Omit<ResearchEntry, 'id' | 'member1' | 'member2'> & { member1: string; member2: string };
export const researchUrl = (category: string) => '/' + category.replace('-', '/');
