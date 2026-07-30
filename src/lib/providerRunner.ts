import { generateCloudflareRedesign } from './cloudflare';
import { SiteGlowException } from './errors';
import { DEFAULT_CLOUDFLARE_MODEL, type PublicConfig, type RedesignResult } from '../shared/types';

export interface PrivateAiConfig extends PublicConfig {
  cloudflareToken?: string;
}

export interface GeneratePayload {
  beforeDataUrl: string;
  url: string;
  instructions?: string;
  pageTitle?: string;
  beforeWidth?: number;
  beforeHeight?: number;
}

export async function generateWithConfiguredProvider(
  config: PrivateAiConfig,
  payload: GeneratePayload
): Promise<RedesignResult> {
  if (!config.cloudflareAccountId || !config.cloudflareToken) {
    throw new SiteGlowException({
      code: 'cloudflare_missing_credentials',
      message: 'Add and validate your Cloudflare Workers AI credentials before generating a redesign.'
    });
  }

  return {
    ...await generateCloudflareRedesign({
      accountId: config.cloudflareAccountId,
      apiToken: config.cloudflareToken,
      model: config.cloudflareModel || DEFAULT_CLOUDFLARE_MODEL,
      beforeDataUrl: payload.beforeDataUrl,
      beforeWidth: payload.beforeWidth,
      beforeHeight: payload.beforeHeight,
      instructions: payload.instructions,
      url: payload.url,
      pageTitle: payload.pageTitle
    }),
    providerUsed: 'cloudflare'
  };
}
