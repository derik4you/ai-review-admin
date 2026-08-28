/**
 * POST /api/admin/businesses/[id]/archive
 * ─────────────────────────────────────────────────────────────────────────────
 * Archives a business.
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
      return NextResponse.json({ error: 'Unauthorized: Admin role required to archive businesses.' }, { status: 403 });
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
    };

    const updated = {
      ...business,
      status: 'ARCHIVED' as const,
      customerFlowEnabled: false,
      archivedAt: new Date().toISOString(),
      archivedBy: session.email || session.name,
    };

    await saveBusinessToFirebase(updated);

    await writeAuditLog({
      adminId: session.adminId,
      action: 'business_archived',
      targetId: business.id,
      targetType: 'business',
      before: beforeSnapshot,
      after: {
        status: 'ARCHIVED',
        archivedAt: updated.archivedAt,
        archivedBy: updated.archivedBy,
      },
      metadata: { businessName: business.name, businessSlug: business.slug },
    });

    return NextResponse.json({
      success: true,
      message: `Business "${business.name}" has been archived.`,
      business: updated,
    });
  } catch (error: any) {
    console.error('Archive business error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to archive business' }, { status: 500 });
  }
}
