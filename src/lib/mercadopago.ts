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

export function isMercadoPagoTestingEnvironment() {
  return getMercadoPagoEnvironment() === 'testing';
}
