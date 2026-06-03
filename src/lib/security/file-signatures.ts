export type FileSignatureKind =
  | 'gif'
  | 'heic'
  | 'heif'
  | 'jpeg'
  | 'pdf'
  | 'png'
  | 'webp';

export type DetectedFileSignature = {
  kind: FileSignatureKind;
  contentType: string;
  extension: string;
};

const SIGNATURES: Record<FileSignatureKind, DetectedFileSignature> = {
  gif: { kind: 'gif', contentType: 'image/gif', extension: '.gif' },
  heic: { kind: 'heic', contentType: 'image/heic', extension: '.heic' },
  heif: { kind: 'heif', contentType: 'image/heif', extension: '.heif' },
  jpeg: { kind: 'jpeg', contentType: 'image/jpeg', extension: '.jpg' },
  pdf: { kind: 'pdf', contentType: 'application/pdf', extension: '.pdf' },
  png: { kind: 'png', contentType: 'image/png', extension: '.png' },
  webp: { kind: 'webp', contentType: 'image/webp', extension: '.webp' },
};

const DECLARED_TYPE_ALIASES: Record<string, string> = {
  'image/heic-sequence': 'image/heic',
  'image/heif-sequence': 'image/heif',
  'image/jpg': 'image/jpeg',
};

export const SAFE_IMAGE_SIGNATURE_KINDS: readonly FileSignatureKind[] = [
  'gif',
  'jpeg',
  'png',
  'webp',
];

export const MANUAL_PAYMENT_SIGNATURE_KINDS: readonly FileSignatureKind[] = [
  'jpeg',
  'pdf',
  'png',
];

export const PROFESSOR_INVOICE_SIGNATURE_KINDS: readonly FileSignatureKind[] = [
  'heic',
  'heif',
  'jpeg',
  'pdf',
  'png',
  'webp',
];

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

function normalizeDeclaredType(type: string | undefined) {
  const normalized = type?.split(';')[0]?.trim().toLowerCase();
  if (!normalized || normalized === 'application/octet-stream') return null;
  return DECLARED_TYPE_ALIASES[normalized] ?? normalized;
}

export function detectFileSignatureFromBytes(bytes: Uint8Array) {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return SIGNATURES.jpeg;
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return SIGNATURES.png;
  }

  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return SIGNATURES.pdf;
  }

  const ascii = String.fromCharCode(...bytes.slice(0, 12));
  if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) {
    return SIGNATURES.gif;
  }

  if (ascii.slice(0, 4) === 'RIFF' && ascii.slice(8, 12) === 'WEBP') {
    return SIGNATURES.webp;
  }

  if (ascii.slice(4, 8) === 'ftyp') {
    const brands = ascii.slice(8);
    if (brands.includes('heic') || brands.includes('heix')) {
      return SIGNATURES.heic;
    }
    if (
      brands.includes('heif') ||
      brands.includes('hevc') ||
      brands.includes('hevx') ||
      brands.includes('mif1') ||
      brands.includes('msf1')
    ) {
      return SIGNATURES.heif;
    }
  }

  return null;
}

export async function detectFileSignature(file: File) {
  const arrayBuffer =
    typeof file.arrayBuffer === 'function'
      ? await file.arrayBuffer()
      : await new Promise<ArrayBuffer>((resolve, reject) => {
          if (typeof FileReader === 'undefined') {
            reject(new Error('File arrayBuffer API is unavailable'));
            return;
          }
          const reader = new FileReader();
          reader.onerror = () => reject(reader.error);
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.readAsArrayBuffer(file);
        });
  const bytes = new Uint8Array(arrayBuffer).slice(0, 32);
  return detectFileSignatureFromBytes(bytes);
}

export async function validateFileSignature(
  file: File,
  allowedKinds: readonly FileSignatureKind[],
  invalidMessage: string
) {
  const detected = await detectFileSignature(file);
  const declaredType = normalizeDeclaredType(file.type);

  if (!detected || !allowedKinds.includes(detected.kind)) {
    return { ok: false as const, error: invalidMessage };
  }

  if (declaredType && declaredType !== detected.contentType) {
    return { ok: false as const, error: invalidMessage };
  }

  return { ok: true as const, file: detected };
}
