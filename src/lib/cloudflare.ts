import { SiteGlowException } from './errors';
import { buildRedesignPrompt } from './prompt';
import type { CloudflareRedesignRequest, RedesignResult } from '../shared/types';

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4/accounts';
const VALIDATION_MODEL = '@cf/meta/llama-3.2-1b-instruct';

interface CloudflareJsonResponse {
  success?: boolean;
  result?: unknown;
  errors?: Array<{ code?: number; message?: string }>;
  messages?: string[];
}

export async function validateCloudflareConnection(options: {
  accountId: string;
  apiToken: string;
}): Promise<{ active: true; message: string }> {
  const accountId = options.accountId.trim();
  const apiToken = options.apiToken.trim();

  if (!accountId || !apiToken) {
    throw new SiteGlowException({
      code: 'cloudflare_missing_credentials',
      message: 'Enter your Cloudflare Account ID and Workers AI API token before testing.'
    });
  }

  const response = await fetchCloudflare(runUrl(accountId, VALIDATION_MODEL), {
    method: 'POST',
    headers: cloudflareHeaders(apiToken),
    body: JSON.stringify({ prompt: 'Reply with OK.' })
  });

  await parseCloudflareJson(response);
  return { active: true, message: 'Cloudflare Workers AI connection is active.' };
}

export async function generateCloudflareRedesign(request: CloudflareRedesignRequest): Promise<RedesignResult> {
  const dimensions = targetDimensions(request.beforeWidth, request.beforeHeight);
  const prompt = buildRedesignPrompt({
    url: request.url,
    pageTitle: request.pageTitle,
    instructions: request.instructions
  });

  const response = await fetchCloudflare(runUrl(request.accountId, request.model), {
    method: 'POST',
    headers: cloudflareHeaders(request.apiToken),
    body: JSON.stringify({
      prompt,
      negative_prompt: [
        'invented text',
        'fake logos',
        'missing footer',
        'duplicated sections',
        'poster',
        'collage',
        'warped typography',
        'overlapping text',
        'clipped content'
      ].join(', '),
      image_b64: imageBase64(request.beforeDataUrl),
      width: dimensions.width,
      height: dimensions.height,
      num_steps: 12,
      strength: 0.62,
      guidance: 7.5
    })
  });

  if (!response.ok) {
    await throwCloudflareResponse(response);
  }

  const contentType = response.headers.get('content-type') || 'image/png';
  if (contentType.includes('application/json')) {
    const data = await parseCloudflareJson(response);
    const result = data.result as { image?: string } | undefined;
    if (result?.image) {
      return { afterDataUrl: `data:image/png;base64,${result.image}` };
    }

    throw new SiteGlowException({
      code: 'cloudflare_empty_image',
      message: 'Cloudflare Workers AI completed the request but did not return an image.'
    });
  }

  const blob = await response.blob();
  const afterDataUrl = await blobToDataUrl(blob);
  return { afterDataUrl };
}

function runUrl(accountId: string, model: string): string {
  const normalized = model.replace(/^\/+/, '');
  return `${CLOUDFLARE_API_BASE}/${encodeURIComponent(accountId.trim())}/ai/run/${normalized}`;
}

function cloudflareHeaders(apiToken: string): HeadersInit {
  return {
    'Authorization': `Bearer ${apiToken.trim()}`,
    'Content-Type': 'application/json'
  };
}

async function fetchCloudflare(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    throw new SiteGlowException({
      code: 'cloudflare_network',
      message: 'SiteGlow could not reach Cloudflare Workers AI. Check your internet connection and make sure Chrome is not blocking api.cloudflare.com.',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

async function parseCloudflareJson(response: Response): Promise<CloudflareJsonResponse> {
  const bodyText = await response.text();
  let data: CloudflareJsonResponse;

  try {
    data = JSON.parse(bodyText) as CloudflareJsonResponse;
  } catch {
    throw new SiteGlowException({
      code: 'cloudflare_bad_response',
      message: 'Cloudflare returned a response SiteGlow could not read.',
      detail: bodyText
    });
  }

  if (!response.ok || data.success === false) {
    throw new SiteGlowException(classifyCloudflareError(response.status, data, bodyText));
  }

  return data;
}

async function throwCloudflareResponse(response: Response): Promise<never> {
  const bodyText = await response.text();
  try {
    const data = JSON.parse(bodyText) as CloudflareJsonResponse;
    throw new SiteGlowException(classifyCloudflareError(response.status, data, bodyText));
  } catch (error) {
    if (error instanceof SiteGlowException) throw error;
    throw new SiteGlowException({
      code: 'cloudflare_api_error',
      message: `Cloudflare Workers AI returned HTTP ${response.status}.`,
      detail: bodyText
    });
  }
}

function classifyCloudflareError(status: number, data: CloudflareJsonResponse, bodyText: string) {
  const message = data.errors?.map((entry) => entry.message).filter(Boolean).join(' ') || bodyText;

  if (status === 401 || status === 403) {
    return {
      code: 'cloudflare_authentication',
      message: message || 'Cloudflare authentication failed. Check your Account ID and Workers AI API token.',
      detail: bodyText
    };
  }

  if (status === 404) {
    return {
      code: 'cloudflare_not_found',
      message: message || 'Cloudflare could not find that account or model.',
      detail: bodyText
    };
  }

  if (status === 429) {
    return {
      code: 'cloudflare_quota',
      message: message || 'Cloudflare Workers AI daily free allowance or rate limit was reached.',
      detail: bodyText
    };
  }

  return {
    code: 'cloudflare_api_error',
    message: message || `Cloudflare Workers AI returned HTTP ${status}.`,
    detail: bodyText
  };
}

function imageBase64(dataUrl: string): string {
  return dataUrl.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
}

function targetDimensions(width = 1024, height = 1024): { width: number; height: number } {
  const maxSide = 1024;
  const minSide = 256;
  const ratio = Math.max(0.25, Math.min(4, width / Math.max(1, height)));

  let nextWidth = ratio >= 1 ? maxSide : Math.round(maxSide * ratio);
  let nextHeight = ratio >= 1 ? Math.round(maxSide / ratio) : maxSide;

  nextWidth = clampToMultiple(nextWidth, minSide, maxSide, 8);
  nextHeight = clampToMultiple(nextHeight, minSide, maxSide, 8);

  return { width: nextWidth, height: nextHeight };
}

function clampToMultiple(value: number, min: number, max: number, multiple: number): number {
  const clamped = Math.max(min, Math.min(max, value));
  return Math.round(clamped / multiple) * multiple;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the Cloudflare image response.'));
    reader.readAsDataURL(blob);
  });
}
