export function buildYPositions(pageHeight: number, viewportHeight: number): number[] {
  const maxSlices = 80;
  const positions: number[] = [];
  const step = Math.max(1, viewportHeight);
  const lastY = Math.max(0, pageHeight - viewportHeight);

  for (let y = 0; y < lastY && positions.length < maxSlices; y += step) {
    positions.push(y);
  }

  if (!positions.includes(lastY) && positions.length < maxSlices) {
    positions.push(lastY);
  }

  return [...new Set(positions)].sort((a, b) => a - b);
}
