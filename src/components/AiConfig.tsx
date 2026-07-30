import { CheckCircle2, KeyRound, PlugZap, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { sendToBackground } from '../lib/chromeClient';
import {
  CLOUDFLARE_IMAGE_MODELS,
  DEFAULT_CLOUDFLARE_MODEL,
  type PublicConfig,
  type SiteGlowError,
  type StorageMode
} from '../shared/types';

interface AiConfigProps {
  config: PublicConfig;
  onConfigChange: (config: PublicConfig) => void;
}

export function AiConfig({ config, onConfigChange }: AiConfigProps) {
  const [cloudflareAccountId, setCloudflareAccountId] = useState(config.cloudflareAccountId || '');
  const [cloudflareToken, setCloudflareToken] = useState('');
  const [cloudflareModel, setCloudflareModel] = useState(config.cloudflareModel || DEFAULT_CLOUDFLARE_MODEL);
  const [storageMode, setStorageMode] = useState<StorageMode>(config.storageMode);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<SiteGlowError | null>(null);

  async function save() {
    setBusy('save');
    setError(null);
    setMessage(null);

    try {
      const next = await sendToBackground<PublicConfig>({
        type: 'SAVE_CONFIG',
        payload: {
          storageMode,
          cloudflareAccountId,
          cloudflareToken: cloudflareToken || undefined,
          cloudflareModel
        }
      });
      setCloudflareToken('');
      onConfigChange(next);
      setMessage('Cloudflare Workers AI configuration saved and validated.');
    } catch (caught) {
      setError(caught as SiteGlowError);
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy('test');
    setError(null);
    setMessage(null);

    try {
      const result = await sendToBackground<{ message: string }>({
        type: 'TEST_CLOUDFLARE',
        payload: {
          accountId: cloudflareAccountId,
          apiToken: cloudflareToken || undefined,
          model: cloudflareModel
        }
      });

      if (cloudflareToken) {
        setMessage(`${result.message} Validate & Save to use this token for redesigns.`);
      } else {
        const next = await sendToBackground<PublicConfig>({ type: 'GET_CONFIG' });
        onConfigChange(next.connectionState === 'active' ? next : { ...next, connectionState: 'active' });
        setMessage(result.message);
      }
    } catch (caught) {
      setError(caught as SiteGlowError);
      onConfigChange({ ...config, connectionState: 'inactive' });
    } finally {
      setBusy(null);
    }
  }

  async function removeSecrets() {
    setBusy('delete');
    setError(null);
    setMessage(null);

    try {
      const next = await sendToBackground<PublicConfig>({ type: 'DELETE_KEY' });
      setCloudflareToken('');
      onConfigChange(next);
      setMessage('Saved Cloudflare token deleted.');
    } catch (caught) {
      setError(caught as SiteGlowError);
    } finally {
      setBusy(null);
    }
  }

  function resetLocalForm() {
    setCloudflareAccountId(config.cloudflareAccountId || '');
    setCloudflareToken('');
    setCloudflareModel(config.cloudflareModel || DEFAULT_CLOUDFLARE_MODEL);
    setStorageMode(config.storageMode);
    setError(null);
    setMessage(null);
  }

  return (
    <section className="panel config-panel" aria-labelledby="ai-config-title">
      <h2 id="ai-config-title" className="sr-only">Cloudflare connection</h2>

      <div className="field-grid">
        <label className="field full">
          <span>Cloudflare Account ID</span>
          <input
            value={cloudflareAccountId}
            onChange={(event) => setCloudflareAccountId(event.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
        </label>

        <label className="field full">
          <span>Workers AI API token</span>
          <div className="input-with-icon">
            <KeyRound size={18} aria-hidden="true" />
            <input
              type="password"
              autoComplete="off"
              placeholder={config.cloudflareTokenHint || 'Paste your Cloudflare Workers AI API token'}
              value={cloudflareToken}
              onChange={(event) => setCloudflareToken(event.target.value)}
            />
          </div>
          {config.cloudflareTokenHint && <small>Saved token: {config.cloudflareTokenHint}</small>}
        </label>

        <label className="field full">
          <span>Cloudflare image model</span>
          <input
            list="cloudflare-models"
            value={cloudflareModel}
            onChange={(event) => setCloudflareModel(event.target.value)}
            spellCheck={false}
          />
          <datalist id="cloudflare-models">
            {CLOUDFLARE_IMAGE_MODELS.map((entry) => (
              <option key={entry} value={entry} />
            ))}
          </datalist>
        </label>

        <fieldset className="storage-field">
          <legend>API token storage</legend>
          <label>
            <input
              type="radio"
              name="storageMode"
              value="session"
              checked={storageMode === 'session'}
              onChange={() => setStorageMode('session')}
            />
            Session only
          </label>
          <label>
            <input
              type="radio"
              name="storageMode"
              value="local"
              checked={storageMode === 'local'}
              onChange={() => setStorageMode('local')}
            />
            Persistent local
          </label>
        </fieldset>
      </div>

      {message && <div className="notice success"><CheckCircle2 size={18} />{message}</div>}
      {error && <div className="notice error"><strong>{error.message}</strong>{error.detail && <small>{error.detail}</small>}</div>}

      <div className="button-row">
        <button className="primary" onClick={save} disabled={Boolean(busy) || !cloudflareModel.trim()}>
          <Save size={18} /> {busy === 'save' ? 'Validating...' : 'Validate & Save'}
        </button>
        <button onClick={test} disabled={Boolean(busy) || !cloudflareModel.trim()}>
          <PlugZap size={18} /> {busy === 'test' ? 'Testing...' : 'Test'}
        </button>
        <button onClick={resetLocalForm} disabled={Boolean(busy)}>
          <RotateCcw size={18} /> Reset
        </button>
        <button className="danger" onClick={removeSecrets} disabled={Boolean(busy) || !config.cloudflareTokenHint}>
          <Trash2 size={18} /> Delete Token
        </button>
      </div>
    </section>
  );
}
