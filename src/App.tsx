import { Download, Globe2, ImagePlus, Settings, WandSparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AiConfig } from './components/AiConfig';
import { ResultPreviews } from './components/ResultPreviews';
import { hasChromeRuntime, sendToBackground } from './lib/chromeClient';
import { extensionFromDataUrl, filenameFromUrl } from './lib/url';
import type { CapturedPage, PublicConfig, RedesignResult, SiteGlowError } from './shared/types';
import { DEFAULT_CLOUDFLARE_MODEL } from './shared/types';

type Stage = 'idle' | 'capturing' | 'generating';
type View = 'capture' | 'config';

const emptyConfig: PublicConfig = {
  cloudflareModel: DEFAULT_CLOUDFLARE_MODEL,
  storageMode: 'session',
  connectionState: 'inactive'
};

export default function App() {
  const [view, setView] = useState<View>('capture');
  const [config, setConfig] = useState<PublicConfig>(emptyConfig);
  const [url, setUrl] = useState('');
  const [instructions, setInstructions] = useState('');
  const [capture, setCapture] = useState<CapturedPage | null>(null);
  const [afterDataUrl, setAfterDataUrl] = useState<string | null>(null);
  const [outputText, setOutputText] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<SiteGlowError | null>(null);
  const resultPanelRef = useRef<HTMLDivElement>(null);

  const canGenerate = useMemo(
    () => Boolean(config.connectionState === 'active' && url.trim() && stage === 'idle'),
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

  useEffect(() => {
    if (afterDataUrl) {
      resultPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [afterDataUrl]);

  async function runFlow() {
    const targetUrl = url;
    const targetInstructions = instructions;
    setError(null);
    setOutputText(null);

    try {
      setStage('capturing');
      const currentCapture = await sendToBackground<CapturedPage>({
        type: 'CAPTURE_SITE',
        payload: { url: targetUrl }
      });
      setCapture(currentCapture);
      setAfterDataUrl(null);

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

  const isConfigView = view === 'config';
  const topbarActionLabel = isConfigView ? 'Back to capture' : 'Open AI settings';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>SiteGlow AI<span aria-hidden="true">✦</span></h1>
          <p>Website redesigns made simple.</p>
        </div>
        <div className="topbar-actions">
          <button
            title={topbarActionLabel}
            onClick={() => setView(isConfigView ? 'capture' : 'config')}
            aria-label={topbarActionLabel}
          >
            {isConfigView ? <WandSparkles size={18} /> : <Settings size={18} />}
          </button>
        </div>
      </header>

      {view === 'config' ? (
        <AiConfig config={config} onConfigChange={setConfig} />
      ) : (
        <section className={`workspace ${capture || stage !== 'idle' ? 'has-result' : 'waiting-result'}`}>
          <div className="panel capture-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Website Capture</p>
              </div>
              {capture && <span className="meta">{capture.slices} slices</span>}
            </div>

            <label className="field full">
              <span>Public website URL</span>
              <div className="input-with-icon">
                <Globe2 size={18} aria-hidden="true" />
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                />
              </div>
            </label>

            <label className="field full capture-instructions">
              <span>Optional redesign instructions</span>
              <div className="textarea-with-icon">
                <WandSparkles size={18} aria-hidden="true" />
                <textarea
                  rows={7}
                  placeholder="Example: Make it feel premium and editorial, but preserve all content and section order."
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                />
              </div>
            </label>

            {(capture || stage !== 'idle') && (
              <div className="result-panel inline-result-panel" ref={resultPanelRef}>
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Result</p>
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

                {capture ? (
                  <ResultPreviews before={capture.dataUrl} after={afterDataUrl} />
                ) : (
                  <div className="result-empty">
                    <div>
                      <strong>{stage === 'capturing' ? 'Capturing Before' : 'Generating redesign'}</strong>
                      <span>
                        {stage === 'capturing'
                          ? 'Stitching the full-page screenshot.'
                          : 'Generating the After redesign.'}
                      </span>
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
            )}

            {error && <div className="notice error"><strong>{error.message}</strong>{error.detail && <small>{error.detail}</small>}</div>}
            {stage !== 'idle' && (
              <div className="progress-line">
                <span />
                {stage === 'capturing' ? 'Capturing and stitching the full page...' : 'Generating the full-page redesign concept...'}
              </div>
            )}

            <div className="button-row">
              <button className="primary" onClick={runFlow} disabled={!canGenerate}>
                <ImagePlus size={18} /> Capture & Generate
              </button>
            </div>

          </div>
        </section>
      )}
    </main>
  );
}

function formatResultMeta(result: RedesignResult): string | null {
  if (result.outputText) {
    return result.outputText;
  }

  if (result.providerUsed) {
    return 'Generated with Cloudflare Workers AI.';
  }

  return result.outputText || null;
}
