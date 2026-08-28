/**
 * POST /api/admin/auth/login
 * ─────────────────────────────────────────────────────────────────────────────
 * Authenticates an admin user against the adminUsers Firestore collection.
 * Issues a separate admin_session_token cookie (different secret from vendors).
 *
 * Security:
 *  - Never trusts client-supplied role or adminId values
 *  - Always verifies password via bcrypt
 *  - Checks active: true flag
 *  - Issues short-lived 7-day tokens (vs vendor 10-year tokens)
 */

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminUserByEmail, updateAdminLastLogin } from '@/lib/adminDb';
import { encryptAdminSession, writeAuditLog } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Look up admin user by email (server-side — never trust client role)
    const adminUser = await getAdminUserByEmail(cleanEmail);

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // 2. Check account is active
    if (!adminUser.active) {
      return NextResponse.json(
        { error: 'This admin account has been deactivated. Contact your system administrator.' },
        { status: 403 }
      );
    }

    // 3. Verify password (bcrypt — no plaintext comparison)
    const isValid = await bcrypt.compare(String(password), adminUser.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // 4. Build admin session payload (role read from DB, not client)
    const sessionPayload = {
      adminId: adminUser.adminId,
      email: adminUser.email,
      name: adminUser.name,
      adminRole: adminUser.role,
    };

    const token = await encryptAdminSession(sessionPayload);

    // 5. Update last login (non-blocking)
    updateAdminLastLogin(adminUser.adminId);

    // 6. Write audit log (non-blocking)
    writeAuditLog({
      adminId: adminUser.adminId,
      action: 'admin_login',
      metadata: { email: adminUser.email, role: adminUser.role },
    });

    // 7. Issue admin_session_token cookie (SEPARATE from owner_session_token)
    const res = NextResponse.json({
      success: true,
      admin: {
        adminId: adminUser.adminId,
        email: adminUser.email,
        name: adminUser.name,
        adminRole: adminUser.role,
      },
    });

    res.cookies.set({
      name: 'admin_session_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Login service temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }
}
