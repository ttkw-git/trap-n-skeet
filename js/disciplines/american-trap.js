// ═══════════════════════════════════════════════
// american-trap.js — American Trap sequence engine
//
// Rules: 5 stations × 5 shots = 25 total.
// Shooter rotates station 1 → 2 → 3 → 4 → 5.
// Single targets only, random angles from oscillating trap.
// One shot per target.
// ═══════════════════════════════════════════════

function buildSequence() {
  const seq = [];
  for (let station = 1; station <= 5; station++) {
    for (let shotNum = 1; shotNum <= 5; shotNum++) {
      seq.push({ station, shotNum, type: 'single' });
    }
  }
  return seq; // 25 entries
}

function getGuidance(shot, isFirstAtStation) {
  const { station, shotNum } = shot;
  const dirHint = station === 1 ? 'Targets fly to the right.' :
                  station === 5 ? 'Targets fly to the left.' :
                  'Targets can fly left, right, or straight.';

  if (isFirstAtStation) {
    const rotateNote = station === 1 ? '' : ` Rotate right from Station ${station - 1}.`;
    return `Step to Station ${station}.${rotateNote} Face downrange. ${dirHint} Load your gun, call "Pull!" when ready. Shot ${shotNum} of 5 at this station.`;
  }
  return `Station ${station} — shot ${shotNum} of 5. ${dirHint} Call "Pull!" when ready.`;
}

export class AmericanTrapEngine {
  constructor() {
    this.sequence = buildSequence();
    this.pointer  = 0;
    this.score    = 0;
    this.shots    = [];
    this._snapshots = [];
  }


  get total() { return 25; }

  getCurrentShot() {
    return this.sequence[this.pointer] || null;
  }

  getCurrentGuidance() {
    const shot = this.getCurrentShot();
    if (!shot) return '';
    const isFirst = shot.shotNum === 1;
    return getGuidance(shot, isFirst);
  }

  /** Record hit or miss. Returns true when round is complete. */
  recordResult(result) {
    const shot = this.getCurrentShot();
    if (!shot) return true;

    // Save snapshot BEFORE mutating state (enables undo)
    this._snapshots.push({
      pointer: this.pointer,
      score:   this.score,
      shotsLen: this.shots.length,
    });

    this.shots.push({
      shotIndex: this.pointer,
      station:   shot.station,
      shotNum:   shot.shotNum,
      type:      shot.type,
      result,
      isOption:  false,
      timestamp: new Date().toISOString(),
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

  /** Per-station breakdown for summary screen */
  getStationBreakdown() {
    const breakdown = [];
    for (let st = 1; st <= 5; st++) {
      const stShots = this.shots.filter(s => s.station === st);
      breakdown.push({
        label: `St. ${st}`,
        shots: stShots,
        hits: stShots.filter(s => s.result === 'hit').length,
        total: stShots.length,
      });
    }
    return breakdown;
  }
}

// ═══════════════════════════════════════════════
// HandicapTrapEngine — Handicap Trap sequence engine
//
// Same rules as American Trap (5 stations × 5 shots = 25),
// but the shooter stands at a personal yardage (16–27 yards).
// ═══════════════════════════════════════════════

export class HandicapTrapEngine {
  constructor(yardage = 20) {
    this.yardage  = yardage;
    this.sequence = buildSequence();
    this.pointer  = 0;
    this.score    = 0;
    this.shots    = [];
    this._snapshots = [];
  }

  get total() { return 25; }

  getCurrentShot() {
    return this.sequence[this.pointer] || null;
  }

  getCurrentGuidance() {
    const shot = this.getCurrentShot();
    if (!shot) return '';
    const isFirst = shot.shotNum === 1;
    return getGuidance(shot, isFirst) + ` Shooting from ${this.yardage} yards.`;
  }

  recordResult(result) {
    const shot = this.getCurrentShot();
    if (!shot) return true;

    this._snapshots.push({
      pointer:  this.pointer,
      score:    this.score,
      shotsLen: this.shots.length,
    });

    this.shots.push({
      shotIndex: this.pointer,
      station:   shot.station,
      shotNum:   shot.shotNum,
      type:      shot.type,
      result,
      isOption:  false,
      timestamp: new Date().toISOString(),
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

  getStationBreakdown() {
    const breakdown = [];
    for (let st = 1; st <= 5; st++) {
      const stShots = this.shots.filter(s => s.station === st);
      breakdown.push({
        label: `St. ${st}`,
        shots: stShots,
        hits:  stShots.filter(s => s.result === 'hit').length,
        total: stShots.length,
      });
    }
    return breakdown;
  }
}
