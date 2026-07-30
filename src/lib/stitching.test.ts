import { describe, expect, it } from 'vitest';
import { buildYPositions } from './captureMath';
import { computeStitchLayout, destinationY, visibleSliceHeight } from './stitching';
import type { CaptureSlice } from '../shared/types';

const slice: CaptureSlice = {
  dataUrl: 'data:image/png;base64,',
  y: 800,
  viewportWidth: 1200,
  viewportHeight: 800,
  pageWidth: 1200,
  pageHeight: 2600,
  deviceScaleFactor: 2
};

describe('capture stitching math', () => {
  it('includes the final bottom-aligned slice', () => {
    expect(buildYPositions(2600, 800)).toEqual([0, 800, 1600, 1800]);
  });

  it('computes visible height for the final slice', () => {
    expect(visibleSliceHeight({ ...slice, y: 2400 })).toBe(200);
  });

  it('scales very large pages under the max pixel budget', () => {
    const layout = computeStitchLayout(slice);
    expect(layout.sourceWidth).toBe(2400);
    expect(layout.sourceHeight).toBe(5200);
    expect(layout.scaled).toBe(false);
    expect(destinationY(slice, layout.scale)).toBe(1600);
  });
});
