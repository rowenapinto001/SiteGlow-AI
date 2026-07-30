interface ResultPreviewsProps {
  before: string;
  after?: string | null;
}

export function ResultPreviews({ before, after }: ResultPreviewsProps) {
  return (
    <div className="stacked-previews" aria-label={after ? 'Before and after result previews' : 'Before result preview'}>
      <PreviewCard title="Before" src={before} alt="Original full-page website screenshot" />
      {after && <PreviewCard title="After" src={after} alt="AI-generated redesign concept" />}
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
