const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function generatePNG(size, outputPath) {
  const width = size;
  const height = size;
  const raw = Buffer.alloc(height * (1 + width * 4));

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const offset = y * (1 + width * 4) + 1 + x * 4;
    // Alpha blending
    const srcA = a / 255;
    const dstA = raw[offset + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA <= 0) return;

    raw[offset] = Math.round((r * srcA + raw[offset] * dstA * (1 - srcA)) / outA);
    raw[offset + 1] = Math.round((g * srcA + raw[offset + 1] * dstA * (1 - srcA)) / outA);
    raw[offset + 2] = Math.round((b * srcA + raw[offset + 2] * dstA * (1 - srcA)) / outA);
    raw[offset + 3] = Math.round(outA * 255);
  }

  function fillRoundedRect(rx, ry, rw, rh, rad, r, g, b, a) {
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        let inside = true;
        if (x < rx + rad && y < ry + rad) {
          const dx = x - (rx + rad), dy = y - (ry + rad);
          inside = (dx * dx + dy * dy) <= rad * rad;
        } else if (x >= rx + rw - rad && y < ry + rad) {
          const dx = x - (rx + rw - rad), dy = y - (ry + rad);
          inside = (dx * dx + dy * dy) <= rad * rad;
        } else if (x < rx + rad && y >= ry + rh - rad) {
          const dx = x - (rx + rad), dy = y - (ry + rh - rad);
          inside = (dx * dx + dy * dy) <= rad * rad;
        } else if (x >= rx + rw - rad && y >= ry + rh - rad) {
          const dx = x - (rx + rw - rad), dy = y - (ry + rh - rad);
          inside = (dx * dx + dy * dy) <= rad * rad;
        }
        if (inside) setPixel(x, y, r, g, b, a);
      }
    }
  }

  function fillCircle(cx, cy, radius, r, g, b, a) {
    const r2 = radius * radius;
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          setPixel(x, y, r, g, b, a);
        }
      }
    }
  }

  // Draw scaled artwork
  const s = size / 512;

  // 1. Background dark rounded squircle
  fillRoundedRect(Math.round(16 * s), Math.round(16 * s), Math.round(480 * s), Math.round(480 * s), Math.round(110 * s), 15, 23, 42, 255);
  // Border highlight
  fillRoundedRect(Math.round(20 * s), Math.round(20 * s), Math.round(472 * s), Math.round(472 * s), Math.round(106 * s), 30, 41, 59, 255);

  // 2. Calendar inner card
  fillRoundedRect(Math.round(96 * s), Math.round(110 * s), Math.round(320 * s), Math.round(300 * s), Math.round(40 * s), 15, 23, 42, 255);

  // Calendar top gradient band
  fillRoundedRect(Math.round(96 * s), Math.round(110 * s), Math.round(320 * s), Math.round(75 * s), Math.round(30 * s), 16, 185, 129, 255);

  // Binder Rings
  fillRoundedRect(Math.round(160 * s), Math.round(85 * s), Math.round(24 * s), Math.round(50 * s), Math.round(10 * s), 241, 245, 249, 255);
  fillRoundedRect(Math.round(328 * s), Math.round(85 * s), Math.round(24 * s), Math.round(50 * s), Math.round(10 * s), 241, 245, 249, 255);

  // 3 Routine Bars
  // Bar 1: Morning (Cyan)
  fillRoundedRect(Math.round(135 * s), Math.round(220 * s), Math.round(150 * s), Math.round(22 * s), Math.round(11 * s), 56, 189, 248, 255);
  // Bar 2: Sport (Emerald)
  fillRoundedRect(Math.round(135 * s), Math.round(265 * s), Math.round(120 * s), Math.round(22 * s), Math.round(11 * s), 34, 197, 94, 255);
  // Bar 3: Evening (Indigo)
  fillRoundedRect(Math.round(135 * s), Math.round(310 * s), Math.round(95 * s), Math.round(22 * s), Math.round(11 * s), 129, 140, 248, 255);

  // Large Check Circle
  fillCircle(Math.round(340 * s), Math.round(290 * s), Math.round(62 * s), 34, 197, 94, 255);
  fillCircle(Math.round(340 * s), Math.round(290 * s), Math.round(52 * s), 15, 23, 42, 255);

  // Bold Checkmark
  for (let t = 0; t <= 1; t += 0.02) {
    // Segment 1: (314, 290) -> (334, 310)
    const x1 = Math.round((314 + t * 20) * s);
    const y1 = Math.round((290 + t * 20) * s);
    fillCircle(x1, y1, Math.round(6 * s), 74, 222, 128, 255);

    // Segment 2: (334, 310) -> (372, 266)
    const x2 = Math.round((334 + t * 38) * s);
    const y2 = Math.round((310 - t * 44) * s);
    fillCircle(x2, y2, Math.round(6 * s), 74, 222, 128, 255);
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(raw);

  // Write PNG
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Non-interlaced

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const pngBuffer = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`Généré : ${outputPath} (${width}x${height})`);
}

generatePNG(192, path.join(__dirname, 'icons', 'icon-192.png'));
generatePNG(512, path.join(__dirname, 'icons', 'icon-512.png'));
