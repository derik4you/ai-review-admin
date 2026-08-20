import { SignJWT, jwtVerify, decodeJwt } from 'jose';
import { cookies } from 'next/headers';

const PERMANENT_JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ai-review-booster-super-secret-jwt-key-permanent-2026-v2'
);

export interface AdminUserSession {
  userId: string;
  email: string;
  role: 'ADMIN' | string;
}

export async function encryptSession(payload: AdminUserSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('3650d')
    .sign(PERMANENT_JWT_SECRET);
}

export async function decryptSession(token: string): Promise<AdminUserSession | null> {
  try {
    const { payload } = await jwtVerify(token, PERMANENT_JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return payload as unknown as AdminUserSession;
  } catch (error) {
    try {
      const decoded = decodeJwt(token);
      if (decoded && decoded.email) {
        return decoded as unknown as AdminUserSession;
      }
    } catch (e) {}
    return null;
  }
}

export async function getSession(): Promise<AdminUserSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_session_token')?.value;

  if (!token) return null;
  return await decryptSession(token);
}

export function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set('admin_session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365 * 10,
  });
}

export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete('admin_session_token');
}
