/**
 * app/api/admin/categories/[id]/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET & PATCH endpoints for individual Category Management.
 *
 * Security:
 *  - GET: Requires at least SUPPORT role
 *  - PATCH: Requires ADMIN or SUPER_ADMIN role (SUPPORT receives 403)
 *  - Writes audit log on every modification
 */

import { NextResponse } from 'next/server';
import { getAdminSession, hasAdminPermission, writeAuditLog } from '@/lib/adminAuth';
import { getCategoryById, saveCategoryToDb, AdminCategoryRecord } from '@/lib/adminDb';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'SUPPORT')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const params = await context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });

    const category = await getCategoryById(id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error('GET /api/admin/categories/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Admin or Super Admin role required.' }, { status: 403 });
    }

    const params = await context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });

    const existing = await getCategoryById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      description,
      aiContext,
      experienceTags,
      vocabulary,
      wordsToAvoid,
      active,
    } = body;

    const beforeSnapshot = {
      name: existing.name,
      description: existing.description,
      aiContext: existing.aiContext,
      active: existing.active,
      experienceTagsCount: existing.experienceTags?.length || 0,
    };

    let action = 'category_updated';
    if (active !== undefined && active !== existing.active) {
      action = active ? 'category_enabled' : 'category_disabled';
    }

    const updated: AdminCategoryRecord = {
      ...existing,
      name: name !== undefined ? String(name).trim() : existing.name,
      description: description !== undefined ? String(description).trim() : existing.description,
      aiContext: aiContext !== undefined ? String(aiContext).trim() : existing.aiContext,
      experienceTags: Array.isArray(experienceTags)
        ? experienceTags.map(String).filter(Boolean)
        : existing.experienceTags,
      vocabulary: Array.isArray(vocabulary)
        ? vocabulary.map(String).filter(Boolean)
        : existing.vocabulary,
      wordsToAvoid: Array.isArray(wordsToAvoid)
        ? wordsToAvoid.map(String).filter(Boolean)
        : existing.wordsToAvoid,
      active: active !== undefined ? Boolean(active) : existing.active,
      updatedAt: new Date().toISOString(),
    };

    await saveCategoryToDb(updated);

    // Audit log
    await writeAuditLog({
      adminId: session.adminId,
      action,
      targetId: existing.id,
      targetType: 'category',
      before: beforeSnapshot,
      after: {
        name: updated.name,
        description: updated.description,
        aiContext: updated.aiContext,
        active: updated.active,
        experienceTagsCount: updated.experienceTags?.length || 0,
      },
      metadata: { categoryName: updated.name, normalizedName: updated.normalizedName },
    });

    return NextResponse.json({
      success: true,
      message: `Category "${updated.name}" updated successfully. Existing business profiles are preserved.`,
      category: updated,
    });
  } catch (error: any) {
    console.error('PATCH /api/admin/categories/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update category' }, { status: 500 });
  }
}
