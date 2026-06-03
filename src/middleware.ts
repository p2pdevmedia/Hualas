import { NextRequest, NextResponse } from 'next/server';
import { isAllowedCookieMutationOrigin } from '@/lib/security/csrf';

function hasSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes('next-auth.session-token'));
}

export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname === '/' &&
    (request.method === 'POST' || request.method === 'OPTIONS')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/api/mercadopago/notifications';
    return NextResponse.rewrite(url);
  }

  if (
    !isAllowedCookieMutationOrigin({
      method: request.method,
      pathname: request.nextUrl.pathname,
      requestOrigin: request.headers.get('origin'),
      requestHost: request.headers.get('host'),
      hasSessionCookie: hasSessionCookie(request),
    })
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/'],
};
