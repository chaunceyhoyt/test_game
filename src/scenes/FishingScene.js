// States: waiting → qte → reel → result
export class FishingScene {
  constructor(canvas, selector, inventory, gameTime, onDone) {
    this.canvas    = canvas;
    this.ctx       = canvas.getContext('2d');
    this.selector  = selector;
    this.inventory = inventory;
    this.gameTime  = gameTime;
    this.onDone    = onDone;

    this.state     = 'waiting';
    this.waitTimer = 0;
    this.waitMax   = 0;

    this.qteTimer     = 0;
    this.qteTotalTime = 0;

    this.reelPos     = 0.5;
    this.zoneMin     = 0.35;
    this.zoneMax     = 0.65;
    this.zoneDir     = 1;
    this.zoneSpeed   = 0.22;
    this.catchMeter  = 0;
    this.reelHeld    = false;

    this.pendingFish   = null;
    this.pendingWeight = 0;

    this.resultFish   = null;
    this.resultWeight = 0;
    this.resultTimer  = 0;
    this.escaped      = false;

    this.t    = 0;
    this.spot = null;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp   = this._onPointerUp.bind(this);
    canvas.addEventListener('mousedown',  this._onPointerDown);
    canvas.addEventListener('mouseup',    this._onPointerUp);
    canvas.addEventListener('touchstart', this._onPointerDown, { passive: false });
    canvas.addEventListener('touchend',   this._onPointerUp,   { passive: false });
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
    this.canvas.removeEventListener('mouseup',    this._onPointerUp);
    this.canvas.removeEventListener('touchstart', this._onPointerDown);
    this.canvas.removeEventListener('touchend',   this._onPointerUp);
  }

  _onPointerDown(e) {
    e.preventDefault();
    this.reelHeld = true;

    if (this.state === 'qte') {
      this._beginReel();
      return;
    }

    if (this.state === 'result') {
      this.onDone(this.resultFish && !this.escaped
        ? { fish: this.resultFish, weight: this.resultWeight }
        : null);
    }
  }

  _onPointerUp() {
    this.reelHeld = false;
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
    this.qteTotalTime = base + (polePower - 1) * 0.5;
    this.qteTimer     = this.qteTotalTime;
  }

  _beginReel() {
    this.state      = 'reel';
    this.reelPos    = 0.15;  // start near left — player reels right toward win
    this.catchMeter = 1.0;   // starts full, drains when hook outside zone
    this.zoneDir    = 1;

    const rarity    = this.pendingFish?.rarity ?? 'common';
    const polePower = this.inventory.getEquippedPole().power;

    // Zone speed: rarer fish fight harder
    const raritySpeed = { common: 0.18, uncommon: 0.25, rare: 0.32, epic: 0.42, legendary: 0.55 };
    this.zoneSpeed = raritySpeed[rarity] ?? 0.22;

    // Window size: rarer = smaller, higher pole power = larger
    const rarityWindow = { common: 0.30, uncommon: 0.26, rare: 0.22, epic: 0.18, legendary: 0.14 };
    const win = Math.min(0.48, (rarityWindow[rarity] ?? 0.28) + (polePower - 1) * 0.03);

    this.zoneMin = 0.5 - win / 2;
    this.zoneMax = 0.5 + win / 2;

    // Drain rate when outside zone: rarer fish drain faster
    const rarityDrain = { common: 0.15, uncommon: 0.20, rare: 0.28, epic: 0.38, legendary: 0.50 };
    this.meterDrain = rarityDrain[rarity] ?? 0.20;
  }

  _finishReel(caught) {
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
      if (this.waitTimer >= this.waitMax) this._beginQTE();
      return;
    }

    if (this.state === 'qte') {
      this.qteTimer -= dt;
      if (this.qteTimer <= 0) {
        // Fish got away — short wait then try again
        this._beginWait();
      }
      return;
    }

    if (this.state === 'reel') {
      // Zone oscillates
      this.zoneMin += dt * this.zoneDir * this.zoneSpeed;
      this.zoneMax += dt * this.zoneDir * this.zoneSpeed;
      if (this.zoneMax >= 0.92 || this.zoneMin <= 0.08) this.zoneDir *= -1;

      // Hook: hold = reel right toward win, release = fish pulls back left
      const target = this.reelHeld ? this.reelPos + dt * 0.30 : this.reelPos - dt * 0.38;
      this.reelPos = Math.max(0, Math.min(1, target));

      // Meter drains only when hook is outside the zone
      const inZone = this.reelPos >= this.zoneMin && this.reelPos <= this.zoneMax;
      if (!inZone) {
        this.catchMeter = Math.max(0, this.catchMeter - dt * this.meterDrain);
      }

      if (this.reelPos  >= 0.95) this._finishReel(true);   // reeled in!
      if (this.catchMeter <= 0)  this._finishReel(false);  // meter emptied = escaped
      return;
    }

    if (this.state === 'result') {
      this.resultTimer += dt;
    }
  }

  // ── Drawing ──────────────────────────────────────────────────────────────────

  draw() {
    const ctx = this.ctx;
    const cw = this.canvas.width, ch = this.canvas.height;

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

    // Fishing line + bobber
    const biting   = this.state === 'qte' || this.state === 'reel';
    const bobbleAmp = biting ? Math.sin(this.t * 12) * 5 : Math.sin(this.t * 1.2) * 2;
    const lineEndX  = cw / 2 + Math.sin(this.t * 0.5) * 20;
    const lineEndY  = ch * 0.25 + bobbleAmp;

    ctx.strokeStyle = 'rgba(220,220,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cw / 2, 0); ctx.lineTo(lineEndX, lineEndY); ctx.stroke();

    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.arc(lineEndX, lineEndY, biting ? 8 : 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(lineEndX, lineEndY - 3, biting ? 8 : 6, 0, Math.PI); ctx.fill();

    if (biting) {
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const r = 14 + i * 8 + ((this.t * 3 + i) % 1) * 8;
        ctx.strokeStyle = `rgba(100,200,255,${0.5 - i * 0.15})`;
        ctx.beginPath(); ctx.arc(lineEndX, lineEndY, r, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // Panel
    const pw = Math.min(cw * 0.9, 360);
    const px = (cw - pw) / 2;
    const py = ch * 0.35;
    const ph = ch * 0.55;
    this._drawPanel(px, py, pw, ph);

    if (this.state === 'waiting') this._drawWaiting(px, py, pw, ph);
    if (this.state === 'qte')     this._drawQTE(px, py, pw, ph);
    if (this.state === 'reel')    this._drawReel(px, py, pw, ph);
    if (this.state === 'result')  this._drawResult(px, py, pw, ph);
  }

  _drawPanel(px, py, pw, ph) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(10,15,40,0.92)';
    this._roundRect(px, py, pw, ph, 20); ctx.fill();
    ctx.strokeStyle = 'rgba(100,180,255,0.25)';
    ctx.lineWidth = 1.5;
    this._roundRect(px, py, pw, ph, 20); ctx.stroke();
  }

  _drawWaiting(px, py, pw, ph) {
    const ctx = this.ctx;
    const cx  = px + pw / 2;
    ctx.textAlign = 'center';

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '12px sans-serif';
    ctx.fillText(`📍 ${this.spot?.label ?? ''} · ${this.gameTime.timeOfDay} · ${this.gameTime.season}`, cx, py + ph * 0.28);

    const dots = '.'.repeat(1 + Math.floor(this.t * 2) % 3);
    ctx.fillStyle = 'rgba(150,200,255,0.8)';
    ctx.font = '15px sans-serif';
    ctx.fillText(`Waiting for a bite${dots}`, cx, py + ph * 0.45);

    const bob = Math.sin(this.t * 1.8) * 6;
    ctx.font = '42px sans-serif';
    ctx.fillText('🐟', cx, py + ph * 0.65 + bob);

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

    // Shrinking arc
    const arcColor = progress > 0.5 ? '#4CAF50' : progress > 0.25 ? '#FFC107' : '#EF5350';
    ctx.strokeStyle = arcColor;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = 'butt';

    this._drawFishSilhouette(cx, cy, radius * 0.9, radius * 0.45, rc, false);

    const pulse = 1 + Math.sin(this.t * 10) * 0.07;
    ctx.fillStyle = arcColor;
    ctx.font = `bold ${Math.round(22 * pulse)}px sans-serif`;
    ctx.fillText('TAP!', cx, cy + radius + 28);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '11px sans-serif';
    ctx.fillText(this.qteTimer.toFixed(1) + 's', cx, cy + radius + 46);
  }

  _drawReel(px, py, pw, ph) {
    const ctx = this.ctx;
    const cx  = px + pw / 2;

    const rarityColors = { common:'#9E9E9E', uncommon:'#4CAF50', rare:'#2196F3', epic:'#9C27B0', legendary:'#FF9800' };
    const rc = rarityColors[this.pendingFish?.rarity] ?? '#9E9E9E';

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('HOLD TO REEL IN!', cx, py + 36);

    ctx.fillStyle = rc;
    ctx.font = '13px sans-serif';
    ctx.fillText(`${this.pendingFish?.name ?? '???'} on the line!`, cx, py + 56);

    // Reel bar
    const bw = pw * 0.82, bh = 28;
    const bx = px + (pw - bw) / 2;
    const by = py + ph * 0.38;

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    this._roundRect(bx, by, bw, bh, 14); ctx.fill();

    // Green zone
    const zx = bx + this.zoneMin * bw;
    const zw = (this.zoneMax - this.zoneMin) * bw;
    ctx.fillStyle = 'rgba(76,175,80,0.5)';
    ctx.fillRect(zx, by, zw, bh);
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.strokeRect(zx, by, zw, bh);

    // Hook indicator
    const hx     = bx + this.reelPos * bw;
    const inZone = this.reelPos >= this.zoneMin && this.reelPos <= this.zoneMax;
    ctx.fillStyle = inZone ? '#FFEB3B' : '#EF5350';
    ctx.beginPath(); ctx.arc(hx, by + bh / 2, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = inZone ? '#F9A825' : '#B71C1C';
    ctx.lineWidth = 2; ctx.stroke();

    // Catch meter
    const mw = pw * 0.7, mh = 14;
    const mx = px + (pw - mw) / 2;
    const my = by + bh + 22;

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this._roundRect(mx, my, mw, mh, 7); ctx.fill();

    // Meter starts full and drains — color goes green → yellow → red
    const meterColor = this.catchMeter > 0.6 ? '#4CAF50' : this.catchMeter > 0.3 ? '#FFC107' : '#EF5350';
    ctx.fillStyle = meterColor;
    this._roundRect(mx, my, mw * this.catchMeter, mh, 7); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px sans-serif';
    ctx.fillText('LINE TENSION', cx, my - 6);

    // Win marker at right edge of reel bar
    ctx.fillStyle = '#FFEB3B';
    ctx.font = '11px sans-serif';
    ctx.fillText('🏁', bx + bw, by - 6);

    this._drawFishSilhouette(cx, py + ph * 0.78, 70, 35, rc, true);
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
