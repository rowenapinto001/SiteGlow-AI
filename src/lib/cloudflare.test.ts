import { describe, expect, it } from 'vitest';
import { extractImageDataUrl } from './cloudflare';

describe('Cloudflare image extraction', () => {
  it('reads common JSON image response shapes', () => {
    expect(extractImageDataUrl({ result: { image: 'abc123==' } })).toBe('data:image/png;base64,abc123==');
    expect(extractImageDataUrl({ result: { image_b64: 'def456==' } })).toBe('data:image/png;base64,def456==');
    expect(extractImageDataUrl({ data: [{ b64_json: 'ghi789==' }] })).toBe('data:image/png;base64,ghi789==');
  });

  it('keeps an existing image data URL unchanged', () => {
    const dataUrl = 'data:image/webp;base64,abc123==';
    expect(extractImageDataUrl({ result: dataUrl })).toBe(dataUrl);
  });
});
