import { Download, ExternalLink, ImagePlus, RefreshCw, RotateCcw, WandSparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AiConfig } from './components/AiConfig';
import { ComparisonSlider } from './components/ComparisonSlider';
import { StatusPill } from './components/StatusPill';
import { hasChromeRuntime, sendToBackground } from './lib/chromeClient';
import { extensionFromDataUrl, filenameFromUrl } from './lib/url';
import type { CapturedPage, PublicConfig, RedesignResult, SiteGlowError } from './shared/types';
import { DEFAULT_CLOUDFLARE_MODEL } from './shared/types';

type Stage = 'idle' | 'capturing' | 'generating';

const emptyConfig: PublicConfig = {
  cloudflareModel: DEFAULT_CLOUDFLARE_MODEL,
  storageMode: 'session',
  connectionState: 'inactive'
};

export default function App() {
  const [config, setConfig] = useState<PublicConfig>(emptyConfig);
  const [url, setUrl] = useState('');
  const [instructions, setInstructions] = useState('');
  const [capture, setCapture] = useState<CapturedPage | null>(null);
  const [afterDataUrl, setAfterDataUrl] = useState<string | null>(null);
  const [outputText, setOutputText] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<SiteGlowError | null>(null);

  const canGenerate = useMemo(
    () => config.connectionState === 'active' && url.trim() && stage === 'idle',
    [config.connectionState, stage, url]
  );

  useEffect(() => {
    if (!hasChromeRuntime()) {
      setError({
        code: 'chrome_runtime_missing',
        message: 'Load the built dist folder as a Chrome extension to run captures and AI generation.'
      });
      return;
    }

    async function boot() {
      const nextConfig = await sendToBackground<PublicConfig>({ type: 'GET_CONFIG' });
      setConfig(nextConfig);

    }

    boot().catch((caught) => setError(caught as SiteGlowError));
  }, []);

  async function runFlow(regenerate = false) {
    const targetUrl = url;
    const targetInstructions = instructions;
    setError(null);
    setOutputText(null);

    try {
      let currentCapture = capture;
      if (!regenerate || !currentCapture) {
        setStage('capturing');
        currentCapture = await sendToBackground<CapturedPage>({
          type: 'CAPTURE_SITE',
          payload: { url: targetUrl }
        });
        setCapture(currentCapture);
        setAfterDataUrl(null);
      }

      setStage('generating');
      const redesign = await sendToBackground<RedesignResult>({
        type: 'GENERATE_REDESIGN',
          payload: {
            beforeDataUrl: currentCapture.dataUrl,
            url: currentCapture.url,
            instructions: targetInstructions,
            pageTitle: currentCapture.title,
            beforeWidth: currentCapture.width,
            beforeHeight: currentCapture.height
          }
      });
      setAfterDataUrl(redesign.afterDataUrl);
      setOutputText(formatResultMeta(redesign));
    } catch (caught) {
      setError(caught as SiteGlowError);
    } finally {
      setStage('idle');
    }
  }

  async function download(kind: 'before' | 'after') {
    const dataUrl = kind === 'before' ? capture?.dataUrl : afterDataUrl;
    const sourceUrl = capture?.url || url || 'siteglow.ai';
    if (!dataUrl) return;

    try {
      await sendToBackground<{ id: number }>({
        type: 'DOWNLOAD_IMAGE',
        payload: {
          dataUrl,
          filename: filenameFromUrl(sourceUrl, kind, extensionFromDataUrl(dataUrl))
        }
      });
    } catch (caught) {
      setError(caught as SiteGlowError);
    }
  }

  function reset() {
    setCapture(null);
    setAfterDataUrl(null);
    setOutputText(null);
    setError(null);
    setStage('idle');
  }

  function openWorkspaceTab() {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>SiteGlow AI</h1>
          <p>Cloudflare-powered website redesigns.</p>
        </div>
        <div className="topbar-actions">
          <StatusPill state={config.connectionState} />
          <button title="Open full workspace tab" onClick={openWorkspaceTab}>
            <ExternalLink size={18} />
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="SiteGlow views">
        <button className="active">
          <WandSparkles size={18} /> Redesign
        </button>
      </nav>

      <section className="workspace">
        <div className="left-stack">
          <AiConfig config={config} onConfigChange={setConfig} />
          <div className="panel capture-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Website Capture</p>
                <h2>Before screenshot</h2>
              </div>
              {capture && <span className="meta">{capture.slices} slices</span>}
            </div>

            <label className="field full">
              <span>Public website URL</span>
              <input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
            </label>

            <label className="field full">
              <span>Optional redesign instructions</span>
              <textarea
                rows={2}
                placeholder="Example: Make it feel premium and editorial, but preserve all content and section order."
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
              />
            </label>

            {error && <div className="notice error"><strong>{error.message}</strong>{error.detail && <small>{error.detail}</small>}</div>}
            {stage !== 'idle' && (
              <div className="progress-line">
                <span />
                {stage === 'capturing' ? 'Capturing and stitching the full page...' : 'Generating the full-page redesign concept...'}
              </div>
            )}

            <div className="button-row">
              <button className="primary" onClick={() => runFlow(false)} disabled={!canGenerate}>
                <ImagePlus size={18} /> Capture & Generate
              </button>
              <button onClick={() => runFlow(true)} disabled={!capture || stage !== 'idle' || config.connectionState !== 'active'}>
                <RefreshCw size={18} /> Regenerate
              </button>
              <button onClick={reset} disabled={stage !== 'idle'}>
                <RotateCcw size={18} /> Reset
              </button>
            </div>

          </div>
        </div>

        <div className="panel result-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Result</p>
              <h2>{afterDataUrl ? 'Before / After' : capture ? 'Captured Before' : 'Preview'}</h2>
            </div>
            <div className="button-row compact">
              <button onClick={() => download('before')} disabled={!capture} title="Download before screenshot">
                <Download size={18} /> Before
              </button>
              <button onClick={() => download('after')} disabled={!afterDataUrl} title="Download after redesign">
                <Download size={18} /> After
              </button>
            </div>
          </div>

          {afterDataUrl && capture ? (
            <ComparisonSlider before={capture.dataUrl} after={afterDataUrl} />
          ) : capture ? (
            <div className="single-preview">
              <img src={capture.dataUrl} alt="Original full-page website screenshot" />
            </div>
          ) : (
            <div className="preview-placeholder" aria-label="Result preview placeholder">
              <div className="preview-window">
                <span />
                <span />
                <span />
                <div className="preview-band" />
                <div className="preview-line long" />
                <div className="preview-line" />
                <div className="preview-grid">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          )}

          {capture && (
            <div className="capture-meta">
              <span>{capture.width} x {capture.height}</span>
              <span>{capture.scaled ? 'Scaled for API limits' : 'Native stitched capture'}</span>
              {outputText && <span>{outputText}</span>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function formatResultMeta(result: RedesignResult): string | null {
  if (result.providerUsed) {
    return 'Generated with Cloudflare Workers AI.';
  }

  return result.outputText || null;
}
