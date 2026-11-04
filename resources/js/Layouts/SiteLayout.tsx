import PageHero from '@/components/ui/PageHero';
import { useCms, ManagedBlocks } from '@/components/ui/ManagedContent';
import TopBar from '@/components/layout/TopBar';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SmoothScroll from '@/components/animation/SmoothScroll';
import PageProgressBar from '@/components/animation/PageProgressBar';
import { Head, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import type { SharedProps } from '@/types';

export default function SiteLayout({ children }: PropsWithChildren) {
    const { cms } = useCms();
    const document = cms?.document;
    const blocks = <ManagedBlocks blocks={document?.blocks ?? []} />;
    const { site, seo } = usePage<SharedProps>().props;
    return <SmoothScroll>
        {seo && <Head title={seo.title}>
            <meta head-key="description" name="description" content={seo.description} />
            <link head-key="canonical" rel="canonical" href={seo.url} />
            <meta property="og:title" content={seo.title} />
            <meta property="og:description" content={seo.description} />
            <meta property="og:url" content={seo.url} />
            <meta property="og:image" content={seo.image} />
            <meta property="og:site_name" content="P3M Politeknik Negeri Madiun" />
            <meta property="og:locale" content="id_ID" />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={seo.title} />
            <meta name="twitter:description" content={seo.description} />
            <meta name="twitter:image" content={seo.image} />
        </Head>}
        <a href="#main-content" className="skip-to-content">Lewati ke konten utama</a>
        <PageProgressBar />
        <TopBar />
        <Navbar logoUrl={site?.logoUrl ?? null} />
        {cms?.preview && <div className="bg-amber-50 border-y border-amber-300 text-amber-950 px-5 py-3 text-sm relative z-20"><strong>Pratinjau draf.</strong> Perubahan ini belum terlihat oleh pengunjung. <a className="underline font-semibold ml-2" href={`/admin/halaman/${cms.pageId}`}>Kembali ke editor</a><Head><meta name="robots" content="noindex,nofollow" /></Head></div>}
        <main id="main-content">{document?.placement === 'before' && blocks}{document?.placement === 'replace' ? <PageHero title={document.title} lead={document.description} crumbs={[{label:document.title}]} /> : children}{document?.placement !== 'before' && blocks}</main>
        <Footer />
    </SmoothScroll>;
}
