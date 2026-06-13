import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const APT_SESSION_COOKIE = 'apt_session';
const APP_PATHS = ['/dashboard', '/bills', '/meals', '/expenses', '/settings', '/profile'];

async function hasValidAptSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(APT_SESSION_COOKIE)?.value;
  if (!token) return false;
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload.type === 'apartment';
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Signed-in apartments skip the auth landing page; guests can't reach app pages.
  // Doing this on the edge avoids the client-side fetch + redirect flash.
  if (pathname === '/' || pathname === '/login') {
    if (await hasValidAptSession(request)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } else if (APP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (!(await hasValidAptSession(request))) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export const config = {
  // Exclude all Next.js internals and static assets from middleware
  matcher: ['/((?!_next|favicon.ico|assets|.*\\..*).*)'],
};
