import { redirect } from 'next/navigation';
import { getAdminSession, hasAdminPermission } from '@/lib/adminAuth';
import AnalyticsClient from './AnalyticsClient';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  const session = await getAdminSession();

  if (!session || !hasAdminPermission(session, 'SUPPORT')) {
    redirect('/login');
  }

  return <AnalyticsClient />;
}
