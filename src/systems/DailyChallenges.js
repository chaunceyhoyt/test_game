// Pokemon Go-style daily field research challenge system.
// Generates 3 random challenges per day from a pool of 12 templates.
// Progress is tracked in real-time via onFishCaught / onFishSold callbacks.

const CHALLENGE_POOL = [
  { id: 'catch3',     type: 'catch_count',   target: 3,  reward: 25,  icon: '🎣', desc: 'Catch 3 fish' },
  { id: 'catch5',     type: 'catch_count',   target: 5,  reward: 50,  icon: '🎣', desc: 'Catch 5 fish' },
  { id: 'catch10',    type: 'catch_count',   target: 10, reward: 100, icon: '🎣', desc: 'Catch 10 fish' },
  { id: 'uncommon',   type: 'catch_rarity',  rarity: 'uncommon',    target: 1, reward: 75,  icon: '🟢', desc: 'Catch an uncommon fish' },
  { id: 'rare',       type: 'catch_rarity',  rarity: 'rare',        target: 1, reward: 150, icon: '🔵', desc: 'Catch a rare fish' },
  { id: 'epic',       type: 'catch_rarity',  rarity: 'epic',        target: 1, reward: 300, icon: '🟣', desc: 'Catch an epic fish' },
  { id: 'over5lbs',   type: 'catch_weight',  minWeight: 5,  target: 1, reward: 60,  icon: '⚖️', desc: 'Catch a fish over 5 lbs' },
  { id: 'over10lbs',  type: 'catch_weight',  minWeight: 10, target: 1, reward: 120, icon: '⚖️', desc: 'Catch a fish over 10 lbs' },
  { id: 'species3',   type: 'catch_species', target: 3,  reward: 80,  icon: '📖', desc: 'Catch 3 different species' },
  { id: 'sell3',      type: 'sell_count',    target: 3,  reward: 40,  icon: '💰', desc: 'Sell 3 fish' },
  { id: 'rain_fish',  type: 'catch_weather', weather: 'rain',         target: 1, reward: 80,  icon: '🌧', desc: 'Catch a fish in the rain' },
  { id: 'storm_fish', type: 'catch_weather', weather: 'thunderstorm', target: 1, reward: 120, icon: '⛈', desc: 'Catch a fish in a thunderstorm' },
];

const DAILY_BONUS_REWARD = 200;

export class DailyChallenges {
  constructor() {
    this.day           = 1;
    this._challenges   = [];
    this._bonusClaimed = false;
    this._generateDay();
  }

  get bonusClaimed() { return this._bonusClaimed; }
  get challenges()   { return this._challenges; }

  newDay() {
    this.day++;
    this._bonusClaimed = false;
    this._generateDay();
  }

  _generateDay() {
    const pool   = [...CHALLENGE_POOL];
    const picked = [];
    while (picked.length < 3 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    this._challenges = picked.map(template => ({
      template,
      progress:   0,
      claimed:    false,
      speciesSet: new Set(),
    }));
  }

  onFishCaught(fishDef, weight, currentWeather) {
    if (!fishDef) return;
    for (const slot of this._challenges) {
      if (slot.claimed) continue;
      const t = slot.template;
      switch (t.type) {
        case 'catch_count':
          slot.progress = Math.min(t.target, slot.progress + 1);
          break;
        case 'catch_rarity':
          if (fishDef.rarity === t.rarity) slot.progress = Math.min(t.target, slot.progress + 1);
          break;
        case 'catch_weight':
          if (weight >= t.minWeight) slot.progress = Math.min(t.target, slot.progress + 1);
          break;
        case 'catch_species':
          slot.speciesSet.add(fishDef.id);
          slot.progress = Math.min(t.target, slot.speciesSet.size);
          break;
        case 'catch_weather':
          if (currentWeather === t.weather) slot.progress = Math.min(t.target, slot.progress + 1);
          break;
      }
    }
  }

  onFishSold(count, _earned) {
    for (const slot of this._challenges) {
      if (slot.claimed) continue;
      if (slot.template.type === 'sell_count') {
        slot.progress = Math.min(slot.template.target, slot.progress + count);
      }
    }
  }

  isComplete(i) {
    const slot = this._challenges[i];
    return slot ? slot.progress >= slot.template.target : false;
  }

  getProgress(i) {
    const slot = this._challenges[i];
    if (!slot) return { current: 0, total: 1 };
    return { current: slot.progress, total: slot.template.target };
  }

  claimReward(i, inventory) {
    const slot = this._challenges[i];
    if (!slot || !this.isComplete(i) || slot.claimed) return 0;
    slot.claimed = true;
    inventory.money += slot.template.reward;
    inventory.save();
    return slot.template.reward;
  }

  allComplete() {
    return this._challenges.every((_, i) => this.isComplete(i));
  }

  claimBonus(inventory) {
    if (!this._challenges.every(s => s.claimed)) return 0;
    if (this._bonusClaimed) return 0;
    this._bonusClaimed = true;
    inventory.money += DAILY_BONUS_REWARD;
    inventory.save();
    return DAILY_BONUS_REWARD;
  }
}
