// Rarity weights ported from FishSelect.cs
const WEIGHTS = { common: 249, uncommon: 120, rare: 20, epic: 10, legendary: 1 };

export class FishSelector {
  constructor(db) { this.db = db; }

  select(location, season, timeOfDay) {
    const pool = this.db.filterAvailable(location, season, timeOfDay);
    if (!pool.length) return this._fallback();

    // Build weighted list
    const weighted = [];
    for (const fish of pool) {
      const w = WEIGHTS[fish.rarity] ?? 1;
      for (let i = 0; i < w; i++) weighted.push(fish);
    }
    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  // Fallback to any common fish if location/season/time yields nothing
  _fallback() {
    const commons = this.db.fish.filter(f => f.rarity === 'common');
    return commons[Math.floor(Math.random() * commons.length)] ?? null;
  }

  randomWeight(fish) {
    // Slight bell curve via average of 3 randoms
    const r = (Math.random() + Math.random() + Math.random()) / 3;
    const w = fish.minWeight + (fish.maxWeight - fish.minWeight) * r;
    return Math.round(w * 10) / 10;
  }
}
