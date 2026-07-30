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
