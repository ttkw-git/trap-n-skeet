// ═══════════════════════════════════════════════
// screens/summary.js — Post-round summary screen
// ═══════════════════════════════════════════════

import { disciplineLabel, formatPercent, getRating } from '../utils.js';

let onShootAgainCallback = null;
let onHistoryCallback    = null;

export function initSummary({ onShootAgain, onHistory }) {
  onShootAgainCallback = onShootAgain;
  onHistoryCallback    = onHistory;

  document.getElementById('btn-shoot-again').addEventListener('click', onShootAgainCallback);
  document.getElementById('btn-go-history').addEventListener('click', onHistoryCallback);
}

export function onEnter({ round, engine }) {
  const { discipline, score, maxScore } = round;
  const pct = formatPercent(score, maxScore);

  const disciplineDisplay = discipline === 'handicap_trap' && round.yardage
    ? `Handicap Trap · ${round.yardage} yd`
    : disciplineLabel(discipline);
  document.getElementById('summary-discipline').textContent = disciplineDisplay;
  document.getElementById('summary-score').textContent      = score;
  document.getElementById('summary-max').textContent        = maxScore;
  document.getElementById('summary-percent').textContent    = pct;
  document.getElementById('summary-rating').textContent     = getRating(score, maxScore);
  document.body.dataset.discipline                          = discipline;

  // Build station breakdown
  const breakdown = engine.getStationBreakdown();
  const container = document.getElementById('summary-breakdown');
  container.innerHTML = '';

  for (const station of breakdown) {
    const row    = document.createElement('div');
    row.className = 'breakdown-row';

    const label = document.createElement('div');
    label.className   = 'breakdown-station';
    label.textContent = station.label;

    const dots = document.createElement('div');
    dots.className = 'breakdown-dots';
    for (const s of station.shots) {
      const dot = document.createElement('div');
      dot.className = `dot ${s.result}`;
      if (s.isOption) dot.classList.add('option');
      dot.title = s.isOption ? `Option reshoot: ${s.result}` : s.result;
      dots.appendChild(dot);
    }

    const frac = document.createElement('div');
    frac.className   = `breakdown-fraction${station.hits === station.total ? ' perfect' : ''}`;
    frac.textContent = `${station.hits}/${station.total}`;

    row.appendChild(label);
    row.appendChild(dots);
    row.appendChild(frac);
    container.appendChild(row);
  }
}
