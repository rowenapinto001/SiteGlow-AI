import { validateCloudflareConnection } from './lib/cloudflare';
import { generateWithConfiguredProvider } from './lib/providerRunner';
import { buildYPositions } from './lib/captureMath';
import { normalizePublicUrl } from './lib/url';
import {
  deleteApiKey,
  getPrivateConfig,
  getPublicConfig,
  markConnectionInactive,
  saveValidatedConfig
} from './lib/storage';
import { SiteGlowException, toSiteGlowError } from './lib/errors';
import type {
  BackgroundRequest,
  BackgroundResponse,
  CapturedPage,
  CaptureSlice,
  StitchResponse
} from './shared/types';

chrome.runtime.onInstalled.addListener(() => {
  configureSidePanel().catch(() => undefined);
});

chrome.runtime.onStartup.addListener(() => {
  configureSidePanel().catch(() => undefined);
});

chrome.action.onClicked.addListener((tab) => {
  openSidePanel(tab.windowId).catch(() => undefined);
});

chrome.runtime.onMessage.addListener((request: BackgroundRequest, _sender, sendResponse) => {
  handleMessage(request)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: toSiteGlowError(error) }));

  return true;
});

async function handleMessage(request: BackgroundRequest): Promise<unknown> {
  switch (request.type) {
    case 'GET_CONFIG':
      return getPublicConfig();
    case 'SAVE_CONFIG':
      return saveValidatedConfig(request.payload);
    case 'DELETE_KEY':
      return deleteApiKey();
    case 'TEST_CLOUDFLARE':
      return testCloudflareConnection(request.payload);
    case 'CAPTURE_SITE':
      return captureWebsite(request.payload.url);
    case 'GENERATE_REDESIGN':
      return generateFromStoredKey(request.payload);
    case 'DOWNLOAD_IMAGE':
      return downloadImage(request.payload.dataUrl, request.payload.filename);
    default:
      throw new SiteGlowException({
        code: 'unknown_message',
        message: 'The extension received an unknown command.'
      });
  }
}

async function configureSidePanel(): Promise<void> {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await chrome.sidePanel.setOptions({
    path: 'index.html',
    enabled: true
  });
}

async function openSidePanel(windowId?: number): Promise<void> {
  await configureSidePanel();

  if (windowId) {
    await chrome.sidePanel.open({ windowId });
    return;
  }

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.windowId) {
    await chrome.sidePanel.open({ windowId: activeTab.windowId });
  }
}

async function testCloudflareConnection(payload?: { accountId?: string; apiToken?: string; model?: string }) {
  const config = await getPrivateConfig();
  const accountId = payload?.accountId?.trim() || config.cloudflareAccountId;
  const apiToken = payload?.apiToken?.trim() || config.cloudflareToken;

  if (!accountId || !apiToken) {
    throw new SiteGlowException({
      code: 'cloudflare_missing_credentials',
      message: 'Enter and save your Cloudflare Account ID and Workers AI API token before testing.'
    });
  }

  try {
    return { ...await validateCloudflareConnection({ accountId, apiToken }), testedAt: new Date().toISOString() };
  } catch (error) {
    await markConnectionInactive();
    throw error;
  }
}

async function generateFromStoredKey(payload: {
  beforeDataUrl: string;
  url: string;
  instructions?: string;
  pageTitle?: string;
  beforeWidth?: number;
  beforeHeight?: number;
}) {
  return generateWithConfiguredProvider(await getPrivateConfig(), payload);
}

async function captureWebsite(inputUrl: string): Promise<CapturedPage> {
  const url = normalizePublicUrl(inputUrl);
  const tab = await chrome.tabs.create({ url, active: true });

  if (!tab.id || !tab.windowId) {
    throw new SiteGlowException({
      code: 'capture_tab_failed',
      message: 'Chrome could not open a capture tab for this URL.'
    });
  }

  try {
    await waitForTabComplete(tab.id);
    await sleep(900);

    const metrics = await getPageMetrics(tab.id);
    const yPositions = buildYPositions(metrics.pageHeight, metrics.viewportHeight);
    const slices: CaptureSlice[] = [];

    for (const y of yPositions) {
      await scrollTabTo(tab.id, y);
      await sleep(450);
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      slices.push({
        dataUrl,
        y,
        viewportWidth: metrics.viewportWidth,
        viewportHeight: metrics.viewportHeight,
        pageWidth: metrics.viewportWidth,
        pageHeight: metrics.pageHeight,
        deviceScaleFactor: metrics.deviceScaleFactor
      });
    }

    await scrollTabTo(tab.id, 0);
    const stitched = await stitchSlices(slices);
    const latest = await chrome.tabs.get(tab.id);

    return {
      dataUrl: stitched.dataUrl,
      url: latest.url || url,
      title: latest.title || '',
      width: stitched.width,
      height: stitched.height,
      deviceScaleFactor: metrics.deviceScaleFactor,
      slices: slices.length,
      scaled: stitched.scaled
    };
  } finally {
    await chrome.tabs.remove(tab.id).catch(() => undefined);
  }
}

async function stitchSlices(slices: CaptureSlice[]): Promise<StitchResponse> {
  await ensureOffscreenDocument();
  const response = (await chrome.runtime.sendMessage({
    type: 'STITCH_SCREENSHOTS',
    slices
  })) as StitchResponse;

  if (!response?.dataUrl) {
    throw new SiteGlowException({
      code: 'stitch_failed',
      message: 'Chrome could not stitch the full-page screenshot.',
      detail: JSON.stringify(response)
    });
  }

  return response;
}

async function ensureOffscreenDocument(): Promise<void> {
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');

  if (await chrome.offscreen.hasDocument()) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: offscreenUrl,
    reasons: [chrome.offscreen.Reason.BLOBS],
    justification: 'Stitch full-page website screenshots with canvas before sending them to the selected AI provider.'
  });
}

function waitForTabComplete(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new SiteGlowException({
        code: 'capture_timeout',
        message: 'The website took too long to load for capture.'
      }));
    }, 30_000);

    const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }).catch(reject);
  });
}

async function getPageMetrics(tabId: number) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const doc = document.documentElement;
      const body = document.body;
      const pageHeight = Math.max(
        doc.scrollHeight,
        body?.scrollHeight || 0,
        doc.offsetHeight,
        body?.offsetHeight || 0,
        window.innerHeight
      );

      return {
        pageHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        deviceScaleFactor: window.devicePixelRatio || 1
      };
    }
  });

  if (!result.result) {
    throw new SiteGlowException({
      code: 'capture_metrics_failed',
      message: 'Could not read the page dimensions for screenshot capture.'
    });
  }

  return result.result;
}

async function scrollTabTo(tabId: number, y: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    args: [y],
    func: (scrollY: number) => {
      window.scrollTo(0, scrollY);
    }
  });
}

async function downloadImage(dataUrl: string, filename: string) {
  const id = await chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs: true
  });

  return { id };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type MessageResult<T> = BackgroundResponse<T>;
