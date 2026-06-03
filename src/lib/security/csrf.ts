const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_API_PREFIXES = [
  '/api/auth',
  '/api/mobile',
  '/api/mercadopago/notifications',
];

type CookieMutationOriginInput = {
  method: string;
  pathname: string;
  requestOrigin: string | null;
  requestHost: string | null;
  hasSessionCookie: boolean;
};

export function isAllowedCookieMutationOrigin({
  method,
  pathname,
  requestOrigin,
  requestHost,
  hasSessionCookie,
}: CookieMutationOriginInput) {
  if (SAFE_METHODS.has(method.toUpperCase())) return true;
  if (!pathname.startsWith('/api/')) return true;
  if (EXEMPT_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  if (!hasSessionCookie) return true;
  if (!requestOrigin || !requestHost) return false;

  try {
    return new URL(requestOrigin).host === requestHost;
  } catch {
    return false;
  }
}
