/**
 * app/api/admin/ai-control/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET & PATCH endpoints for the Admin AI Control Center.
 *
 * Security:
 *  - GET: Allowed for SUPPORT, ADMIN, SUPER_ADMIN
 *  - PATCH: Allowed for ADMIN (blacklist/rules) and SUPER_ADMIN (global toggles)
 *  - Vendor & unauthenticated: Blocked (401/403)
 *  - NEVER exposes GEMINI_API_KEY or other secrets
 */

import { NextResponse } from 'next/server';
import { getAdminSession, hasAdminPermission, writeAuditLog } from '@/lib/adminAuth';
import {
  getAiSettings,
  saveAiSettings,
  getActivePromptVersion,
  getAllPromptVersions,
  getAuditLogsForBusiness,
  AiSettingsRecord,
} from '@/lib/adminDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'SUPPORT')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const [settings, activePrompt, promptVersions, auditLogs] = await Promise.all([
      getAiSettings(),
      getActivePromptVersion(),
      getAllPromptVersions(),
      getAuditLogsForBusiness('aiSettings').catch(() => []),
    ]);

    return NextResponse.json({
      success: true,
      settings,
      activePrompt,
      promptVersions,
      auditLogs: auditLogs.slice(0, 15),
    });
  } catch (error: any) {
    console.error('GET /api/admin/ai-control error:', error);
    return NextResponse.json({ error: 'Failed to load AI control settings' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session || !hasAdminPermission(session, 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Admin or Super Admin role required.' }, { status: 403 });
    }

    const body = await req.json();
    const current = await getAiSettings();

    // Validation checks
    if (body.minWords !== undefined && body.maxWords !== undefined) {
      if (body.minWords > body.maxWords) {
        return NextResponse.json(
          { error: 'Validation Error: Minimum words cannot exceed maximum words.' },
          { status: 400 }
        );
      }
    } else if (body.minWords !== undefined && body.minWords > current.maxWords) {
      return NextResponse.json(
        { error: 'Validation Error: Minimum words cannot exceed current maximum words.' },
        { status: 400 }
      );
    } else if (body.maxWords !== undefined && body.maxWords < current.minWords) {
      return NextResponse.json(
        { error: 'Validation Error: Maximum words cannot be less than current minimum words.' },
        { status: 400 }
      );
    }

    if (body.locationMentionPercentage !== undefined) {
      const pct = Number(body.locationMentionPercentage);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return NextResponse.json(
          { error: 'Validation Error: Location mention percentage must be between 0 and 100.' },
          { status: 400 }
        );
      }
    }

    if (body.maxEmojis !== undefined) {
      const em = Number(body.maxEmojis);
      if (isNaN(em) || em < 0 || em > 5) {
        return NextResponse.json(
          { error: 'Validation Error: Maximum emojis must be between 0 and 5.' },
          { status: 400 }
        );
      }
    }

    if (body.maxExclamations !== undefined) {
      const ex = Number(body.maxExclamations);
      if (isNaN(ex) || ex < 0 || ex > 5) {
        return NextResponse.json(
          { error: 'Validation Error: Maximum exclamation marks must be between 0 and 5.' },
          { status: 400 }
        );
      }
    }

    // Role-specific check: only SUPER_ADMIN can toggle AI master switches
    if (
      (body.aiEnabled !== undefined || body.reviewGenerationEnabled !== undefined) &&
      session.adminRole !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admins can toggle master AI switches.' },
        { status: 403 }
      );
    }

    const beforeSnapshot = {
      aiEnabled: current.aiEnabled,
      locationMentionPercentage: current.locationMentionPercentage,
      minWords: current.minWords,
      maxWords: current.maxWords,
      clicheBlacklistCount: current.clicheBlacklist?.length || 0,
      globalRulesCount: current.globalRules?.length || 0,
    };

    const updated = await saveAiSettings(body, session.adminId);

    // Audit log
    let auditAction = 'ai_settings_updated';
    if (body.clicheBlacklist && body.clicheBlacklist.length !== current.clicheBlacklist?.length) {
      auditAction = 'cliche_updated';
    } else if (body.aiEnabled !== undefined || body.reviewGenerationEnabled !== undefined) {
      auditAction = 'feature_flag_changed';
    }

    await writeAuditLog({
      adminId: session.adminId,
      action: auditAction,
      targetId: 'aiSettings/global',
      targetType: 'aiSettings',
      before: beforeSnapshot,
      after: {
        aiEnabled: updated.aiEnabled,
        locationMentionPercentage: updated.locationMentionPercentage,
        minWords: updated.minWords,
        maxWords: updated.maxWords,
        clicheBlacklistCount: updated.clicheBlacklist?.length || 0,
        globalRulesCount: updated.globalRules?.length || 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'AI settings updated successfully.',
      settings: updated,
    });
  } catch (error: any) {
    console.error('PATCH /api/admin/ai-control error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update AI settings' }, { status: 500 });
  }
}
