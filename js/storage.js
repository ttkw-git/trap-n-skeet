// ═══════════════════════════════════════════════
// storage.js — localStorage data layer
// ═══════════════════════════════════════════════

const ROUNDS_KEY   = 'trapnskeet_rounds';
const SETTINGS_KEY = 'trapnskeet_settings';

// ── Rounds ────────────────────────────────────

export function loadAllRounds() {
  try {
    return JSON.parse(localStorage.getItem(ROUNDS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveRound(round) {
  const rounds = loadAllRounds();
  const idx = rounds.findIndex(r => r.id === round.id);
  if (idx >= 0) {
    rounds[idx] = round;
  } else {
    rounds.push(round);
  }
  localStorage.setItem(ROUNDS_KEY, JSON.stringify(rounds));
}

export function loadRoundsByDiscipline(discipline) {
  return loadAllRounds().filter(r => r.discipline === discipline && r.completedAt);
}

export function clearAllRounds() {
  localStorage.removeItem(ROUNDS_KEY);
}

export function createRound(discipline, mode = 'practice_25') {
  const maxScore = (discipline === 'olympic_trap' && mode === 'competition_125') ? 125 : 25;
  return {
    id: `round_${Date.now()}`,
    discipline,
    mode,
    startedAt: new Date().toISOString(),
    completedAt: null,
    score: 0,
    maxScore,
    shots: [],
  };
}

// ── Settings ──────────────────────────────────

const DEFAULT_SETTINGS = {
  shooterName: '',
  showGuidance: true,
};

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
