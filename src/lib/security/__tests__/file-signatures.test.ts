import {
  MANUAL_PAYMENT_SIGNATURE_KINDS,
  SAFE_IMAGE_SIGNATURE_KINDS,
  validateFileSignature,
} from '../file-signatures';

describe('file signature validation', () => {
  it('accepts a JPEG with matching magic bytes', async () => {
    const file = new File(
      [Uint8Array.from([0xff, 0xd8, 0xff, 0xdb, 0x00])],
      'photo.jpg',
      { type: 'image/jpeg' }
    );

    const result = await validateFileSignature(
      file,
      SAFE_IMAGE_SIGNATURE_KINDS,
      'invalid'
    );

    expect(result).toEqual({
      ok: true,
      file: { kind: 'jpeg', contentType: 'image/jpeg', extension: '.jpg' },
    });
  });

  it('rejects spoofed image content', async () => {
    const file = new File(['<svg><script>alert(1)</script></svg>'], 'x.png', {
      type: 'image/png',
    });

    const result = await validateFileSignature(
      file,
      SAFE_IMAGE_SIGNATURE_KINDS,
      'invalid'
    );

    expect(result).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects mismatched declared MIME type', async () => {
    const file = new File([Uint8Array.from([0xff, 0xd8, 0xff])], 'proof.png', {
      type: 'image/png',
    });

    const result = await validateFileSignature(
      file,
      MANUAL_PAYMENT_SIGNATURE_KINDS,
      'invalid'
    );

    expect(result).toEqual({ ok: false, error: 'invalid' });
  });
});
