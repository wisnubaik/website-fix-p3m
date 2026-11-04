import { CmsText, CmsElement, useCms } from '@/components/ui/ManagedContent';
import type { ContentProps } from './content-types';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import PengumumanList from '@/components/ui/PengumumanList';

export default function Page({ announcements }: Pick<ContentProps, 'announcements'>) {
    const cms = useCms();

    return <>
        <CmsElement as={PageHero} fields={{"title":"f_3b76a41036672c","lead":"f_84381ce05b610a"}}
            crumbs={[{ label: cms.text("x_d2a73b870eddcf", "Informasi") }, { label: cms.text("x_ef4c76fe5fc035", "Pengumuman") }]}
            title="Pengumuman"
            lead="Pengumuman resmi Pusat Penelitian dan Pengabdian kepada Masyarakat Politeknik Negeri Madiun."
        />
        <Section className="!bg-white !py-10 md:!py-12">
            <PengumumanList items={announcements} />
        </Section>
    </>;
}
