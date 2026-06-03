const SAVE_KEY = 'fishgame_v1';

export class Inventory {
  constructor() {
    this.money = 100;
    this.fuel  = 50;
    this.maxFuel = 100;
    this.caughtFish = [];
    this.fishLog = {};

    this.poles = [
      { id: 'old',    name: 'Old Rod',    power: 1, action: 'slow' },
      { id: 'carbon', name: 'Carbon Rod', power: 3, action: 'fast' },
    ];
    this.equippedPoleId = 'old';

    this.baits = [
      { id: 'worm',    name: 'Worm',         type: 'worm', count: 20 },
      { id: 'spinner', name: 'Spinner Lure', type: 'lure', health: 10 },
    ];
    this.equippedBaitId = 'worm';

    this.load();
  }

  // ── Poles ──────────────────────────────────────────────────────────────────

  equipPole(id) {
    if (this.poles.find(p => p.id === id)) {
      this.equippedPoleId = id;
      this.save();
    }
  }

  getEquippedPole() {
    return this.poles.find(p => p.id === this.equippedPoleId) ?? this.poles[0];
  }

  // ── Bait ───────────────────────────────────────────────────────────────────

  equipBait(id) {
    if (this.baits.find(b => b.id === id)) {
      this.equippedBaitId = id;
      this.save();
    }
  }

  getEquippedBait() {
    return this.baits.find(b => b.id === this.equippedBaitId) ?? null;
  }

  useBait() {
    const bait = this.getEquippedBait();
    if (!bait) return;
    if (bait.type === 'worm') {
      bait.count = Math.max(0, bait.count - 1);
      if (bait.count <= 0) this._autoSwitchBait(bait.id);
    } else if (bait.type === 'lure') {
      bait.health = Math.max(0, bait.health - 1);
      if (bait.health <= 0) this._autoSwitchBait(bait.id);
    }
    this.save();
  }

  _autoSwitchBait(usedId) {
    const next = this.baits.find(b =>
      b.id !== usedId &&
      ((b.type === 'worm' && b.count > 0) || (b.type === 'lure' && b.health > 0))
    );
    this.equippedBaitId = next?.id ?? null;
  }

  // ── Fish ───────────────────────────────────────────────────────────────────

  addFish(fish, weight) {
    const avgW  = (fish.minWeight + fish.maxWeight) / 2;
    const value = Math.max(1, Math.round(fish.value * (weight / avgW)));
    const entry = { fishId: fish.id, name: fish.name, weight, value, caughtAt: Date.now() };
    this.caughtFish.push(entry);

    if (!this.fishLog[fish.id]) this.fishLog[fish.id] = { count: 0, bestWeight: 0 };
    this.fishLog[fish.id].count++;
    if (weight > this.fishLog[fish.id].bestWeight) this.fishLog[fish.id].bestWeight = weight;

    this.save();
    return entry;
  }

  sellFish(index) {
    const entry = this.caughtFish[index];
    if (!entry) return;
    this.money += entry.value;
    this.caughtFish.splice(index, 1);
    this.save();
  }

  hasCaught(fishId)  { return !!this.fishLog[fishId]; }
  catchCount(fishId) { return this.fishLog[fishId]?.count ?? 0; }
  bestWeight(fishId) { return this.fishLog[fishId]?.bestWeight ?? 0; }

  // ── Persistence ────────────────────────────────────────────────────────────

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        money: this.money, fuel: this.fuel,
        caughtFish: this.caughtFish, fishLog: this.fishLog,
        equippedPoleId: this.equippedPoleId,
        equippedBaitId: this.equippedBaitId,
        baitStates: this.baits.map(b => ({ id: b.id, count: b.count, health: b.health })),
      }));
    } catch {}
  }

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!d) return;
      this.money          = d.money          ?? 100;
      this.fuel           = d.fuel           ?? 50;
      this.caughtFish     = d.caughtFish     ?? [];
      this.fishLog        = d.fishLog        ?? {};
      this.equippedPoleId = d.equippedPoleId ?? 'old';
      this.equippedBaitId = d.equippedBaitId ?? 'worm';
      if (d.baitStates) {
        for (const saved of d.baitStates) {
          const bait = this.baits.find(b => b.id === saved.id);
          if (bait) {
            if (saved.count  !== undefined) bait.count  = saved.count;
            if (saved.health !== undefined) bait.health = saved.health;
          }
        }
      }
    } catch {}
  }
}
