export type MercadoPagoEnvironment = 'testing' | 'production';

export type MercadoPagoCheckoutSettings = {
  autoReturn: 'approved' | 'all';
  binaryMode: boolean;
  expiresInMinutes: number;
  maxInstallments: number;
  excludedPaymentMethodIds: string[];
  excludedPaymentTypeIds: string[];
};

function normalizeEnvironment(value?: string): MercadoPagoEnvironment {
  return value?.toLowerCase() === 'production' ? 'production' : 'testing';
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return ['true', '1', 'yes', 'si'].includes(value.toLowerCase());
}

function toArray(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function normalizeUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function getMercadoPagoEnvironment(): MercadoPagoEnvironment {
  return normalizeEnvironment(process.env.MP_ENVIRONMENT);
}

export function getMercadoPagoCredentials() {
  const environment = getMercadoPagoEnvironment();

  if (environment === 'production') {
    return {
      environment,
      publicKey: process.env.MERCADOPAGO_PUBLIC_KEY,
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    };
  }

  return {
    environment,
    publicKey: process.env.MP_PUBLIC_KEY,
    accessToken: process.env.MP_ACCESS_TOKEN,
  };
}

export function getMercadoPagoCheckoutSettings(): MercadoPagoCheckoutSettings {
  const autoReturnValue = (
    process.env.MP_AUTO_RETURN || 'approved'
  ).toLowerCase();

  return {
    autoReturn: autoReturnValue === 'all' ? 'all' : 'approved',
    binaryMode: toBoolean(process.env.MP_BINARY_MODE, false),
    expiresInMinutes: toPositiveInt(
      process.env.MP_PREFERENCE_EXPIRES_MINUTES,
      60
    ),
    maxInstallments: toPositiveInt(process.env.MP_MAX_INSTALLMENTS, 1),
    excludedPaymentMethodIds: toArray(process.env.MP_EXCLUDED_PAYMENT_METHODS),
    excludedPaymentTypeIds: toArray(process.env.MP_EXCLUDED_PAYMENT_TYPES),
  };
}

export function getCanonicalAppUrl() {
  return (
    normalizeOrigin(process.env.APP_BASE_URL) ||
    normalizeOrigin(process.env.NEXTAUTH_URL) ||
    (process.env.NODE_ENV === 'production' ? null : 'http://localhost:3000')
  );
}

export function getMercadoPagoReturnBaseUrl() {
  return (
    normalizeUrl(process.env.MP_RETURN_URL_BASE) ||
    getCanonicalAppUrl() ||
    'http://localhost:3000'
  );
}

export function getMercadoPagoNotificationUrl() {
  return (
    normalizeUrl(process.env.MP_NOTIFICATION_URL) ||
    `${getCanonicalAppUrl() || 'http://localhost:3000'}/api/mercadopago/notifications`
  );
}

export function isMercadoPagoTestingEnvironment() {
  return getMercadoPagoEnvironment() === 'testing';
}
