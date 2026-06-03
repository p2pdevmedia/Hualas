export function extensionForContentType(contentType: string): string | null {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };

  return mimeToExt[contentType] ?? null;
}

export function extensionFor(file: File): string {
  const fallback = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.'))
    : '';

  return extensionForContentType(file.type) ?? (fallback || '.jpg');
}
