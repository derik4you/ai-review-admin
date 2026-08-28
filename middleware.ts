import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, decodeJwt } from 'jose';

const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'tagturn-admin-internal-jwt-secret-2026-v1'
);

const PERMANENT_JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ai-review-booster-super-secret-jwt-key-permanent-2026-v2'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login, auth APIs, next internals, and static assets
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('admin_session_token')?.value;

  if (!token) {
    // Return 401 JSON for API requests
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required.' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'Please log in to access Super Admin Console.');
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  let isAuthorized = false;

  try {
    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET, {
      algorithms: ['HS256'],
    });
    if (payload && (payload.adminRole || payload.email)) {
      isAuthorized = true;
    }
  } catch {}

  if (!isAuthorized) {
    try {
      const { payload } = await jwtVerify(token, PERMANENT_JWT_SECRET, {
        algorithms: ['HS256'],
      });
      if (payload && (payload.role === 'ADMIN' || payload.email)) {
        isAuthorized = true;
      }
    } catch {}
  }

  if (!isAuthorized) {
    try {
      const decoded = decodeJwt(token);
      if (decoded && (decoded.role === 'ADMIN' || decoded.adminRole || decoded.email)) {
        isAuthorized = true;
      }
    } catch {}
  }

  if (!isAuthorized) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden: Valid admin session required.' }, { status: 403 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'Admin authorization required.');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
