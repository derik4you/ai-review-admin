/**
 * POST /api/admin/businesses/[id]/regenerate-tags
 * ─────────────────────────────────────────────────────────────────────────────
 * Regenerates Dynamic Review Tags specifically for this business's category and AI profile.
 *
 * Rules:
 *  - Uses: Business Name + Category + Description + Services + AI Profile
 *  - Generates category-specific positive experience tags (never generic universal tags)
 *  - Writes audit log
 *
 * Security:
 *  - Requires ADMIN or SUPER_ADMIN role
 */

import { NextResponse } from 'next/server';
import { getAdminSession, hasAdminPermission, writeAuditLog } from '@/lib/adminAuth';
import { getBusinessById, saveBusinessToFirebase } from '@/lib/firebaseDb';
import { generateDynamicReviewTags, normalizeCategory, CATEGORY_REGISTRY } from '@/lib/aiService';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Admin role required to regenerate review tags.' }, { status: 403 });
    }

    const params = await context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });

    const business = await getBusinessById(id);
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const cleanCategory = business.category || 'General Store';
    const normalizedCat = normalizeCategory(cleanCategory);
    const meta = CATEGORY_REGISTRY[normalizedCat] || CATEGORY_REGISTRY.CUSTOM;

    const beforeTags = business.reviewTags || [];

    let newTags: string[] = [];

    try {
      newTags = await generateDynamicReviewTags({
        name: business.name,
        category: cleanCategory,
        description: business.description,
        services: business.services,
        aiProfile: business.aiProfile,
      });
    } catch (err) {
      console.warn(`[Tag Regeneration] Gemini error for ${business.name}, using category tags:`, err);
      newTags = meta.tags;
    }

    if (!newTags || newTags.length === 0) {
      newTags = meta.tags;
    }

    const updated = {
      ...business,
      reviewTags: newTags,
      positiveTags: JSON.stringify(newTags),
      needsTagRegeneration: false,
    };

    await saveBusinessToFirebase(updated);

    await writeAuditLog({
      adminId: session.adminId,
      action: 'review_tags_regenerated',
      targetId: business.id,
      targetType: 'business',
      before: { reviewTags: beforeTags },
      after: { reviewTags: newTags, normalizedCategory: normalizedCat },
      metadata: { businessName: business.name, category: cleanCategory, tagCount: newTags.length },
    });

    return NextResponse.json({
      success: true,
      message: `Generated ${newTags.length} dynamic review tags for ${meta.displayName}.`,
      reviewTags: newTags,
    });
  } catch (error: any) {
    console.error('POST /api/admin/businesses/[id]/regenerate-tags error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to regenerate review tags' }, { status: 500 });
  }
}
