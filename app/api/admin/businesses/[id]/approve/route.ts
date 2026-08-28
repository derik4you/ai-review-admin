/**
 * POST /api/admin/businesses/[id]/approve
 * ─────────────────────────────────────────────────────────────────────────────
 * Approves a pending/suspended/rejected business.
 * Automatically generates AI Profile & Dynamic Tags if missing.
 *
 * Security:
 *  - Server-side auth check via getAdminSession()
 *  - Requires ADMIN or SUPER_ADMIN role (SUPPORT cannot approve)
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
      return NextResponse.json({ error: 'Unauthorized: Admin role required to approve businesses.' }, { status: 403 });
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
      approvedAt: (business as any).approvedAt || null,
      customerFlowEnabled: (business as any).customerFlowEnabled !== false,
    };

    let aiProfile = business.aiProfile;
    let reviewTags = business.reviewTags;
    let positiveTags = business.positiveTags;
    let aiStatusMessage = 'AI profile exists';

    // Generate AI Business Profile & dynamic tags if missing or incomplete
    if (!aiProfile || !aiProfile.businessPersonality) {
      try {
        const { generateBusinessAIProfile } = await import('@/lib/aiService');
        const cleanCity = business.city || (business as any).location || null;
        const result = await generateBusinessAIProfile({
          id: business.id,
          name: business.name,
          category: business.category || 'General Store',
          city: cleanCity,
          location: cleanCity,
          description: business.description || `Welcome to ${business.name}!`,
          services: business.services || null,
          keywords: business.keywords || '',
          website: business.website || null,
          instagram: business.instagram || null,
        });

        aiProfile = result.aiProfile;
        reviewTags = result.reviewTags;
        positiveTags = JSON.stringify(result.reviewTags);
        aiStatusMessage = 'AI profile & tags generated successfully';
      } catch (err: any) {
        console.warn(`[Admin Approve] AI profile generation fallback for ${business.name}:`, err);
        const { generateFallbackProfile } = await import('@/lib/aiService');
        const fallback = generateFallbackProfile({
          name: business.name,
          category: business.category || 'General Store',
          city: business.city || null,
          location: (business as any).location || null,
          description: business.description || null,
          keywords: business.keywords || '',
        });
        aiProfile = fallback.aiProfile;
        reviewTags = fallback.reviewTags;
        positiveTags = JSON.stringify(fallback.reviewTags);
        aiStatusMessage = 'AI profile generated with fallback rules';
      }
    }

    const updated = {
      ...business,
      status: 'ACTIVE' as const,
      customerFlowEnabled: true,
      approvedAt: new Date().toISOString(),
      approvedBy: session.email || session.name,
      aiProfile,
      reviewTags,
      positiveTags,
      // Clear previous rejection/suspension reasons
      rejectedReason: null,
      suspendedReason: null,
    };

    await saveBusinessToFirebase(updated);

    // Audit log
    await writeAuditLog({
      adminId: session.adminId,
      action: 'business_approved',
      targetId: business.id,
      targetType: 'business',
      before: beforeSnapshot,
      after: {
        status: 'ACTIVE',
        approvedAt: updated.approvedAt,
        approvedBy: updated.approvedBy,
        aiGenerated: aiStatusMessage,
      },
      metadata: { businessName: business.name, businessSlug: business.slug },
    });

    return NextResponse.json({
      success: true,
      message: `Business "${business.name}" approved successfully. ${aiStatusMessage}.`,
      business: updated,
    });
  } catch (error: any) {
    console.error('Approve business error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to approve business' }, { status: 500 });
  }
}
