/**
 * app/api/admin/analytics/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET endpoint for the Platform Analytics Center.
 *
 * Security:
 *  - Server-side admin auth check via getAdminSession()
 *  - Requires at least SUPPORT role (SUPPORT, ADMIN, SUPER_ADMIN)
 *  - Blocks vendor tokens and unauthenticated access (401/403)
 *  - Never exposes passwords, API keys, JWTs or customer PII
 */

import { NextResponse } from 'next/server';
import { getAdminSession, hasAdminPermission } from '@/lib/adminAuth';
import { getPlatformAnalytics } from '@/lib/analyticsDb';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'SUPPORT')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '7d';

    const analytics = await getPlatformAnalytics(range);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error: any) {
    console.error('GET /api/admin/analytics error:', error);
    return NextResponse.json({ error: 'Failed to aggregate platform analytics' }, { status: 500 });
  }
}
