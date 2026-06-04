// States: waiting → qte_hook → reel ↔ qte_boost (loop) → result
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

    // QTE hook (initial)
    this.qteTimer     = 0;
    this.qteTotalTime = 0;

    // Reel bar
    this.reelPos         = 0.15;
    this.zoneMin         = 0.35;
    this.zoneMax         = 0.65;
    this.zoneDir         = 1;
    this.zoneSpeed       = 0.22;
    this.zoneBaseSpeed   = 0.22;
    this.zoneSpeedModTimer = 0;
    this.reelHeld        = false;

    // Double-tap jump
    this.lastTapTime     = 0;
    this.jumpCooldown    = 0;
    this.jumpCooldownMax = 2.0;
    this.jumpFlash       = 0;

    // Deferred vibration — queued from game-loop context, fired on next pointer event
    this._pendingVibrate = null;

    // Secondary meter (Line Tension) — fills in zone, drains out
    this.secondaryMeter = 0.5;
    this.meterDrain     = 0.20;

    // Primary meter (Catch Progress) — only moves from boost QTEs + passive drain
    this.primaryMeter = 0;
    this.primaryDrain = 0.02;

    // Boost QTE (precision ring)
    this.qteBoostTimer  = 0;
    this.qteBoostTotal  = 2.0;
    this.qteBoostResult = null; // null | 'perfect' | 'good' | 'miss'
    this.qteBoostFlash  = 0;
    this.qteCount       = 0;   // increments each boost QTE, shrinks zone

    this.pendingFish   = null;
    this.pendingWeight = 0;
    this.resultFish    = null;
    this.resultWeight  = 0;
    this.resultValue   = 0;
    this.resultStars   = 1;
    this.resultTimer   = 0;
    this.escaped       = false;
    this.lineBroke     = false;

    this.t    = 0;
    this.spot = null;
    this._boostTimer = 0;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp   = this._onPointerUp.bind(this);
    canvas.addEventListener('mousedown',  this._onPointerDown);
    canvas.addEventListener('mouseup',    this._onPointerUp);
    canvas.addEventListener('touchstart', this._onPointerDown, { passive: false });
    canvas.addEventListener('touchend',   this._onPointerUp,   { passive: false });
  }

  start(spot) {
    this.spot = spot;
    this._beginWait(); // _beginWait now calls _selectFish so fish re-randomizes each attempt
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

  // ── Input ──────────────────────────────────────────────────────────────────

  _onPointerDown(e) {
    e.preventDefault();
    this.reelHeld = true;

    // Flush any vibration queued from the game loop (needs user-activation context)
    if (this._pendingVibrate) {
      this._vibrate(this._pendingVibrate);
      this._pendingVibrate = null;
    }

    if (this.state === 'waiting') {
      this.onDone(null); // cancel — return to world
      return;
    }

    if (this.state === 'qte_hook') {
      this._vibrate([150]); // solid hook-set thud
      this._beginReel();
      return;
    }

    if (this.state === 'reel') {
      const now = Date.now();
      if (now - this.lastTapTime < 300 && this.jumpCooldown <= 0) {
        const newPos = Math.min(1, this.reelPos + 0.20);
        this.reelPos      = newPos;
        this.jumpCooldown = this.jumpCooldownMax;
        this.lastTapTime  = 0;
        // Bonus progress if circle lands inside zone
        if (newPos >= this.zoneMin && newPos <= this.zoneMax) {
          this.primaryMeter = Math.min(1, this.primaryMeter + 0.15);
          this.jumpFlash    = 0.9;
          this._vibrate([50, 30, 200]);
        } else {
          this.jumpFlash = 0.45;
          this._vibrate([80]);
        }
      } else {
        this.lastTapTime = now;
      }
      return;
    }

    if (this.state === 'qte_boost' && this.qteBoostResult === null) {
      const outerRadius = 85 * (1 - this.qteBoostTimer / this.qteBoostTotal);
      const diff        = Math.abs(outerRadius - 38);
      this._applyQteBoost(diff < 8 ? 'perfect' : 'good');
      return;
    }

    if (this.state === 'result') {
      this.onDone(this.resultFish && !this.escaped
        ? { fish: this.resultFish, weight: this.resultWeight }
        : null);
    }
  }

  _onPointerUp() { this.reelHeld = false; }

  // ── State transitions ──────────────────────────────────────────────────────

  _beginWait() {
    this._selectFish(); // re-randomize fish each attempt (miss = new fish)
    this.state     = 'waiting';
    this.waitMax   = 2.0 + Math.random() * 4.0;
    this.waitTimer = 0;
  }

  _beginQteHook() {
    this.state = 'qte_hook';
    this._pendingVibrate = [90, 60, 90]; // queued — fires on next tap (user activation)
    const rarityBaseTime = { common: 3.0, uncommon: 2.2, rare: 1.5, epic: 1.0, legendary: 0.6 };
    const base      = rarityBaseTime[this.pendingFish?.rarity ?? 'common'] ?? 2.0;
    const polePower = this.inventory.getEquippedPole().power;
    const jitter    = (Math.random() - 0.5) * 1.0; // ±0.5 s random variation
    this.qteTotalTime = Math.max(0.5, base + (polePower - 1) * 0.5 + jitter);
    this.qteTimer     = this.qteTotalTime;
  }

  _beginReel() {
    this.state          = 'reel';
    this.reelPos        = 0.15;
    this.secondaryMeter = 0;   // tension starts at zero
    this.primaryMeter   = 0;
    this.zoneDir        = 1;
    this.qteCount       = 0;
    this.lastTapTime    = 0; // prevent accidental jump from hook tap
    this.jumpCooldown   = 0;
    this.jumpFlash      = 0;
    this.lineBroke      = false;
    this._boostTimer    = 4 + Math.random() * 4; // first fish lunge in 4-8 s
    this.inventory.useBait(); // consume bait on hook

    const rarity    = this.pendingFish?.rarity ?? 'common';
    const polePower = this.inventory.getEquippedPole().power;
    const fish      = this.pendingFish;

    // Base speed by rarity
    const raritySpeed = { common: 0.16, uncommon: 0.24, rare: 0.34, epic: 0.46, legendary: 0.62 };
    let spd = raritySpeed[rarity] ?? 0.24;

    // Heavier fish (relative to its weight range) = faster zone
    if (fish && fish.maxWeight > fish.minWeight) {
      const wn = (this.pendingWeight - fish.minWeight) / (fish.maxWeight - fish.minWeight);
      spd += wn * 0.18;
    }

    // Stronger pole = slightly better control (slower zone)
    spd *= Math.max(0.65, 1 - (polePower - 1) * 0.06);

    // Lure bait = fish more agitated = faster zone
    const bait = this.inventory.getEquippedBait();
    if (bait?.type === 'lure') spd *= 1.15;

    // Initial ±25% random variation
    spd *= 0.75 + Math.random() * 0.50;

    this.zoneBaseSpeed     = spd;
    this.zoneSpeed         = spd;
    this.zoneSpeedModTimer = 0.5 + Math.random() * 1.0; // first burst timing

    const rarityDrain = { common: 0.15, uncommon: 0.20, rare: 0.28, epic: 0.38, legendary: 0.50 };
    this.meterDrain   = rarityDrain[rarity] ?? 0.20;
    this.primaryDrain = 0.02;

    this.zoneMin = 0.35;
    this.zoneMax = 0.65;
    this._applyZoneWindow();
  }

  // Recalculates zone width from rarity + pole power + fish weight + QTE count.
  _applyZoneWindow() {
    const rarity    = this.pendingFish?.rarity ?? 'common';
    const polePower = this.inventory.getEquippedPole().power;
    const fish      = this.pendingFish;

    const rarityWindow = { common: 0.36, uncommon: 0.30, rare: 0.24, epic: 0.18, legendary: 0.12 };
    let win = rarityWindow[rarity] ?? 0.30;

    win += (polePower - 1) * 0.05;

    if (fish && fish.maxWeight > fish.minWeight) {
      const weightNorm = (this.pendingWeight - fish.minWeight) / (fish.maxWeight - fish.minWeight);
      win -= weightNorm * 0.10;
    }

    win -= this.qteCount * 0.025;
    win = Math.max(0.07, Math.min(0.52, win));

    const center  = (this.zoneMin + this.zoneMax) / 2;
    this.zoneMin  = Math.max(0.05, center - win / 2);
    this.zoneMax  = Math.min(0.95, center + win / 2);
  }

  _beginQteBoost() {
    this.state          = 'qte_boost';
    this.qteBoostTimer  = 0;
    this.qteBoostResult = null;
  }

  _applyQteBoost(result) {
    this.qteBoostResult = result;
    this.qteBoostFlash  = 0.9;
    this._boostTimer    = 4 + Math.random() * 4; // schedule next lunge

    if (result === 'perfect') {
      this.primaryMeter = Math.min(1, this.primaryMeter + 0.30);
      this._vibrate([220]);
    } else if (result === 'good') {
      this.primaryMeter = Math.min(1, this.primaryMeter + 0.15);
      this._vibrate([110]);
    } else {
      this.primaryMeter = Math.max(0, this.primaryMeter - 0.20);
      this._vibrate([70, 60, 70]);
    }

    this.qteCount++;
    this._applyZoneWindow();
  }

  _lineBroken() {
    this.state       = 'result';
    this.escaped     = true;
    this.lineBroke   = true;
    this.resultTimer = 0;
    this.resultFish  = null;
    this._pendingVibrate = [80, 40, 80, 40, 400]; // snap rattle
  }

  _finishReel(caught) {
    this.state       = 'result';
    this.escaped     = !caught;
    this.resultTimer = 0;
    if (caught && this.pendingFish) {
      this.resultFish   = this.pendingFish;
      this.resultWeight = this.pendingWeight;
      const entry       = this.inventory.addFish(this.pendingFish, this.pendingWeight);
      this.resultValue  = entry.value;
      this.resultStars  = entry.stars;
      this._pendingVibrate = [120, 60, 120, 60, 300]; // queued — fires on result tap
    } else {
      this.resultFish = null;
      this._pendingVibrate = [400];                  // queued — fires on result tap
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(dt) {
    this.t += dt;

    if (this.state === 'waiting') {
      this.waitTimer += dt;
      if (this.waitTimer >= this.waitMax) this._beginQteHook();
      return;
    }

    if (this.state === 'qte_hook') {
      this.qteTimer -= dt;
      if (this.qteTimer <= 0) this._beginWait(); // missed — try again
      return;
    }

    if (this.state === 'reel') {
      // Zone oscillates
      this.zoneMin += dt * this.zoneDir * this.zoneSpeed;
      this.zoneMax += dt * this.zoneDir * this.zoneSpeed;
      if (this.zoneMax >= 0.92 || this.zoneMin <= 0.08) this.zoneDir *= -1;

      // Random speed bursts (fish lunges)
      this.zoneSpeedModTimer -= dt;
      if (this.zoneSpeedModTimer <= 0) {
        this.zoneSpeed         = this.zoneBaseSpeed * (0.35 + Math.random() * 1.7);
        this.zoneSpeedModTimer = 0.35 + Math.random() * 1.1;
      }

      // Tick jump timers
      if (this.jumpCooldown > 0) this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
      if (this.jumpFlash    > 0) this.jumpFlash    = Math.max(0, this.jumpFlash    - dt * 2.5);

      // Hook: hold = reel right, release = fish pulls left
      const target = this.reelHeld ? this.reelPos + dt * 0.30 : this.reelPos - dt * 0.38;
      this.reelPos = Math.max(0, Math.min(1, target));

      // Line tension: up when holding outside zone, down when releasing, safe in zone
      const inZone = this.reelPos >= this.zoneMin && this.reelPos <= this.zoneMax;
      if (this.reelHeld && !inZone) {
        this.secondaryMeter = Math.min(1, this.secondaryMeter + dt * 0.25);
      } else if (!this.reelHeld) {
        this.secondaryMeter = Math.max(0, this.secondaryMeter - dt * 0.18);
      }
      // holding in zone → no change; at 0 → no penalty

      // Catch progress: holding builds fast in zone, slow outside; not holding + in zone = slow drip
      if (this.reelHeld) {
        this.primaryMeter = Math.min(1, this.primaryMeter + dt * (inZone ? 0.09 : 0.03));
      } else if (inZone) {
        this.primaryMeter = Math.min(1, this.primaryMeter + dt * 0.02);
      }

      // Catch complete
      if (this.primaryMeter >= 1) { this._finishReel(true); return; }

      // Line break at full tension
      if (this.secondaryMeter >= 1) { this._lineBroken(); return; }

      // Fish lunge QTE — disabled for now, timer kept for future use
      // this._boostTimer -= dt;
      // if (this._boostTimer <= 0) { this._beginQteBoost(); return; }
      return;
    }

    if (this.state === 'qte_boost') {
      if (this.qteBoostResult !== null) {
        this.qteBoostFlash -= dt;
        if (this.qteBoostFlash <= 0) {
          if (this.primaryMeter >= 1) this._finishReel(true);
          else                        this.state = 'reel';
        }
        return;
      }

      this.qteBoostTimer += dt;
      if (this.qteBoostTimer >= this.qteBoostTotal) this._applyQteBoost('miss');
      return;
    }

    if (this.state === 'result') {
      this.resultTimer += dt;
    }
  }

  // ── Draw ───────────────────────────────────────────────────────────────────

  draw() {
    const ctx = this.ctx;
    const cw = this.canvas.width, ch = this.canvas.height;

    ctx.fillStyle = 'rgba(0,0,30,0.75)';
    ctx.fillRect(0, 0, cw, ch);

    // Waiting and hook use a full-screen immersive bobber scene — no panel
    if (this.state === 'waiting')  { this._drawWaiting(cw, ch);  return; }
    if (this.state === 'qte_hook') { this._drawQteHook(cw, ch);  return; }

    // Panel states (reel, boost, result) ──────────────────────────────────────
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

    const biting   = this.state === 'reel' || this.state === 'qte_boost';
    const bobAmp   = biting ? Math.sin(this.t * 12) * 5 : 0;
    const lineEndX = cw / 2 + Math.sin(this.t * 0.5) * 20;
    const lineEndY = ch * 0.25 + bobAmp;

    ctx.strokeStyle = 'rgba(220,220,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cw / 2, 0); ctx.lineTo(lineEndX, lineEndY); ctx.stroke();

    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.arc(lineEndX, lineEndY, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(lineEndX, lineEndY - 3, 6, 0, Math.PI); ctx.fill();

    if (biting) {
      for (let i = 0; i < 3; i++) {
        const r = 14 + i * 8 + ((this.t * 3 + i) % 1) * 8;
        ctx.strokeStyle = `rgba(100,200,255,${0.5 - i * 0.15})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(lineEndX, lineEndY, r, 0, Math.PI * 2); ctx.stroke();
      }
    }

    const pw = Math.min(cw * 0.9, 360);
    const px = (cw - pw) / 2;
    const py = ch * 0.33;
    const ph = ch - py - 140;
    this._drawPanel(px, py, pw, ph);

    if (this.state === 'reel')      this._drawReel(px, py, pw, ph);
    if (this.state === 'qte_boost') this._drawQteBoost(px, py, pw, ph);
    if (this.state === 'result')    this._drawResult(px, py, pw, ph);
  }

  _drawPanel(px, py, pw, ph) {
    const ctx = this.ctx;
    const r = 18;

    // Wood frame outer fill
    const woodGrad = ctx.createLinearGradient(px, py, px + pw, py + ph);
    woodGrad.addColorStop(0,    '#5C3310');
    woodGrad.addColorStop(0.25, '#7B4A22');
    woodGrad.addColorStop(0.55, '#6A3D18');
    woodGrad.addColorStop(0.8,  '#8B5A28');
    woodGrad.addColorStop(1,    '#4A2A0E');
    ctx.fillStyle = woodGrad;
    this._roundRect(px, py, pw, ph, r); ctx.fill();

    // Wood grain lines (deterministic — no Math.random in draw loop)
    ctx.save();
    this._roundRect(px, py, pw, ph, r);
    ctx.clip();
    ctx.lineWidth = 0.8;
    for (let i = 0; i < ph; i += 5) {
      ctx.strokeStyle = (i % 15 < 8) ? 'rgba(0,0,0,0.10)' : 'rgba(210,150,60,0.07)';
      ctx.beginPath();
      let first = true;
      for (let x = 0; x <= pw; x += 10) {
        const yy = py + i + Math.sin((i + x) * 0.18) * 1.4;
        first ? ctx.moveTo(px + x, yy) : ctx.lineTo(px + x, yy);
        first = false;
      }
      ctx.stroke();
    }
    ctx.restore();

    // Outer highlight
    ctx.strokeStyle = 'rgba(210,155,70,0.38)';
    ctx.lineWidth = 1.5;
    this._roundRect(px, py, pw, ph, r); ctx.stroke();

    // Parchment interior
    const pad = 7;
    const ri  = r - 4;
    const pGrad = ctx.createLinearGradient(px, py, px, py + ph);
    pGrad.addColorStop(0,   '#F6EAD0');
    pGrad.addColorStop(0.4, '#EDD9A0');
    pGrad.addColorStop(1,   '#E2CC84');
    ctx.fillStyle = pGrad;
    this._roundRect(px + pad, py + pad, pw - pad * 2, ph - pad * 2, ri); ctx.fill();

    // Parchment fiber texture (horizontal, deterministic)
    ctx.save();
    this._roundRect(px + pad, py + pad, pw - pad * 2, ph - pad * 2, ri);
    ctx.clip();
    for (let i = 0; i < ph; i += 4) {
      ctx.strokeStyle = (i % 8 === 0) ? 'rgba(139,90,43,0.06)' : 'rgba(180,140,70,0.04)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(px + pad, py + pad + i);
      ctx.lineTo(px + pw - pad, py + pad + i + Math.sin(i * 0.25) * 0.7);
      ctx.stroke();
    }
    ctx.restore();

    // Inner edge shadow
    ctx.strokeStyle = 'rgba(90,50,20,0.18)';
    ctx.lineWidth = 1.5;
    this._roundRect(px + pad, py + pad, pw - pad * 2, ph - pad * 2, ri); ctx.stroke();
  }

  _drawWaterScene(ctx, cw, ch, waterY) {
    // Sky
    const skyG = ctx.createLinearGradient(0, 0, 0, waterY);
    skyG.addColorStop(0, '#0a1520');
    skyG.addColorStop(1, this.gameTime.waterColor);
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, cw, waterY);
    // Deep water
    const waterG = ctx.createLinearGradient(0, waterY, 0, ch);
    waterG.addColorStop(0, this.gameTime.waterColor);
    waterG.addColorStop(1, '#040d18');
    ctx.fillStyle = waterG;
    ctx.fillRect(0, waterY, cw, ch - waterY);
    // Waves
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.05 + i * 0.02})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= cw; x += 16) {
        const wy = waterY + 10 + i * 14 + Math.sin((x / cw) * Math.PI * 5 + this.t * 0.9 + i * 0.7) * 4;
        x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  }

  _drawBobber(ctx, cx, cy, r, submerged) {
    ctx.fillStyle = '#e53935';
    ctx.fillRect(cx - 2, cy - r - 6, 4, 8); // tip
    ctx.fillStyle = submerged ? 'rgba(229,57,53,0.35)' : '#e53935';
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.fill();
    ctx.fillStyle = submerged ? 'rgba(255,255,255,0.12)' : '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI); ctx.fill();
    ctx.fillStyle = submerged ? 'rgba(40,40,40,0.3)' : '#2a2a2a';
    ctx.fillRect(cx - r, cy - 2, r * 2, 4);
    if (!submerged) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.ellipse(cx - r * 0.3, cy - r * 0.35, r * 0.18, r * 0.28, -0.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawWaiting(cw, ch) {
    const ctx = this.ctx;
    const cx  = cw / 2;
    const waterY = ch * 0.48;

    this._drawWaterScene(ctx, cw, ch, waterY);

    // Gentle ripples from bobber
    for (let i = 0; i < 3; i++) {
      const age = ((this.t * 0.45 + i / 3) % 1);
      ctx.strokeStyle = `rgba(255,255,255,${0.18 * (1 - age)})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, waterY + 5, age * 42, age * 14, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // Bobber — gentle bob
    const bobberY = waterY - 4 + Math.sin(this.t * 1.6) * 6;
    // Line
    ctx.strokeStyle = 'rgba(220,220,255,0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 6, 0);
    ctx.quadraticCurveTo(cx, bobberY * 0.5, cx, bobberY - 24);
    ctx.stroke();
    this._drawBobber(ctx, cx, bobberY, 22, false);

    // Fish shadow below surface
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.font = '34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText('🐟', cx + Math.sin(this.t * 0.38) * 38, waterY + 65 + Math.sin(this.t * 0.65) * 18);
    ctx.restore();

    // Status text
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.font = '11px sans-serif';
    ctx.fillText(`📍 ${this.spot?.label ?? ''} · ${this.gameTime.timeOfDay} · ${this.gameTime.season}`, cx, ch * 0.86);
    const dots = '.'.repeat(1 + Math.floor(this.t * 2) % 3);
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`Waiting for a bite${dots}`, cx, ch * 0.92);
    ctx.fillStyle = 'rgba(255,100,100,0.65)';
    ctx.font = '11px sans-serif';
    ctx.fillText('Tap to cancel', cx, ch * 0.97);
  }

  _drawQteHook(cw, ch) {
    const ctx = this.ctx;
    const cx  = cw / 2;
    const waterY = ch * 0.48;

    this._drawWaterScene(ctx, cw, ch, waterY);

    const progress = Math.max(0, this.qteTimer / this.qteTotalTime);

    // Deterministic shake using stacked sines
    const shakeX = Math.sin(this.t * 24.3) * 5 + Math.sin(this.t * 38.7) * 3;
    const dipY   = Math.max(0, Math.sin(this.t * 7.2) * 28 + Math.sin(this.t * 3.5) * 14);
    const bx     = cx + shakeX;
    const bobberY = waterY - 4 + dipY;

    // Line — shakes with bobber
    ctx.strokeStyle = 'rgba(220,220,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 6, 0);
    ctx.quadraticCurveTo(cx + shakeX * 0.4, bobberY * 0.4, bx, bobberY - 22);
    ctx.stroke();

    // Splash jets around waterline
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + this.t * 2.8;
      const dist  = 22 + Math.sin(this.t * 4.1 + i) * 7;
      const len   = 5 + Math.sin(this.t * 6.3 + i * 1.4) * 4;
      ctx.strokeStyle = `rgba(120,210,255,${0.35 + Math.sin(this.t * 5 + i) * 0.18})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(angle) * dist, waterY + Math.abs(Math.sin(angle)) * 8);
      ctx.lineTo(bx + Math.cos(angle) * (dist + len), waterY + Math.abs(Math.sin(angle)) * 8 - len * 0.8);
      ctx.stroke();
    }

    // Aggressive ripples
    for (let i = 0; i < 3; i++) {
      const age = ((this.t * 1.3 + i / 3) % 1);
      ctx.strokeStyle = `rgba(100,200,255,${0.4 * (1 - age)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(bx, waterY + 5, age * 55, age * 18, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // Bobber (partially submerged when dipping deep)
    this._drawBobber(ctx, bx, bobberY, 22, dipY > 22);

    // Fish name
    const rarityColors = { common:'#9E9E9E', uncommon:'#4CAF50', rare:'#2196F3', epic:'#9C27B0', legendary:'#FF9800' };
    const rc = rarityColors[this.pendingFish?.rarity ?? 'common'] ?? '#9E9E9E';
    ctx.textAlign = 'center';
    ctx.fillStyle = rc;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(this.pendingFish?.name ?? '???', cx, ch * 0.68);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '11px sans-serif';
    ctx.fillText(`${(this.pendingFish?.rarity ?? '').toUpperCase()} · ${this.pendingWeight} lbs`, cx, ch * 0.72);

    // TAP! pulsing
    const pulse = 1 + Math.sin(this.t * 10) * 0.07;
    ctx.fillStyle = `rgba(255,230,50,${0.9 + Math.sin(this.t * 8) * 0.1})`;
    ctx.font = `bold ${Math.round(48 * pulse)}px sans-serif`;
    ctx.fillText('TAP!', cx, ch * 0.86);

    // Timer bar at top
    const barW = cw * 0.55, barX = (cw - barW) / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    this._roundRect(barX, 18, barW, 6, 3); ctx.fill();
    const barColor = progress > 0.5 ? '#4CAF50' : progress > 0.25 ? '#FFC107' : '#EF5350';
    ctx.fillStyle = barColor;
    this._roundRect(barX, 18, barW * progress, 6, 3); ctx.fill();
  }

  _drawReel(px, py, pw, ph) {
    const ctx = this.ctx;
    const cx  = px + pw / 2;

    const rarityColors = { common:'#9E9E9E', uncommon:'#4CAF50', rare:'#2196F3', epic:'#9C27B0', legendary:'#FF9800' };
    const rc = rarityColors[this.pendingFish?.rarity] ?? '#9E9E9E';

    // ── Catch Progress — top of panel, prominent ──────────────
    this._drawCatchProgressTop(px, py, pw, ph);

    // ── Title + fish name ─────────────────────────────────────
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2A1000';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('HOLD IN ZONE = FAST PROGRESS', cx, py + ph * 0.24);
    ctx.fillStyle = rc;
    ctx.font = '11px sans-serif';
    ctx.fillText(`${this.pendingFish?.name ?? '???'} on the line!`, cx, py + ph * 0.31);

    // ── Reel bar ──────────────────────────────────────────────
    const bw = pw * 0.82, bh = 22;
    const bx = px + (pw - bw) / 2;
    const by = py + ph * 0.39;

    ctx.fillStyle = 'rgba(42,16,0,0.1)';
    this._roundRect(bx, by, bw, bh, 11); ctx.fill();

    const zx = bx + this.zoneMin * bw;
    const zw = (this.zoneMax - this.zoneMin) * bw;
    ctx.fillStyle = 'rgba(60,110,20,0.30)';
    ctx.fillRect(zx, by, zw, bh);
    ctx.strokeStyle = '#3D7A1A';
    ctx.lineWidth = 2;
    ctx.strokeRect(zx, by, zw, bh);

    const hx     = bx + this.reelPos * bw;
    const inZone = this.reelPos >= this.zoneMin && this.reelPos <= this.zoneMax;

    // Jump flash ring
    if (this.jumpFlash > 0) {
      ctx.strokeStyle = `rgba(255,210,50,${this.jumpFlash * 2})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(hx, by + bh / 2, 10 + this.jumpFlash * 14, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.fillStyle = inZone ? '#FFEB3B' : '#EF5350';
    ctx.beginPath(); ctx.arc(hx, by + bh / 2, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = inZone ? '#F9A825' : '#B71C1C';
    ctx.lineWidth = 2; ctx.stroke();

    // ── Double-tap jump indicator ─────────────────────────────
    const jumpReady = this.jumpCooldown <= 0;
    const jy        = py + ph * 0.52;
    const pillW     = 116, pillH = 16;
    const jpulse    = jumpReady ? 0.75 + Math.sin(this.t * 5) * 0.25 : 1;

    ctx.fillStyle = jumpReady
      ? `rgba(200,150,20,${0.12 + 0.08 * jpulse})`
      : 'rgba(42,16,0,0.06)';
    this._roundRect(cx - pillW / 2, jy - pillH / 2, pillW, pillH, 8); ctx.fill();
    ctx.strokeStyle = jumpReady
      ? `rgba(200,150,20,${0.55 * jpulse})`
      : 'rgba(42,16,0,0.12)';
    ctx.lineWidth = 1;
    this._roundRect(cx - pillW / 2, jy - pillH / 2, pillW, pillH, 8); ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = jumpReady
      ? `rgba(140,80,0,${jpulse})`
      : 'rgba(42,16,0,0.28)';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('⚡ DOUBLE TAP TO JUMP', cx, jy + 3.5);

    if (!jumpReady) {
      const cdProg = 1 - (this.jumpCooldown / this.jumpCooldownMax);
      const cdW = 90, cdY = jy + pillH / 2 + 4;
      ctx.fillStyle = 'rgba(42,16,0,0.08)';
      this._roundRect(cx - cdW / 2, cdY, cdW, 3, 2); ctx.fill();
      ctx.fillStyle = '#B8860B';
      this._roundRect(cx - cdW / 2, cdY, cdW * cdProg, 3, 2); ctx.fill();
    }

    // ── Line Tension ──────────────────────────────────────────
    this._drawMeterBar(px, py, pw, ph, 0.63, this.secondaryMeter,
      'LINE TENSION', '#4CAF50',
      this.secondaryMeter > 0.75 ? '⚠️ EASE UP — LINE NEAR BREAK' : null, '#C62828');

    // Fish silhouette
    this._drawFishSilhouette(cx, py + ph * 0.84, 60, 30, rc, true);
  }

  _drawQteBoost(px, py, pw, ph) {
    const ctx = this.ctx;
    const cx  = px + pw / 2;
    const cy  = py + ph * 0.42;

    const rarityColors = { common:'#9E9E9E', uncommon:'#4CAF50', rare:'#2196F3', epic:'#9C27B0', legendary:'#FF9800' };
    const rc = rarityColors[this.pendingFish?.rarity] ?? '#9E9E9E';

    const innerRadius = 38;
    const outerRadius = Math.max(0, 85 * (1 - this.qteBoostTimer / this.qteBoostTotal));
    const diff        = Math.abs(outerRadius - innerRadius);
    const inPerfect   = diff < 8 && outerRadius > 0;

    ctx.textAlign = 'center';

    if (this.qteBoostResult !== null) {
      const flashColors = { perfect: '#FFD700', good: '#4CAF50', miss: '#EF5350' };
      const flashText   = { perfect: '⭐ PERFECT!  +30%', good: '✓ GOOD!  +15%', miss: '✗ MISS!  -20%' };
      ctx.fillStyle = flashColors[this.qteBoostResult];
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(flashText[this.qteBoostResult], cx, cy);
    } else {
      ctx.fillStyle = 'rgba(42,16,0,0.55)';
      ctx.font = '11px sans-serif';
      ctx.fillText('TAP WHEN THE RINGS ALIGN', cx, py + ph * 0.14);

      // Inner ring (fixed target)
      ctx.strokeStyle = inPerfect ? '#FFD700' : 'rgba(42,16,0,0.30)';
      ctx.lineWidth   = inPerfect ? 5 : 3;
      ctx.beginPath(); ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2); ctx.stroke();

      if (inPerfect) {
        ctx.strokeStyle = 'rgba(255,215,0,0.25)';
        ctx.lineWidth = 14;
        ctx.beginPath(); ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2); ctx.stroke();
      }

      if (outerRadius > 1) {
        const outerColor = inPerfect ? '#FFD700' : outerRadius > innerRadius ? '#4CAF50' : '#EF5350';
        ctx.strokeStyle = outerColor;
        ctx.lineWidth   = 4;
        ctx.beginPath(); ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2); ctx.stroke();
      }

      const pulse = 1 + Math.sin(this.t * 14) * 0.06;
      ctx.fillStyle = inPerfect ? '#FFD700' : 'rgba(42,16,0,0.72)';
      ctx.font = `bold ${Math.round(inPerfect ? 22 * pulse : 18)}px sans-serif`;
      ctx.fillText(inPerfect ? 'NOW!' : 'TAP!', cx, cy + innerRadius + 26);
    }

    this._drawMeterBar(px, py, pw, ph, 0.78, this.secondaryMeter, 'LINE TENSION', '#4CAF50', null, null);
    // Catch progress shown at top of panel (same as reel state)
    this._drawCatchProgressTop(px, py, pw, ph);
  }

  _drawCatchProgressTop(px, py, pw, ph) {
    const ctx = this.ctx;
    const cpw = pw * 0.86, cph = 20;
    const cpx = px + (pw - cpw) / 2;
    const cpy = py + ph * 0.08;
    const cpv = this.primaryMeter;
    const cpColor = cpv > 0.7 ? '#C07020' : cpv > 0.35 ? '#B8860B' : '#888070';

    const filling = this.state === 'reel'
      && (this.reelPos >= this.zoneMin && this.reelPos <= this.zoneMax)
      && !this.reelHeld;

    ctx.textAlign = 'left';
    ctx.fillStyle = filling ? 'rgba(60,120,20,0.85)' : 'rgba(42,16,0,0.55)';
    ctx.font = `bold 10px sans-serif`;
    ctx.fillText('CATCH PROGRESS', cpx, cpy - 5);
    ctx.textAlign = 'right';
    ctx.fillStyle = filling ? '#3D7A1A' : cpColor;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(filling ? `▲ ${Math.round(cpv * 100)}%` : `${Math.round(cpv * 100)}%`, cpx + cpw, cpy - 5);

    ctx.fillStyle = 'rgba(42,16,0,0.12)';
    this._roundRect(cpx, cpy, cpw, cph, 10); ctx.fill();
    if (cpv > 0) {
      ctx.fillStyle = filling ? '#4CAF50' : cpColor;
      this._roundRect(cpx, cpy, cpw * Math.min(1, cpv), cph, 10); ctx.fill();
    }

    // Pulse glow when actively filling
    if (filling && cpv > 0) {
      const glow = 0.35 + Math.sin(this.t * 8) * 0.25;
      ctx.strokeStyle = `rgba(60,180,60,${glow})`;
      ctx.lineWidth = 3;
      this._roundRect(cpx, cpy, cpw * Math.min(1, cpv), cph, 10); ctx.stroke();
    }

    const shine = ctx.createLinearGradient(cpx, cpy, cpx, cpy + cph);
    shine.addColorStop(0,   'rgba(255,255,255,0.18)');
    shine.addColorStop(0.5, 'rgba(255,255,255,0.04)');
    shine.addColorStop(1,   'rgba(0,0,0,0.08)');
    ctx.fillStyle = shine;
    this._roundRect(cpx, cpy, cpw, cph, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,20,0.15)';
    ctx.lineWidth = 1;
    this._roundRect(cpx, cpy, cpw, cph, 10); ctx.stroke();
  }

  _drawMeterBar(px, py, pw, ph, yFraction, value, label, fillColor, hintText, hintColor) {
    const ctx = this.ctx;
    const cx  = px + pw / 2;
    const mw  = pw * 0.82, mh = 13;
    const mx  = px + (pw - mw) / 2;
    const my  = py + ph * yFraction;

    ctx.fillStyle = 'rgba(42,16,0,0.10)';
    this._roundRect(mx, my, mw, mh, 6); ctx.fill();

    let color = fillColor;
    if (label === 'LINE TENSION') {
      color = value > 0.7 ? '#C62828' : value > 0.4 ? '#FFC107' : '#4CAF50';
    } else if (label === 'CATCH PROGRESS') {
      color = value > 0.7 ? '#C07020' : value > 0.35 ? '#B8860B' : '#888070';
    }

    if (value > 0) {
      ctx.fillStyle = color;
      this._roundRect(mx, my, mw * Math.min(1, value), mh, 6); ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(42,16,0,0.55)';
    ctx.font = '10px sans-serif';
    ctx.fillText(label, cx, my - 4);

    if (hintText) {
      const pulse = 0.6 + Math.abs(Math.sin(this.t * 4)) * 0.4;
      ctx.fillStyle = `rgba(60,120,20,${pulse})`;
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(hintText, cx, my + mh + 12);
    }
  }

  _drawResult(px, py, pw, ph) {
    const ctx = this.ctx;
    const cx  = px + pw / 2;
    ctx.textAlign = 'center';

    if (this.lineBroke) {
      ctx.fillStyle = '#C62828';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('Line snapped! 💔', cx, py + ph * 0.35);
      ctx.fillStyle = 'rgba(42,16,0,0.65)';
      ctx.font = '13px sans-serif';
      ctx.fillText('Too much tension — bait lost', cx, py + ph * 0.50);
      ctx.fillStyle = 'rgba(42,16,0,0.45)';
      ctx.font = '13px sans-serif';
      ctx.fillText('Tap to try again', cx, py + ph * 0.62);
    } else if (this.escaped) {
      ctx.fillStyle = '#C62828';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('It got away! 😞', cx, py + ph * 0.38);
      ctx.fillStyle = 'rgba(42,16,0,0.55)';
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

      ctx.fillStyle = '#2A1000';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(this.resultFish.name, cx, py + ph * 0.42);

      ctx.fillStyle = rc;
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(this.resultFish.rarity.toUpperCase(), cx, py + ph * 0.52);

      ctx.fillStyle = '#C07020';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('★'.repeat(this.resultStars) + '☆'.repeat(3 - this.resultStars), cx, py + ph * 0.62);

      ctx.fillStyle = '#7B4A00';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`⚖️ ${this.resultWeight} lbs · 💰 $${this.resultValue}`, cx, py + ph * 0.72);

      this._drawFishSilhouette(cx, py + ph * 0.85, 80, 40, this.resultFish.color, true);

      ctx.globalAlpha = Math.max(0, this.resultTimer - 0.8);
      ctx.fillStyle = 'rgba(42,16,0,0.5)';
      ctx.font = '13px sans-serif';
      ctx.fillText('Tap to continue', cx, py + ph * 0.94);
      ctx.globalAlpha = 1;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _vibrate(pattern) {
    if (!navigator.vibrate) return;
    try {
      const ok = navigator.vibrate(pattern);
      if (!ok) console.warn('[Vibrate] returned false — vibration may be disabled or not permitted', pattern);
    } catch (err) {
      console.warn('[Vibrate] error:', err, pattern);
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
