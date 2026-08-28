/**
 * app/api/admin/ai-control/versions/[id]/activate/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST endpoint to activate or rollback to a prompt version.
 *
 * Security:
 *  - Strictly requires SUPER_ADMIN role (ADMIN and SUPPORT receive 403)
 *  - Enforces single active prompt version rule
 *  - Invalidates cache immediately
 *  - Writes audit log with before/after active versions
 */

import { NextResponse } from 'next/server';
import { getAdminSession, hasAdminPermission, writeAuditLog } from '@/lib/adminAuth';
import {
  activatePromptVersion,
  getActivePromptVersion,
  getPromptVersionById,
  getAllPromptVersions,
} from '@/lib/adminDb';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admins can activate or roll back prompt versions.' },
        { status: 403 }
      );
    }

    const params = await context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Version ID is required' }, { status: 400 });

    const target = await getPromptVersionById(id);
    if (!target) {
      return NextResponse.json({ error: 'Prompt version not found.' }, { status: 404 });
    }

    const currentActive = await getActivePromptVersion();
    const allVersions = await getAllPromptVersions();

    // Determine if this is a rollback (target was created earlier than current active)
    const isRollback = currentActive && new Date(target.createdAt).getTime() < new Date(currentActive.createdAt).getTime();

    const activated = await activatePromptVersion(id, session.adminId);
    if (!activated) {
      return NextResponse.json({ error: 'Failed to activate prompt version.' }, { status: 500 });
    }

    const action = isRollback ? 'prompt_version_rolled_back' : 'prompt_version_activated';

    await writeAuditLog({
      adminId: session.adminId,
      action,
      targetId: id,
      targetType: 'prompt',
      before: { activeVersionId: currentActive?.id, version: currentActive?.version },
      after: { activeVersionId: activated.id, version: activated.version },
      reason: isRollback ? `Rolled back to prompt version ${activated.version}` : `Activated prompt version ${activated.version}`,
    });

    return NextResponse.json({
      success: true,
      message: isRollback
        ? `Successfully rolled back to prompt version "${activated.version}".`
        : `Successfully activated prompt version "${activated.version}".`,
      activeVersion: activated,
    });
  } catch (error: any) {
    console.error('POST /api/admin/ai-control/versions/[id]/activate error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to activate prompt version' }, { status: 500 });
  }
}
