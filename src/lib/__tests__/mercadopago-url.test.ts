/**
 * @jest-environment node
 */

describe('Mercado Pago canonical URLs', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.APP_BASE_URL;
    delete process.env.MP_NOTIFICATION_URL;
    delete process.env.MP_RETURN_URL_BASE;
    delete process.env.NEXTAUTH_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('builds return and notification URLs from the canonical app origin', async () => {
    process.env.APP_BASE_URL = 'https://club.example.com/';

    const { getMercadoPagoNotificationUrl, getMercadoPagoReturnBaseUrl } =
      await import('@/lib/mercadopago');

    expect(getMercadoPagoReturnBaseUrl()).toBe('https://club.example.com');
    expect(getMercadoPagoNotificationUrl()).toBe(
      'https://club.example.com/api/mercadopago/notifications'
    );
  });

  it('uses explicit Mercado Pago URL overrides when configured', async () => {
    process.env.APP_BASE_URL = 'https://club.example.com';
    process.env.MP_RETURN_URL_BASE = 'https://pagos.example.com/return/';
    process.env.MP_NOTIFICATION_URL = 'https://hooks.example.com/mp';

    const { getMercadoPagoNotificationUrl, getMercadoPagoReturnBaseUrl } =
      await import('@/lib/mercadopago');

    expect(getMercadoPagoReturnBaseUrl()).toBe(
      'https://pagos.example.com/return'
    );
    expect(getMercadoPagoNotificationUrl()).toBe(
      'https://hooks.example.com/mp'
    );
  });
});
