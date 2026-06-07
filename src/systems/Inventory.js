const SAVE_KEY = 'fishgame_v1';

export class Inventory {
  constructor() {
    this.money   = 100;
    this.fuel    = 50;
    this.maxFuel = 100;
    this.hasSail = false;

    this.caughtFish = [];
    this.fishLog    = {};
    this.aquarium   = [];
    this.trophies   = [];

    this.onSell = null;

    this.poles = [
      { id: 'old',    name: 'Old Rod',    power: 1, action: 'slow', owned: true },
      { id: 'carbon', name: 'Carbon Rod', power: 3, action: 'fast', owned: false },
    ];
    this.equippedPoleId = 'old';

    this.motors = [
      { id: 'basic', name: 'Basic Motor', speed: 160, owned: false },
    ];
    this.equippedMotorId = null; // null = paddling (no motor)

    this.baits = [
      { id: 'worm',    name: 'Worm',          type: 'worm', count: 20 },
      { id: 'spinner', name: 'Spinner Lure',  type: 'lure', health: 10 },
    ];
    this.equippedBaitId = 'worm';

    this.shopCatalog = [
      // equipment
      { id: 'carbon_rod',  tab: 'equipment', name: 'Carbon Rod',  desc: 'Faster reels, tighter zone',   price: 120, type: 'pole',  poleId: 'carbon' },
      { id: 'basic_motor', tab: 'equipment', name: 'Basic Motor', desc: 'Motorized propulsion, uses fuel', price: 50, type: 'motor', motorId: 'basic' },
      { id: 'sail',        tab: 'equipment', name: 'Sail',        desc: 'Boosts fuel-less boat speed',   price: 75,  type: 'sail' },
      // bait
      { id: 'worms_10',   tab: 'bait',      name: 'Worms ×10',    desc: '+10 worm bait',               price: 8,   type: 'bait_count', baitId: 'worm',    amount: 10 },
      { id: 'worms_25',   tab: 'bait',      name: 'Worms ×25',    desc: '+25 worm bait',               price: 18,  type: 'bait_count', baitId: 'worm',    amount: 25 },
      { id: 'lure',       tab: 'bait',      name: 'Spinner Lure', desc: 'Attracts rarer fish',          price: 25,  type: 'bait_lure',  baitId: 'spinner' },
      // fuel
      { id: 'fuel_25',    tab: 'fuel',      name: 'Fuel ×25',     desc: '+25 fuel',                    price: 15,  type: 'fuel',       amount: 25 },
      { id: 'fuel_50',    tab: 'fuel',      name: 'Fuel ×50',     desc: '+50 fuel',                    price: 25,  type: 'fuel',       amount: 50 },
      { id: 'fuel_full',  tab: 'fuel',      name: 'Full Tank',    desc: 'Fills tank to maximum',       price: 40,  type: 'fuel_full' },
    ];

    this.load();
  }

  // ── Poles ──────────────────────────────────────────────────────────────────

  equipPole(id) {
    const pole = this.poles.find(p => p.id === id);
    if (pole?.owned) { this.equippedPoleId = id; this.save(); }
  }

  // ── Motors ─────────────────────────────────────────────────────────────────

  getEquippedMotor() {
    if (!this.equippedMotorId) return null;
    return this.motors.find(m => m.id === this.equippedMotorId) ?? null;
  }

  equipMotor(id) {
    const motor = this.motors.find(m => m.id === id);
    if (motor?.owned) { this.equippedMotorId = id; this.save(); }
  }

  unequipMotor() { this.equippedMotorId = null; this.save(); }

  getEquippedPole() {
    return this.poles.find(p => p.id === this.equippedPoleId) ?? this.poles[0];
  }

  // ── Bait ───────────────────────────────────────────────────────────────────

  equipBait(id) {
    if (this.baits.find(b => b.id === id)) { this.equippedBaitId = id; this.save(); }
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

  fishStars(fishDef, weight) {
    if (!fishDef || fishDef.maxWeight <= fishDef.minWeight) return 1;
    const range = fishDef.maxWeight - fishDef.minWeight;
    const norm  = (weight - fishDef.minWeight) / range;
    if (norm < 1 / 3) return 1;
    if (norm < 2 / 3) return 2;
    return 3;
  }

  addFish(fish, weight) {
    const stars     = this.fishStars(fish, weight);
    const avgW      = (fish.minWeight + fish.maxWeight) / 2;
    const starMult  = [0, 0.7, 1.0, 1.5][stars];
    const value     = Math.max(1, Math.round(fish.value * (weight / avgW) * starMult));
    const entry     = { fishId: fish.id, name: fish.name, weight, value, stars, rarity: fish.rarity, caughtAt: Date.now() };

    this.caughtFish.push(entry);
    this._updateTrophies(entry);

    if (!this.fishLog[fish.id]) this.fishLog[fish.id] = { count: 0, bestWeight: 0 };
    this.fishLog[fish.id].count++;
    if (weight > this.fishLog[fish.id].bestWeight) this.fishLog[fish.id].bestWeight = weight;

    this.save();
    return entry;
  }

  _updateTrophies(entry) {
    this.trophies.push({ ...entry });
    this.trophies.sort((a, b) => b.weight - a.weight);
    if (this.trophies.length > 3) this.trophies = this.trophies.slice(0, 3);
  }

  addToAquarium(index) {
    if (this.aquarium.length >= 8) return false;
    const fish = this.caughtFish.splice(index, 1)[0];
    if (!fish) return false;
    this.aquarium.push(fish);
    this.save();
    return true;
  }

  removeFromAquarium(index) {
    const fish = this.aquarium.splice(index, 1)[0];
    if (!fish) return false;
    this.caughtFish.push(fish);
    this.save();
    return true;
  }

  sellFish(index) {
    const entry = this.caughtFish[index];
    if (!entry) return 0;
    this.money += entry.value;
    this.caughtFish.splice(index, 1);
    this.onSell?.(1, entry.value);
    this.save();
    return entry.value;
  }

  sellAllFish() {
    const total = this.caughtFish.reduce((s, e) => s + e.value, 0);
    const count = this.caughtFish.length;
    this.money += total;
    this.caughtFish = [];
    this.onSell?.(count, total);
    this.save();
    return total;
  }

  hasCaught(fishId)  { return !!this.fishLog[fishId]; }
  catchCount(fishId) { return this.fishLog[fishId]?.count ?? 0; }
  bestWeight(fishId) { return this.fishLog[fishId]?.bestWeight ?? 0; }

  // ── Shop ───────────────────────────────────────────────────────────────────

  buyItem(itemId) {
    const item = this.shopCatalog.find(i => i.id === itemId);
    if (!item) return { success: false, reason: 'not_found' };
    if (this.money < item.price) return { success: false, reason: 'insufficient_funds' };

    // Block re-purchasing one-time items
    if (item.type === 'pole') {
      const pole = this.poles.find(p => p.id === item.poleId);
      if (pole?.owned) return { success: false, reason: 'already_owned' };
    }
    if (item.type === 'sail' && this.hasSail) {
      return { success: false, reason: 'already_owned' };
    }
    if (item.type === 'motor') {
      const motor = this.motors.find(m => m.id === item.motorId);
      if (motor?.owned) return { success: false, reason: 'already_owned' };
    }

    this.money -= item.price;

    switch (item.type) {
      case 'pole': {
        const pole = this.poles.find(p => p.id === item.poleId);
        if (pole) pole.owned = true;
        break;
      }
      case 'motor': {
        const motor = this.motors.find(m => m.id === item.motorId);
        if (motor) motor.owned = true;
        break;
      }
      case 'sail':
        this.hasSail = true;
        break;
      case 'bait_count': {
        const bait = this.baits.find(b => b.id === item.baitId);
        if (bait) bait.count = (bait.count ?? 0) + item.amount;
        break;
      }
      case 'bait_lure': {
        const bait = this.baits.find(b => b.id === item.baitId);
        if (bait) bait.health = Math.min(20, (bait.health ?? 0) + 10);
        break;
      }
      case 'fuel':
        this.fuel = Math.min(this.maxFuel, this.fuel + item.amount);
        break;
      case 'fuel_full':
        this.fuel = this.maxFuel;
        break;
    }

    this.save();
    return { success: true };
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        money:          this.money,
        fuel:           this.fuel,
        hasSail:        this.hasSail,
        caughtFish:     this.caughtFish,
        fishLog:        this.fishLog,
        aquarium:       this.aquarium,
        trophies:       this.trophies,
        equippedPoleId: this.equippedPoleId,
        equippedBaitId: this.equippedBaitId,
        poleStates:     this.poles.map(p => ({ id: p.id, owned: p.owned })),
        motorStates:    this.motors.map(m => ({ id: m.id, owned: m.owned })),
        equippedMotorId: this.equippedMotorId,
        baitStates:     this.baits.map(b => ({ id: b.id, count: b.count, health: b.health })),
      }));
    } catch {}
  }

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!d) return;
      this.money          = d.money          ?? 100;
      this.fuel           = d.fuel           ?? 50;
      this.hasSail        = d.hasSail        ?? false;
      this.caughtFish     = d.caughtFish     ?? [];
      this.fishLog        = d.fishLog        ?? {};
      this.aquarium       = d.aquarium       ?? [];
      this.trophies       = d.trophies       ?? [];
      this.equippedPoleId = d.equippedPoleId ?? 'old';
      this.equippedBaitId = d.equippedBaitId ?? 'worm';

      this.equippedMotorId = d.equippedMotorId ?? null;
      if (d.motorStates) {
        for (const s of d.motorStates) {
          const motor = this.motors.find(m => m.id === s.id);
          if (motor && s.owned !== undefined) motor.owned = s.owned;
        }
      }

      if (d.poleStates) {
        for (const s of d.poleStates) {
          const pole = this.poles.find(p => p.id === s.id);
          if (pole && s.owned !== undefined) pole.owned = s.owned;
        }
      } else if (d.equippedPoleId === 'carbon') {
        // Migrate old saves that had carbon rod equipped
        const carbon = this.poles.find(p => p.id === 'carbon');
        if (carbon) carbon.owned = true;
      }

      if (d.baitStates) {
        for (const s of d.baitStates) {
          const bait = this.baits.find(b => b.id === s.id);
          if (bait) {
            if (s.count  !== undefined) bait.count  = s.count;
            if (s.health !== undefined) bait.health = s.health;
          }
        }
      }
    } catch {}
  }
}
