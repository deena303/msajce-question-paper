const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('public/msajce_internal_exam_watermark.png');
console.log('File length:', buf.length);

let idx = 8;
let width = 0, height = 0, colorType = 0, bitDepth = 0;
const idatChunks = [];

while (idx < buf.length) {
  const len = buf.readUInt32BE(idx);
  const type = buf.subarray(idx + 4, idx + 8).toString('ascii');
  if (type === 'IHDR') {
    width = buf.readUInt32BE(idx + 8);
    height = buf.readUInt32BE(idx + 12);
    bitDepth = buf[idx + 16];
    colorType = buf[idx + 17];
    console.log('IHDR:', { width, height, bitDepth, colorType });
  } else if (type === 'PLTE') {
    console.log('PLTE palette length:', len);
  } else if (type === 'IDAT') {
    idatChunks.push(buf.subarray(idx + 8, idx + 8 + len));
  } else if (type === 'IEND') {
    break;
  }
  idx += 12 + len;
}

const idatConcat = Buffer.concat(idatChunks);
const decompressed = zlib.inflateSync(idatConcat);
console.log('Decompressed IDAT length:', decompressed.length);

// If colorType === 6 (RGBA), bytes per pixel = 4.
// Let's sample non-transparent pixels!
if (colorType === 6) {
  const bytesPerPixel = 4;
  const stride = 1 + width * bytesPerPixel;
  console.log('Expected decompressed length:', stride * height);
  
  // Sample non-zero alpha pixels
  let sampled = 0;
  const colors = new Map();
  const alphas = new Map();

  for (let y = 0; y < height; y += 10) {
    const rowStart = y * stride + 1; // skip filter byte
    for (let x = 0; x < width; x += 10) {
      const p = rowStart + x * bytesPerPixel;
      const r = decompressed[p];
      const g = decompressed[p + 1];
      const b = decompressed[p + 2];
      const a = decompressed[p + 3];
      if (a > 0) {
        sampled++;
        const hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        colors.set(hex, (colors.get(hex) || 0) + 1);
        alphas.set(a, (alphas.get(a) || 0) + 1);
      }
    }
  }
  console.log('Sampled non-transparent pixels:', sampled);
  console.log('Top colors (hex):', Array.from(colors.entries()).sort((a,b)=>b[1]-a[1]).slice(0, 10));
  console.log('Alpha values distribution:', Array.from(alphas.entries()).sort((a,b)=>b[1]-a[1]).slice(0, 10));
}
