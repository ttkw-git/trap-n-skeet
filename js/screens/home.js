// ═══════════════════════════════════════════════
// screens/home.js — Home & Settings screens
// ═══════════════════════════════════════════════

import { loadSettings, saveSettings } from '../storage.js';

let selectedDiscipline     = null;
let selectedMode           = 'practice_25';
let selectedYardage        = 20;
let selectedPracticeConfig = null;  // { selectedStations, shotCount, skeetHouseSelection? }
let onStartCallback        = null;
let onHistoryCallback      = null;
let onAnalyticsCallback    = null;

// Station counts per discipline
const STATION_COUNTS = {
  american_trap: 5,
  handicap_trap: 5,
  skeet:         8,
  olympic_trap:  6,
};

export function initHome({ onStart, onHistory, onAnalytics }) {
  onStartCallback     = onStart;
  onHistoryCallback   = onHistory;
  onAnalyticsCallback = onAnalytics;

  // Discipline buttons
  document.querySelectorAll('.discipline-btn').forEach(btn => {
    btn.addEventListener('click', () => selectDiscipline(btn.dataset.discipline));
  });

  // Competition mode buttons (Olympic Trap practice_25 / competition_125; Skeet competition)
  document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => selectMode(btn.dataset.mode));
  });

  // American Trap sub-mode buttons (Standard vs Handicap — change selectedDiscipline)
  document.querySelectorAll('[data-set-discipline]').forEach(btn => {
    btn.addEventListener('click', () => selectAmericanMode(btn.dataset.setDiscipline));
  });

  // Station Practice buttons (data-show-practice="discipline_name")
  document.querySelectorAll('[data-show-practice]').forEach(btn => {
    btn.addEventListener('click', () => showStationPractice(btn.dataset.showPractice));
  });

  // Yardage stepper (Handicap mode)
  document.getElementById('yardage-dec').addEventListener('click', () => adjustYardage(-1));
  document.getElementById('yardage-inc').addEventListener('click', () => adjustYardage(+1));

  // Station Practice — shot count presets
  document.querySelectorAll('.practice-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => selectShotCountPreset(btn.dataset.count));
  });

  // Station Practice — custom shot count input
  document.getElementById('practice-custom-count').addEventListener('input', () => {
    updateShotCountFromInput();
  });

  // Station Practice — Select All / None
  document.getElementById('practice-select-all').addEventListener('click', () => {
    selectAllStations(true);
  });
  document.getElementById('practice-deselect-all').addEventListener('click', () => {
    selectAllStations(false);
  });

  // Start button
  document.getElementById('btn-start-round').addEventListener('click', () => {
    if (!selectedDiscipline) return;
    if (selectedMode === 'station_practice') {
      if (!isPracticeConfigValid()) return;
      onStartCallback({
        discipline:     selectedDiscipline,
        mode:           'station_practice',
        yardage:        null,
        practiceConfig: { ...selectedPracticeConfig },
      });
    } else {
      onStartCallback({ discipline: selectedDiscipline, mode: selectedMode, yardage: selectedYardage });
    }
  });

  // History / Analytics buttons
  document.getElementById('btn-history').addEventListener('click', onHistoryCallback);
  document.getElementById('btn-analytics').addEventListener('click', onAnalyticsCallback);

  // Settings
  document.getElementById('btn-settings').addEventListener('click', openSettings);
  document.getElementById('btn-settings-back').addEventListener('click', () => {
    saveCurrentSettings();
    import('../app.js').then(m => m.navigate('home'));
  });
  document.getElementById('input-name').addEventListener('change', saveCurrentSettings);
  document.getElementById('toggle-guidance').addEventListener('change', saveCurrentSettings);
}

export function onEnter() {
  selectedDiscipline     = null;
  selectedMode           = 'practice_25';
  selectedYardage        = 20;
  selectedPracticeConfig = null;

  document.querySelectorAll('.discipline-btn').forEach(b => b.classList.remove('selected'));

  // Hide all sub-selectors
  document.getElementById('american-mode-selector').classList.add('hidden');
  document.getElementById('handicap-yardage-selector').classList.add('hidden');
  document.getElementById('skeet-mode-selector').classList.add('hidden');
  document.getElementById('olympic-mode-selector').classList.add('hidden');
  document.getElementById('station-practice-selector').classList.add('hidden');
  document.getElementById('btn-start-round').classList.add('hidden');

  // Reset American mode toggle to "Standard"
  document.querySelectorAll('[data-set-discipline]').forEach(b => {
    b.classList.toggle('active', b.dataset.setDiscipline === 'american_trap');
  });

  // Reset Skeet competition button to active
  document.querySelectorAll('.mode-btn[data-mode="practice_25"]').forEach(b => {
    b.classList.add('active');
  });
  document.querySelectorAll('[data-show-practice]').forEach(b => b.classList.remove('active'));

  // Reset yardage stepper
  document.getElementById('yardage-value').textContent = '20 yd';
  document.getElementById('yardage-dec').disabled = false;
  document.getElementById('yardage-inc').disabled = false;

  // Load saved settings
  const settings = loadSettings();
  document.getElementById('input-name').value        = settings.shooterName || '';
  document.getElementById('toggle-guidance').checked = settings.showGuidance !== false;
}

// ── Discipline selection ───────────────────────

function selectDiscipline(discipline) {
  document.querySelectorAll('.discipline-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.discipline === discipline);
  });

  const americanSelector = document.getElementById('american-mode-selector');
  const skeetSelector    = document.getElementById('skeet-mode-selector');
  const olympicSelector  = document.getElementById('olympic-mode-selector');
  const handicapSelector = document.getElementById('handicap-yardage-selector');
  const practiceSelector = document.getElementById('station-practice-selector');

  // Hide all
  americanSelector.classList.add('hidden');
  skeetSelector.classList.add('hidden');
  olympicSelector.classList.add('hidden');
  handicapSelector.classList.add('hidden');
  practiceSelector.classList.add('hidden');

  if (discipline === 'american_trap') {
    americanSelector.classList.remove('hidden');
    selectAmericanMode('american_trap');
    selectedMode = 'practice_25';
  } else if (discipline === 'skeet') {
    skeetSelector.classList.remove('hidden');
    selectedDiscipline = 'skeet';
    selectedMode       = 'practice_25';
    document.body.dataset.discipline = 'skeet';
    // Reset Skeet mode: competition active, practice inactive
    skeetSelector.querySelectorAll('.mode-btn[data-mode]').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === 'practice_25');
    });
    skeetSelector.querySelectorAll('[data-show-practice]').forEach(b => b.classList.remove('active'));
  } else if (discipline === 'olympic_trap') {
    olympicSelector.classList.remove('hidden');
    selectedDiscipline = 'olympic_trap';
    selectedMode       = 'practice_25';
    document.body.dataset.discipline = 'olympic_trap';
    // Reset Olympic mode: practice_25 active
    olympicSelector.querySelectorAll('.mode-btn[data-mode]').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === 'practice_25');
    });
    olympicSelector.querySelectorAll('[data-show-practice]').forEach(b => b.classList.remove('active'));
  } else {
    selectedDiscipline = discipline;
    selectedMode       = 'practice_25';
    document.body.dataset.discipline = discipline;
  }

  document.getElementById('btn-start-round').classList.remove('hidden');
  document.getElementById('btn-start-round').disabled = false;
}

// Switches between "Standard" (american_trap) and "Handicap" (handicap_trap)
function selectAmericanMode(newDiscipline) {
  selectedDiscipline = newDiscipline;
  document.body.dataset.discipline = newDiscipline;

  document.querySelectorAll('[data-set-discipline]').forEach(b => {
    b.classList.toggle('active', b.dataset.setDiscipline === newDiscipline);
  });
  // Deactivate Station Practice button in the American group
  document.querySelectorAll('#american-mode-selector [data-show-practice]').forEach(b => {
    b.classList.remove('active');
  });

  const handicapSelector = document.getElementById('handicap-yardage-selector');
  const practiceSelector = document.getElementById('station-practice-selector');

  practiceSelector.classList.add('hidden');
  if (newDiscipline === 'handicap_trap') {
    handicapSelector.classList.remove('hidden');
    selectedMode = 'practice_25';
  } else {
    handicapSelector.classList.add('hidden');
    selectedMode = 'practice_25';
  }

  document.getElementById('btn-start-round').disabled = false;
}

function selectMode(mode) {
  selectedMode = mode;
  // Update active state only within the visible selector group
  document.querySelectorAll('.mode-btn[data-mode]').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  // Deactivate Station Practice buttons in all groups
  document.querySelectorAll('[data-show-practice]').forEach(b => b.classList.remove('active'));
  document.getElementById('station-practice-selector').classList.add('hidden');
  document.getElementById('btn-start-round').disabled = false;
}

// ── Station Practice ───────────────────────────

function showStationPractice(discipline) {
  selectedDiscipline = discipline;
  selectedMode       = 'station_practice';
  document.body.dataset.discipline = discipline;

  // Mark the Station Practice button as active, deactivate siblings
  document.querySelectorAll('.mode-btn[data-mode]').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('[data-set-discipline]').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('[data-show-practice]').forEach(b => {
    b.classList.toggle('active', b.dataset.showPractice === discipline);
  });

  // For American trap — deactivate Standard/Handicap discipline sub-buttons too
  if (discipline === 'american_trap') {
    document.getElementById('handicap-yardage-selector').classList.add('hidden');
  }

  buildStationSelector(discipline);
  document.getElementById('station-practice-selector').classList.remove('hidden');
  document.getElementById('btn-start-round').classList.remove('hidden');
  validatePractice();
}

function initPracticeConfig(discipline) {
  const count       = STATION_COUNTS[discipline] || 5;
  const allStations = Array.from({ length: count }, (_, i) => i + 1);

  selectedPracticeConfig = {
    selectedStations:    [...allStations],
    shotCount:           25,
    skeetHouseSelection: discipline === 'skeet'
      ? Object.fromEntries(allStations.map(s => [s, 'both']))
      : undefined,
  };
}

function buildStationSelector(discipline) {
  initPracticeConfig(discipline);

  const list    = document.getElementById('practice-station-list');
  list.innerHTML = '';

  const count   = STATION_COUNTS[discipline] || 5;
  const isSkeet = discipline === 'skeet';

  for (let st = 1; st <= count; st++) {
    const row     = document.createElement('div');
    row.className = 'practice-station-row';

    // Checkbox + label
    const labelEl     = document.createElement('label');
    labelEl.className = 'practice-station-label';

    const cb         = document.createElement('input');
    cb.type          = 'checkbox';
    cb.className     = 'practice-station-checkbox';
    cb.dataset.station = st;
    cb.checked       = true;

    const name         = document.createElement('span');
    name.className     = 'practice-station-name';
    name.textContent   = `Station ${st}`;

    labelEl.appendChild(cb);
    labelEl.appendChild(name);
    row.appendChild(labelEl);

    // House toggles (Skeet only)
    if (isSkeet) {
      const toggles     = document.createElement('div');
      toggles.className = 'practice-house-toggles';

      for (const [val, lbl] of [['high', 'HH'], ['both', 'Both'], ['low', 'LH']]) {
        const btn         = document.createElement('button');
        btn.className     = `practice-house-btn${val === 'both' ? ' active' : ''}`;
        btn.dataset.house = val;
        btn.textContent   = lbl;
        btn.addEventListener('click', () => {
          if (cb.disabled || !cb.checked) return;
          toggles.querySelectorAll('.practice-house-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (!selectedPracticeConfig.skeetHouseSelection) {
            selectedPracticeConfig.skeetHouseSelection = {};
          }
          selectedPracticeConfig.skeetHouseSelection[st] = val;
        });
        toggles.appendChild(btn);
      }

      row.appendChild(toggles);
    }

    // Wire checkbox change
    cb.addEventListener('change', () => {
      const station = Number(cb.dataset.station);
      if (cb.checked) {
        if (!selectedPracticeConfig.selectedStations.includes(station)) {
          selectedPracticeConfig.selectedStations.push(station);
          selectedPracticeConfig.selectedStations.sort((a, b) => a - b);
        }
        if (isSkeet) {
          row.querySelectorAll('.practice-house-btn').forEach(b => (b.disabled = false));
        }
      } else {
        selectedPracticeConfig.selectedStations =
          selectedPracticeConfig.selectedStations.filter(s => s !== station);
        if (isSkeet) {
          row.querySelectorAll('.practice-house-btn').forEach(b => (b.disabled = true));
        }
      }
      validatePractice();
    });

    list.appendChild(row);
  }

  // Reset shot count preset to 25
  selectShotCountPreset('25');
}

function selectAllStations(checked) {
  const count = STATION_COUNTS[selectedDiscipline] || 5;
  document.querySelectorAll('.practice-station-checkbox').forEach(cb => {
    cb.checked = checked;
    const row  = cb.closest('.practice-station-row');
    if (row) {
      row.querySelectorAll('.practice-house-btn').forEach(b => (b.disabled = !checked));
    }
  });
  selectedPracticeConfig.selectedStations = checked
    ? Array.from({ length: count }, (_, i) => i + 1)
    : [];
  validatePractice();
}

function selectShotCountPreset(val) {
  document.querySelectorAll('.practice-preset-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.count === val);
  });

  const customInput = document.getElementById('practice-custom-count');
  if (val === 'custom') {
    customInput.classList.remove('hidden');
    const v = parseInt(customInput.value, 10);
    selectedPracticeConfig.shotCount =
      Number.isFinite(v) && v > 0 ? Math.min(200, v) : 25;
  } else {
    customInput.classList.add('hidden');
    selectedPracticeConfig.shotCount = parseInt(val, 10);
  }
  validatePractice();
}

function updateShotCountFromInput() {
  const v = parseInt(document.getElementById('practice-custom-count').value, 10);
  selectedPracticeConfig.shotCount =
    Number.isFinite(v) && v > 0 ? Math.min(200, v) : 0;
  validatePractice();
}

function isPracticeConfigValid() {
  return selectedPracticeConfig &&
    selectedPracticeConfig.selectedStations.length > 0 &&
    selectedPracticeConfig.shotCount >= 1;
}

function validatePractice() {
  const valid    = isPracticeConfigValid();
  const msgEl    = document.getElementById('practice-validation-msg');
  const startBtn = document.getElementById('btn-start-round');
  msgEl.classList.toggle('hidden', valid);
  startBtn.disabled = !valid;
}

// ── Helpers ────────────────────────────────────

function openSettings() {
  import('../app.js').then(m => m.navigate('settings'));
}

function adjustYardage(delta) {
  selectedYardage = Math.min(27, Math.max(16, selectedYardage + delta));
  document.getElementById('yardage-value').textContent = `${selectedYardage} yd`;
  document.getElementById('yardage-dec').disabled = selectedYardage <= 16;
  document.getElementById('yardage-inc').disabled = selectedYardage >= 27;
}

function saveCurrentSettings() {
  const current = loadSettings();
  saveSettings({
    ...current,
    shooterName:  document.getElementById('input-name').value.trim(),
    showGuidance: document.getElementById('toggle-guidance').checked,
  });
}
