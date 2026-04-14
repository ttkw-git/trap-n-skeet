// ═══════════════════════════════════════════════
// skeet.js — Skeet sequence engine
//
// RULES SUMMARY:
//  • 8 stations arranged in a semicircle
//  • High House (HH): elevated trap at left end
//  • Low House  (LH): lower trap at right end
//  • Station 1: HH single, LH single, Double (HH launches first)
//  • Station 2: HH single, LH single, Double (HH launches first)
//  • Stations 3-5: HH single, LH single
//  • Station 6: HH single, LH single, Double (LH launches first)
//  • Station 7: HH single, LH single, Double (LH launches first)
//  • Station 8: HH single, LH single
//  • Total: 24 defined shots + 1 "25th shot"
//
// OPTION RULE:
//  • On the FIRST miss of the round, an option reshoot of that
//    exact target is immediately injected as the very next shot.
//  • The last entry in the sequence (index 24) is removed so
//    the round stays at 25 shots total.
//  • If the round reaches shot 24 with no misses, shot 25 is
//    traditionally a Station 7 Low House single.
//  • Option reshoot result (hit or miss) counts toward score.
// ═══════════════════════════════════════════════

function buildBaseSequence() {
  return [
    // Station 1 — HH first on doubles
    { station: 1, house: 'high_house', type: 'single' },
    { station: 1, house: 'low_house',  type: 'single' },
    { station: 1, house: 'high_house', type: 'double_first' },
    { station: 1, house: 'low_house',  type: 'double_second' },
    // Station 2 — HH first on doubles
    { station: 2, house: 'high_house', type: 'single' },
    { station: 2, house: 'low_house',  type: 'single' },
    { station: 2, house: 'high_house', type: 'double_first' },
    { station: 2, house: 'low_house',  type: 'double_second' },
    // Stations 3-5 — singles only
    { station: 3, house: 'high_house', type: 'single' },
    { station: 3, house: 'low_house',  type: 'single' },
    { station: 4, house: 'high_house', type: 'single' },
    { station: 4, house: 'low_house',  type: 'single' },
    { station: 5, house: 'high_house', type: 'single' },
    { station: 5, house: 'low_house',  type: 'single' },
    // Station 6 — LH first on doubles
    { station: 6, house: 'high_house', type: 'single' },
    { station: 6, house: 'low_house',  type: 'single' },
    { station: 6, house: 'low_house',  type: 'double_first' },
    { station: 6, house: 'high_house', type: 'double_second' },
    // Station 7 — LH first on doubles
    { station: 7, house: 'high_house', type: 'single' },
    { station: 7, house: 'low_house',  type: 'single' },
    { station: 7, house: 'low_house',  type: 'double_first' },
    { station: 7, house: 'high_house', type: 'double_second' },
    // Station 8
    { station: 8, house: 'high_house', type: 'single' },
    { station: 8, house: 'low_house',  type: 'single' },
    // Shot 25 placeholder (used only if no miss occurs in shots 1-24)
    { station: 7, house: 'low_house',  type: 'single', isShot25Placeholder: true },
  ];
}

function houseLabel(house) {
  return house === 'high_house' ? 'High House' : 'Low House';
}

function getGuidance(shot, isFirstAtStation) {
  const { station, house, type, isOption } = shot;
  const hl = houseLabel(house);

  if (isOption) {
    return `⚡ OPTION SHOT — You missed a ${hl} target at Station ${station}. Reshoot the same target. This replaces your 25th shot. Call "Pull!" when ready.`;
  }

  const stationNote = isFirstAtStation
    ? `Move to Station ${station}.`
    : `Station ${station}.`;

  if (type === 'single') {
    const aimNote = house === 'high_house'
      ? `Face the High House opening (left side of the field).`
      : `Face the Low House opening (right side of the field).`;
    return `${stationNote} ${aimNote} Call "Pull!" for a ${hl} single target.`;
  }

  if (type === 'double_first') {
    const order = house === 'high_house'
      ? `The High House bird launches first — break it, then quickly swing to the Low House bird.`
      : `The Low House bird launches first — break it, then quickly swing to the High House bird.`;
    return `${stationNote} DOUBLE — both birds launch simultaneously. ${order} Load 2 shells. Call "Pull!"`;
  }

  if (type === 'double_second') {
    return `(Continuing the double) Now focus on the ${hl} bird. Keep swinging through the target.`;
  }

  return `Station ${station} — ${hl}. Call "Pull!"`;
}

export class SkeetEngine {
  constructor() {
    this.sequence        = buildBaseSequence();
    this.pointer         = 0;
    this.score           = 0;
    this.shots           = [];
    this.optionAvailable = true;  // false once used or consumed
    this._snapshots      = [];    // full state snapshots for undo
  }

  get total() { return 25; }

  getCurrentShot() {
    return this.sequence[this.pointer] || null;
  }

  getCurrentGuidance() {
    const shot = this.getCurrentShot();
    if (!shot) return '';
    const isFirst = this.pointer === 0 ||
      this.sequence[this.pointer - 1]?.station !== shot.station;
    return getGuidance(shot, isFirst);
  }

  /** Record hit or miss. Returns true when round is complete. */
  recordResult(result) {
    const shot = this.getCurrentShot();
    if (!shot) return true;

    // Save full state snapshot for undo safety
    this._snapshots.push({
      sequence:        JSON.parse(JSON.stringify(this.sequence)),
      pointer:         this.pointer,
      score:           this.score,
      optionAvailable: this.optionAvailable,
      shotsLen:        this.shots.length,
    });

    const recordedShot = {
      shotIndex: this.shots.length,
      station:   shot.station,
      house:     shot.house,
      type:      shot.type,
      result,
      isOption:  !!shot.isOption,
      timestamp: new Date().toISOString(),
    };
    this.shots.push(recordedShot);
    if (result === 'hit') this.score++;

    // Option rule: first miss in the round (not during an option reshoot)
    if (result === 'miss' && this.optionAvailable && !shot.isOption) {
      this.optionAvailable = false;
      // Build option shot from current shot definition
      const optionShot = {
        station:  shot.station,
        house:    shot.house,
        type:     shot.type === 'double_first' || shot.type === 'double_second' ? 'single' : shot.type,
        isOption: true,
      };
      // Insert option shot immediately after current pointer
      this.sequence.splice(this.pointer + 1, 0, optionShot);
      // Remove the last entry (index 25 now after splice) to keep total at 25
      this.sequence.splice(25, 1);
    }

    this.pointer++;
    return this.isComplete();
  }

  undoLast() {
    if (this._snapshots.length === 0) return false;
    const snap = this._snapshots.pop();
    this.sequence        = snap.sequence;
    this.pointer         = snap.pointer;
    this.score           = snap.score;
    this.optionAvailable = snap.optionAvailable;
    this.shots.splice(snap.shotsLen);
    return true;
  }

  isComplete() {
    return this.pointer >= this.total;
  }

  getProgress() {
    return { current: this.pointer, total: this.total, score: this.score };
  }

  isOptionNext() {
    const shot = this.getCurrentShot();
    return shot?.isOption === true;
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
