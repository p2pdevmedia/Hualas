import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname === '/' &&
    (request.method === 'POST' || request.method === 'OPTIONS')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/api/mercadopago/notifications';
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/',
};
