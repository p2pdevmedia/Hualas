export type MercadoPagoEnvironment = 'testing' | 'production';

function normalizeEnvironment(value?: string): MercadoPagoEnvironment {
  return value?.toLowerCase() === 'production' ? 'production' : 'testing';
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

export function isMercadoPagoTestingEnvironment() {
  return getMercadoPagoEnvironment() === 'testing';
}
