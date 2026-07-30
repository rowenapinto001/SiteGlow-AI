import { SiteGlowException } from './errors';
import { buildRedesignPrompt } from './prompt';
import type { CloudflareRedesignRequest, RedesignResult } from '../shared/types';

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4/accounts';
const VALIDATION_MODEL = '@cf/meta/llama-3.2-1b-instruct';

interface CloudflareJsonResponse {
  success?: boolean;
  result?: unknown;
  data?: unknown;
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
  const apiInputDataUrl = await prepareImageForCloudflare(request.beforeDataUrl, dimensions.width, dimensions.height);
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
      image_b64: imageBase64(apiInputDataUrl),
      width: dimensions.width,
      height: dimensions.height,
      num_steps: 16,
      strength: 0.68,
      guidance: 8
    })
  });

  if (!response.ok) {
    await throwCloudflareResponse(response);
  }

  const contentType = response.headers.get('content-type') || 'image/png';
  if (contentType.includes('application/json')) {
    const data = await parseCloudflareJson(response);
    const afterDataUrl = extractImageDataUrl(data);
    if (afterDataUrl) {
      return {
        afterDataUrl: await blendRedesignWithSource(request.beforeDataUrl, afterDataUrl, request.instructions),
        outputText: 'Text-preserving redesign blend applied.'
      };
    }

    throw new SiteGlowException({
      code: 'cloudflare_empty_image',
      message: 'Cloudflare Workers AI completed the request but did not return an image.'
    });
  }

  const blob = await response.blob();
  if (!contentType.startsWith('image/')) {
    const text = await blob.text();
    try {
      const data = JSON.parse(text) as CloudflareJsonResponse;
      const afterDataUrl = extractImageDataUrl(data);
      if (afterDataUrl) {
        return {
          afterDataUrl: await blendRedesignWithSource(request.beforeDataUrl, afterDataUrl, request.instructions),
          outputText: 'Text-preserving redesign blend applied.'
        };
      }
    } catch {
      // Fall through to the clearer empty-image error below.
    }

    throw new SiteGlowException({
      code: 'cloudflare_empty_image',
      message: 'Cloudflare Workers AI completed the request but returned a non-image response.',
      detail: text
    });
  }

  const afterDataUrl = await blobToDataUrl(blob);
  return {
    afterDataUrl: await blendRedesignWithSource(request.beforeDataUrl, afterDataUrl, request.instructions),
    outputText: 'Text-preserving redesign blend applied.'
  };
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

  if (/request is too large/i.test(message)) {
    return {
      code: 'cloudflare_request_too_large',
      message: 'Cloudflare rejected this page screenshot because the request is too large. Try a shorter page or a less image-heavy site.',
      detail: bodyText
    };
  }

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

async function prepareImageForCloudflare(dataUrl: string, targetWidth: number, targetHeight: number): Promise<string> {
  const maxEncodedChars = 3_600_000;
  if (imageBase64(dataUrl).length <= maxEncodedChars) {
    return dataUrl;
  }

  try {
    const image = await loadBitmap(dataUrl);
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const context = canvas.getContext('2d');
    if (!context) return dataUrl;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const qualities = [0.82, 0.68, 0.54, 0.42];
    for (const quality of qualities) {
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
      const compactDataUrl = await blobToDataUrl(blob);
      if (imageBase64(compactDataUrl).length <= maxEncodedChars) {
        return compactDataUrl;
      }
    }

    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.36 });
    return await blobToDataUrl(blob);
  } catch {
    return dataUrl;
  }
}

async function blendRedesignWithSource(beforeDataUrl: string, aiDataUrl: string, instructions = ''): Promise<string> {
  try {
    const [before, ai] = await Promise.all([
      loadBitmap(beforeDataUrl),
      loadBitmap(aiDataUrl)
    ]);
    const canvas = new OffscreenCanvas(before.width, before.height);
    const context = canvas.getContext('2d');
    if (!context) return beforeDataUrl;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(before, 0, 0, canvas.width, canvas.height);

    context.save();
    context.globalAlpha = 0.5;
    context.globalCompositeOperation = 'soft-light';
    context.drawImage(ai, 0, 0, canvas.width, canvas.height);
    context.restore();

    context.save();
    context.globalAlpha = 0.32;
    context.globalCompositeOperation = 'overlay';
    context.drawImage(ai, 0, 0, canvas.width, canvas.height);
    context.restore();

    applyInstructionTheme(context, canvas.width, canvas.height, instructions);

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return await blobToDataUrl(blob);
  } catch {
    return aiDataUrl;
  }
}

async function loadBitmap(dataUrl: string): Promise<ImageBitmap> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

function applyInstructionTheme(
  context: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  instructions: string
): void {
  const theme = themeColors(instructions);
  context.save();
  context.globalCompositeOperation = 'source-over';

  const wash = context.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, theme.primary);
  wash.addColorStop(0.5, theme.secondary);
  wash.addColorStop(1, theme.tertiary);
  context.globalAlpha = theme.opacity;
  context.fillStyle = wash;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(width * 0.74, height * 0.18, 0, width * 0.74, height * 0.18, Math.max(width, height) * 0.42);
  glow.addColorStop(0, theme.glow);
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  context.globalAlpha = theme.glowOpacity;
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
  context.restore();

  drawThemeAccents(context, width, height, instructions);
}

function themeColors(instructions: string) {
  const text = instructions.toLowerCase();
  if (/\b(waterfall|water|river|ocean|sea|blue|aqua)\b/.test(text)) {
    return {
      primary: 'rgba(37, 160, 255, 0.28)',
      secondary: 'rgba(184, 244, 255, 0.22)',
      tertiary: 'rgba(16, 88, 135, 0.18)',
      glow: 'rgba(191, 250, 255, 0.56)',
      opacity: 0.48,
      glowOpacity: 0.62
    };
  }

  if (/\b(sunset|sunrise|dusk|orange|gold|warm)\b/.test(text)) {
    return {
      primary: 'rgba(255, 108, 55, 0.32)',
      secondary: 'rgba(255, 193, 94, 0.26)',
      tertiary: 'rgba(206, 28, 83, 0.2)',
      glow: 'rgba(255, 208, 116, 0.62)',
      opacity: 0.52,
      glowOpacity: 0.68
    };
  }

  if (/\b(forest|garden|green|nature|leaf)\b/.test(text)) {
    return {
      primary: 'rgba(38, 155, 92, 0.24)',
      secondary: 'rgba(183, 232, 161, 0.2)',
      tertiary: 'rgba(19, 94, 61, 0.16)',
      glow: 'rgba(202, 255, 190, 0.5)',
      opacity: 0.42,
      glowOpacity: 0.56
    };
  }

  return {
    primary: 'rgba(255, 63, 82, 0.14)',
    secondary: 'rgba(255, 191, 151, 0.12)',
    tertiary: 'rgba(255, 242, 232, 0.1)',
    glow: 'rgba(255, 202, 176, 0.32)',
    opacity: 0.24,
    glowOpacity: 0.34
  };
}

function drawThemeAccents(
  context: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  instructions: string
): void {
  const text = instructions.toLowerCase();
  if (/\b(waterfall|water|river|ocean|sea|blue|aqua)\b/.test(text)) {
    drawWaterAccents(context, width, height);
    return;
  }

  if (/\b(sunset|sunrise|dusk|orange|gold|warm)\b/.test(text)) {
    drawSunsetAccents(context, width, height);
    return;
  }

  if (/\b(forest|garden|green|nature|leaf)\b/.test(text)) {
    drawNatureAccents(context, width, height);
  }
}

function drawWaterAccents(context: OffscreenCanvasRenderingContext2D, width: number, height: number): void {
  context.save();
  context.globalCompositeOperation = 'source-over';

  const stream = context.createLinearGradient(width * 0.78, 0, width, height);
  stream.addColorStop(0, 'rgba(166, 238, 255, 0.5)');
  stream.addColorStop(0.52, 'rgba(55, 166, 239, 0.32)');
  stream.addColorStop(1, 'rgba(10, 75, 130, 0)');
  context.fillStyle = stream;
  context.globalAlpha = 0.9;
  context.fillRect(width * 0.7, 0, width * 0.3, height);

  context.strokeStyle = 'rgba(189, 249, 255, 0.56)';
  context.lineWidth = Math.max(2, width * 0.004);
  for (let i = 0; i < 6; i += 1) {
    const y = height * (0.18 + i * 0.11);
    context.beginPath();
    context.moveTo(width * 0.08, y);
    context.bezierCurveTo(width * 0.26, y - 16, width * 0.43, y + 16, width * 0.66, y);
    context.stroke();
  }

  context.globalAlpha = 0.7;
  context.fillStyle = 'rgba(212, 253, 255, 0.58)';
  for (let i = 0; i < 14; i += 1) {
    const x = width * (0.1 + (i % 7) * 0.12);
    const y = height * (0.2 + Math.floor(i / 7) * 0.34);
    context.beginPath();
    context.arc(x, y, Math.max(2, width * 0.004), 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawSunsetAccents(context: OffscreenCanvasRenderingContext2D, width: number, height: number): void {
  context.save();
  context.globalCompositeOperation = 'source-over';

  const sky = context.createLinearGradient(0, 0, width, height * 0.5);
  sky.addColorStop(0, 'rgba(255, 91, 59, 0.5)');
  sky.addColorStop(0.55, 'rgba(255, 190, 93, 0.34)');
  sky.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.globalAlpha = 0.9;
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height * 0.52);

  const sun = context.createRadialGradient(width * 0.78, height * 0.18, 0, width * 0.78, height * 0.18, width * 0.34);
  sun.addColorStop(0, 'rgba(255, 238, 160, 0.72)');
  sun.addColorStop(0.45, 'rgba(255, 129, 69, 0.36)');
  sun.addColorStop(1, 'rgba(255, 129, 69, 0)');
  context.fillStyle = sun;
  context.fillRect(0, 0, width, height * 0.58);

  context.globalAlpha = 0.42;
  context.strokeStyle = 'rgba(255, 207, 130, 0.72)';
  context.lineWidth = Math.max(2, width * 0.004);
  for (let i = 0; i < 4; i += 1) {
    const y = height * (0.24 + i * 0.08);
    context.beginPath();
    context.moveTo(width * 0.05, y);
    context.bezierCurveTo(width * 0.28, y - 12, width * 0.52, y + 12, width * 0.9, y);
    context.stroke();
  }
  context.restore();
}

function drawNatureAccents(context: OffscreenCanvasRenderingContext2D, width: number, height: number): void {
  context.save();
  context.globalCompositeOperation = 'source-over';

  const garden = context.createLinearGradient(0, 0, width, height);
  garden.addColorStop(0, 'rgba(187, 231, 147, 0.32)');
  garden.addColorStop(0.55, 'rgba(57, 164, 102, 0.22)');
  garden.addColorStop(1, 'rgba(23, 99, 61, 0.18)');
  context.globalAlpha = 0.8;
  context.fillStyle = garden;
  context.fillRect(0, 0, width, height);

  context.globalAlpha = 0.44;
  context.fillStyle = 'rgba(205, 255, 198, 0.72)';
  for (let i = 0; i < 12; i += 1) {
    const x = width * (0.08 + (i % 6) * 0.15);
    const y = height * (0.18 + Math.floor(i / 6) * 0.5);
    context.beginPath();
    context.ellipse(x, y, width * 0.025, width * 0.009, -0.6, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

export function extractImageDataUrl(data: unknown): string | null {
  if (!data) return null;

  if (typeof data === 'string') {
    return toImageDataUrl(data);
  }

  if (Array.isArray(data)) {
    for (const entry of data) {
      const dataUrl = extractImageDataUrl(entry);
      if (dataUrl) return dataUrl;
    }
    return null;
  }

  if (typeof data !== 'object') return null;

  const record = data as Record<string, unknown>;
  const directKeys = ['image', 'image_b64', 'b64_json', 'base64'];

  for (const key of directKeys) {
    const dataUrl = extractImageDataUrl(record[key]);
    if (dataUrl) return dataUrl;
  }

  for (const key of ['result', 'data', 'images', 'output']) {
    const dataUrl = extractImageDataUrl(record[key]);
    if (dataUrl) return dataUrl;
  }

  return null;
}

function toImageDataUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (/^[A-Za-z0-9+/=\s_-]+$/.test(trimmed)) {
    return `data:image/png;base64,${trimmed.replace(/\s/g, '')}`;
  }

  return null;
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
