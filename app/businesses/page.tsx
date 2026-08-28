import { redirect } from 'next/navigation';
import { getAdminSession, hasAdminPermission } from '@/lib/adminAuth';
import BusinessListClient from './BusinessListClient';

export const dynamic = 'force-dynamic';

export default async function AdminBusinessesPage() {
  const session = await getAdminSession();

  if (!session || !hasAdminPermission(session, 'SUPPORT')) {
    redirect('/login');
  }

  return <BusinessListClient />;
}
