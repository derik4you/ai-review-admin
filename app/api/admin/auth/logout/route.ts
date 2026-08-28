/**
 * POST /api/admin/auth/logout
 * Clears the admin_session_token cookie.
 */

import { NextResponse } from 'next/server';
import { getAdminSession, writeAuditLog } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getAdminSession();

  if (session) {
    writeAuditLog({
      adminId: session.adminId,
      action: 'admin_logout',
      metadata: { email: session.email },
    });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: 'admin_session_token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
