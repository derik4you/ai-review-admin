import { redirect } from 'next/navigation';
import { getAdminSession, hasAdminPermission } from '@/lib/adminAuth';
import BusinessDetailClient from './BusinessDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function BusinessDetailPage(props: PageProps) {
  const session = await getAdminSession();

  if (!session || !hasAdminPermission(session, 'SUPPORT')) {
    redirect('/login');
  }

  const params = await props.params;
  const id = params?.id;

  if (!id) {
    redirect('/businesses');
  }

  return <BusinessDetailClient businessId={id} />;
}
