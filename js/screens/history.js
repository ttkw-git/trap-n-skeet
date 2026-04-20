// ═══════════════════════════════════════════════
// screens/history.js — History screen
// ═══════════════════════════════════════════════

import { loadAllRounds, clearAllRounds } from '../storage.js';
import { disciplineLabel, disciplineDotColor, formatDate, formatPercent, confirm, escapeHtml } from '../utils.js';
import { downloadRoundsAsCSV, downloadRoundsAsJSON } from '../export.js';
import { clearAllRoundsFromCloud } from '../sync.js';

let onBackCallback = null;
let filteredRounds = [];

const filterState = {
  discipline:      'all',
  from:            '',
  to:              '',
  minPct:          '',
  query:           '',
  includePractice: false,
};

export function initHistory({ onBack }) {
  onBackCallback = onBack;
  document.getElementById('btn-history-back').addEventListener('click', onBackCallback);
  document.getElementById('btn-clear-history').addEventListener('click', handleClear);
  document.getElementById('btn-history-clear-filters').addEventListener('click', resetFilters);
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    if (filteredRounds.length > 0) downloadRoundsAsCSV(filteredRounds);
  });
  document.getElementById('btn-export-json').addEventListener('click', () => {
    if (filteredRounds.length > 0) downloadRoundsAsJSON(filteredRounds);
  });
  document.getElementById('history-filter-practice').addEventListener('change', (e) => {
    filterState.includePractice = e.target.checked;
    renderHistory();
  });

  bindFilterInputs();
}

export function onEnter() {
  renderHistory();
}

function renderHistory() {
  const all    = loadAllRounds().filter(r => r.completedAt);
  filteredRounds = applyFilters(all);

  const list   = document.getElementById('history-list');
  const empty  = document.getElementById('history-empty');
  const stats  = document.getElementById('history-stats');
  const clearBtn = document.getElementById('btn-clear-history');
  const exportCsvBtn = document.getElementById('btn-export-csv');
  const exportJsonBtn = document.getElementById('btn-export-json');

  list.innerHTML  = '';
  stats.innerHTML = '';

  if (all.length === 0) {
    empty.classList.remove('hidden');
    empty.innerHTML = '<p>No rounds recorded yet.</p><p>Start a round to see your history here.</p>';
    clearBtn.classList.add('hidden');
    exportCsvBtn.disabled = true;
    exportJsonBtn.disabled = true;
    return;
  }

  empty.classList.add('hidden');
  clearBtn.classList.remove('hidden');
  exportCsvBtn.disabled = filteredRounds.length === 0;
  exportJsonBtn.disabled = filteredRounds.length === 0;

  if (filteredRounds.length === 0) {
    empty.classList.remove('hidden');
    empty.innerHTML = '<p>No rounds match your filters.</p><p>Reset filters to see all rounds.</p>';
    return;
  }

  // ── Stats chips ──────────────────────────────
  const disciplines = ['american_trap', 'skeet', 'olympic_trap', 'handicap_trap'];
  for (const disc of disciplines) {
    const rounds = filteredRounds.filter(r =>
      r.discipline === disc && r.maxScore <= 25 && r.mode !== 'station_practice');
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
  const sorted = [...filteredRounds].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

  for (const round of sorted) {
    const item = buildHistoryItem(round);
    list.appendChild(item);
  }
}

function bindFilterInputs() {
  const discipline = document.getElementById('history-filter-discipline');
  const from = document.getElementById('history-filter-from');
  const to = document.getElementById('history-filter-to');
  const minPct = document.getElementById('history-filter-min-pct');
  const query = document.getElementById('history-filter-query');

  discipline.addEventListener('change', () => {
    filterState.discipline = discipline.value;
    renderHistory();
  });
  from.addEventListener('change', () => {
    filterState.from = from.value;
    renderHistory();
  });
  to.addEventListener('change', () => {
    filterState.to = to.value;
    renderHistory();
  });
  minPct.addEventListener('input', () => {
    filterState.minPct = minPct.value;
    renderHistory();
  });
  query.addEventListener('input', () => {
    filterState.query = query.value.trim().toLowerCase();
    renderHistory();
  });
}

function resetFilters() {
  filterState.discipline      = 'all';
  filterState.from            = '';
  filterState.to              = '';
  filterState.minPct          = '';
  filterState.query           = '';
  filterState.includePractice = false;

  document.getElementById('history-filter-discipline').value = 'all';
  document.getElementById('history-filter-from').value      = '';
  document.getElementById('history-filter-to').value        = '';
  document.getElementById('history-filter-min-pct').value   = '';
  document.getElementById('history-filter-query').value     = '';
  document.getElementById('history-filter-practice').checked = false;

  renderHistory();
}

function applyFilters(rounds) {
  const minPct = Number(filterState.minPct);
  const hasMinPct = Number.isFinite(minPct) && filterState.minPct !== '';
  const fromDate = filterState.from ? new Date(`${filterState.from}T00:00:00`).getTime() : null;
  const toDate = filterState.to ? new Date(`${filterState.to}T23:59:59`).getTime() : null;

  return rounds.filter(round => {
    if (!filterState.includePractice && round.mode === 'station_practice') return false;
    if (filterState.discipline !== 'all' && round.discipline !== filterState.discipline) {
      return false;
    }

    const startedAt = new Date(round.startedAt).getTime();
    if (fromDate && startedAt < fromDate) return false;
    if (toDate && startedAt > toDate) return false;

    if (hasMinPct) {
      const pct = round.maxScore > 0 ? Math.round((round.score / round.maxScore) * 100) : 0;
      if (pct < minPct) return false;
    }

    if (filterState.query) {
      const haystack = `${disciplineLabel(round.discipline)} ${round.mode}`.toLowerCase();
      if (!haystack.includes(filterState.query)) return false;
    }

    return true;
  });
}

function buildHistoryItem(round) {
  const pct   = formatPercent(round.score, round.maxScore);
  const date  = formatDate(round.startedAt);
  const color = disciplineDotColor(round.discipline);
  const isPractice = round.mode === 'station_practice';

  // Build title string
  let titleText;
  if (isPractice) {
    // Coerce to integers to guard against stored data injection into innerHTML
    const stations = (round.practiceConfig?.selectedStations || [])
      .map(Number)
      .filter(n => Number.isFinite(n) && n > 0)
      .join(', ');
    titleText = `${disciplineLabel(round.discipline)} · Sts. ${stations}`;
  } else if (round.discipline === 'handicap_trap' && round.yardage) {
    const yardage = Number(round.yardage);
    titleText = `Handicap Trap · ${Number.isFinite(yardage) ? yardage : '?'} yd`;
  } else {
    titleText = `${disciplineLabel(round.discipline)}${round.mode === 'competition_125' ? ' (125)' : ''}`;
  }

  const practiceBadge = isPractice
    ? `<span class="practice-badge">Practice</span>`
    : '';

  const item = document.createElement('div');
  item.className = 'history-item';

  item.innerHTML = `
    <div class="history-item-header">
      <div class="history-discipline-dot" style="background:${color}"></div>
      <div class="history-item-info">
        <div class="history-item-title">${escapeHtml(titleText)}${practiceBadge}</div>
        <div class="history-item-date">${escapeHtml(date)}</div>
      </div>
      <div>
        <div class="history-item-score">${escapeHtml(round.score)}/${escapeHtml(round.maxScore)}</div>
        <div class="history-item-pct">${escapeHtml(pct)}</div>
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
      const resultClass = s.result === 'hit' ? 'hit' : 'miss';
      const title = s.isOption ? `Option reshoot: ${resultClass}` : resultClass;
      return `<div class="dot ${resultClass}${optClass}" title="${title}"></div>`;
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
  await clearAllRoundsFromCloud();
  renderHistory();
}
