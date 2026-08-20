import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, decodeJwt } from 'jose';

const PERMANENT_JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ai-review-booster-super-secret-jwt-key-permanent-2026-v2'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login and public api routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('admin_session_token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'Please log in to access Super Admin Console.');
    return NextResponse.redirect(loginUrl);
  }

  let role = 'ADMIN';

  try {
    const { payload } = await jwtVerify(token, PERMANENT_JWT_SECRET, {
      algorithms: ['HS256'],
    });
    role = (payload.role as string) || 'ADMIN';
  } catch (err) {
    try {
      const decoded = decodeJwt(token);
      if (decoded) {
        role = (decoded.role as string) || 'ADMIN';
      }
    } catch (e) {}
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
