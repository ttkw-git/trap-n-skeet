// ═══════════════════════════════════════════════
// screens/history.js — History screen
// ═══════════════════════════════════════════════

import { loadAllRounds, clearAllRounds } from '../storage.js';
import { disciplineLabel, disciplineDotColor, formatDate, formatPercent, confirm } from '../utils.js';

let onBackCallback = null;

export function initHistory({ onBack }) {
  onBackCallback = onBack;
  document.getElementById('btn-history-back').addEventListener('click', onBackCallback);
  document.getElementById('btn-clear-history').addEventListener('click', handleClear);
}

export function onEnter() {
  renderHistory();
}

function renderHistory() {
  const all    = loadAllRounds().filter(r => r.completedAt);
  const list   = document.getElementById('history-list');
  const empty  = document.getElementById('history-empty');
  const stats  = document.getElementById('history-stats');
  const clearBtn = document.getElementById('btn-clear-history');

  list.innerHTML  = '';
  stats.innerHTML = '';

  if (all.length === 0) {
    empty.classList.remove('hidden');
    clearBtn.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  clearBtn.classList.remove('hidden');

  // ── Stats chips ──────────────────────────────
  const disciplines = ['american_trap', 'skeet', 'olympic_trap'];
  for (const disc of disciplines) {
    const rounds = all.filter(r => r.discipline === disc && r.maxScore <= 25);
    if (rounds.length === 0) continue;

    const avg = rounds.reduce((sum, r) => sum + r.score, 0) / rounds.length;
    const best = Math.max(...rounds.map(r => r.score));

    const chip = document.createElement('div');
    chip.className = 'stat-chip';
    chip.innerHTML = `
      <div class="stat-chip-label">${disciplineLabel(disc)}</div>
      <div class="stat-chip-value">${best}/25</div>
      <div class="stat-chip-sub">Best · Avg ${avg.toFixed(1)}</div>
    `;
    stats.appendChild(chip);
  }

  // ── Round list (most recent first) ───────────
  const sorted = [...all].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

  for (const round of sorted) {
    const item = buildHistoryItem(round);
    list.appendChild(item);
  }
}

function buildHistoryItem(round) {
  const pct  = formatPercent(round.score, round.maxScore);
  const date = formatDate(round.startedAt);
  const color = disciplineDotColor(round.discipline);

  const item = document.createElement('div');
  item.className = 'history-item';

  item.innerHTML = `
    <div class="history-item-header">
      <div class="history-discipline-dot" style="background:${color}"></div>
      <div class="history-item-info">
        <div class="history-item-title">${disciplineLabel(round.discipline)}${round.mode === 'competition_125' ? ' (125)' : ''}</div>
        <div class="history-item-date">${date}</div>
      </div>
      <div>
        <div class="history-item-score">${round.score}/${round.maxScore}</div>
        <div class="history-item-pct">${pct}</div>
      </div>
      <div class="history-expand-icon">▼</div>
    </div>
    <div class="history-item-detail">
      ${buildDetailDots(round)}
    </div>
  `;

  item.querySelector('.history-item-header').addEventListener('click', () => {
    item.classList.toggle('expanded');
  });

  return item;
}

function buildDetailDots(round) {
  // Group shots by station
  const stationMap = {};
  for (const s of round.shots) {
    const key = s.station;
    if (!stationMap[key]) stationMap[key] = [];
    stationMap[key].push(s);
  }

  let html = '<div class="summary-breakdown" style="background:transparent;padding:0;">';
  for (const [st, shots] of Object.entries(stationMap)) {
    const hits  = shots.filter(s => s.result === 'hit').length;
    const total = shots.length;
    const dotsHtml = shots.map(s => {
      const optClass = s.isOption ? ' option' : '';
      return `<div class="dot ${s.result}${optClass}" title="${s.isOption ? 'Option reshoot: ' : ''}${s.result}"></div>`;
    }).join('');

    html += `
      <div class="breakdown-row">
        <div class="breakdown-station">St. ${st}</div>
        <div class="breakdown-dots">${dotsHtml}</div>
        <div class="breakdown-fraction${hits === total ? ' perfect' : ''}">${hits}/${total}</div>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

async function handleClear() {
  const ok = await confirm('Delete all history? This cannot be undone.');
  if (!ok) return;
  clearAllRounds();
  renderHistory();
}
