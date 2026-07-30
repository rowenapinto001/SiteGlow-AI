import type { BackgroundRequest, BackgroundResponse } from '../shared/types';

export async function sendToBackground<T>(request: BackgroundRequest): Promise<T> {
  const response = await chrome.runtime.sendMessage(request) as BackgroundResponse<T>;

  if (!response?.ok) {
    throw response?.error ?? {
      code: 'extension_message_failed',
      message: 'The extension background worker did not respond.'
    };
  }

  return response.data;
}

export function hasChromeRuntime(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.sendMessage);
}
