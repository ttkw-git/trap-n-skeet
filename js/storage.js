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

export function loadCompletedRounds({ discipline = 'all', days = 'all' } = {}) {
  const now = Date.now();
  const dayCount = days === 'all' ? null : Number(days);
  const cutoff = Number.isFinite(dayCount) ? now - (dayCount * 24 * 60 * 60 * 1000) : null;

  return loadAllRounds().filter(round => {
    if (!round.completedAt) return false;
    if (discipline !== 'all' && round.discipline !== discipline) return false;
    if (!cutoff) return true;

    const ts = new Date(round.startedAt).getTime();
    return Number.isFinite(ts) && ts >= cutoff;
  });
}

export function getTrendPoints({ discipline = 'all', days = 'all' } = {}) {
  const rounds = loadCompletedRounds({ discipline, days })
    .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

  return rounds.map(round => ({
    id: round.id,
    date: round.startedAt,
    score: round.score,
    maxScore: round.maxScore,
    percent: round.maxScore > 0 ? Math.round((round.score / round.maxScore) * 100) : 0,
    discipline: round.discipline,
  }));
}

export function getStationPerformance({ discipline = 'all', days = 'all' } = {}) {
  const rounds = loadCompletedRounds({ discipline, days });
  const stationMap = new Map();

  for (const round of rounds) {
    const isSkeet = round.discipline === 'skeet';
    for (const shot of round.shots || []) {
      const house = isSkeet ? normalizeHouse(shot.house) : null;
      const key = discipline === 'all'
        ? `${round.discipline}|${shot.station}|${house || '-'}`
        : `${shot.station}|${house || '-'}`;

      const curr = stationMap.get(key) || {
        discipline: round.discipline,
        station: String(shot.station),
        house,
        hits: 0,
        total: 0,
      };
      curr.total += 1;
      if (shot.result === 'hit') curr.hits += 1;
      stationMap.set(key, curr);
    }
  }

  return [...stationMap.values()]
    .map(s => ({
      ...s,
      percent: s.total > 0 ? Math.round((s.hits / s.total) * 100) : 0,
      label: buildStationLabel(s),
    }))
    .sort((a, b) => {
      if (a.discipline !== b.discipline) return a.discipline.localeCompare(b.discipline);
      if (Number(a.station) !== Number(b.station)) return Number(a.station) - Number(b.station);
      return (a.house || '').localeCompare(b.house || '');
    });
}

function normalizeHouse(house) {
  if (house === 'high_house') return 'High';
  if (house === 'low_house') return 'Low';
  return null;
}

function disciplineShortLabel(discipline) {
  if (discipline === 'american_trap') return 'Trap';
  if (discipline === 'skeet') return 'Skeet';
  if (discipline === 'olympic_trap') return 'Olympic';
  return discipline;
}

function buildStationLabel(row) {
  const discipline = disciplineShortLabel(row.discipline);
  const station = `St ${row.station}`;
  const house = row.house ? ` ${row.house}` : '';
  return `${discipline} ${station}${house}`;
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
