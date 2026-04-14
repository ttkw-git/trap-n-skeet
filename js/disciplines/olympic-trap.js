// ═══════════════════════════════════════════════
// olympic-trap.js — Olympic Trap sequence engine
//
// RULES SUMMARY:
//  • 6 shooting stations in a line, 15m from the bunker
//  • 15 fixed trap machines in a sunken bunker (random computer-
//    controlled angles — faster, lower, more extreme than American trap)
//  • Shooter rotates: Station 1 → 2 → 3 → 4 → 5 → 6 → 1 → ...
//  • One shot per target (since 2020 rule change)
//  • Practice mode:     25 shots  (≈ 4 full cycles + 1 extra)
//  • Competition mode: 125 shots  (5 rounds of 25)
// ═══════════════════════════════════════════════

function buildSequence(totalShots) {
  const seq = [];
  for (let i = 0; i < totalShots; i++) {
    const station  = (i % 6) + 1;          // cycles 1-6
    const roundNum = Math.floor(i / 25) + 1; // 1-indexed round (for 125-shot mode)
    const shotInRound = (i % 25) + 1;
    seq.push({ station, shotInRound, roundNum, type: 'single' });
  }
  return seq;
}

function getGuidance(shot, isFirstAtStation, isCompetition) {
  const { station, roundNum, shotInRound } = shot;
  const stationNote = isFirstAtStation
    ? `Rotate to Station ${station}.`
    : `Station ${station}.`;
  const diffNote = `Olympic targets fly faster and at more extreme angles than American Trap — stay focused.`;
  const roundNote = isCompetition ? ` (Round ${roundNum})` : '';
  return `${stationNote}${roundNote} ${diffNote} Face downrange, mount your gun, and call "Pull!" when ready.`;
}

export class OlympicTrapEngine {
  constructor(mode = 'practice_25') {
    this.mode     = mode;
    const total   = mode === 'competition_125' ? 125 : 25;
    this.sequence = buildSequence(total);
    this.pointer  = 0;
    this.score    = 0;
    this.shots    = [];
    this._snapshots = [];
  }

  get total() { return this.sequence.length; }

  getCurrentShot() {
    return this.sequence[this.pointer] || null;
  }

  getCurrentGuidance() {
    const shot = this.getCurrentShot();
    if (!shot) return '';
    const isFirst = this.pointer === 0 ||
      this.sequence[this.pointer - 1]?.station !== shot.station;
    return getGuidance(shot, isFirst, this.mode === 'competition_125');
  }

  /** Record hit or miss. Returns true when round is complete. */
  recordResult(result) {
    const shot = this.getCurrentShot();
    if (!shot) return true;

    this._snapshots.push({
      pointer:  this.pointer,
      score:    this.score,
      shotsLen: this.shots.length,
    });

    this.shots.push({
      shotIndex:    this.pointer,
      station:      shot.station,
      shotInRound:  shot.shotInRound,
      roundNum:     shot.roundNum,
      type:         shot.type,
      result,
      isOption:     false,
      timestamp:    new Date().toISOString(),
    });

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

  /** Current round number (1-5 for competition mode) */
  getCurrentRound() {
    if (this.mode !== 'competition_125') return 1;
    return Math.floor(this.pointer / 25) + 1;
  }

  /** Per-station breakdown for summary screen */
  getStationBreakdown() {
    const stationMap = {};
    for (const s of this.shots) {
      const key = s.station;
      if (!stationMap[key]) stationMap[key] = [];
      stationMap[key].push(s);
    }
    return Object.entries(stationMap).map(([st, shots]) => ({
      label: `St. ${st}`,
      shots,
      hits:  shots.filter(s => s.result === 'hit').length,
      total: shots.length,
    }));
  }
}
