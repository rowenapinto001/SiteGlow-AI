export function normalizePublicUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Enter a public website URL.');
  }

  const hasExplicitProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed);
  const hasSchemeWithoutSlashes = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) && !hasExplicitProtocol;
  const looksLikeHostPort = /^[^/\s]+:\d+([/?#].*)?$/.test(trimmed);
  const candidate = hasExplicitProtocol || (hasSchemeWithoutSlashes && !looksLikeHostPort)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(candidate);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('SiteGlow can only capture public HTTP or HTTPS websites.');
  }

  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.endsWith('.local')) {
    throw new Error('Enter a public website URL, not a local address.');
  }

  return url.toString();
}

export function filenameFromUrl(url: string, suffix: string, extension = 'png'): string {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, '').replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  return `${host || 'siteglow'}-${suffix}-${date}.${extension}`;
}

export function extensionFromDataUrl(dataUrl: string): 'jpg' | 'png' | 'webp' {
  if (dataUrl.startsWith('data:image/jpeg')) return 'jpg';
  if (dataUrl.startsWith('data:image/webp')) return 'webp';
  return 'png';
}
