/**
 * @jest-environment node
 */

import { isAllowedCookieMutationOrigin } from '@/lib/security/csrf';

describe('isAllowedCookieMutationOrigin', () => {
  it('blocks cross-origin cookie-authenticated API mutations', () => {
    expect(
      isAllowedCookieMutationOrigin({
        method: 'POST',
        pathname: '/api/accounting/manual-payments/payment-1/approve',
        requestOrigin: 'https://evil.example',
        requestHost: 'club.example.com',
        hasSessionCookie: true,
      })
    ).toBe(false);
  });

  it('allows bearer/mobile and webhook calls without session cookies', () => {
    expect(
      isAllowedCookieMutationOrigin({
        method: 'POST',
        pathname: '/api/mobile/activities/cart/checkout',
        requestOrigin: 'https://app.example',
        requestHost: 'club.example.com',
        hasSessionCookie: false,
      })
    ).toBe(true);
  });
});
