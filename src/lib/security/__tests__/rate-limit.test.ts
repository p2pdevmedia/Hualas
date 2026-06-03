/**
 * @jest-environment node
 */

import { checkRateLimit, resetRateLimitStore } from '@/lib/security/rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it('rejects requests over the configured limit inside the window', () => {
    expect(
      checkRateLimit('login:127.0.0.1', {
        limit: 2,
        windowMs: 60_000,
        now: 1000,
      }).allowed
    ).toBe(true);
    expect(
      checkRateLimit('login:127.0.0.1', {
        limit: 2,
        windowMs: 60_000,
        now: 2000,
      }).allowed
    ).toBe(true);

    const blocked = checkRateLimit('login:127.0.0.1', {
      limit: 2,
      windowMs: 60_000,
      now: 3000,
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(58);
  });
});
