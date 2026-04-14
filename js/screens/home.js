// ═══════════════════════════════════════════════
// screens/home.js — Home & Settings screens
// ═══════════════════════════════════════════════

import { loadSettings, saveSettings } from '../storage.js';

let selectedDiscipline  = null;
let selectedMode        = 'practice_25';
let selectedYardage     = 20;
let onStartCallback     = null;
let onHistoryCallback   = null;
let onAnalyticsCallback = null;

export function initHome({ onStart, onHistory, onAnalytics }) {
  onStartCallback   = onStart;
  onHistoryCallback = onHistory;
  onAnalyticsCallback = onAnalytics;

  // Discipline buttons
  document.querySelectorAll('.discipline-btn').forEach(btn => {
    btn.addEventListener('click', () => selectDiscipline(btn.dataset.discipline));
  });

  // Olympic Trap mode buttons (change selectedMode)
  document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => selectMode(btn.dataset.mode));
  });

  // American Trap sub-mode buttons (Standard vs Handicap — change selectedDiscipline)
  document.querySelectorAll('[data-set-discipline]').forEach(btn => {
    btn.addEventListener('click', () => selectAmericanMode(btn.dataset.setDiscipline));
  });

  // Yardage stepper (Handicap mode)
  document.getElementById('yardage-dec').addEventListener('click', () => adjustYardage(-1));
  document.getElementById('yardage-inc').addEventListener('click', () => adjustYardage(+1));

  // Start button
  document.getElementById('btn-start-round').addEventListener('click', () => {
    if (selectedDiscipline) {
      onStartCallback({ discipline: selectedDiscipline, mode: selectedMode, yardage: selectedYardage });
    }
  });

  // History button
  document.getElementById('btn-history').addEventListener('click', onHistoryCallback);
  document.getElementById('btn-analytics').addEventListener('click', onAnalyticsCallback);

  // Settings button
  document.getElementById('btn-settings').addEventListener('click', () => {
    openSettings();
  });

  // Settings back button
  document.getElementById('btn-settings-back').addEventListener('click', () => {
    saveCurrentSettings();
    import('../app.js').then(m => m.navigate('home'));
  });

  // Settings inputs — auto-save on change
  document.getElementById('input-name').addEventListener('change', saveCurrentSettings);
  document.getElementById('toggle-guidance').addEventListener('change', saveCurrentSettings);
}

export function onEnter() {
  // Reset selection state
  selectedDiscipline = null;
  selectedMode       = 'practice_25';
  selectedYardage    = 20;

  document.querySelectorAll('.discipline-btn').forEach(b => b.classList.remove('selected'));

  // Hide all sub-selectors
  document.getElementById('american-mode-selector').classList.add('hidden');
  document.getElementById('handicap-yardage-selector').classList.add('hidden');
  document.getElementById('olympic-mode-selector').classList.add('hidden');
  document.getElementById('btn-start-round').classList.add('hidden');

  // Reset American mode toggle to "Standard"
  document.querySelectorAll('[data-set-discipline]').forEach(b => {
    b.classList.toggle('active', b.dataset.setDiscipline === 'american_trap');
  });

  // Reset yardage stepper
  document.getElementById('yardage-value').textContent = '20 yd';
  document.getElementById('yardage-dec').disabled = false;
  document.getElementById('yardage-inc').disabled = false;

  // Load saved settings
  const settings = loadSettings();
  document.getElementById('input-name').value     = settings.shooterName || '';
  document.getElementById('toggle-guidance').checked = settings.showGuidance !== false;
}

function selectDiscipline(discipline) {
  document.querySelectorAll('.discipline-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.discipline === discipline);
  });

  const americanSelector = document.getElementById('american-mode-selector');
  const olympicSelector  = document.getElementById('olympic-mode-selector');
  const handicapSelector = document.getElementById('handicap-yardage-selector');

  if (discipline === 'american_trap') {
    americanSelector.classList.remove('hidden');
    olympicSelector.classList.add('hidden');
    // Default to Standard sub-mode
    selectAmericanMode('american_trap');
    selectedMode = 'practice_25';
  } else if (discipline === 'olympic_trap') {
    olympicSelector.classList.remove('hidden');
    americanSelector.classList.add('hidden');
    handicapSelector.classList.add('hidden');
    selectedDiscipline = 'olympic_trap';
    selectedMode = 'practice_25';
    document.body.dataset.discipline = 'olympic_trap';
  } else {
    americanSelector.classList.add('hidden');
    olympicSelector.classList.add('hidden');
    handicapSelector.classList.add('hidden');
    selectedDiscipline = discipline;
    selectedMode = 'practice_25';
    document.body.dataset.discipline = discipline;
  }

  document.getElementById('btn-start-round').classList.remove('hidden');
}

// Switches between "Standard" (american_trap) and "Handicap" (handicap_trap)
// within the American Trap discipline card
function selectAmericanMode(newDiscipline) {
  selectedDiscipline = newDiscipline;
  document.body.dataset.discipline = newDiscipline;

  document.querySelectorAll('[data-set-discipline]').forEach(b => {
    b.classList.toggle('active', b.dataset.setDiscipline === newDiscipline);
  });

  const handicapSelector = document.getElementById('handicap-yardage-selector');
  if (newDiscipline === 'handicap_trap') {
    handicapSelector.classList.remove('hidden');
  } else {
    handicapSelector.classList.add('hidden');
  }
}

function selectMode(mode) {
  selectedMode = mode;
  document.querySelectorAll('.mode-btn[data-mode]').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
}

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
