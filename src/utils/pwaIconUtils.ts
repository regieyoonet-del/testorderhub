/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_PWA_ICONS = {
  icon192: '/pwa-192x192.png',
  icon512: '/pwa-512x512.png',
  iconMaskable: '/pwa-maskable-512x512.png',
  appleTouchIcon: '/apple-touch-icon.png'
};

export interface ProcessedPwaIcons {
  masterUrl: string;
  icon192: string;
  icon512: string;
  iconMaskable: string;
  width: number;
  height: number;
}

/**
 * Load image file or data URL into an HTMLImageElement safely
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image for PWA icon processing: ' + err));
    img.src = src;
  });
}

/**
 * Automatically processes, scales, and creates crisp 192x192, 512x512,
 * and 512x512 maskable (safe-zone padded) PWA icons using HTML5 Canvas.
 */
export async function processPwaIcon(dataUrlOrFile: string | File): Promise<ProcessedPwaIcons> {
  let srcUrl: string;

  if (typeof dataUrlOrFile === 'string') {
    srcUrl = dataUrlOrFile;
  } else {
    srcUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(dataUrlOrFile);
    });
  }

  const img = await loadImage(srcUrl);
  const { naturalWidth, naturalHeight } = img;

  // 1. Generate 512x512 icon
  const canvas512 = document.createElement('canvas');
  canvas512.width = 512;
  canvas512.height = 512;
  const ctx512 = canvas512.getContext('2d');
  if (!ctx512) throw new Error('Canvas 2D context unavailable');

  ctx512.imageSmoothingEnabled = true;
  ctx512.imageSmoothingQuality = 'high';

  // Calculate aspect ratio containment or cover
  const scale512 = Math.min(512 / naturalWidth, 512 / naturalHeight);
  const drawW512 = naturalWidth * scale512;
  const drawH512 = naturalHeight * scale512;
  const drawX512 = (512 - drawW512) / 2;
  const drawY512 = (512 - drawH512) / 2;

  ctx512.drawImage(img, drawX512, drawY512, drawW512, drawH512);
  const icon512 = canvas512.toDataURL('image/png', 0.95);

  // 2. Generate 192x192 icon
  const canvas192 = document.createElement('canvas');
  canvas192.width = 192;
  canvas192.height = 192;
  const ctx192 = canvas192.getContext('2d');
  if (!ctx192) throw new Error('Canvas 2D context unavailable');

  ctx192.imageSmoothingEnabled = true;
  ctx192.imageSmoothingQuality = 'high';

  const scale192 = Math.min(192 / naturalWidth, 192 / naturalHeight);
  const drawW192 = naturalWidth * scale192;
  const drawH192 = naturalHeight * scale192;
  const drawX192 = (192 - drawW192) / 2;
  const drawY192 = (192 - drawH192) / 2;

  ctx192.drawImage(img, drawX192, drawY192, drawW192, drawH192);
  const icon192 = canvas192.toDataURL('image/png', 0.95);

  // 3. Generate 512x512 maskable icon
  // Android maskable icons must keep important graphics within the central 80% safe zone circle
  const canvasMaskable = document.createElement('canvas');
  canvasMaskable.width = 512;
  canvasMaskable.height = 512;
  const ctxMaskable = canvasMaskable.getContext('2d');
  if (!ctxMaskable) throw new Error('Canvas 2D context unavailable');

  ctxMaskable.imageSmoothingEnabled = true;
  ctxMaskable.imageSmoothingQuality = 'high';

  // Sample corner pixel or default to deep dark #0a0a0a background
  ctxMaskable.fillStyle = '#0a0a0a';
  ctxMaskable.fillRect(0, 0, 512, 512);

  // Scale down into safe zone (75% of dimension)
  const safeDimension = 512 * 0.75;
  const scaleMaskable = Math.min(safeDimension / naturalWidth, safeDimension / naturalHeight);
  const drawWMaskable = naturalWidth * scaleMaskable;
  const drawHMaskable = naturalHeight * scaleMaskable;
  const drawXMaskable = (512 - drawWMaskable) / 2;
  const drawYMaskable = (512 - drawHMaskable) / 2;

  ctxMaskable.drawImage(img, drawXMaskable, drawYMaskable, drawWMaskable, drawHMaskable);
  const iconMaskable = canvasMaskable.toDataURL('image/png', 0.95);

  return {
    masterUrl: srcUrl,
    icon192,
    icon512,
    iconMaskable,
    width: naturalWidth,
    height: naturalHeight
  };
}
