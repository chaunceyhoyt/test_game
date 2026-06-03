export class GameTime {
  constructor() {
    this.gameMinutes = 480; // Start at 8:00 AM
    this.speed = 60;        // 1 real second = 1 game minute
  }

  update(dt) {
    this.gameMinutes = (this.gameMinutes + dt * this.speed) % 1440;
  }

  get hour() { return Math.floor(this.gameMinutes / 60) % 24; }
  get minute() { return Math.floor(this.gameMinutes % 60); }

  get timeOfDay() {
    const h = this.hour;
    if (h >= 5 && h < 9)  return 'morning';
    if (h >= 9 && h < 17) return 'afternoon';
    if (h >= 17 && h < 21) return 'evening';
    return 'night';
  }

  get season() {
    const m = new Date().getMonth();
    if (m >= 2 && m <= 4) return 'spring';
    if (m >= 5 && m <= 7) return 'summer';
    if (m >= 8 && m <= 10) return 'fall';
    return 'winter';
  }

  get displayTime() {
    const h12 = this.hour % 12 || 12;
    const ampm = this.hour < 12 ? 'AM' : 'PM';
    return `${h12}:${String(this.minute).padStart(2, '0')} ${ampm}`;
  }

  get skyColor() {
    const colors = { morning: '#FFB86C', afternoon: '#87CEEB', evening: '#FF7043', night: '#1A237E' };
    return colors[this.timeOfDay];
  }

  get waterColor() {
    const colors = { morning: '#4A8FA8', afternoon: '#1565C0', evening: '#37474F', night: '#0D1B2A' };
    return colors[this.timeOfDay];
  }
}
