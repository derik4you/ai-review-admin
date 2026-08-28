/**
 * POST /api/admin/businesses/[id]/reject
 * ─────────────────────────────────────────────────────────────────────────────
 * Rejects a business registration with a specified reason.
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
      return NextResponse.json({ error: 'Unauthorized: Admin role required to reject businesses.' }, { status: 403 });
    }

    const params = await context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Business ID required' }, { status: 400 });

    const business = await getBusinessById(id);
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = (body.reason ? String(body.reason).trim() : '') || 'Does not meet platform onboarding requirements.';

    const beforeSnapshot = {
      status: (business as any).status || 'ACTIVE',
      customerFlowEnabled: (business as any).customerFlowEnabled !== false,
    };

    const updated = {
      ...business,
      status: 'REJECTED' as const,
      customerFlowEnabled: false,
      rejectedAt: new Date().toISOString(),
      rejectedReason: reason,
    };

    await saveBusinessToFirebase(updated);

    await writeAuditLog({
      adminId: session.adminId,
      action: 'business_rejected',
      targetId: business.id,
      targetType: 'business',
      before: beforeSnapshot,
      after: {
        status: 'REJECTED',
        rejectedAt: updated.rejectedAt,
        rejectedReason: reason,
      },
      reason,
      metadata: { businessName: business.name, businessSlug: business.slug },
    });

    return NextResponse.json({
      success: true,
      message: `Business "${business.name}" has been rejected.`,
      business: updated,
    });
  } catch (error: any) {
    console.error('Reject business error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to reject business' }, { status: 500 });
  }
}
