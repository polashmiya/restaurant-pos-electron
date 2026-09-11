// Generates build/icon.png (512×512) — the application icon used by
// electron-builder for Windows (.ico), macOS (.icns) and Linux.
// Pure Node.js (zlib) so it works offline without image tooling.
// Change BRAND_COLOR to match src/styles/theme.css (--c-primary).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const BRAND_COLOR = [37, 99, 235]; // #2563eb
const FOREGROUND = [255, 255, 255];
const SIZE = 512;
const SUPERSAMPLE = 4;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'build', 'icon.png');

// Signed distance helpers (negative = inside).
const roundedRect = (x, y, cx, cy, halfW, halfH, radius) => {
  const qx = Math.abs(x - cx) - halfW + radius;
  const qy = Math.abs(y - cy) - halfH + radius;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
};
const circle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;
const capsule = (x, y, ax, ay, bx, by, r) => {
  const px = x - ax;
  const py = y - ay;
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - dx * t, py - dy * t) - r;
};

function background(x, y) {
  return roundedRect(x, y, 256, 256, 240, 240, 104) <= 0;
}

function foreground(x, y) {
  const ring = Math.max(circle(x, y, 256, 256, 176), -circle(x, y, 256, 256, 152)) <= 0;
  const fork =
    capsule(x, y, 214, 232, 214, 350, 12) <= 0 ||
    capsule(x, y, 196, 158, 196, 214, 6.5) <= 0 ||
    capsule(x, y, 214, 158, 214, 214, 6.5) <= 0 ||
    capsule(x, y, 232, 158, 232, 214, 6.5) <= 0 ||
    capsule(x, y, 196, 220, 232, 220, 11) <= 0;
  const knife = capsule(x, y, 298, 250, 298, 350, 12) <= 0 || capsule(x, y, 302, 164, 302, 250, 17) <= 0;
  return ring || fork || knife;
}

const pixels = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y += 1) {
  for (let x = 0; x < SIZE; x += 1) {
    let bg = 0;
    let fg = 0;
    for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
      for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
        const px = x + (sx + 0.5) / SUPERSAMPLE;
        const py = y + (sy + 0.5) / SUPERSAMPLE;
        if (background(px, py)) {
          bg += 1;
          if (foreground(px, py)) fg += 1;
        }
      }
    }
    const samples = SUPERSAMPLE * SUPERSAMPLE;
    const alpha = bg / samples;
    const mix = bg ? fg / bg : 0;
    const offset = (y * SIZE + x) * 4;
    for (let channel = 0; channel < 3; channel += 1) {
      pixels[offset + channel] = Math.round(BRAND_COLOR[channel] * (1 - mix) + FOREGROUND[channel] * mix);
    }
    pixels[offset + 3] = Math.round(alpha * 255);
  }
}

// --- Minimal PNG encoder (RGBA, filter 0) ---
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

const header = Buffer.alloc(13);
header.writeUInt32BE(SIZE, 0);
header.writeUInt32BE(SIZE, 4);
header[8] = 8; // bit depth
header[9] = 6; // RGBA
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y += 1) {
  raw[y * (SIZE * 4 + 1)] = 0;
  pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', header),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, png);
console.info(`Icon written: ${path.relative(root, output)} (${png.length} bytes)`);
