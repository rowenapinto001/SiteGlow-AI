import { describe, expect, it } from 'vitest';
import { extensionFromDataUrl, filenameFromUrl, normalizePublicUrl } from './url';

describe('normalizePublicUrl', () => {
  it('adds https when a protocol is omitted', () => {
    expect(normalizePublicUrl('example.com/path')).toBe('https://example.com/path');
  });

  it('rejects local and unsupported URLs', () => {
    expect(() => normalizePublicUrl('localhost:5173')).toThrow(/public website/i);
    expect(() => normalizePublicUrl('chrome://extensions')).toThrow(/HTTP or HTTPS/i);
  });
});

describe('filenameFromUrl', () => {
  it('creates a stable image filename', () => {
    expect(filenameFromUrl('https://www.Example.com/pricing', 'after')).toMatch(/^example-com-after-\d{4}-\d{2}-\d{2}\.png$/);
    expect(filenameFromUrl('https://www.Example.com/pricing', 'after', 'jpg')).toMatch(/^example-com-after-\d{4}-\d{2}-\d{2}\.jpg$/);
  });

  it('detects image extensions from data URLs', () => {
    expect(extensionFromDataUrl('data:image/jpeg;base64,abc')).toBe('jpg');
    expect(extensionFromDataUrl('data:image/png;base64,abc')).toBe('png');
  });
});
