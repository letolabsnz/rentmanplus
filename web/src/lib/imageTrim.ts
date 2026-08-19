function decodeImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = dataUrl;
  });
}

function isBackgroundPixel(r: number, g: number, b: number, a: number): boolean {
  return a < 10 || (r > 250 && g > 250 && b > 250);
}

// Logos exported from design tools often carry a chunk of transparent or
// white padding around the actual mark — that padding becomes visible
// "whitespace" once the logo is placed on a label. Crop it away by finding
// the tightest bounding box of non-background pixels.
export async function trimWhitespace(dataUrl: string): Promise<string> {
  const img = await decodeImage(dataUrl);
  const width = img.naturalWidth;
  const height = img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, width, height);

  const rowHasContent = (y: number) => {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!isBackgroundPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) return true;
    }
    return false;
  };
  const colHasContent = (x: number) => {
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      if (!isBackgroundPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) return true;
    }
    return false;
  };

  let top = 0;
  let bottom = height - 1;
  let left = 0;
  let right = width - 1;
  while (top < bottom && !rowHasContent(top)) top++;
  while (bottom > top && !rowHasContent(bottom)) bottom--;
  while (left < right && !colHasContent(left)) left++;
  while (right > left && !colHasContent(right)) right--;

  const trimmedWidth = right - left + 1;
  const trimmedHeight = bottom - top + 1;
  const nothingToTrim = left === 0 && top === 0 && trimmedWidth === width && trimmedHeight === height;
  if (nothingToTrim || trimmedWidth <= 0 || trimmedHeight <= 0) return dataUrl;

  const out = document.createElement("canvas");
  out.width = trimmedWidth;
  out.height = trimmedHeight;
  out.getContext("2d")?.drawImage(canvas, left, top, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
  return out.toDataURL("image/png");
}
