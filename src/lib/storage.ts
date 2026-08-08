import {
  DEFAULT_CLOUDFLARE_MODEL,
  type PublicConfig,
  type SaveConfigInput,
  type StorageMode
} from '../shared/types';
import { validateCloudflareConnection } from './cloudflare';

const CONFIG_KEY = 'siteglow.config';
const CLOUDFLARE_TOKEN_KEY = 'siteglow.cloudflareApiToken';

interface StoredConfig {
  storageMode: StorageMode;
  cloudflareAccountId?: string;
  cloudflareModel?: string;
  cloudflareTokenHint?: string;
  connectionState?: PublicConfig['connectionState'];
  lastValidatedAt?: string;
}

const fallbackConfig: StoredConfig = {
  cloudflareModel: DEFAULT_CLOUDFLARE_MODEL,
  storageMode: 'session',
  connectionState: 'untested'
};

/**
 * Read the stored config, filled in from the defaults.
 *
 * chrome.storage.local.get hands back unknown values, which is honest: what is
 * on disk is whatever an older version wrote. The cast belongs here, once,
 * rather than at each of the three call sites.
 */
async function readConfig(): Promise<StoredConfig> {
  const stored = await chrome.storage.local.get(CONFIG_KEY);
  const saved = stored[CONFIG_KEY] as Partial<StoredConfig> | undefined;
  return { ...fallbackConfig, ...saved } as StoredConfig;
}

export async function getPublicConfig(): Promise<PublicConfig> {
  const config = await readConfig();
  const cloudflareToken = await getCloudflareToken(config.storageMode);

  return {
    storageMode: config.storageMode || 'session',
    cloudflareAccountId: config.cloudflareAccountId,
    cloudflareModel: config.cloudflareModel || DEFAULT_CLOUDFLARE_MODEL,
    cloudflareTokenHint: cloudflareToken ? maskKey(cloudflareToken) : config.cloudflareTokenHint,
    connectionState: cloudflareToken ? config.connectionState || 'untested' : 'inactive',
    lastValidatedAt: config.lastValidatedAt
  };
}

export async function getPrivateConfig(): Promise<PublicConfig & { cloudflareToken?: string }> {
  const publicConfig = await getPublicConfig();
  return {
    ...publicConfig,
    cloudflareToken: await getCloudflareToken(publicConfig.storageMode)
  };
}

export async function saveValidatedConfig(input: SaveConfigInput): Promise<PublicConfig> {
  const current = await getPrivateConfig();
  const cloudflareToken = input.cloudflareToken?.trim() || current.cloudflareToken;
  const cloudflareModel = input.cloudflareModel?.trim() || current.cloudflareModel || DEFAULT_CLOUDFLARE_MODEL;
  const cloudflareAccountId = input.cloudflareAccountId?.trim() || current.cloudflareAccountId;

  if (!cloudflareAccountId || !cloudflareToken) {
    throw new Error('Enter your Cloudflare Account ID and Workers AI API token before saving.');
  }
  await validateCloudflareConnection({ accountId: cloudflareAccountId, apiToken: cloudflareToken });

  await chrome.storage.session.remove(CLOUDFLARE_TOKEN_KEY);
  await chrome.storage.local.remove(CLOUDFLARE_TOKEN_KEY);

  const secretStorage = input.storageMode === 'local' ? chrome.storage.local : chrome.storage.session;
  await secretStorage.set({ [CLOUDFLARE_TOKEN_KEY]: cloudflareToken });

  const storedConfig: StoredConfig = {
    cloudflareAccountId,
    cloudflareModel,
    storageMode: input.storageMode,
    cloudflareTokenHint: maskKey(cloudflareToken),
    connectionState: 'active',
    lastValidatedAt: new Date().toISOString()
  };

  await chrome.storage.local.set({ [CONFIG_KEY]: storedConfig });
  return getPublicConfig();
}

export async function deleteApiKey(): Promise<PublicConfig> {
  await chrome.storage.session.remove(CLOUDFLARE_TOKEN_KEY);
  await chrome.storage.local.remove(CLOUDFLARE_TOKEN_KEY);

  const config = await readConfig();
  const {
    cloudflareTokenHint: _cloudflareTokenHint,
    lastValidatedAt: _lastValidatedAt,
    ...rest
  } = config;
  await chrome.storage.local.set({
    [CONFIG_KEY]: {
      ...rest,
      connectionState: 'inactive',
    }
  });

  return getPublicConfig();
}

export async function markConnectionInactive(): Promise<void> {
  const config = await readConfig();
  await chrome.storage.local.set({ [CONFIG_KEY]: { ...config, connectionState: 'inactive' } });
}

async function getCloudflareToken(storageMode: StorageMode): Promise<string | undefined> {
  const storage = storageMode === 'local' ? chrome.storage.local : chrome.storage.session;
  const value = await storage.get(CLOUDFLARE_TOKEN_KEY);
  return value[CLOUDFLARE_TOKEN_KEY] as string | undefined;
}

function maskKey(apiKey: string): string {
  const tail = apiKey.slice(-4);
  return `•••• •••• •••• ${tail}`;
}
