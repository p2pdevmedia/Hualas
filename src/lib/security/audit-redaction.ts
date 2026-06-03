export const AUDIT_REDACTED_VALUE = '[REDACTED]';

const ALWAYS_REDACTED_KEYS = new Set([
  'accessToken',
  'authorization',
  'cookie',
  'idToken',
  'password',
  'providerPaymentId',
  'rawData',
  'refreshToken',
  'secret',
  'token',
  'tokenHash',
  'webhookSecret',
]);

const HEALTH_AND_PII_KEYS = new Set([
  'allergies',
  'bloodGroup',
  'dni',
  'doctorCertificate',
  'doctorPhone',
  'documentNumber',
  'observations',
  'physicalRestrictions',
  'previousInjuries',
  'primaryDoctor',
  'regularMedication',
  'relevantDiseases',
]);

const MODEL_REDACTED_KEYS: Record<string, Set<string>> = {
  MercadoPagoNotification: new Set(['data']),
  Message: new Set(['body']),
  MobileDeviceToken: new Set(['token']),
  MobileSession: new Set(['tokenHash']),
  Payment: new Set(['rawData', 'receiptUrl', 'providerPaymentId']),
};

function shouldRedactKey(model: string | undefined, key: string) {
  if (ALWAYS_REDACTED_KEYS.has(key) || HEALTH_AND_PII_KEYS.has(key)) {
    return true;
  }

  return model ? (MODEL_REDACTED_KEYS[model]?.has(key) ?? false) : false;
}

export function redactAuditValue(
  value: unknown,
  context: { model?: string } = {}
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactAuditValue(entry, context));
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        shouldRedactKey(context.model, key)
          ? AUDIT_REDACTED_VALUE
          : redactAuditValue(entry, context),
      ])
    );
  }

  return value;
}
