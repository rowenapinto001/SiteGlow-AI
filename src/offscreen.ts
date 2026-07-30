import { computeStitchLayout, destinationY, visibleSliceHeight } from './lib/stitching';
import type { CaptureSlice, StitchRequest, StitchResponse } from './shared/types';

chrome.runtime.onMessage.addListener((message: StitchRequest, _sender, sendResponse) => {
  if (message.type !== 'STITCH_SCREENSHOTS') {
    return false;
  }

  stitch(message.slices)
    .then((response) => sendResponse(response))
    .catch((error) => {
      sendResponse({
        dataUrl: '',
        width: 0,
        height: 0,
        scaled: false,
        error: error instanceof Error ? error.message : String(error)
      });
    });

  return true;
});

async function stitch(slices: CaptureSlice[]): Promise<StitchResponse> {
  if (!slices.length) {
    throw new Error('No screenshot slices were captured.');
  }

  const layout = computeStitchLayout(slices[0]);
  const canvas = document.createElement('canvas');
  canvas.width = layout.outputWidth;
  canvas.height = layout.outputHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas stitching is unavailable in this browser context.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (const slice of slices) {
    const image = await loadImage(slice.dataUrl);
    const sourceHeight = Math.min(
      image.naturalHeight,
      Math.round(visibleSliceHeight(slice) * slice.deviceScaleFactor)
    );
    const sourceWidth = Math.min(image.naturalWidth, layout.sourceWidth);
    const drawWidth = Math.round(sourceWidth * layout.scale);
    const drawHeight = Math.round(sourceHeight * layout.scale);

    context.drawImage(
      image,
      0,
      0,
      sourceWidth,
      sourceHeight,
      0,
      destinationY(slice, layout.scale),
      drawWidth,
      drawHeight
    );
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    scaled: layout.scaled
  };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('A captured screenshot slice could not be decoded.'));
    image.src = dataUrl;
  });
}
