/**
 * POST /api/admin/businesses/[id]/reactivate
 * ─────────────────────────────────────────────────────────────────────────────
 * Reactivates a suspended or rejected business.
 *
 * Security:
 *  - Requires ADMIN or SUPER_ADMIN role
 *  - Creates immutable audit log entry
 */

import { NextResponse } from 'next/server';
import { getAdminSession, hasAdminPermission, writeAuditLog } from '@/lib/adminAuth';
import { getBusinessById, saveBusinessToFirebase } from '@/lib/firebaseDb';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Admin role required to reactivate businesses.' }, { status: 403 });
    }

    const params = await context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Business ID required' }, { status: 400 });

    const business = await getBusinessById(id);
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const beforeSnapshot = {
      status: (business as any).status || 'ACTIVE',
      suspendedReason: (business as any).suspendedReason || null,
      rejectedReason: (business as any).rejectedReason || null,
    };

    const updated = {
      ...business,
      status: 'ACTIVE' as const,
      customerFlowEnabled: true,
      suspendedReason: null,
      rejectedReason: null,
    };

    await saveBusinessToFirebase(updated);

    await writeAuditLog({
      adminId: session.adminId,
      action: 'business_reactivated',
      targetId: business.id,
      targetType: 'business',
      before: beforeSnapshot,
      after: {
        status: 'ACTIVE',
        reactivatedBy: session.email || session.name,
      },
      metadata: { businessName: business.name, businessSlug: business.slug },
    });

    return NextResponse.json({
      success: true,
      message: `Business "${business.name}" has been reactivated.`,
      business: updated,
    });
  } catch (error: any) {
    console.error('Reactivate business error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to reactivate business' }, { status: 500 });
  }
}
