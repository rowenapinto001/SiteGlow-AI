import { useState } from 'react';

interface ComparisonSliderProps {
  before: string;
  after: string;
}

export function ComparisonSlider({ before, after }: ComparisonSliderProps) {
  const [position, setPosition] = useState(50);

  return (
    <div className="comparison-shell" aria-label="Before and after comparison">
      <div className="comparison-toolbar">
        <span>Before</span>
        <span>{position}%</span>
        <span>After</span>
      </div>
      <div className="comparison-frame">
        <img className="comparison-image" src={after} alt="AI-generated redesign concept" />
        <div className="comparison-before" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <img className="comparison-image" src={before} alt="Original full-page website screenshot" />
        </div>
        <div className="comparison-handle" style={{ left: `${position}%` }} aria-hidden="true" />
        <input
          aria-label="Drag to compare before and after"
          className="comparison-range"
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      </div>
    </div>
  );
}
