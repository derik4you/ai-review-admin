import { redirect } from 'next/navigation';
import { getAdminSession, hasAdminPermission } from '@/lib/adminAuth';
import CategoriesClient from './CategoriesClient';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const session = await getAdminSession();

  // SUPPORT can view categories (read-only); ADMIN/SUPER_ADMIN can edit
  if (!session || !hasAdminPermission(session, 'SUPPORT')) {
    redirect('/login');
  }

  return <CategoriesClient />;
}
