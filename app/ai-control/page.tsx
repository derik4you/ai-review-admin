import { redirect } from 'next/navigation';
import { getAdminSession, hasAdminPermission } from '@/lib/adminAuth';
import AiControlClient from './AiControlClient';

export const dynamic = 'force-dynamic';

export default async function AdminAiControlPage() {
  const session = await getAdminSession();

  // SUPPORT can view settings (read-only); ADMIN can edit drafts/blacklist; SUPER_ADMIN can activate
  if (!session || !hasAdminPermission(session, 'SUPPORT')) {
    redirect('/login');
  }

  return <AiControlClient />;
}
