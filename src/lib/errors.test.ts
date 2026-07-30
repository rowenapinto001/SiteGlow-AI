import { describe, expect, it } from 'vitest';
import { SiteGlowException, toSiteGlowError } from './errors';

describe('toSiteGlowError', () => {
  it('returns structured SiteGlow exceptions unchanged', () => {
    const error = toSiteGlowError(new SiteGlowException({
      code: 'cloudflare_authentication',
      message: 'Authentication error'
    }));

    expect(error.code).toBe('cloudflare_authentication');
    expect(error.message).toBe('Authentication error');
  });

  it('maps unexpected errors safely', () => {
    const error = toSiteGlowError(new TypeError('Failed to fetch'));
    expect(error.code).toBe('unexpected_error');
    expect(error.message).toBe('Failed to fetch');
  });
});
