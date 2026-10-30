export function serviceCropRect(width: number, height: number, zoom: number, x: number, y: number) {
  const cropWidth = width / zoom;
  const cropHeight = height / zoom;
  const sx = Math.max(0, Math.min(width - cropWidth, ((x / 100) * width) - (cropWidth / 2)));
  const sy = Math.max(0, Math.min(height - cropHeight, ((y / 100) * height) - (cropHeight / 2)));

  return {
    sx,
    sy,
    sWidth: cropWidth,
    sHeight: cropHeight,
    dx: 0,
    dy: 0,
    dWidth: 1200,
    dHeight: 800
  };
}
