import { NextResponse } from 'next/server';
import { getBusinessesFromFirebase, saveBusinessAiProfile } from '@/lib/firebaseDb';
import { generateBusinessAIProfile } from '@/lib/aiService';
import { getAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Verify admin authorization
    const session = await getAdminSession();
    const adminKey = req.headers.get('x-admin-key');
    const isValidAdminKey = adminKey && adminKey === (process.env.ADMIN_SECRET || 'ai-review-booster-super-secret-jwt-key-2026');

    if (session?.adminRole !== 'ADMIN' && session?.adminRole !== 'SUPER_ADMIN' && !isValidAdminKey && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const businesses = await getBusinessesFromFirebase();
    const results = {
      total: businesses.length,
      migrated: 0,
      skipped: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const biz of businesses) {
      try {
        // Skip if already has an aiProfile with businessPersonality
        if (biz.aiProfile && biz.aiProfile.businessPersonality) {
          results.skipped++;
          results.details.push({ id: biz.id, name: biz.name, status: 'SKIPPED (already has AI profile)' });
          continue;
        }

        console.log(`[AI Migration] Generating profile for: ${biz.name} (${biz.id})...`);
        const { aiProfile, reviewTags } = await generateBusinessAIProfile({
          id: biz.id,
          name: biz.name,
          category: biz.category || 'General Store',
          description: biz.description,
          services: biz.services,
          keywords: biz.keywords,
          website: biz.website,
          instagram: biz.instagram,
        });

        await saveBusinessAiProfile(biz.id, aiProfile, reviewTags);
        results.migrated++;
        results.details.push({ id: biz.id, name: biz.name, status: 'MIGRATED', reviewTags });
      } catch (err: any) {
        console.warn(`[AI Migration] Error migrating business ${biz.id}:`, err);
        results.failed++;
        results.details.push({ id: biz.id, name: biz.name, status: 'FAILED', error: err?.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration complete: ${results.migrated} migrated, ${results.skipped} skipped, ${results.failed} failed.`,
      results,
    });
  } catch (error: any) {
    console.error('Migration endpoint error:', error);
    return NextResponse.json({ error: error?.message || 'Migration failed' }, { status: 500 });
  }
}
