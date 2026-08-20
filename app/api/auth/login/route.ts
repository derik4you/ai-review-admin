import { NextResponse } from 'next/server';
import { encryptSession, setSessionCookie } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// The only authorized Super Admin email
const SUPER_ADMIN_EMAIL = 'prathameshpvadde2004@gmail.com';

// bcrypt hash of the admin password 'review@2026' (10 rounds)
const ADMIN_PASSWORD_HASH = '$2b$10$2SQSqgEygSc/FNQDxUdafOAukKQ1UtHDv8BpXDgerxxj7injjUuBy';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // Strict email gate — reject anyone who is not the Super Admin
    if (cleanEmail !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json(
        { error: `Access Denied: (${cleanEmail}) is not authorized. Only ${SUPER_ADMIN_EMAIL} can log in.` },
        { status: 403 }
      );
    }

    // Verify password if provided (email + password login path).
    // Google OAuth path does NOT send a password — email gate above is sufficient.
    if (password) {
      const isValidPassword = await bcrypt.compare(String(password), ADMIN_PASSWORD_HASH);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Access Denied: Incorrect admin password.' },
          { status: 403 }
        );
      }
    }

    const sessionPayload = {
      userId: 'master-admin-id',
      email: cleanEmail,
      role: 'ADMIN' as const,
    };

    const token = await encryptSession(sessionPayload);
    setSessionCookie(token);

    return NextResponse.json({ success: true, user: sessionPayload });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 });
  }
}
