// States: cast → waiting → reel → result
export class FishingScene {
  constructor(canvas, selector, inventory, gameTime, onDone) {
    this.canvas    = canvas;
    this.ctx       = canvas.getContext('2d');
    this.selector  = selector;
    this.inventory = inventory;
    this.gameTime  = gameTime;
    this.onDone    = onDone;

    this.state      = 'cast';
    this.castPower  = 0;
    this.castDir    = 1;       // bar direction
    this.castLocked = false;

    this.waitTimer  = 0;
    this.waitMax    = 0;
    this.nibbleFlash = 0;

    this.reelPos    = 0.5;    // hook position 0–1
    this.zoneMin    = 0.35;   // catch zone bounds
    this.zoneMax    = 0.65;
    this.zoneDir    = 1;
    this.zoneSpeed  = 0.22;
    this.catchMeter = 0;
    this.catchTarget = 1;
    this.reelHeld   = false;

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
    this.spot      = spot;
    this.state     = 'cast';
    this.castPower = 0;
    this.castDir   = 1;
    this.castLocked= false;
    this._selectFish();
  }

  _selectFish() {
    const { season, timeOfDay } = this.gameTime;
    const loc = this.spot?.location ?? 'pond';
    this.pendingFish   = this.selector.select(loc, season, timeOfDay);
    this.pendingWeight = this.pendingFish ? this.selector.randomWeight(this.pendingFish) : 0;
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

    if (this.state === 'cast' && !this.castLocked) {
      this.castLocked = true;
      this._beginWait();
      return;
    }

    if (this.state === 'waiting') {
      if (this.nibbleFlash > 0) {
        this._beginReel();
      }
      return;
    }

    if (this.state === 'result') {
      this.onDone(this.resultFish && !this.escaped ? { fish: this.resultFish, weight: this.resultWeight } : null);
    }
  }

  _onPointerUp() {
    this.reelHeld = false;
  }

  _beginWait() {
    this.state = 'waiting';
    this.waitMax = 1.5 + Math.random() * 3.5;
    this.waitTimer = 0;
    this.nibbleFlash = 0;
  }

  _beginReel() {
    this.state     = 'reel';
    this.reelPos   = 0.5;
    this.zoneMin   = 0.3 + Math.random() * 0.15;
    this.zoneMax   = this.zoneMin + 0.20 + Math.random() * 0.15;
    this.zoneDir   = 1;
    this.catchMeter= 0;
    // Rarer fish = faster zone, smaller window
    const raritySpeed = { common: 0.18, uncommon: 0.25, rare: 0.32, epic: 0.42, legendary: 0.55 };
    this.zoneSpeed = raritySpeed[this.pendingFish?.rarity ?? 'common'] ?? 0.2;
    const rarityWindow = { common: 0.30, uncommon: 0.26, rare: 0.22, epic: 0.18, legendary: 0.14 };
    const win = rarityWindow[this.pendingFish?.rarity ?? 'common'] ?? 0.28;
    this.zoneMax = Math.min(0.9, this.zoneMin + win);
  }

  update(dt) {
    this.t += dt;

    if (this.state === 'cast') {
      if (!this.castLocked) {
        this.castPower += dt * this.castDir * 0.8;
        if (this.castPower >= 1) { this.castPower = 1; this.castDir = -1; }
        if (this.castPower <= 0) { this.castPower = 0; this.castDir = 1; }
      }
      return;
    }

    if (this.state === 'waiting') {
      this.waitTimer += dt;
      if (this.waitTimer >= this.waitMax) {
        this.nibbleFlash = 2.0; // seconds to tap
      }
      if (this.nibbleFlash > 0) {
        this.nibbleFlash -= dt;
        if (this.nibbleFlash <= 0) {
          // Missed the bite — try again
          this._beginWait();
        }
      }
      return;
    }

    if (this.state === 'reel') {
      // Zone oscillates
      this.zoneMin += dt * this.zoneDir * this.zoneSpeed;
      this.zoneMax += dt * this.zoneDir * this.zoneSpeed;
      if (this.zoneMax >= 0.92 || this.zoneMin <= 0.08) this.zoneDir *= -1;

      // Hook physics: held = reel up (right), released = fish pulls left
      const hookTarget = this.reelHeld ? this.reelPos + dt * 0.45 : this.reelPos - dt * 0.3;
      this.reelPos = Math.max(0, Math.min(1, hookTarget));

      // Catch meter
      const inZone = this.reelPos >= this.zoneMin && this.reelPos <= this.zoneMax;
      this.catchMeter += inZone ? dt * 0.28 : -dt * 0.22;
      this.catchMeter = Math.max(0, Math.min(1, this.catchMeter));

      if (this.catchMeter >= 1) { this._finishReel(true); }
      if (this.catchMeter <= 0 && this.reelPos <= 0.01) { this._finishReel(false); }
      return;
    }

    if (this.state === 'result') {
      this.resultTimer += dt;
    }
  }

  _finishReel(caught) {
    this.state = 'result';
    this.escaped = !caught;
    this.resultTimer = 0;
    if (caught && this.pendingFish) {
      this.resultFish   = this.pendingFish;
      this.resultWeight = this.pendingWeight;
      this.inventory.addFish(this.pendingFish, this.pendingWeight);
    } else {
      this.resultFish = null;
    }
  }

  draw() {
    const ctx = this.ctx;
    const cw = this.canvas.width, ch = this.canvas.height;

    // Dim overlay behind panel
    ctx.fillStyle = 'rgba(0,0,30,0.75)';
    ctx.fillRect(0, 0, cw, ch);

    // Animated water surface at top
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

    // Fishing line from top-center
    const lineEndX = cw / 2 + Math.sin(this.t * 0.5) * 20;
    const lineEndY = ch * 0.25;
    ctx.strokeStyle = 'rgba(220,220,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cw / 2, 0); ctx.lineTo(lineEndX, lineEndY); ctx.stroke();

    // Bobber
    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.arc(lineEndX, lineEndY, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(lineEndX, lineEndY - 3, 6, 0, Math.PI); ctx.fill();

    // Panel
    const pw = Math.min(cw * 0.9, 360);
    const px = (cw - pw) / 2;
    const py = ch * 0.35;
    const ph = ch * 0.55;
    this._drawPanel(px, py, pw, ph);

    if (this.state === 'cast')    this._drawCast(px, py, pw, ph);
    if (this.state === 'waiting') this._drawWaiting(px, py, pw, ph);
    if (this.state === 'reel')    this._drawReel(px, py, pw, ph);
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

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  _drawCast(px, py, pw, ph) {
    const ctx = this.ctx;
    const cx = px + pw / 2, cy = py + ph * 0.3;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAP TO CAST', cx, py + 40);

    // Location info
    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(150,200,255,0.8)';
    ctx.fillText(`📍 ${this.spot?.label ?? 'Unknown'} • ${this.gameTime.timeOfDay} • ${this.gameTime.season}`, cx, py + 62);

    // Power bar
    const bw = pw * 0.75, bh = 22;
    const bx = px + (pw - bw) / 2, by = cy + 10;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    this._roundRect(bx, by, bw, bh, 11); ctx.fill();

    const powerColor = this.castPower > 0.75 ? '#FF5722' : this.castPower > 0.5 ? '#FFC107' : '#4CAF50';
    ctx.fillStyle = powerColor;
    this._roundRect(bx, by, bw * this.castPower, bh, 11); ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('POWER', cx, by - 6);
    ctx.fillText(`${Math.round(this.castPower * 100)}%`, cx, by + bh + 18);

    if (this.castLocked) {
      ctx.fillStyle = '#FFC107';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('🎣  Casting...', cx, by + bh + 44);
    }
  }

  _drawWaiting(px, py, pw, ph) {
    const ctx = this.ctx;
    const cx = px + pw / 2;

    const dots = '.'.repeat(1 + Math.floor(this.t * 2) % 3);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';

    if (this.nibbleFlash > 0) {
      // BITE alert — flash red/yellow
      const flash = Math.sin(this.t * 25) > 0;
      ctx.fillStyle = flash ? '#FF5722' : '#FFC107';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('❗  TAP NOW!', cx, py + ph * 0.42);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(`${this.nibbleFlash.toFixed(1)}s`, cx, py + ph * 0.58);
    } else {
      ctx.fillStyle = 'rgba(150,200,255,0.8)';
      ctx.font = '14px sans-serif';
      ctx.fillText(`Waiting for a bite${dots}`, cx, py + ph * 0.45);

      // Idle fish icon bobbing
      const bob = Math.sin(this.t * 1.8) * 6;
      ctx.font = '40px sans-serif';
      ctx.fillText('🐟', cx, py + ph * 0.65 + bob);
    }
  }

  _drawReel(px, py, pw, ph) {
    const ctx = this.ctx;
    const cx = px + pw / 2;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOLD TO REEL IN!', cx, py + 36);

    const rarityColors = { common:'#9E9E9E', uncommon:'#4CAF50', rare:'#2196F3', epic:'#9C27B0', legendary:'#FF9800' };
    const rc = rarityColors[this.pendingFish?.rarity] ?? '#9E9E9E';
    ctx.fillStyle = rc;
    ctx.font = '13px sans-serif';
    ctx.fillText(`${this.pendingFish?.name ?? '???'} on the line!`, cx, py + 56);

    // Reel bar
    const bw = pw * 0.82, bh = 28;
    const bx = px + (pw - bw) / 2;
    const by = py + ph * 0.38;

    // Track
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    this._roundRect(bx, by, bw, bh, 14); ctx.fill();

    // Zone (green)
    const zx = bx + this.zoneMin * bw;
    const zw = (this.zoneMax - this.zoneMin) * bw;
    ctx.fillStyle = 'rgba(76,175,80,0.5)';
    ctx.fillRect(zx, by, zw, bh);
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.strokeRect(zx, by, zw, bh);

    // Hook indicator
    const hx = bx + this.reelPos * bw;
    const inZone = this.reelPos >= this.zoneMin && this.reelPos <= this.zoneMax;
    ctx.fillStyle = inZone ? '#FFEB3B' : '#EF5350';
    ctx.beginPath(); ctx.arc(hx, by + bh / 2, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = inZone ? '#F9A825' : '#B71C1C';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Catch meter
    const mw = pw * 0.7, mh = 14;
    const mx = px + (pw - mw) / 2;
    const my = by + bh + 22;

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this._roundRect(mx, my, mw, mh, 7); ctx.fill();

    const meterColor = this.catchMeter > 0.7 ? '#4CAF50' : this.catchMeter > 0.4 ? '#FFC107' : '#EF5350';
    ctx.fillStyle = meterColor;
    this._roundRect(mx, my, mw * this.catchMeter, mh, 7); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px sans-serif';
    ctx.fillText('CATCH METER', cx, my - 6);

    // Fish illustration
    this._drawFishSilhouette(cx, py + ph * 0.78, 70, 35, rc, true);
  }

  _drawResult(px, py, pw, ph) {
    const ctx = this.ctx;
    const cx = px + pw / 2;

    if (this.escaped) {
      ctx.fillStyle = '#EF5350';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('It got away! 😞', cx, py + ph * 0.38);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '14px sans-serif';
      ctx.fillText('Tap to try again', cx, py + ph * 0.56);
    } else if (this.resultFish) {
      const rarityColors = { common:'#9E9E9E', uncommon:'#4CAF50', rare:'#2196F3', epic:'#9C27B0', legendary:'#FF9800' };
      const rc = rarityColors[this.resultFish.rarity] ?? '#9E9E9E';

      // Flash animation
      const flash = Math.min(1, this.resultTimer / 0.5);
      ctx.globalAlpha = flash;

      ctx.fillStyle = rc;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
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

  _drawFishSilhouette(cx, cy, w, h, color, detailed) {
    const ctx = this.ctx;
    ctx.fillStyle = color;

    // Body
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.05, cy, w * 0.38, h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.32, cy);
    ctx.lineTo(cx + w * 0.55, cy - h * 0.4);
    ctx.lineTo(cx + w * 0.55, cy + h * 0.4);
    ctx.closePath(); ctx.fill();

    // Dorsal fin
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.1, cy - h * 0.38);
    ctx.lineTo(cx + w * 0.08, cy - h * 0.6);
    ctx.lineTo(cx + w * 0.22, cy - h * 0.38);
    ctx.closePath(); ctx.fill();

    if (detailed) {
      // Scales hint
      ctx.strokeStyle = `rgba(0,0,0,0.15)`;
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(cx + i * w * 0.08 - w * 0.05, cy, h * 0.18, 0.3, Math.PI - 0.3);
        ctx.stroke();
      }
      // Eye
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx - w * 0.22, cy - h * 0.06, h * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(cx - w * 0.22, cy - h * 0.06, h * 0.06, 0, Math.PI * 2); ctx.fill();
    }
  }
}
