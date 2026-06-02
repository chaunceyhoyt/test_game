const SAVE_KEY = 'fishgame_v1';

export class Inventory {
  constructor() {
    this.money = 100;
    this.fuel  = 50;
    this.maxFuel = 100;
    this.caughtFish = []; // { fishId, name, weight, value, caughtAt }
    this.fishLog = {};    // { [fishId]: { count, bestWeight } }
    this.poles = [{ name: 'Old Rod', power: 1, action: 'slow' }];
    this.baits = [{ name: 'Worm', count: 20 }];
    this.load();
  }

  addFish(fish, weight) {
    const avgW = (fish.minWeight + fish.maxWeight) / 2;
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

  hasCaught(fishId) { return !!this.fishLog[fishId]; }
  catchCount(fishId) { return this.fishLog[fishId]?.count ?? 0; }
  bestWeight(fishId) { return this.fishLog[fishId]?.bestWeight ?? 0; }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        money: this.money, fuel: this.fuel,
        caughtFish: this.caughtFish, fishLog: this.fishLog,
      }));
    } catch {}
  }

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!d) return;
      this.money = d.money ?? 100;
      this.fuel  = d.fuel  ?? 50;
      this.caughtFish = d.caughtFish ?? [];
      this.fishLog    = d.fishLog    ?? {};
    } catch {}
  }
}
