// scripts/createPwaIcons.js
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

// CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 1);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(typeAndData), 8 + len);
  return buf;
}

function generatePng(width, height, drawFn) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = createChunk('IDAT', deflated);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Draw function for ARH Print Hub brand icon
function drawArhIcon(x, y, width, height, isMaskable = false) {
  // Normalized coordinates: -1 to 1
  const nx = (x / width) * 2 - 1;
  const ny = (y / height) * 2 - 1;

  // Background
  let bgR = 10, bgG = 10, bgB = 12, bgA = 255; // Deep modern black/zinc

  // For non-maskable, give soft squircle corner radius
  if (!isMaskable) {
    const cornerRadius = 0.28;
    const qx = Math.max(0, Math.abs(nx) - (1 - cornerRadius));
    const qy = Math.max(0, Math.abs(ny) - (1 - cornerRadius));
    const distFromCorner = Math.sqrt(qx * qx + qy * qy);
    if (distFromCorner > cornerRadius) {
      return [0, 0, 0, 0]; // Transparent outside corner
    }
    // Subtle border
    if (distFromCorner > cornerRadius - 0.02 || Math.abs(nx) > 0.96 || Math.abs(ny) > 0.96) {
      bgR = 39; bgG = 39; bgB = 42;
    }
  }

  // Geometric pixel rendering of stylized 'ARH' letters
  // Target box: y in [-0.45, 0.15], x in [-0.75, 0.75]
  const scale = isMaskable ? 0.75 : 0.85;
  const sx = nx / scale;
  const sy = ny / scale;

  // Check if pixel falls inside letter 'A', 'R', or 'H'
  let isLetter = false;

  // Letter A: sx in [-0.7, -0.2], sy in [-0.35, 0.15]
  const ax = sx - (-0.46);
  const ay = sy - (-0.1);
  if (Math.abs(ax) < 0.22 && Math.abs(ay) < 0.26) {
    // Slanted legs and crossbar
    const leftLegDist = Math.abs((ay * 0.45) - ax);
    const rightLegDist = Math.abs((ay * 0.45) + ax);
    const topCap = ay < -0.22 && Math.abs(ax) < 0.05;
    const crossbar = Math.abs(ay - 0.05) < 0.04 && Math.abs(ax) < 0.15;
    if (leftLegDist < 0.055 || rightLegDist < 0.055 || crossbar || topCap) {
      isLetter = true;
    }
  }

  // Letter R: sx in [-0.2, 0.2], sy in [-0.35, 0.15]
  const rx = sx - (-0.02);
  const ry = sy - (-0.1);
  if (Math.abs(rx) < 0.20 && Math.abs(ry) < 0.26) {
    // Left vertical stem
    const leftStem = Math.abs(rx - (-0.12)) < 0.045;
    // Top loop of R
    const topBar = Math.abs(ry - (-0.22)) < 0.04 && rx >= -0.12 && rx <= 0.06;
    const midBar = Math.abs(ry - (-0.02)) < 0.04 && rx >= -0.12 && rx <= 0.06;
    const rightLoop = Math.abs(rx - 0.10) < 0.045 && ry >= -0.22 && ry <= -0.02;
    // Diagonal leg
    const legDist = Math.abs((ry - (-0.02)) * 0.9 - (rx - (-0.02)));
    const leg = legDist < 0.055 && ry >= -0.02 && ry <= 0.24 && rx >= -0.02 && rx <= 0.16;

    if (leftStem || topBar || midBar || rightLoop || leg) {
      isLetter = true;
    }
  }

  // Letter H: sx in [0.22, 0.72], sy in [-0.35, 0.15]
  const hx = sx - (0.44);
  const hy = sy - (-0.1);
  if (Math.abs(hx) < 0.22 && Math.abs(hy) < 0.26) {
    const leftStem = Math.abs(hx - (-0.13)) < 0.045;
    const rightStem = Math.abs(hx - 0.13) < 0.045;
    const crossbar = Math.abs(hy - (-0.04)) < 0.04 && Math.abs(hx) <= 0.13;
    if (leftStem || rightStem || crossbar) {
      isLetter = true;
    }
  }

  if (isLetter) {
    return [255, 255, 255, 255]; // Crisp white lettering
  }

  // CMYK Precision Dots below letters
  // Target y around 0.32
  const dotY = 0.30;
  const dotRadius = 0.038 * (isMaskable ? 0.8 : 1.0);
  const dots = [
    { x: -0.30, color: [0, 229, 255] },  // Cyan
    { x: -0.10, color: [255, 0, 127] },  // Magenta
    { x: 0.10, color: [255, 234, 0] },   // Yellow
    { x: 0.30, color: [255, 255, 255] }, // White / Key
  ];

  for (const dot of dots) {
    const dx = nx - dot.x * (isMaskable ? 0.8 : 1.0);
    const dy = ny - dotY * (isMaskable ? 0.8 : 1.0);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < dotRadius) {
      const edge = dotRadius - dist;
      if (edge < 0.005) {
        // Antialias edge
        const alpha = Math.floor((edge / 0.005) * 255);
        return [dot.color[0], dot.color[1], dot.color[2], Math.min(255, alpha + 120)];
      }
      return [dot.color[0], dot.color[1], dot.color[2], 255];
    }
  }

  // Print hub subtle horizontal guide bars
  if (Math.abs(ny - 0.44 * (isMaskable ? 0.8 : 1.0)) < 0.005 && Math.abs(nx) < 0.45 * (isMaskable ? 0.8 : 1.0)) {
    return [113, 113, 122, 180]; // Zinc divider line
  }

  return [bgR, bgG, bgB, bgA];
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Generating PWA icons in public/...');

// 1. 512x512
const png512 = generatePng(512, 512, (x, y, w, h) => drawArhIcon(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), png512);
console.log('✓ Created pwa-512x512.png');

// 2. 192x192
const png192 = generatePng(192, 192, (x, y, w, h) => drawArhIcon(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), png192);
console.log('✓ Created pwa-192x192.png');

// 3. 512x512 maskable (full bleed background, centered within safe zone)
const pngMaskable = generatePng(512, 512, (x, y, w, h) => drawArhIcon(x, y, w, h, true));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), pngMaskable);
console.log('✓ Created pwa-maskable-512x512.png');

// 4. 180x180 Apple Touch Icon
const pngApple = generatePng(180, 180, (x, y, w, h) => drawArhIcon(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), pngApple);
console.log('✓ Created apple-touch-icon.png');

// 5. 32x32 Favicon
const pngFavicon = generatePng(32, 32, (x, y, w, h) => drawArhIcon(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'favicon.png'), pngFavicon);
console.log('✓ Created favicon.png');

console.log('All icons generated successfully!');
