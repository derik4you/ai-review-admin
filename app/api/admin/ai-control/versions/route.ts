/**
 * app/api/admin/ai-control/versions/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST endpoint to create a new prompt version draft or duplicate an existing version.
 *
 * Rules:
 *  - Never overwrite an active version in place
 *  - Newly created versions are drafts (active: false)
 *  - Allowed for ADMIN, SUPER_ADMIN
 */

import { NextResponse } from 'next/server';
import { getAdminSession, hasAdminPermission, writeAuditLog } from '@/lib/adminAuth';
import {
  savePromptVersion,
  getAllPromptVersions,
  AiPromptVersionRecord,
} from '@/lib/adminDb';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Admin or Super Admin role required.' }, { status: 403 });
    }

    const body = await req.json();
    const { version, name, description, globalRules, systemInstructionTemplate } = body;

    if (!version || typeof version !== 'string' || !version.trim()) {
      return NextResponse.json({ error: 'Version identifier (e.g. v1.1.0) is required.' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Version name is required.' }, { status: 400 });
    }

    const cleanVersion = version.trim();
    const existing = await getAllPromptVersions();
    if (existing.some((v) => v.version.toLowerCase() === cleanVersion.toLowerCase())) {
      return NextResponse.json(
        { error: `A prompt version with identifier "${cleanVersion}" already exists. Please choose a unique version string.` },
        { status: 409 }
      );
    }

    const rules = Array.isArray(globalRules) && globalRules.length > 0
      ? globalRules.map(String).filter(Boolean)
      : ['Sound like a real, authentic customer sharing a genuine first-hand visit'];

    const newId = `prompt-${cleanVersion.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    const newRecord: AiPromptVersionRecord = {
      id: newId,
      version: cleanVersion,
      name: name.trim(),
      description: description ? String(description).trim() : '',
      globalRules: rules,
      systemInstructionTemplate: systemInstructionTemplate ? String(systemInstructionTemplate).trim() : undefined,
      createdBy: session.name || session.email,
      createdAt: new Date().toISOString(),
      active: false, // New versions start as drafts
    };

    await savePromptVersion(newRecord);

    await writeAuditLog({
      adminId: session.adminId,
      action: 'prompt_version_created',
      targetId: newId,
      targetType: 'prompt',
      after: {
        id: newId,
        version: cleanVersion,
        name: newRecord.name,
        rulesCount: rules.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Prompt version "${cleanVersion}" created as draft.`,
      promptVersion: newRecord,
    });
  } catch (error: any) {
    console.error('POST /api/admin/ai-control/versions error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create prompt version' }, { status: 500 });
  }
}
