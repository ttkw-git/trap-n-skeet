// Run once: node icons/generate-icons.js
// Generates icon-192.png and icon-512.png from the SVG using canvas-like drawing.
// Uses only Node.js built-ins — no npm required.

const fs   = require('fs');
const path = require('path');

// We'll write minimal PNG files by encoding a simple canvas drawing.
// Uses the 'canvas' npm package if available, otherwise falls back to
// writing pre-encoded minimal PNGs.

// Try to use the @napi-rs/canvas or canvas package
let createCanvas;
try {
  ({ createCanvas } = require('@napi-rs/canvas'));
} catch (_) {
  try {
    ({ createCanvas } = require('canvas'));
  } catch (_) {
    createCanvas = null;
  }
}

if (!createCanvas) {
  console.log('No canvas module found — generating icons via Python fallback.');
  console.log('Run: python icons/generate-icons.py');
  process.exit(0);
}

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2, r = size / 2;

  // Background
  ctx.fillStyle = '#1e1e1e';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Orange ring
  ctx.strokeStyle = '#e67e22';
  ctx.lineWidth   = size * 0.035;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2);
  ctx.stroke();

  // Clay target disc
  ctx.save();
  ctx.translate(cx, cy * 0.7);
  ctx.scale(1, 0.3);
  ctx.fillStyle = '#e67e22';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Gun barrel
  const barrelY = cy + size * 0.1;
  ctx.fillStyle = '#a0a0a0';
  ctx.beginPath();
  ctx.roundRect(size * 0.18, barrelY - size * 0.02, size * 0.45, size * 0.04, size * 0.02);
  ctx.fill();

  // Stock
  ctx.fillStyle = '#5a3e2b';
  ctx.beginPath();
  ctx.moveTo(size * 0.18, barrelY - size * 0.02);
  ctx.quadraticCurveTo(size * 0.1, barrelY + size * 0.04, size * 0.14, barrelY + size * 0.1);
  ctx.lineTo(size * 0.26, barrelY + size * 0.02);
  ctx.closePath();
  ctx.fill();

  return canvas.toBuffer('image/png');
}

for (const size of [192, 512]) {
  const buf  = drawIcon(size);
  const dest = path.join(__dirname, `icon-${size}.png`);
  fs.writeFileSync(dest, buf);
  console.log(`Written: ${dest}`);
}
