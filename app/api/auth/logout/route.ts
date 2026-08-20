import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function GET(request: Request) {
  clearSessionCookie();
  const url = new URL('/login', request.url);
  return NextResponse.redirect(url);
}

export async function POST() {
  clearSessionCookie();
  return NextResponse.json({ success: true });
}
