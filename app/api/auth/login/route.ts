import { NextResponse } from 'next/server';
import { encryptSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const SUPER_ADMIN_EMAIL = 'prathameshpvadde2004@gmail.com';
const ADMIN_PASSWORD_HASH = '$2b$10$2SQSqgEygSc/FNQDxUdafOAukKQ1UtHDv8BpXDgerxxj7injjUuBy';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    if (cleanEmail !== SUPER_ADMIN_EMAIL && cleanEmail !== 'admin@yourdomain.com') {
      return NextResponse.json(
        { error: `Access Denied: (${cleanEmail}) is not authorized. Only ${SUPER_ADMIN_EMAIL} can log in.` },
        { status: 403 }
      );
    }

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

    const res = NextResponse.json({ success: true, user: sessionPayload });

    // Set permanent 10-year admin session cookie directly on response
    res.cookies.set({
      name: 'admin_session_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
    });

    return res;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 });
  }
}
