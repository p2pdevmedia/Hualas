import crypto from 'crypto';
import { getMercadoPagoEnvironment } from '@/lib/mercadopago';

const MAX_SIGNATURE_AGE_MS = 10 * 60 * 1000;

type SignatureParts = {
  timestamp: string;
  signature: string;
};

function parseSignatureHeader(header: string | null): SignatureParts | null {
  if (!header) return null;

  const parts = Object.fromEntries(
    header
      .split(',')
      .map((part) => part.split('='))
      .filter((part): part is [string, string] => part.length === 2)
      .map(([key, value]) => [key.trim(), value.trim()])
  );

  if (!parts.ts || !parts.v1) return null;
  return { timestamp: parts.ts, signature: parts.v1 };
}

function normalizeDataId(value: string | null) {
  if (!value) return '';
  return /[a-z]/i.test(value) ? value.toLowerCase() : value;
}

function safeCompareHex(left: string, right: string) {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) {
    return false;
  }

  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function getMercadoPagoWebhookSecret() {
  if (getMercadoPagoEnvironment() === 'production') {
    return process.env.MERCADOPAGO_WEBHOOK_SECRET;
  }

  return process.env.MP_WEBHOOK_SECRET;
}

export function verifyMercadoPagoWebhookSignature(input: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string | undefined;
  now?: number;
}) {
  if (!input.secret) return false;

  const signature = parseSignatureHeader(input.signatureHeader);
  if (!signature || !input.requestId) return false;

  const timestamp = Number(signature.timestamp);
  if (!Number.isFinite(timestamp)) return false;

  const normalizedTimestamp =
    timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  const now = input.now ?? Date.now();
  if (Math.abs(now - normalizedTimestamp) > MAX_SIGNATURE_AGE_MS) {
    return false;
  }

  const manifest = `id:${normalizeDataId(input.dataId)};request-id:${input.requestId};ts:${signature.timestamp};`;
  const expected = crypto
    .createHmac('sha256', input.secret)
    .update(manifest)
    .digest('hex');

  return safeCompareHex(expected, signature.signature);
}
