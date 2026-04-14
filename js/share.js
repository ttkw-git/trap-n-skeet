// ═══════════════════════════════════════════════
// share.js — Scorecard PNG generation + share/download
// ═══════════════════════════════════════════════

import { disciplineLabel, formatDate, formatPercent, getRating } from './utils.js';

const W = 400;

const ACCENT = {
  american_trap: '#e67e22',
  skeet:         '#2980b9',
  olympic_trap:  '#8e44ad',
  handicap_trap: '#d4a017',
};

const HIT_COLOR  = '#27ae60';
const MISS_COLOR = '#c0392b';

function getAccentColor(discipline) {
  return ACCENT[discipline] || '#e67e22';
}

function getDisciplineDisplay(round) {
  if (round.discipline === 'handicap_trap' && round.yardage) {
    return `Handicap Trap · ${round.yardage} yd`;
  }
  return disciplineLabel(round.discipline);
}

function drawDivider(ctx, y) {
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, y);
  ctx.lineTo(W - 20, y);
  ctx.stroke();
}

export async function shareRoundAsImage(round, engine) {
  const breakdown   = engine.getStationBreakdown();
  const HEADER_H    = 228;
  const ROW_H       = 44;
  const FOOTER_H    = 52;
  const H           = HEADER_H + breakdown.length * ROW_H + FOOTER_H;

  const canvas  = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx     = canvas.getContext('2d');

  const accent = getAccentColor(round.discipline);

  // ── Background ──────────────────────────────────────────────────
  ctx.fillStyle = '#141414';
  ctx.fillRect(0, 0, W, H);

  // ── Accent top bar ───────────────────────────────────────────────
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 5);

  // ── App name ─────────────────────────────────────────────────────
  ctx.fillStyle    = '#606060';
  ctx.font         = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TRAP N SKEET', W / 2, 30);

  // ── Discipline label ──────────────────────────────────────────────
  ctx.fillStyle = accent;
  ctx.font      = '600 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(getDisciplineDisplay(round), W / 2, 56);

  // ── Score ─────────────────────────────────────────────────────────
  const scoreStr = String(round.score);
  const maxStr   = String(round.maxScore);
  const divStr   = '/';

  ctx.font      = 'bold 58px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#f2f2f2';
  const scoreW  = ctx.measureText(scoreStr).width;

  ctx.font      = '300 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#606060';
  const divW    = ctx.measureText(divStr).width;

  ctx.font      = '300 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const maxW    = ctx.measureText(maxStr).width;

  const totalW  = scoreW + 8 + divW + 8 + maxW;
  const startX  = (W - totalW) / 2;
  const scoreY  = 124;

  ctx.textAlign    = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.font      = 'bold 58px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#f2f2f2';
  ctx.fillText(scoreStr, startX, scoreY);

  ctx.font      = '300 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#606060';
  ctx.fillText(divStr, startX + scoreW + 8, scoreY - 2);

  ctx.fillText(maxStr, startX + scoreW + 8 + divW + 8, scoreY - 2);

  // ── Percentage ────────────────────────────────────────────────────
  ctx.font         = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle    = '#a0a0a0';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatPercent(round.score, round.maxScore), W / 2, 156);

  // ── Rating ────────────────────────────────────────────────────────
  ctx.font      = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#a0a0a0';
  ctx.fillText(getRating(round.score, round.maxScore), W / 2, 183);

  // ── Divider ───────────────────────────────────────────────────────
  drawDivider(ctx, 205);

  // ── Station rows ──────────────────────────────────────────────────
  const DOT_R  = 6;
  const DOT_GAP = 4;

  for (let i = 0; i < breakdown.length; i++) {
    const station = breakdown[i];
    const rowY    = HEADER_H + i * ROW_H;
    const midY    = rowY + ROW_H / 2;

    // Station label
    ctx.font         = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle    = '#a0a0a0';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(station.label, 20, midY);

    // Dots
    const dotStep = DOT_R * 2 + DOT_GAP;
    const dotStartX = 110;
    for (let j = 0; j < station.shots.length; j++) {
      const s  = station.shots[j];
      const cx = dotStartX + j * dotStep + DOT_R;
      ctx.beginPath();
      ctx.arc(cx, midY, DOT_R, 0, Math.PI * 2);
      ctx.fillStyle = s.result === 'hit' ? HIT_COLOR : MISS_COLOR;
      ctx.fill();
    }

    // Fraction
    const isPerfect = station.hits === station.total;
    ctx.font         = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle    = isPerfect ? HIT_COLOR : '#a0a0a0';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${station.hits}/${station.total}`, W - 20, midY);
  }

  // ── Footer divider ────────────────────────────────────────────────
  const footerDivY = HEADER_H + breakdown.length * ROW_H + 4;
  drawDivider(ctx, footerDivY);

  // ── Footer date ───────────────────────────────────────────────────
  ctx.font         = '400 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle    = '#606060';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  const footerY    = footerDivY + (FOOTER_H - 4) / 2;
  ctx.fillText(`${formatDate(round.completedAt || round.startedAt)} · Trap N Skeet`, W / 2, footerY);

  // ── Export ────────────────────────────────────────────────────────
  const filename = `trapnskeet-${round.discipline}-${(round.startedAt || '').slice(0, 10)}.png`;

  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], filename, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${getDisciplineDisplay(round)} — ${round.score}/${round.maxScore}`,
        });
        return;
      } catch (_) {
        // User cancelled or share failed — fall through to download
      }
    }

    // Download fallback
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
