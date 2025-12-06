// Simple script to generate placeholder icons
// This creates minimal valid PNG files

const fs = require('fs');
const path = require('path');

// Minimal valid 1x1 transparent PNG (base64 encoded)
const minimalPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Simple colored PNG (creates a small colored square)
function createColoredPNG(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdr = createChunk('IHDR', ihdrData);
  
  // IDAT chunk (image data)
  const zlib = require('zlib');
  const rawData = Buffer.alloc((width * 3 + 1) * height);
  
  for (let y = 0; y < height; y++) {
    const offset = y * (width * 3 + 1);
    rawData[offset] = 0; // filter type
    for (let x = 0; x < width; x++) {
      const pixelOffset = offset + 1 + x * 3;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
    }
  }
  
  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);
  
  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(data) {
  let crc = 0xffffffff;
  const table = [];
  
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  
  return crc ^ 0xffffffff;
}

const assetsDir = path.join(__dirname, '..', 'assets');

// Create directory if it doesn't exist
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Generate icons with AutoShift brand color (#6366f1 - indigo)
const brandColor = { r: 99, g: 102, b: 241 };

// icon.png (1024x1024)
const icon = createColoredPNG(1024, 1024, brandColor.r, brandColor.g, brandColor.b);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), icon);
console.log('Created icon.png');

// splash.png (1284x2778 for iPhone)
const splash = createColoredPNG(1284, 2778, 30, 27, 75); // #1e1b4b
fs.writeFileSync(path.join(assetsDir, 'splash.png'), splash);
console.log('Created splash.png');

// adaptive-icon.png (1024x1024)
const adaptiveIcon = createColoredPNG(1024, 1024, brandColor.r, brandColor.g, brandColor.b);
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), adaptiveIcon);
console.log('Created adaptive-icon.png');

// favicon.png (48x48)
const favicon = createColoredPNG(48, 48, brandColor.r, brandColor.g, brandColor.b);
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), favicon);
console.log('Created favicon.png');

console.log('\nAll placeholder icons created successfully!');
console.log('Note: Replace these with proper designed icons for production.');



