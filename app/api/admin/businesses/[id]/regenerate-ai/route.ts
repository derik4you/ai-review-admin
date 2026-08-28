/**
 * POST /api/admin/businesses/[id]/regenerate-ai
 * ─────────────────────────────────────────────────────────────────────────────
 * Regenerates the AI Business Profile using Gemini (with fallback preservation).
 *
 * Rules:
 *  - Uses exact business details (name, category, description, services, city)
 *  - Uses normalized category for vertical-specific intelligence
 *  - If Gemini fails, preserves existing valid profile
 *  - Never replaces a valid profile with null or empty data
 *  - Writes audit log
 *
 * Security:
 *  - Requires ADMIN or SUPER_ADMIN role
 */

import { NextResponse } from 'next/server';
import { getAdminSession, hasAdminPermission, writeAuditLog } from '@/lib/adminAuth';
import { getBusinessById, saveBusinessToFirebase } from '@/lib/firebaseDb';
import { generateBusinessAIProfile, generateFallbackProfile, normalizeCategory } from '@/lib/aiService';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Admin role required to regenerate AI profile.' }, { status: 403 });
    }

    const params = await context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });

    const business = await getBusinessById(id);
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const cleanCategory = business.category || 'General Store';
    const cleanCity = business.city || (business as any).location || null;
    const normalizedCat = normalizeCategory(cleanCategory);

    const beforeAiProfile = business.aiProfile || null;

    let newAiProfile = null;
    let newTags: string[] = [];
    let methodUsed = 'gemini';

    try {
      const result = await generateBusinessAIProfile({
        id: business.id,
        name: business.name,
        category: cleanCategory,
        city: cleanCity,
        location: cleanCity,
        description: business.description || `Welcome to ${business.name}! We provide high-quality ${cleanCategory} services${cleanCity ? ` in ${cleanCity}` : ''}.`,
        services: business.services || null,
        keywords: business.keywords || '',
        website: business.website || null,
        instagram: business.instagram || null,
      });

      newAiProfile = result.aiProfile;
      newTags = result.reviewTags;
    } catch (err: any) {
      console.warn(`[AI Regeneration] Gemini call failed for ${business.name}:`, err);
      // Fallback: If existing profile has valid personality, PRESERVE IT!
      if (beforeAiProfile && beforeAiProfile.businessPersonality) {
        newAiProfile = beforeAiProfile;
        newTags = business.reviewTags || [];
        methodUsed = 'preserved_existing_due_to_gemini_error';
      } else {
        const fallback = generateFallbackProfile({
          name: business.name,
          category: cleanCategory,
          city: cleanCity,
          location: cleanCity,
          description: business.description,
          keywords: business.keywords,
          services: business.services,
        });
        newAiProfile = fallback.aiProfile;
        newTags = fallback.reviewTags;
        methodUsed = 'deterministic_fallback';
      }
    }

    // Ensure we never save null AI profile if one was available
    const finalProfile = newAiProfile || beforeAiProfile;

    const updated = {
      ...business,
      aiProfile: finalProfile,
      reviewTags: newTags.length > 0 ? newTags : business.reviewTags,
      positiveTags: newTags.length > 0 ? JSON.stringify(newTags) : business.positiveTags,
      needsAiRegeneration: false,
      needsTagRegeneration: false,
    };

    await saveBusinessToFirebase(updated);

    await writeAuditLog({
      adminId: session.adminId,
      action: 'ai_profile_regenerated',
      targetId: business.id,
      targetType: 'aiSettings',
      before: { personality: beforeAiProfile?.businessPersonality },
      after: {
        personality: finalProfile?.businessPersonality,
        methodUsed,
        normalizedCategory: normalizedCat,
      },
      metadata: { businessName: business.name, category: cleanCategory, methodUsed },
    });

    return NextResponse.json({
      success: true,
      message: methodUsed === 'gemini'
        ? 'AI Profile regenerated successfully using Gemini.'
        : methodUsed === 'preserved_existing_due_to_gemini_error'
        ? 'Gemini unavailable — existing valid AI Profile preserved.'
        : 'AI Profile generated using deterministic category profile.',
      methodUsed,
      aiProfile: finalProfile,
      reviewTags: updated.reviewTags,
    });
  } catch (error: any) {
    console.error('POST /api/admin/businesses/[id]/regenerate-ai error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to regenerate AI profile' }, { status: 500 });
  }
}
