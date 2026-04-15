// ═══════════════════════════════════════════════
// disciplines/station-practice.js — Station Practice engine
//
// Allows users to drill specific stations from any discipline.
// Cycles through the selected stations (and houses for Skeet)
// for a configurable shot count. Implements the same public
// interface as AmericanTrapEngine, SkeetEngine, OlympicTrapEngine.
//
// practiceConfig = {
//   selectedStations: number[],      // e.g. [1, 3, 5]
//   shotCount:        number,         // 1–200
//   skeetHouseSelection: {            // Skeet only
//     [station]: 'high' | 'low' | 'both'
//   }
// }
// ═══════════════════════════════════════════════

function buildSequence(discipline, { selectedStations, shotCount, skeetHouseSelection }) {
  const seq = [];
  const isSkeet = discipline === 'skeet';

  // Build the unit list — the repeating pattern of shots
  const unitList = [];
  for (const station of selectedStations) {
    if (isSkeet) {
      const sel = (skeetHouseSelection && skeetHouseSelection[station]) || 'both';
      if (sel === 'high' || sel === 'both') {
        unitList.push({ station, house: 'high_house', type: 'single' });
      }
      if (sel === 'low' || sel === 'both') {
        unitList.push({ station, house: 'low_house', type: 'single' });
      }
    } else {
      unitList.push({ station, type: 'single' });
    }
  }

  if (unitList.length === 0) return seq; // guard: nothing to shoot

  for (let i = 0; i < shotCount; i++) {
    seq.push({ ...unitList[i % unitList.length] });
  }

  return seq;
}

function getGuidance(discipline, shot, pointer, total) {
  const { station } = shot;
  const shotNum = pointer + 1;

  if (discipline === 'skeet') {
    const houseName = shot.house === 'high_house' ? 'High House' : 'Low House';
    return `Station ${station} — ${houseName}. Practice shot ${shotNum} of ${total}. Call "Pull!" when ready.`;
  }

  if (discipline === 'olympic_trap') {
    return `Station ${station}. Olympic targets fly faster and at more extreme angles. Practice shot ${shotNum} of ${total}. Face downrange and call "Pull!" when ready.`;
  }

  // American Trap / Handicap Trap
  const dirHint =
    station === 1 ? 'Targets fly to the right.' :
    station === 5 ? 'Targets fly to the left.' :
    'Targets can fly left, right, or straight.';
  return `Station ${station} — practice shot ${shotNum} of ${total}. ${dirHint} Call "Pull!" when ready.`;
}

export class StationPracticeEngine {
  constructor({ discipline, practiceConfig }) {
    const { selectedStations, shotCount, skeetHouseSelection } = practiceConfig;

    this.discipline       = discipline;
    this.practiceConfig   = practiceConfig;

    const clampedCount  = Math.max(1, Math.min(200, Math.floor(Number(shotCount) || 1)));
    this.sequence       = buildSequence(discipline, {
      selectedStations,
      shotCount: clampedCount,
      skeetHouseSelection,
    });

    this.pointer    = 0;
    this.score      = 0;
    this.shots      = [];
    this._snapshots = [];
  }

  get total() { return this.sequence.length; }

  getCurrentShot() {
    return this.sequence[this.pointer] || null;
  }

  getCurrentGuidance() {
    const shot = this.getCurrentShot();
    if (!shot) return '';
    return getGuidance(this.discipline, shot, this.pointer, this.total);
  }

  /** Record hit or miss. Returns true when session is complete. */
  recordResult(result) {
    const shot = this.getCurrentShot();
    if (!shot) return true;

    this._snapshots.push({
      pointer:  this.pointer,
      score:    this.score,
      shotsLen: this.shots.length,
    });

    const record = {
      shotIndex: this.pointer,
      station:   shot.station,
      type:      shot.type,
      result,
      isOption:  false,
      timestamp: new Date().toISOString(),
    };
    if (shot.house) record.house = shot.house;

    this.shots.push(record);

    if (result === 'hit') this.score++;
    this.pointer++;
    return this.isComplete();
  }

  undoLast() {
    if (this._snapshots.length === 0) return false;
    const snap = this._snapshots.pop();
    this.pointer = snap.pointer;
    this.score   = snap.score;
    this.shots.splice(snap.shotsLen);
    return true;
  }

  isComplete() {
    return this.pointer >= this.total;
  }

  getProgress() {
    return { current: this.pointer, total: this.total, score: this.score };
  }

  /** Per-station breakdown for summary screen */
  getStationBreakdown() {
    const stationMap = new Map();

    for (const s of this.shots) {
      // For Skeet, separate High House from Low House per station
      const key = s.house ? `${s.station}|${s.house}` : String(s.station);
      if (!stationMap.has(key)) stationMap.set(key, []);
      stationMap.get(key).push(s);
    }

    return [...stationMap.entries()].map(([key, shots]) => {
      const [st, house] = key.split('|');
      const houseLabel  = house === 'high_house' ? ' HH' : house === 'low_house' ? ' LH' : '';
      return {
        label: `St. ${st}${houseLabel}`,
        shots,
        hits:  shots.filter(s => s.result === 'hit').length,
        total: shots.length,
      };
    });
  }
}
