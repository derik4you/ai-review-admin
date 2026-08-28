/**
 * GET /api/admin/dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns real platform metrics for the admin dashboard.
 * No fake data — all counts from live Firebase.
 *
 * Returns:
 *  - Business counts by status
 *  - Recent signups (last 10)
 *  - Admin user count
 */

import { NextResponse } from 'next/server';
import { getAdminSession, hasAdminPermission } from '@/lib/adminAuth';
import { getAdminUsersCount } from '@/lib/adminDb';
import { getBusinessesFromFirebase } from '@/lib/firebaseDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Server-side auth check — never trust client role claims
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'SUPPORT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch all businesses (real data)
    const businesses = await getBusinessesFromFirebase();

    // 3. Count by status
    const counts = {
      total: businesses.length,
      pending: 0,
      active: 0,
      suspended: 0,
      rejected: 0,
      archived: 0,
    };

    for (const biz of businesses) {
      const status = (biz as any).status || 'ACTIVE';
      if (status === 'PENDING') counts.pending++;
      else if (status === 'ACTIVE') counts.active++;
      else if (status === 'SUSPENDED') counts.suspended++;
      else if (status === 'REJECTED') counts.rejected++;
      else if (status === 'ARCHIVED') counts.archived++;
      else counts.active++; // legacy without status field
    }

    // 4. Recent signups (last 10, sorted by createdAt desc)
    const recentSignups = [...businesses]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map((b) => ({
        id: b.id,
        name: b.name,
        category: b.category || 'General Store',
        city: b.city || null,
        status: (b as any).status || 'ACTIVE',
        createdAt: b.createdAt,
      }));

    // 5. Admin user count
    const adminCount = await getAdminUsersCount();

    // 5. Analytics summary (7-day compact summary)
    let analyticsSummary = {
      scans: 0,
      reviewsGenerated: 0,
      reviewsCopied: 0,
      googleClicks: 0,
      overallConversionPct: null as number | null,
      activeBusinesses: counts.active,
    };

    try {
      const { getPlatformAnalytics } = await import('@/lib/analyticsDb');
      const ana = await getPlatformAnalytics('7d');
      analyticsSummary = {
        scans: ana.funnel.scans,
        reviewsGenerated: ana.funnel.reviewsGenerated,
        reviewsCopied: ana.funnel.reviewsCopied,
        googleClicks: ana.funnel.googleClicks,
        overallConversionPct: ana.funnel.overallConversionPct ?? null,
        activeBusinesses: counts.active,
      };
    } catch {
      // Non-blocking fallback
    }

    return NextResponse.json({
      success: true,
      businessCounts: counts,
      recentSignups,
      adminCount,
      analyticsSummary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('/api/admin/dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard metrics' },
      { status: 500 }
    );
  }
}
