/**
 * app/api/admin/categories/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET & POST endpoints for Category Management.
 *
 * Security:
 *  - GET: Requires at least SUPPORT role
 *  - POST: Requires ADMIN or SUPER_ADMIN role (SUPPORT receives 403)
 *  - Vendor tokens: Blocked (401/403)
 *  - Writes audit log on category creation
 */

import { NextResponse } from 'next/server';
import { getAdminSession, hasAdminPermission, writeAuditLog } from '@/lib/adminAuth';
import {
  getAllCategories,
  getCategoryByNormalizedName,
  saveCategoryToDb,
  AdminCategoryRecord,
} from '@/lib/adminDb';
import { getBusinessesFromFirebase } from '@/lib/firebaseDb';
import { normalizeCategory } from '@/lib/aiService';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'SUPPORT')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get('search')?.toLowerCase().trim();
    const includeDisabled = searchParams.get('includeDisabled') !== 'false';

    // Parallel load categories and businesses to compute usage counts
    const [categories, businesses] = await Promise.all([
      getAllCategories(includeDisabled),
      getBusinessesFromFirebase().catch(() => []),
    ]);

    // Compute business usage counts for each category
    const usageCounts: Record<string, number> = {};
    for (const b of businesses) {
      const rawCat = b.category || '';
      const normCat = (b.normalizedCategory || normalizeCategory(rawCat)).toUpperCase();

      // Count by normalizedName
      usageCounts[normCat] = (usageCounts[normCat] || 0) + 1;
    }

    let list = categories.map((cat) => ({
      ...cat,
      businessCount: usageCounts[cat.normalizedName.toUpperCase()] || usageCounts[cat.name.toUpperCase()] || 0,
    }));

    if (searchQuery) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery) ||
          c.normalizedName.toLowerCase().includes(searchQuery) ||
          (c.description && c.description.toLowerCase().includes(searchQuery)) ||
          (c.aiContext && c.aiContext.toLowerCase().includes(searchQuery))
      );
    }

    return NextResponse.json({
      success: true,
      categories: list,
      totalCount: list.length,
    });
  } catch (error: any) {
    console.error('GET /api/admin/categories error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Admin or Super Admin role required.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, normalizedName, description, aiContext, experienceTags, vocabulary, wordsToAvoid, active } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanNorm = (normalizedName && typeof normalizedName === 'string' && normalizedName.trim())
      ? normalizedName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
      : cleanName.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    // Duplicate check
    const existing = await getCategoryByNormalizedName(cleanNorm);
    if (existing) {
      return NextResponse.json(
        { error: `A category with normalized name "${cleanNorm}" already exists.` },
        { status: 409 }
      );
    }

    const categoryId = `cat-${cleanNorm.toLowerCase().replace(/_/g, '-')}-${Date.now()}`;
    const newCategory: AdminCategoryRecord = {
      id: categoryId,
      name: cleanName,
      normalizedName: cleanNorm,
      description: description ? String(description).trim() : '',
      aiContext: aiContext ? String(aiContext).trim() : '',
      experienceTags: Array.isArray(experienceTags) ? experienceTags.map(String).filter(Boolean) : [],
      vocabulary: Array.isArray(vocabulary) ? vocabulary.map(String).filter(Boolean) : [],
      wordsToAvoid: Array.isArray(wordsToAvoid) ? wordsToAvoid.map(String).filter(Boolean) : [],
      active: active !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveCategoryToDb(newCategory);

    // Audit log
    await writeAuditLog({
      adminId: session.adminId,
      action: 'category_created',
      targetId: categoryId,
      targetType: 'category',
      after: {
        id: categoryId,
        name: cleanName,
        normalizedName: cleanNorm,
        active: newCategory.active,
      },
      metadata: { name: cleanName, normalizedName: cleanNorm },
    });

    return NextResponse.json({
      success: true,
      message: `Category "${cleanName}" created successfully.`,
      category: newCategory,
    });
  } catch (error: any) {
    console.error('POST /api/admin/categories error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create category' }, { status: 500 });
  }
}
