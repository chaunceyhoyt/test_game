// States: waiting → qte → result
export class FishingScene {
  constructor(canvas, selector, inventory, gameTime, onDone) {
    this.canvas    = canvas;
    this.ctx       = canvas.getContext('2d');
    this.selector  = selector;
    this.inventory = inventory;
    this.gameTime  = gameTime;
    this.onDone    = onDone;

    this.state        = 'waiting';
    this.waitTimer    = 0;
    this.waitMax      = 0;

    this.qteTimer     = 0;
    this.qteTotalTime = 0;

    this.pendingFish   = null;
    this.pendingWeight = 0;

    this.resultFish   = null;
    this.resultWeight = 0;
    this.resultTimer  = 0;
    this.escaped      = false;

    this.t    = 0;
    this.spot = null;

    this._onPointerDown = this._onPointerDown.bind(this);
    canvas.addEventListener('mousedown',  this._onPointerDown);
    canvas.addEventListener('touchstart', this._onPointerDown, { passive: false });
  }

  start(spot) {
    this.spot = spot;
    this._selectFish();
    this._beginWait();
  }

  _selectFish() {
    try {
      const season    = this.gameTime.season;
      const timeOfDay = this.gameTime.timeOfDay;
      const loc       = this.spot?.location ?? 'pond';
      this.pendingFish   = this.selector.select(loc, season, timeOfDay);
      this.pendingWeight = this.pendingFish ? this.selector.randomWeight(this.pendingFish) : 0;
    } catch (err) {
      console.error('[FishingScene] _selectFish failed:', err);
      this.pendingFish   = null;
      this.pendingWeight = 0;
    }
  }

  destroy() {
    this.canvas.removeEventListener('mousedown',  this._onPointerDown);
    this.canvas.removeEventListener('touchstart', this._onPointerDown);
  }

  _onPointerDown(e) {
    e.preventDefault();

    if (this.state === 'qte') {
      this._finishQTE(true);
      return;
    }

    if (this.state === 'result') {
      this.onDone(this.resultFish && !this.escaped
        ? { fish: this.resultFish, weight: this.resultWeight }
        : null);
    }
  }

  _beginWait() {
    this.state     = 'waiting';
    this.waitMax   = 2.0 + Math.random() * 4.0;
    this.waitTimer = 0;
  }

  _beginQTE() {
    this.state = 'qte';
    const rarityBaseTime = { common: 3.0, uncommon: 2.2, rare: 1.5, epic: 1.0, legendary: 0.6 };
    const base      = rarityBaseTime[this.pendingFish?.rarity ?? 'common'] ?? 2.0;
    const polePower = this.inventory.getEquippedPole().power;
    // Each power point beyond 1 adds 0.5s to the window
    this.qteTotalTime = base + (polePower - 1) * 0.5;
    this.qteTimer     = this.qteTotalTime;
  }

  _finishQTE(caught) {
    this.state       = 'result';
    this.escaped     = !caught;
    this.resultTimer = 0;
    if (caught && this.pendingFish) {
      this.resultFish   = this.pendingFish;
      this.resultWeight = this.pendingWeight;
      this.inventory.addFish(this.pendingFish, this.pendingWeight);
    } else {
      this.resultFish = null;
    }
  }

  update(dt) {
    this.t += dt;

    if (this.state === 'waiting') {
      this.waitTimer += dt;
      if (this.waitTimer >= this.waitMax) {
        this._beginQTE();
      }
      return;
    }

    if (this.state === 'qte') {
      this.qteTimer -= dt;
      if (this.qteTimer <= 0) {
        this._finishQTE(false);
      }
      return;
    }

    if (this.state === 'result') {
      this.resultTimer += dt;
    }
  }

  draw() {
    const ctx = this.ctx;
    const cw = this.canvas.width, ch = this.canvas.height;

    // Dim overlay
    ctx.fillStyle = 'rgba(0,0,30,0.75)';
    ctx.fillRect(0, 0, cw, ch);

    // Water surface
    ctx.fillStyle = this.gameTime.waterColor;
    ctx.fillRect(0, 0, cw, ch * 0.3);
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= cw; x += 20) {
        const wy = ch * 0.15 + i * 18 + Math.sin((x / cw) * Math.PI * 4 + this.t + i) * 4;
        x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }

    // Fishing line
    const biting    = this.state === 'qte';
    const bobbleAmp = biting ? Math.sin(this.t * 12) * 5 : Math.sin(this.t * 1.2) * 2;
    const lineEndX  = cw / 2 + Math.sin(this.t * 0.5) * 20;
    const lineEndY  = ch * 0.25 + bobbleAmp;
    ctx.strokeStyle = 'rgba(220,220,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cw / 2, 0); ctx.lineTo(lineEndX, lineEndY); ctx.stroke();

    // Bobber
    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.arc(lineEndX, lineEndY, biting ? 8 : 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(lineEndX, lineEndY - 3, biting ? 8 : 6, 0, Math.PI); ctx.fill();

    // Splash rings when biting
    if (biting) {
      ctx.strokeStyle = 'rgba(100,200,255,0.5)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const r = 14 + i * 8 + ((this.t * 3 + i) % 1) * 8;
        ctx.globalAlpha = 0.5 - i * 0.15;
        ctx.beginPath(); ctx.arc(lineEndX, lineEndY, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Panel
    const pw = Math.min(cw * 0.9, 360);
    const px = (cw - pw) / 2;
    const py = ch * 0.35;
    const ph = ch * 0.55;
    this._drawPanel(px, py, pw, ph);

    if (this.state === 'waiting') this._drawWaiting(px, py, pw, ph);
    if (this.state === 'qte')     this._drawQTE(px, py, pw, ph);
    if (this.state === 'result')  this._drawResult(px, py, pw, ph);
  }

  _drawPanel(px, py, pw, ph) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(10,15,40,0.92)';
    this._roundRect(px, py, pw, ph, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,180,255,0.25)';
    ctx.lineWidth = 1.5;
    this._roundRect(px, py, pw, ph, 20);
    ctx.stroke();
  }

  _drawWaiting(px, py, pw, ph) {
    const ctx = this.ctx;
    const cx  = px + pw / 2;

    ctx.textAlign = 'center';

    // Location / conditions
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '12px sans-serif';
    ctx.fillText(`📍 ${this.spot?.label ?? ''} · ${this.gameTime.timeOfDay} · ${this.gameTime.season}`, cx, py + ph * 0.28);

    // Waiting text
    const dots = '.'.repeat(1 + Math.floor(this.t * 2) % 3);
    ctx.fillStyle = 'rgba(150,200,255,0.8)';
    ctx.font = '15px sans-serif';
    ctx.fillText(`Waiting for a bite${dots}`, cx, py + ph * 0.45);

    // Bobbing fish
    const bob = Math.sin(this.t * 1.8) * 6;
    ctx.font = '42px sans-serif';
    ctx.fillText('🐟', cx, py + ph * 0.65 + bob);

    // Equipped rod
    const pole = this.inventory.getEquippedPole();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px sans-serif';
    ctx.fillText(`🎣 ${pole.name}  (power ${pole.power})`, cx, py + ph * 0.88);
  }

  _drawQTE(px, py, pw, ph) {
    const ctx      = this.ctx;
    const cx       = px + pw / 2;
    const cy       = py + ph * 0.56;
    const radius   = Math.min(pw * 0.27, 75);
    const progress = Math.max(0, this.qteTimer / this.qteTotalTime);

    const rarityColors = { common:'#9E9E9E', uncommon:'#4CAF50', rare:'#2196F3', epic:'#9C27B0', legendary:'#FF9800' };
    const rc = rarityColors[this.pendingFish?.rarity ?? 'common'] ?? '#9E9E9E';

    // Fish name + rarity
    ctx.textAlign = 'center';
    ctx.fillStyle = rc;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(this.pendingFish?.name ?? '???', cx, py + ph * 0.18);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${(this.pendingFish?.rarity ?? '').toUpperCase()} · ${this.pendingWeight} lbs`, cx, py + ph * 0.27);

    // Track ring
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();

    // Progress arc (green → yellow → red)
    const arcColor = progress > 0.5 ? '#4CAF50' : progress > 0.25 ? '#FFC107' : '#EF5350';
    ctx.strokeStyle = arcColor;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Fish silhouette inside circle
    this._drawFishSilhouette(cx, cy, radius * 0.9, radius * 0.45, rc, false);

    // TAP! label (pulses)
    const pulse = 1 + Math.sin(this.t * 10) * 0.07;
    ctx.fillStyle = arcColor;
    ctx.font = `bold ${Math.round(22 * pulse)}px sans-serif`;
    ctx.fillText('TAP!', cx, cy + radius + 28);

    // Countdown seconds
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '11px sans-serif';
    ctx.fillText(this.qteTimer.toFixed(1) + 's', cx, cy + radius + 46);
  }

  _drawResult(px, py, pw, ph) {
    const ctx = this.ctx;
    const cx  = px + pw / 2;

    ctx.textAlign = 'center';

    if (this.escaped) {
      ctx.fillStyle = '#EF5350';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('It got away! 😞', cx, py + ph * 0.38);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '14px sans-serif';
      ctx.fillText('Tap to try again', cx, py + ph * 0.56);
    } else if (this.resultFish) {
      const rarityColors = { common:'#9E9E9E', uncommon:'#4CAF50', rare:'#2196F3', epic:'#9C27B0', legendary:'#FF9800' };
      const rc = rarityColors[this.resultFish.rarity] ?? '#9E9E9E';

      const flash = Math.min(1, this.resultTimer / 0.5);
      ctx.globalAlpha = flash;

      ctx.fillStyle = rc;
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('🎉  CAUGHT!', cx, py + ph * 0.28);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(this.resultFish.name, cx, py + ph * 0.44);

      ctx.fillStyle = rc;
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(this.resultFish.rarity.toUpperCase(), cx, py + ph * 0.54);

      ctx.fillStyle = '#FFEB3B';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`⚖️ ${this.resultWeight} lbs  |  💰 ${Math.round(this.resultFish.value)} coins`, cx, py + ph * 0.64);

      this._drawFishSilhouette(cx, py + ph * 0.80, 80, 40, this.resultFish.color, true);

      ctx.globalAlpha = Math.max(0, this.resultTimer - 0.8);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '13px sans-serif';
      ctx.fillText('Tap to continue', cx, py + ph * 0.94);
      ctx.globalAlpha = 1;
    }
  }

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x,     y + h, x,     y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x,     y,     x + r, y,         r);
    ctx.closePath();
  }

  _drawFishSilhouette(cx, cy, w, h, color, detailed) {
    const ctx = this.ctx;
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.ellipse(cx - w * 0.05, cy, w * 0.38, h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + w * 0.32, cy);
    ctx.lineTo(cx + w * 0.55, cy - h * 0.4);
    ctx.lineTo(cx + w * 0.55, cy + h * 0.4);
    ctx.closePath(); ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - w * 0.1,  cy - h * 0.38);
    ctx.lineTo(cx + w * 0.08, cy - h * 0.6);
    ctx.lineTo(cx + w * 0.22, cy - h * 0.38);
    ctx.closePath(); ctx.fill();

    if (detailed) {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(cx + i * w * 0.08 - w * 0.05, cy, h * 0.18, 0.3, Math.PI - 0.3);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx - w * 0.22, cy - h * 0.06, h * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(cx - w * 0.22, cy - h * 0.06, h * 0.06, 0, Math.PI * 2); ctx.fill();
    }
  }
}
