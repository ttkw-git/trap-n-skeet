// ═══════════════════════════════════════════════
// screens/analytics.js — Trend + station analytics
// ═══════════════════════════════════════════════

import { getTrendPoints, getStationPerformance } from '../storage.js';
import { disciplineLabel } from '../utils.js';

let onBackCallback = null;

const state = {
  discipline: 'all',
  window: '30',
};

export function initAnalytics({ onBack }) {
  onBackCallback = onBack;

  document.getElementById('btn-analytics-back').addEventListener('click', onBackCallback);
  document.getElementById('analytics-discipline').addEventListener('change', (e) => {
    state.discipline = e.target.value;
    renderAnalytics();
  });
  document.getElementById('analytics-window').addEventListener('change', (e) => {
    state.window = e.target.value;
    renderAnalytics();
  });
}

export function onEnter() {
  document.getElementById('analytics-discipline').value = state.discipline;
  document.getElementById('analytics-window').value = state.window;
  renderAnalytics();
}

function renderAnalytics() {
  const trend = getTrendPoints({ discipline: state.discipline, days: state.window });
  const stationPerf = getStationPerformance({ discipline: state.discipline, days: state.window });

  renderTrend(trend);
  renderStationBars(stationPerf);

  if (state.discipline !== 'all') {
    document.body.dataset.discipline = state.discipline;
  }
}

function renderTrend(points) {
  const chart = document.getElementById('analytics-trend-chart');
  const empty = document.getElementById('analytics-trend-empty');

  if (points.length < 2) {
    chart.classList.add('hidden');
    empty.classList.remove('hidden');
    chart.innerHTML = '';
    return;
  }

  empty.classList.add('hidden');
  chart.classList.remove('hidden');

  const width = 320;
  const height = 160;
  const left = 24;
  const right = 12;
  const top = 12;
  const bottom = 20;
  const drawWidth = width - left - right;
  const drawHeight = height - top - bottom;

  const stepX = points.length > 1 ? drawWidth / (points.length - 1) : 0;
  const toY = (pct) => top + ((100 - pct) / 100) * drawHeight;

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${left + (i * stepX)} ${toY(p.percent)}`)
    .join(' ');

  const circles = points
    .map((p, i) => {
      const x = left + (i * stepX);
      const y = toY(p.percent);
      const title = `${new Date(p.date).toLocaleDateString()} · ${p.score}/${p.maxScore} (${p.percent}%)`;
      return `<g><title>${escapeXml(title)}</title><circle cx="${x}" cy="${y}" r="3"></circle></g>`;
    })
    .join('');

  chart.innerHTML = `
    <line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}" class="chart-axis"></line>
    <line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}" class="chart-axis"></line>
    <line x1="${left}" y1="${top + (drawHeight * 0.25)}" x2="${width - right}" y2="${top + (drawHeight * 0.25)}" class="chart-grid"></line>
    <line x1="${left}" y1="${top + (drawHeight * 0.5)}" x2="${width - right}" y2="${top + (drawHeight * 0.5)}" class="chart-grid"></line>
    <line x1="${left}" y1="${top + (drawHeight * 0.75)}" x2="${width - right}" y2="${top + (drawHeight * 0.75)}" class="chart-grid"></line>
    <path d="${path}" class="trend-line"></path>
    ${circles}
  `;
}

function renderStationBars(rows) {
  const empty = document.getElementById('analytics-station-empty');
  const wrap = document.getElementById('analytics-station-bars');

  wrap.innerHTML = '';
  if (rows.length === 0) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  for (const row of rows) {
    const el = document.createElement('div');
    el.className = 'station-bar-row';

    const disciplineText = state.discipline === 'all' ? '' : ` · ${disciplineLabel(state.discipline)}`;

    el.innerHTML = `
      <div class="station-bar-head">
        <span>St ${row.station}${disciplineText}</span>
        <span>${row.hits}/${row.total} (${row.percent}%)</span>
      </div>
      <div class="station-bar-track">
        <div class="station-bar-fill" style="width:${Math.max(0, Math.min(100, row.percent))}%"></div>
      </div>
    `;

    wrap.appendChild(el);
  }
}

function escapeXml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
