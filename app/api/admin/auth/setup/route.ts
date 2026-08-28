/**
 * POST /api/admin/auth/setup
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time SUPER_ADMIN bootstrap endpoint.
 *
 * Security:
 *  - Requires x-setup-key header matching ADMIN_SETUP_KEY env var
 *  - Only works when adminUsers collection is completely empty
 *  - Hashes password with bcrypt (never stores plaintext)
 *  - Cannot be used to create additional admins after first setup
 *  - Disable by unsetting ADMIN_SETUP_KEY in production after setup
 *
 * Usage (one-time only):
 *   POST /api/admin/auth/setup
 *   Headers: x-setup-key: <ADMIN_SETUP_KEY>
 *   Body: { name, email, password }
 */

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminUsersCount, saveAdminUser } from '@/lib/adminDb';
import type { AdminUserRecord } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Validate setup key — must match env var exactly
    const setupKey = req.headers.get('x-setup-key');
    const envSetupKey = process.env.ADMIN_SETUP_KEY;

    if (!envSetupKey) {
      return NextResponse.json(
        { error: 'Admin setup is not enabled. Set ADMIN_SETUP_KEY environment variable to enable.' },
        { status: 403 }
      );
    }

    if (!setupKey || setupKey !== envSetupKey) {
      return NextResponse.json(
        { error: 'Invalid setup key.' },
        { status: 403 }
      );
    }

    // 2. Check that no admin users exist yet (one-time bootstrap only)
    const existingCount = await getAdminUsersCount();
    if (existingCount > 0) {
      return NextResponse.json(
        { error: 'Admin setup has already been completed. This endpoint is disabled.' },
        { status: 409 }
      );
    }

    // 3. Parse and validate request body
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'name, email, and password are required.' },
        { status: 400 }
      );
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    // 4. Hash password (bcrypt, 12 rounds for admin accounts)
    const passwordHash = await bcrypt.hash(String(password), 12);

    // 5. Create SUPER_ADMIN record
    const adminId = `admin-${Date.now()}`;
    const adminRecord: AdminUserRecord = {
      adminId,
      email: String(email).trim().toLowerCase(),
      name: String(name).trim(),
      role: 'SUPER_ADMIN',
      passwordHash,
      active: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };

    await saveAdminUser(adminRecord);

    console.log(`[Setup] SUPER_ADMIN created: ${adminRecord.email} (${adminId})`);

    return NextResponse.json({
      success: true,
      message: 'SUPER_ADMIN created successfully. Remove or unset ADMIN_SETUP_KEY in production.',
      adminId,
      email: adminRecord.email,
      role: 'SUPER_ADMIN',
    });
  } catch (error: any) {
    console.error('Admin setup error:', error);
    return NextResponse.json(
      { error: error?.message || 'Setup failed. Please try again.' },
      { status: 500 }
    );
  }
}
