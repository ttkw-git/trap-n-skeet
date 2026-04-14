// ═══════════════════════════════════════════════
// screens/shooting.js — Active round screen
// ═══════════════════════════════════════════════

import { createRound, saveRound, loadSettings } from '../storage.js';
import { saveRoundToCloud } from '../sync.js';
import { disciplineLabel, vibrate, confirm } from '../utils.js';
import { AmericanTrapEngine, HandicapTrapEngine } from '../disciplines/american-trap.js';
import { SkeetEngine }        from '../disciplines/skeet.js';
import { OlympicTrapEngine }  from '../disciplines/olympic-trap.js';

let engine      = null;
let round       = null;
let activeYardage = null;
let onDoneCallback = null;

export function initShooting({ onDone }) {
  onDoneCallback = onDone;

  document.getElementById('btn-hit').addEventListener('click',  () => recordShot('hit'));
  document.getElementById('btn-miss').addEventListener('click', () => recordShot('miss'));
  document.getElementById('btn-undo').addEventListener('click', undoShot);
  document.getElementById('btn-end-round').addEventListener('click', endRoundEarly);
}

export function onEnter({ discipline, mode, yardage }) {
  activeYardage = yardage ?? null;

  // Create engine
  if (discipline === 'american_trap') {
    engine = new AmericanTrapEngine();
  } else if (discipline === 'handicap_trap') {
    engine = new HandicapTrapEngine(activeYardage);
  } else if (discipline === 'skeet') {
    engine = new SkeetEngine();
  } else {
    engine = new OlympicTrapEngine(mode);
  }

  // Create round object
  round = createRound(discipline, mode, activeYardage);

  // Update static labels
  const label = discipline === 'handicap_trap' && activeYardage
    ? `Handicap Trap · ${activeYardage} yd`
    : disciplineLabel(discipline);
  document.getElementById('shooting-discipline-label').textContent = label;
  document.getElementById('shooting-max').textContent = engine.total;
  document.body.dataset.discipline = discipline;

  renderShotUI();
}

function recordShot(result) {
  if (!engine || engine.isComplete()) return;

  // Haptic feedback
  vibrate(result === 'hit' ? 50 : [50, 30, 50]);

  const complete = engine.recordResult(result);

  // Sync to round object
  const { shots, score } = engine;
  round.shots = shots;
  round.score = score;
  saveRound(round);

  if (complete) {
    finishRound();
  } else {
    renderShotUI();
  }
}

function undoShot() {
  if (!engine) return;
  const success = engine.undoLast();
  if (!success) return;

  round.shots = engine.shots;
  round.score = engine.score;
  saveRound(round);

  renderShotUI();
}

async function endRoundEarly() {
  const ok = await confirm('End this round early? Your progress so far will be saved.');
  if (!ok) return;
  finishRound();
}

function finishRound() {
  round.completedAt = new Date().toISOString();
  round.score       = engine.score;
  round.shots       = engine.shots;
  saveRound(round);           // always save locally first
  saveRoundToCloud(round);    // push to Firestore (non-blocking, silent fail if offline)
  onDoneCallback({ round, engine });
}

function renderShotUI() {
  const progress = engine.getProgress();
  const shot     = engine.getCurrentShot();
  const settings = loadSettings();

  // Progress bar & label
  const pct = (progress.current / progress.total) * 100;
  document.getElementById('shooting-progress-fill').style.width = `${pct}%`;
  document.getElementById('shooting-progress-label').textContent =
    `Shot ${progress.current + 1} of ${progress.total}`;

  // Score
  document.getElementById('shooting-score').textContent = progress.score;

  if (!shot) return;

  // Station name
  document.getElementById('shot-station').textContent = `Station ${shot.station}`;

  // House label (Skeet only)
  const houseEl = document.getElementById('shot-house');
  if (shot.house) {
    houseEl.textContent = shot.house === 'high_house' ? 'High House' : 'Low House';
  } else {
    houseEl.textContent = '';
  }

  // Shot type badge
  const typeEl = document.getElementById('shot-type-badge');
  const isDouble = shot.type === 'double_first' || shot.type === 'double_second';
  if (isDouble) {
    typeEl.textContent = shot.type === 'double_first' ? 'Double — First Bird' : 'Double — Second Bird';
    typeEl.classList.add('double');
  } else {
    typeEl.textContent = 'Single Target';
    typeEl.classList.remove('double');
  }

  // Option banner (Skeet)
  const optionBanner = document.getElementById('option-banner');
  if (shot.isOption) {
    optionBanner.classList.remove('hidden');
  } else {
    optionBanner.classList.add('hidden');
  }

  // Guidance text
  const guidanceBox  = document.getElementById('guidance-box');
  const guidanceText = document.getElementById('guidance-text');
  if (settings.showGuidance !== false) {
    guidanceText.textContent = engine.getCurrentGuidance();
    guidanceBox.classList.remove('hidden');
  } else {
    guidanceBox.classList.add('hidden');
  }

  // Station diagram
  renderDiagram(shot);

  // Undo button — enable if there's something to undo
  document.getElementById('btn-undo').disabled = (engine._snapshots.length === 0);
}

// ── Station Diagrams (SVG) ─────────────────────

function renderDiagram(shot) {
  const el   = document.getElementById('station-diagram');
  const disc = round.discipline;

  if (disc === 'american_trap' || disc === 'handicap_trap') {
    el.innerHTML = buildTrapDiagram(shot.station, 5);
  } else if (disc === 'skeet') {
    el.innerHTML = buildSkeetDiagram(shot);
  } else {
    el.innerHTML = buildTrapDiagram(shot.station, 6);
  }
}

function buildTrapDiagram(activeStation, stationCount) {
  const w = 320, h = 120;
  const stationW = w / (stationCount + 1);
  const stationY = 80;
  const trapY    = 30;

  let stationCircles = '';
  for (let i = 1; i <= stationCount; i++) {
    const x    = stationW * i;
    const isActive = i === activeStation;
    stationCircles += `
      <circle cx="${x}" cy="${stationY}" r="${isActive ? 14 : 10}"
        fill="${isActive ? 'var(--accent-current)' : 'var(--bg-elevated)'}"
        stroke="${isActive ? 'var(--accent-current)' : 'var(--border-color)'}"
        stroke-width="2"/>
      <text x="${x}" y="${stationY + 5}" text-anchor="middle"
        fill="${isActive ? '#fff' : 'var(--text-muted)'}"
        font-size="${isActive ? 13 : 11}" font-weight="bold">${i}</text>
      ${isActive ? `<line x1="${x}" y1="${stationY - 14}" x2="${w/2}" y2="${trapY + 8}"
        stroke="var(--accent-current)" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.6"/>` : ''}
    `;
  }

  return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <!-- Trap house -->
      <rect x="${w/2 - 20}" y="${trapY - 10}" width="40" height="20" rx="4"
        fill="var(--bg-elevated)" stroke="var(--border-color)" stroke-width="1.5"/>
      <text x="${w/2}" y="${trapY + 5}" text-anchor="middle"
        fill="var(--text-muted)" font-size="9">TRAP</text>
      <!-- Station line -->
      <line x1="${stationW * 0.5}" y1="${stationY}" x2="${stationW * (stationCount + 0.5)}" y2="${stationY}"
        stroke="var(--border-color)" stroke-width="1.5"/>
      ${stationCircles}
    </svg>
  `;
}

function buildSkeetDiagram(shot) {
  // Real skeet layout (matches reference diagram):
  //   TOP baseline:  HH — St.1 — St.8 — St.7 — LH
  //   Arc curves DOWNWARD: St.1 → St.2 → St.3 → St.4(bottom) → St.5 → St.6 → St.7
  const w = 320, h = 172;
  const cx = 160, cy = 36;  // arc center near top
  const r  = 108;           // St.4 lands at y = 36+108 = 144

  // Stations 1-7: angles decrease 180°→0° so y = cy + r*sin(θ) goes DOWN
  const stationPos = {};
  for (let i = 1; i <= 7; i++) {
    const deg = 180 - (i - 1) * 30;  // 180,150,120,90,60,30,0
    const rad = (deg * Math.PI) / 180;
    stationPos[i] = {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),  // +sin → downward in SVG coords
    };
  }
  // Station 8: center of the top baseline (between HH and LH)
  stationPos[8] = { x: cx, y: cy };

  // Houses flank the top baseline
  const boxW = 36, boxH = 20;
  const hhX = 4,      hhY = cy - 14;  // left of St.1, slightly above baseline
  const lhX = w - 40, lhY = cy - 14;  // right of St.7

  const hhActive = shot.house === 'high_house';
  const lhActive = shot.house === 'low_house';

  // Dashed flight line from active house to active station
  const sp  = stationPos[shot.station];
  const hhCx = hhX + boxW / 2, hhCy = hhY + boxH / 2;
  const lhCx = lhX + boxW / 2, lhCy = lhY + boxH / 2;
  const flightLine = hhActive
    ? `<line x1="${hhCx}" y1="${hhCy}" x2="${sp.x.toFixed(1)}" y2="${sp.y.toFixed(1)}"
         stroke="var(--accent-current)" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.55"/>`
    : lhActive
    ? `<line x1="${lhCx}" y1="${lhCy}" x2="${sp.x.toFixed(1)}" y2="${sp.y.toFixed(1)}"
         stroke="var(--accent-current)" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.55"/>`
    : '';

  let circles = '';
  for (let i = 1; i <= 8; i++) {
    const { x, y } = stationPos[i];
    const isActive = i === shot.station;
    circles += `
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isActive ? 13 : 9}"
        fill="${isActive ? 'var(--accent-current)' : 'var(--bg-elevated)'}"
        stroke="${isActive ? 'var(--accent-current)' : 'var(--border-color)'}"
        stroke-width="2"/>
      <text x="${x.toFixed(1)}" y="${(y + 4.5).toFixed(1)}" text-anchor="middle"
        fill="${isActive ? '#fff' : 'var(--text-muted)'}"
        font-size="${isActive ? 12 : 10}" font-weight="bold">${i}</text>
    `;
  }

  const arcX1 = (cx - r).toFixed(1);  // St.1 x = 52
  const arcX2 = (cx + r).toFixed(1);  // St.7 x = 268

  return `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <!-- Top baseline (dashed, St.1 through St.8 to St.7) -->
      <line x1="${arcX1}" y1="${cy}" x2="${arcX2}" y2="${cy}"
        stroke="var(--border-color)" stroke-width="1" stroke-dasharray="3,4" opacity="0.4"/>
      <!-- Arc curving DOWN: St.1 → St.4(bottom) → St.7, sweep=0 = counter-clockwise = downward -->
      <path d="M ${arcX1} ${cy} A ${r} ${r} 0 0 0 ${arcX2} ${cy}"
        fill="none" stroke="var(--border-color)" stroke-width="1.5"/>
      <!-- Flight line -->
      ${flightLine}
      <!-- High House (top-left, beside St.1) -->
      <rect x="${hhX}" y="${hhY}" width="${boxW}" height="${boxH}" rx="4"
        fill="${hhActive ? 'var(--accent-current)' : 'var(--bg-elevated)'}"
        stroke="${hhActive ? 'var(--accent-current)' : 'var(--border-color)'}" stroke-width="1.5"/>
      <text x="${hhX + boxW / 2}" y="${hhY + 14}" text-anchor="middle"
        fill="${hhActive ? '#fff' : 'var(--text-muted)'}" font-size="9" font-weight="bold">HH</text>
      <!-- Low House (top-right, beside St.7) -->
      <rect x="${lhX}" y="${lhY}" width="${boxW}" height="${boxH}" rx="4"
        fill="${lhActive ? 'var(--accent-current)' : 'var(--bg-elevated)'}"
        stroke="${lhActive ? 'var(--accent-current)' : 'var(--border-color)'}" stroke-width="1.5"/>
      <text x="${lhX + boxW / 2}" y="${lhY + 14}" text-anchor="middle"
        fill="${lhActive ? '#fff' : 'var(--text-muted)'}" font-size="9" font-weight="bold">LH</text>
      <!-- Stations (drawn last → on top of arc) -->
      ${circles}
    </svg>
  `;
}
