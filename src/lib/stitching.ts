import type { CaptureSlice } from '../shared/types';

const MAX_OUTPUT_PIXELS = 24_000_000;

export interface StitchLayout {
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number;
  outputHeight: number;
  scale: number;
  dpr: number;
  scaled: boolean;
}

export function computeStitchLayout(firstSlice: CaptureSlice): StitchLayout {
  const dpr = firstSlice.deviceScaleFactor || 1;
  const sourceWidth = Math.max(1, Math.round(firstSlice.pageWidth * dpr));
  const sourceHeight = Math.max(1, Math.round(firstSlice.pageHeight * dpr));
  const rawPixels = sourceWidth * sourceHeight;
  const scale = rawPixels > MAX_OUTPUT_PIXELS ? Math.sqrt(MAX_OUTPUT_PIXELS / rawPixels) : 1;

  return {
    sourceWidth,
    sourceHeight,
    outputWidth: Math.max(1, Math.round(sourceWidth * scale)),
    outputHeight: Math.max(1, Math.round(sourceHeight * scale)),
    scale,
    dpr,
    scaled: scale < 1
  };
}

export function visibleSliceHeight(slice: CaptureSlice): number {
  return Math.max(1, Math.min(slice.viewportHeight, slice.pageHeight - slice.y));
}

export function destinationY(slice: CaptureSlice, scale: number): number {
  return Math.round(slice.y * slice.deviceScaleFactor * scale);
}
