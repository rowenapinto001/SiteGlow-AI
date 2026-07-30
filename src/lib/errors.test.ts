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

  it('maps Chrome error pages to a URL validation message', () => {
    const error = toSiteGlowError(new Error('Frame with ID 0 is showing error page'));
    expect(error.code).toBe('capture_invalid_url');
    expect(error.message).toBe('Enter a valid public website URL.');
    expect(error.detail).toMatch(/Check the URL/i);
  });
});
