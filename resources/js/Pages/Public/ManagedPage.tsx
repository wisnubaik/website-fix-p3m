import SiteLayout from '@/Layouts/SiteLayout';
import PageHero from '@/components/ui/PageHero';
import type { PageDocument } from '@/components/ui/ManagedContent';
export default function ManagedPage({pageDocument}:{pageDocument:PageDocument}) {
    return <SiteLayout><PageHero title={pageDocument.title} lead={pageDocument.description} crumbs={[{label:pageDocument.title}]} /></SiteLayout>;
}
