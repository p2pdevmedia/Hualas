import { extensionFor } from '../image-utils';

describe('extensionFor', () => {
  it('returns .jpg for image/jpeg', () => {
    const file = new File([], 'test.jpg', { type: 'image/jpeg' });
    expect(extensionFor(file)).toBe('.jpg');
  });

  it('returns .png for image/png', () => {
    const file = new File([], 'test.png', { type: 'image/png' });
    expect(extensionFor(file)).toBe('.png');
  });

  it('returns .webp for image/webp', () => {
    const file = new File([], 'test.webp', { type: 'image/webp' });
    expect(extensionFor(file)).toBe('.webp');
  });

  it('returns .gif for image/gif', () => {
    const file = new File([], 'test.gif', { type: 'image/gif' });
    expect(extensionFor(file)).toBe('.gif');
  });

  it('returns .avif for image/avif', () => {
    const file = new File([], 'test.avif', { type: 'image/avif' });
    expect(extensionFor(file)).toBe('.avif');
  });

  it('returns .heic for image/heic', () => {
    const file = new File([], 'test.heic', { type: 'image/heic' });
    expect(extensionFor(file)).toBe('.heic');
  });

  it('returns .heif for image/heif', () => {
    const file = new File([], 'test.heif', { type: 'image/heif' });
    expect(extensionFor(file)).toBe('.heif');
  });

  it('falls back to file extension if unknown MIME type', () => {
    const file = new File([], 'test.xyz', { type: 'application/unknown' });
    expect(extensionFor(file)).toBe('.xyz');
  });

  it('returns .jpg fallback if no file extension and unknown MIME', () => {
    const file = new File([], 'test', { type: 'application/unknown' });
    expect(extensionFor(file)).toBe('.jpg');
  });

  it('handles image/jpg alias for jpeg', () => {
    const file = new File([], 'test.jpg', { type: 'image/jpg' });
    expect(extensionFor(file)).toBe('.jpg');
  });
});
