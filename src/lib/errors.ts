import type { SiteGlowError } from '../shared/types';

export class SiteGlowException extends Error {
  siteGlowError: SiteGlowError;

  constructor(error: SiteGlowError) {
    super(error.message);
    this.name = 'SiteGlowException';
    this.siteGlowError = error;
  }
}

export function toSiteGlowError(error: unknown): SiteGlowError {
  if (error instanceof SiteGlowException) {
    return error.siteGlowError;
  }

  if (error instanceof Error) {
    if (isChromeErrorPageError(error)) {
      return {
        code: 'capture_invalid_url',
        message: 'Enter a valid public website URL.',
        detail: 'Chrome opened an error page instead of the website. Check the URL and try again.'
      };
    }

    return {
      code: 'unexpected_error',
      message: error.message || 'Something went wrong.',
      detail: error.name
    };
  }

  return {
    code: 'unexpected_error',
    message: 'Something went wrong.',
    detail: String(error)
  };
}

function isChromeErrorPageError(error: Error): boolean {
  return /frame with id \d+ is showing error page/i.test(error.message);
}
