interface ResultPreviewsProps {
  before: string;
  after?: string | null;
  isGeneratingAfter?: boolean;
}

export function ResultPreviews({ before, after, isGeneratingAfter = false }: ResultPreviewsProps) {
  return (
    <div className="stacked-previews" aria-label="Before and after result previews">
      <PreviewCard title="Before" src={before} alt="Original full-page website screenshot" />
      {after ? (
        <PreviewCard title="After" src={after} alt="AI-generated redesign concept" />
      ) : (
        <PreviewPlaceholder isGenerating={isGeneratingAfter} />
      )}
    </div>
  );
}

interface PreviewCardProps {
  title: string;
  src: string;
  alt: string;
}

function PreviewCard({ title, src, alt }: PreviewCardProps) {
  return (
    <section className="preview-card" aria-label={`${title} preview`}>
      <h3>{title}</h3>
      <div className="preview-frame">
        <img src={src} alt={alt} />
      </div>
    </section>
  );
}

function PreviewPlaceholder({ isGenerating }: { isGenerating: boolean }) {
  return (
    <section className="preview-card" aria-label="After preview">
      <h3>After</h3>
      <div className="preview-frame preview-frame-empty">
        <div className="preview-placeholder">
          <strong>{isGenerating ? 'Generating After' : 'After screen will appear here'}</strong>
          <span>
            {isGenerating
              ? 'Creating the redesign concept now.'
              : 'Run Capture & Generate to create the redesign.'}
          </span>
        </div>
      </div>
    </section>
  );
}
