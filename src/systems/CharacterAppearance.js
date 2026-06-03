const SAVE_KEY = 'fishgame_appearance_v1';

export const DEFAULTS = {
  furColor:   '#FFCC80',
  shirtColor: '#1976D2',
  pantsColor: '#37474F',
};

export class CharacterAppearance {
  constructor() {
    this.furColor   = DEFAULTS.furColor;
    this.shirtColor = DEFAULTS.shirtColor;
    this.pantsColor = DEFAULTS.pantsColor;
    this.load();
  }

  set(key, value) {
    this[key] = value;
    this.save();
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        furColor:   this.furColor,
        shirtColor: this.shirtColor,
        pantsColor: this.pantsColor,
      }));
    } catch {}
  }

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!d) return;
      this.furColor   = d.furColor   ?? DEFAULTS.furColor;
      this.shirtColor = d.shirtColor ?? DEFAULTS.shirtColor;
      this.pantsColor = d.pantsColor ?? DEFAULTS.pantsColor;
    } catch {}
  }
}
