/**
 * GET /api/admin/auth/me
 * Returns the current admin session info.
 * Role and identity are always read from the verified JWT — never from the client.
 */

import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import { getAdminUserById } from '@/lib/adminDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ admin: null }, { status: 401 });
    }

    // Optionally refresh from DB to get latest name/role (in case it changed)
    const freshUser = await getAdminUserById(session.adminId);

    return NextResponse.json({
      admin: {
        adminId: session.adminId,
        email: session.email,
        name: freshUser?.name ?? session.name,
        adminRole: freshUser?.role ?? session.adminRole,
        active: freshUser?.active ?? true,
        lastLoginAt: freshUser?.lastLoginAt ?? null,
      },
    });
  } catch (error) {
    console.error('/api/admin/auth/me error:', error);
    return NextResponse.json({ admin: null }, { status: 401 });
  }
}
