export type StorageMode = 'session' | 'local';

export type ConnectionState = 'untested' | 'active' | 'inactive';

export interface PublicConfig {
  storageMode: StorageMode;
  cloudflareAccountId?: string;
  cloudflareModel: string;
  cloudflareTokenHint?: string;
  connectionState: ConnectionState;
  lastValidatedAt?: string;
}

export interface SaveConfigInput {
  storageMode: StorageMode;
  cloudflareAccountId?: string;
  cloudflareToken?: string;
  cloudflareModel?: string;
}

export interface CloudflareRedesignRequest {
  url: string;
  instructions?: string;
  accountId: string;
  apiToken: string;
  model: string;
  beforeDataUrl: string;
  beforeWidth?: number;
  beforeHeight?: number;
  pageTitle?: string;
}

export interface RedesignResult {
  afterDataUrl: string;
  providerUsed?: 'cloudflare';
  outputText?: string;
}

export interface CaptureOptions {
  url: string;
}

export interface CapturedPage {
  dataUrl: string;
  url: string;
  title: string;
  width: number;
  height: number;
  deviceScaleFactor: number;
  slices: number;
  scaled: boolean;
}

export interface CaptureSlice {
  dataUrl: string;
  y: number;
  viewportWidth: number;
  viewportHeight: number;
  pageWidth: number;
  pageHeight: number;
  deviceScaleFactor: number;
}

export interface StitchRequest {
  type: 'STITCH_SCREENSHOTS';
  slices: CaptureSlice[];
}

export interface StitchResponse {
  dataUrl: string;
  width: number;
  height: number;
  scaled: boolean;
}

export type BackgroundRequest =
  | { type: 'GET_CONFIG' }
  | { type: 'SAVE_CONFIG'; payload: SaveConfigInput }
  | { type: 'DELETE_KEY' }
  | { type: 'TEST_CLOUDFLARE'; payload?: { accountId?: string; apiToken?: string; model?: string } }
  | { type: 'CAPTURE_SITE'; payload: CaptureOptions }
  | { type: 'GENERATE_REDESIGN'; payload: { beforeDataUrl: string; url: string; instructions?: string; pageTitle?: string; beforeWidth?: number; beforeHeight?: number } }
  | { type: 'DOWNLOAD_IMAGE'; payload: { dataUrl: string; filename: string } };

export type BackgroundResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: SiteGlowError };

export interface SiteGlowError {
  code: string;
  message: string;
  detail?: string;
}

export const DEFAULT_CLOUDFLARE_MODEL = '@cf/runwayml/stable-diffusion-v1-5-img2img';

export const CLOUDFLARE_IMAGE_MODELS = [
  '@cf/runwayml/stable-diffusion-v1-5-img2img',
  '@cf/stabilityai/stable-diffusion-xl-base-1.0',
  '@cf/bytedance/stable-diffusion-xl-lightning'
];
