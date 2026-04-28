export function extensionFor(file: File): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
    'image/heic': '.heic',
    'image/heif': '.heif',
  };

  const fallback = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.'))
    : '';

  return mimeToExt[file.type] ?? (fallback || '.jpg');
}
