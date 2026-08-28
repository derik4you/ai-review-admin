/**
 * POST /api/admin/businesses/[id]/suspend
 * ─────────────────────────────────────────────────────────────────────────────
 * Suspends an active business with a specified reason.
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
      return NextResponse.json({ error: 'Unauthorized: Admin role required to suspend businesses.' }, { status: 403 });
    }

    const params = await context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Business ID required' }, { status: 400 });

    const business = await getBusinessById(id);
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = (body.reason ? String(body.reason).trim() : '') || 'Suspended by system administrator.';

    const beforeSnapshot = {
      status: (business as any).status || 'ACTIVE',
      customerFlowEnabled: (business as any).customerFlowEnabled !== false,
    };

    const updated = {
      ...business,
      status: 'SUSPENDED' as const,
      customerFlowEnabled: false,
      suspendedAt: new Date().toISOString(),
      suspendedBy: session.email || session.name,
      suspendedReason: reason,
    };

    await saveBusinessToFirebase(updated);

    await writeAuditLog({
      adminId: session.adminId,
      action: 'business_suspended',
      targetId: business.id,
      targetType: 'business',
      before: beforeSnapshot,
      after: {
        status: 'SUSPENDED',
        suspendedAt: updated.suspendedAt,
        suspendedBy: updated.suspendedBy,
        suspendedReason: reason,
      },
      reason,
      metadata: { businessName: business.name, businessSlug: business.slug },
    });

    return NextResponse.json({
      success: true,
      message: `Business "${business.name}" has been suspended.`,
      business: updated,
    });
  } catch (error: any) {
    console.error('Suspend business error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to suspend business' }, { status: 500 });
  }
}
