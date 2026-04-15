// ═══════════════════════════════════════════════
// export.js — round export helpers
// ═══════════════════════════════════════════════

import { disciplineLabel } from './utils.js';

export function downloadRoundsAsCSV(rounds) {
  const rows = [
    [
      'id',
      'discipline',
      'mode',
      'score',
      'maxScore',
      'percent',
      'startedAt',
      'completedAt',
      'hits',
      'misses',
      'optionShots'
    ]
  ];

  for (const round of rounds) {
    const hits = round.shots.filter(s => s.result === 'hit').length;
    const misses = round.shots.filter(s => s.result === 'miss').length;
    const optionShots = round.shots.filter(s => !!s.isOption).length;
    const percent = round.maxScore > 0 ? Math.round((round.score / round.maxScore) * 100) : 0;

    rows.push([
      round.id,
      disciplineLabel(round.discipline),
      round.mode,
      String(round.score),
      String(round.maxScore),
      String(percent),
      round.startedAt || '',
      round.completedAt || '',
      String(hits),
      String(misses),
      String(optionShots),
    ]);
  }

  const csv = rows.map(row => row.map(csvEscape).join(',')).join('\n');
  triggerDownload(csv, makeFilename('csv'), 'text/csv;charset=utf-8;');
}

export function downloadRoundsAsJSON(rounds) {
  const text = JSON.stringify(rounds, null, 2);
  triggerDownload(text, makeFilename('json'), 'application/json;charset=utf-8;');
}

function csvEscape(value) {
  const safe = String(value ?? '');
  if (safe.includes('"') || safe.includes(',') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function makeFilename(ext) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `trapnskeet-rounds-${stamp}.${ext}`;
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
