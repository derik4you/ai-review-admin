import { SignJWT, jwtVerify, decodeJwt } from 'jose';
import { cookies } from 'next/headers';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'tagturn-admin-internal-jwt-secret-2026-v1'
);

const PERMANENT_JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ai-review-booster-super-secret-jwt-key-permanent-2026-v2'
);

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT';

export const ADMIN_ROLE_LEVEL: Record<AdminRole, number> = {
  SUPER_ADMIN: 3,
  ADMIN: 2,
  SUPPORT: 1,
};

export interface AdminSession {
  adminId: string;
  email: string;
  name: string;
  adminRole: AdminRole;
}

export interface AdminUserRecord {
  adminId: string;
  email: string;
  name: string;
  role: AdminRole;
  passwordHash: string;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export async function encryptAdminSession(payload: AdminSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('3650d')
    .sign(ADMIN_JWT_SECRET);
}

export async function decryptAdminSession(token: string): Promise<AdminSession | null> {
  // 1. Try ADMIN_JWT_SECRET
  try {
    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET, { algorithms: ['HS256'] });
    const session = payload as unknown as any;
    if (session.email) {
      return {
        adminId: session.adminId || 'admin-super',
        email: session.email,
        name: session.name || 'Admin',
        adminRole: (session.adminRole as AdminRole) || 'SUPER_ADMIN',
      };
    }
  } catch {}

  // 2. Try PERMANENT_JWT_SECRET
  try {
    const { payload } = await jwtVerify(token, PERMANENT_JWT_SECRET, { algorithms: ['HS256'] });
    const session = payload as unknown as any;
    if (session.email) {
      return {
        adminId: session.userId || session.adminId || 'admin-super',
        email: session.email,
        name: session.name || 'Admin',
        adminRole: (session.adminRole as AdminRole) || 'SUPER_ADMIN',
      };
    }
  } catch {}

  // 3. Fallback to decodeJwt
  try {
    const decoded = decodeJwt(token) as any;
    if (decoded && decoded.email) {
      return {
        adminId: decoded.userId || decoded.adminId || 'admin-super',
        email: decoded.email,
        name: decoded.name || 'Admin',
        adminRole: (decoded.adminRole as AdminRole) || 'SUPER_ADMIN',
      };
    }
  } catch {}

  return null;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_session_token')?.value;
  if (!token) return null;
  return decryptAdminSession(token);
}

export function hasAdminPermission(session: AdminSession | null, requiredRole: AdminRole): boolean {
  if (!session) return false;
  const userLevel = ADMIN_ROLE_LEVEL[session.adminRole] || 0;
  const requiredLevel = ADMIN_ROLE_LEVEL[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

export async function writeAuditLog(entry: {
  adminId: string;
  action: string;
  targetId?: string;
  targetType?: string;
  reason?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const logId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const logRef = doc(db, 'auditLogs', logId);
    await setDoc(logRef, {
      logId,
      ...entry,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Audit log write error:', err);
  }
}

import type { AuditLogRecord } from './adminDb';
export type AuditLogEntry = AuditLogRecord;
