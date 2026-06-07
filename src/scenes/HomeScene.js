export class HomeScene {
  constructor(canvas, gameTime, inventory, dailyChallenges, weatherSystem, appearance, onExit) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gameTime = gameTime;
    this.inventory = inventory;
    this.dailyChallenges = dailyChallenges;
    this.weatherSystem = weatherSystem;
    this.appearance = appearance;
    this.onExit = onExit;

    this.t = 0;
    this._bubbles = [];
    this._zzz = [];
    this._sleepState = 'none';
    this._sleepAlpha = 0;
    this._sleepTimer = 0;

    const cw = canvas.width, ch = canvas.height;
    this._player = {
      x: cw * 0.50, y: ch * 0.73,
      tx: cw * 0.50, ty: ch * 0.73,
      speed: 130, state: 'idle',
    };
    this._pendingAction = null;
    this._walkParticles = [];

    this._initBubbles();
    this._buildSleepConfirm();
    this._buildAquariumPanel();
    this._buildChallengesPanel();
    this._bindInput();
  }

  _initBubbles() {
    for (let i = 0; i < 14; i++) this._bubbles.push(this._spawnBubble(true));
  }

  _spawnBubble(spread = false) {
    const cw = this.canvas.width, ch = this.canvas.height;
    return {
      x: cw * 0.05 + Math.random() * cw * 0.38,
      y: spread ? ch * 0.10 + Math.random() * ch * 0.25 : ch * 0.355,
      vy: -(18 + Math.random() * 28),
      r: 1.5 + Math.random() * 2.5,
    };
  }

  _bindInput() {
    this._tapStartX = 0;
    this._tapStartY = 0;
    this._onMouseClick = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const sy = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this._handleTap(sx, sy);
    };
    this._onTouchStart = (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        this._tapStartX = e.touches[0].clientX;
        this._tapStartY = e.touches[0].clientY;
      }
    };
    this._onTouchEnd = (e) => {
      e.preventDefault();
      if (e.changedTouches.length !== 1) return;
      const t = e.changedTouches[0];
      if (Math.abs(t.clientX - this._tapStartX) < 14 && Math.abs(t.clientY - this._tapStartY) < 14) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = (t.clientX - rect.left) * (this.canvas.width / rect.width);
        const sy = (t.clientY - rect.top) * (this.canvas.height / rect.height);
        this._handleTap(sx, sy);
      }
    };
    this.canvas.addEventListener('click', this._onMouseClick);
    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
  }

  _handleTap(sx, sy) {
    if (this._sleepState !== 'none') return;
    const cw = this.canvas.width, ch = this.canvas.height;
    const fx = sx / cw, fy = sy / ch;

    // Aquarium (wall zone) — walk to floor in front, then open panel
    if (fx >= 0.03 && fx <= 0.47 && fy >= 0.065 && fy <= 0.38) {
      this._closeAllPanels();
      this._walkTo(Math.max(cw * 0.08, Math.min(cw * 0.44, sx)), ch * 0.47, 'aquarium');
      return;
    }

    // Below wall line only from here
    if (fy < 0.40) return;

    // Door
    if (fx >= 0.42 && fx <= 0.58 && fy >= 0.60) {
      this._closeAllPanels();
      this._walkTo(cw * 0.50, ch * 0.82, 'door');
      return;
    }

    // Bed
    if (fx >= 0.02 && fx <= 0.33 && fy >= 0.42 && fy <= 0.82) {
      this._closeAllPanels();
      this._walkTo(cw * 0.21, ch * 0.78, 'bed');
      return;
    }

    // Floor tap — walk there
    this._closeAllPanels();
    this._walkTo(sx, sy, null);
  }

  _walkTo(tx, ty, action) {
    const cw = this.canvas.width, ch = this.canvas.height;
    this._player.tx = Math.max(cw * 0.03, Math.min(cw * 0.97, tx));
    this._player.ty = Math.max(ch * 0.42, Math.min(ch * 0.93, ty));
    this._player.state = 'walking';
    this._pendingAction = action;
  }

  _closeAllPanels() {
    document.getElementById('home-aquarium-panel')?.style && (document.getElementById('home-aquarium-panel').style.display = 'none');
    document.getElementById('home-challenges-panel')?.style && (document.getElementById('home-challenges-panel').style.display = 'none');
  }

  // ── Sleep confirm ──────────────────────────────────────────────────────────

  _buildSleepConfirm() {
    this._sleepConfirmEl = document.createElement('div');
    this._sleepConfirmEl.id = 'home-sleep-confirm';
    this._sleepConfirmEl.innerHTML = `
      <div class="sleep-dialog">
        <div class="sleep-icon">🌙</div>
        <div class="sleep-title">Sleep until morning?</div>
        <div class="sleep-sub">Daily challenges will refresh.</div>
        <div class="sleep-btns">
          <button class="sleep-cancel-btn" id="sleep-cancel">Cancel</button>
          <button class="sleep-ok-btn" id="sleep-ok">Sleep 💤</button>
        </div>
      </div>
    `;
    document.body.appendChild(this._sleepConfirmEl);
    this._sleepConfirmEl.style.display = 'none';
    document.getElementById('sleep-cancel').addEventListener('click', () => {
      this._sleepConfirmEl.style.display = 'none';
    });
    document.getElementById('sleep-ok').addEventListener('click', () => {
      this._sleepConfirmEl.style.display = 'none';
      this._sleepState = 'fadeout';
      this._sleepAlpha = 0;
    });
  }

  // ── Aquarium panel ─────────────────────────────────────────────────────────

  _buildAquariumPanel() {
    let el = document.getElementById('home-aquarium-panel');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'home-aquarium-panel';
    el.innerHTML = `
      <div class="home-panel-header">
        <span>🐠 Aquarium</span>
        <button class="home-panel-close" id="aq-close">✕</button>
      </div>
      <div id="aq-content" class="home-panel-body"></div>
    `;
    document.body.appendChild(el);
    el.style.display = 'none';
    document.getElementById('aq-close').addEventListener('click', () => { el.style.display = 'none'; });
  }

  _openAquariumPanel() {
    const el = document.getElementById('home-aquarium-panel');
    const content = document.getElementById('aq-content');
    const inv = this.inventory;
    const RARITY_COLORS = { common: '#9E9E9E', uncommon: '#4CAF50', rare: '#2196F3', epic: '#9C27B0', legendary: '#FF9800' };
    const filled = inv.aquarium.length;
    const pct = (filled / 8) * 100;

    let html = `<div class="aq-cap-bar">
      <span>Capacity: ${filled} / 8</span>
      <div class="aq-cap-track"><div class="aq-cap-fill" style="width:${pct}%"></div></div>
    </div>`;

    if (filled > 0) {
      html += `<div class="aq-section-title">In Aquarium</div>`;
      html += inv.aquarium.map((f, i) => `
        <div class="aq-fish-row">
          <span class="aq-dot" style="color:${RARITY_COLORS[f.rarity] ?? '#9E9E9E'}">●</span>
          <span class="aq-fish-name">${f.name}</span>
          <span class="aq-fish-weight">${f.weight} lbs</span>
          <button class="aq-return-btn" data-aq="${i}">Return</button>
        </div>`).join('');
    }
    if (inv.caughtFish.length > 0) {
      html += `<div class="aq-section-title">Your Bag${filled >= 8 ? ' <em>(aquarium full)</em>' : ''}</div>`;
      html += inv.caughtFish.map((f, i) => `
        <div class="aq-fish-row">
          <span class="aq-dot" style="color:${RARITY_COLORS[f.rarity] ?? '#9E9E9E'}">●</span>
          <span class="aq-fish-name">${f.name}</span>
          <span class="aq-fish-weight">${f.weight} lbs</span>
          ${filled < 8 ? `<button class="aq-place-btn" data-bag="${i}">Place</button>` : '<span class="aq-full-label">Full</span>'}
        </div>`).join('');
    }
    if (filled === 0 && inv.caughtFish.length === 0) {
      html += `<div class="aq-empty">Catch some fish and place them here!</div>`;
    }

    content.innerHTML = html;
    el.style.display = 'flex';
    el.querySelectorAll('.aq-return-btn').forEach(btn => {
      btn.addEventListener('click', () => { inv.removeFromAquarium(+btn.dataset.aq); this._openAquariumPanel(); });
    });
    el.querySelectorAll('.aq-place-btn').forEach(btn => {
      btn.addEventListener('click', () => { inv.addToAquarium(+btn.dataset.bag); this._openAquariumPanel(); });
    });
  }

  // ── Challenges panel stub ──────────────────────────────────────────────────

  _buildChallengesPanel() {
    let el = document.getElementById('home-challenges-panel');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'home-challenges-panel';
    document.body.appendChild(el);
    el.style.display = 'none';
  }

  _showToast(msg) {
    const el = document.createElement('div');
    el.className = 'catch-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2200);
  }

  // ── Player movement ────────────────────────────────────────────────────────

  _updatePlayer(dt) {
    const p = this._player;
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 4) {
      const step = Math.min(dist, p.speed * dt);
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
      if (Math.random() < 0.25) {
        this._walkParticles.push({ x: p.x, y: p.y + 8, vx: (Math.random() - 0.5) * 18, vy: -8, life: 0.4 });
      }
    } else {
      p.x = p.tx; p.y = p.ty;
      if (p.state === 'walking') {
        p.state = 'idle';
        const action = this._pendingAction;
        this._pendingAction = null;
        if (action === 'door')      { this._closeAllPanels(); this.onExit(); }
        else if (action === 'bed')       { this._sleepConfirmEl.style.display = 'flex'; }
        else if (action === 'aquarium')  { this._openAquariumPanel(); }
      }
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(dt) {
    this.t += dt;

    this._updatePlayer(dt);

    this._walkParticles = this._walkParticles.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt * 2.5;
      return p.life > 0;
    });

    const ch = this.canvas.height;
    for (const b of this._bubbles) {
      b.y += b.vy * dt;
      if (b.y < ch * 0.12) Object.assign(b, this._spawnBubble(false));
    }

    if (this._sleepState === 'none') {
      if (Math.random() < dt * 0.75) {
        const cw = this.canvas.width;
        this._zzz.push({
          x: cw * 0.14 + (Math.random() - 0.5) * cw * 0.05,
          y: ch * 0.56, vx: (Math.random() - 0.5) * 9,
          vy: -(12 + Math.random() * 12), size: 8 + Math.random() * 9, life: 1,
        });
      }
    }
    this._zzz = this._zzz.filter(z => {
      z.x += z.vx * dt; z.y += z.vy * dt; z.life -= dt * 0.55;
      return z.life > 0;
    });

    if (this._sleepState === 'fadeout') {
      this._sleepAlpha = Math.min(1, this._sleepAlpha + dt * 1.5);
      if (this._sleepAlpha >= 1) {
        this._sleepState = 'dark'; this._sleepTimer = 1.4;
        this.gameTime.setTimeOfDay('morning');
        this.dailyChallenges.newDay();
      }
    } else if (this._sleepState === 'dark') {
      this._sleepTimer -= dt;
      if (this._sleepTimer <= 0) this._sleepState = 'fadein';
    } else if (this._sleepState === 'fadein') {
      this._sleepAlpha = Math.max(0, this._sleepAlpha - dt * 1.5);
      if (this._sleepAlpha <= 0) this._sleepState = 'none';
    }
  }

  // ── Draw ───────────────────────────────────────────────────────────────────

  draw() {
    const ctx = this.ctx;
    const cw = this.canvas.width, ch = this.canvas.height;

    this._drawRoom(cw, ch);
    this._drawAquariumVisual(cw, ch);
    this._drawWindow(cw, ch);
    this._drawTrophyShelf(cw, ch);
    this._drawBed(cw, ch);
    this._drawRodRack(cw, ch);
    this._drawDoor(cw, ch);
    this._drawWalkParticles();
    this._drawPlayer();
    this._drawZzz();

    if (this._sleepState !== 'none') {
      ctx.fillStyle = `rgba(0,0,0,${this._sleepAlpha})`;
      ctx.fillRect(0, 0, cw, ch);
      if (this._sleepState === 'dark') {
        const opacity = Math.min(1, (1.4 - this._sleepTimer) / 0.6);
        ctx.globalAlpha = opacity;
        ctx.fillStyle = '#FFF8DC';
        ctx.font = `bold ${Math.round(ch * 0.03)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('Good morning! ☀️', cw / 2, ch / 2);
        ctx.font = `${Math.round(ch * 0.02)}px sans-serif`;
        ctx.fillStyle = 'rgba(255,240,180,0.85)';
        ctx.fillText(`Day ${this.dailyChallenges.day} — New challenges await!`, cw / 2, ch / 2 + ch * 0.045);
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
      }
    }
  }

  _drawRoom(cw, ch) {
    const ctx = this.ctx;
    const floorY = ch * 0.36;

    // Back wall
    ctx.fillStyle = '#F5E6C8';
    ctx.fillRect(0, 0, cw, floorY);

    // Wallpaper stripes
    ctx.fillStyle = 'rgba(180,140,90,0.07)';
    const stripeW = cw * 0.04;
    for (let x = 0; x < cw; x += stripeW * 2) ctx.fillRect(x, 0, stripeW, floorY);

    // Floor fill
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, ch);
    floorGrad.addColorStop(0, '#B8703A');
    floorGrad.addColorStop(1, '#7A4520');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, cw, ch - floorY);

    // Perspective floor grid (radial lines from vanishing point)
    const vpX = cw / 2, vpY = floorY;
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 1;
    const numRadial = 12;
    for (let i = 0; i <= numRadial; i++) {
      const bx = (i / numRadial) * cw;
      ctx.beginPath(); ctx.moveTo(vpX, vpY); ctx.lineTo(bx, ch); ctx.stroke();
    }
    // Horizontal cross lines (quadratic spacing — close near horizon, spread near camera)
    const numCross = 8;
    for (let i = 1; i <= numCross; i++) {
      const t = i / numCross;
      const y = vpY + (ch - vpY) * (t * t);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }

    // Baseboard
    ctx.fillStyle = '#A07040';
    ctx.fillRect(0, floorY - ch * 0.005, cw, ch * 0.022);

    // Ceiling beam
    ctx.fillStyle = '#7B4A22';
    ctx.fillRect(0, 0, cw, ch * 0.046);

    // Lamp cord
    const lampX = cw / 2;
    ctx.strokeStyle = '#5C3D1E'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lampX, ch * 0.046); ctx.lineTo(lampX, ch * 0.095); ctx.stroke();

    // Lamp shade
    ctx.fillStyle = '#D4A060';
    ctx.beginPath();
    ctx.moveTo(lampX - cw * 0.048, ch * 0.095);
    ctx.lineTo(lampX + cw * 0.048, ch * 0.095);
    ctx.lineTo(lampX + cw * 0.032, ch * 0.135);
    ctx.lineTo(lampX - cw * 0.032, ch * 0.135);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9B6A30'; ctx.lineWidth = 1.5; ctx.stroke();

    // Lamp glow
    const glow = ctx.createRadialGradient(lampX, ch * 0.135, 0, lampX, ch * 0.135, ch * 0.26);
    glow.addColorStop(0, 'rgba(255,220,100,0.26)');
    glow.addColorStop(1, 'rgba(255,220,100,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(lampX, ch * 0.135, ch * 0.26, 0, Math.PI * 2); ctx.fill();
  }

  _drawAquariumVisual(cw, ch) {
    const ctx = this.ctx;
    const x1 = cw * 0.03, y1 = ch * 0.065;
    const aw = cw * 0.44, ah = ch * 0.27;
    const x2 = x1 + aw, y2 = y1 + ah;

    // Water fill
    const wGrad = ctx.createLinearGradient(x1, y1, x1, y2);
    wGrad.addColorStop(0, 'rgba(30,120,220,0.28)');
    wGrad.addColorStop(1, 'rgba(0,50,140,0.48)');
    ctx.fillStyle = wGrad;
    ctx.fillRect(x1, y1, aw, ah);

    // Sand
    ctx.fillStyle = '#C8B060';
    ctx.fillRect(x1, y2 - ah * 0.12, aw, ah * 0.12);

    // Pebbles
    ctx.fillStyle = '#A08048';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.ellipse(x1 + aw * (0.1 + i * 0.15), y2 - ah * 0.06, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Seaweed
    ctx.strokeStyle = 'rgba(30,160,60,0.6)'; ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      const sx = x1 + aw * (0.12 + i * 0.3);
      ctx.beginPath(); ctx.moveTo(sx, y2 - ah * 0.12);
      for (let j = 1; j <= 4; j++) {
        const sy = y2 - ah * 0.12 - j * ah * 0.07;
        ctx.quadraticCurveTo(sx + Math.sin(this.t * 1.4 + i + j) * 8, sy + ah * 0.035, sx, sy);
      }
      ctx.stroke();
    }

    // Fish in aquarium
    const RARITY_COLORS = { common: '#9E9E9E', uncommon: '#4CAF50', rare: '#2196F3', epic: '#9C27B0', legendary: '#FF9800' };
    this.inventory.aquarium.forEach((f, i) => {
      const n = this.inventory.aquarium.length;
      const fx = x1 + aw * (0.15 + (i / Math.max(n, 1)) * 0.7);
      const fy = y1 + ah * 0.35 + Math.sin(this.t * 1.3 + i * 1.8) * ah * 0.14;
      const fc = RARITY_COLORS[f.rarity] ?? '#9E9E9E';
      const dir = Math.sin(this.t * 0.8 + i * 2.5) > 0 ? 1 : -1;
      ctx.save(); ctx.translate(fx, fy); ctx.scale(dir, 1);
      ctx.fillStyle = fc;
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-16, -5); ctx.lineTo(-16, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(3, -1.5, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // Bubbles
    ctx.strokeStyle = 'rgba(160,210,255,0.55)'; ctx.lineWidth = 1;
    for (const b of this._bubbles) {
      if (b.x < x1 || b.x > x2 || b.y < y1 || b.y > y2) continue;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    }

    // Glass frame
    ctx.strokeStyle = '#5C3D1E'; ctx.lineWidth = 3;
    ctx.strokeRect(x1, y1, aw, ah);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x1, y1, aw * 0.12, ah);

    // Label
    const n = this.inventory.aquarium.length;
    ctx.fillStyle = n > 0 ? '#3E2000' : 'rgba(80,40,0,0.55)';
    ctx.font = `bold ${Math.round(ch * 0.017)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`🐠 Aquarium (${n}/8)  TAP`, x1 + aw / 2, y2 + ch * 0.025);
    ctx.textAlign = 'left';
  }

  _drawWindow(cw, ch) {
    const ctx = this.ctx;
    const wx = cw * 0.46, wy = ch * 0.075, ww = cw * 0.09, wh = ch * 0.20;

    ctx.fillStyle = '#B3E0FF';
    ctx.fillRect(wx, wy, ww, wh);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = this.gameTime.skyColor;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#5C3D1E'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeRect(wx, wy, ww, wh);

    // Curtains
    ctx.fillStyle = '#B04040';
    ctx.fillRect(wx - cw * 0.02, wy - 4, cw * 0.022, wh + 8);
    ctx.fillRect(wx + ww - cw * 0.002, wy - 4, cw * 0.022, wh + 8);
    ctx.fillStyle = '#7B4A22';
    ctx.fillRect(wx - cw * 0.025, wy - 6, ww + cw * 0.052, 5);
  }

  _drawTrophyShelf(cw, ch) {
    const ctx = this.ctx;
    const sx = cw * 0.58, sy = ch * 0.065;
    const sw = cw * 0.39, sh = ch * 0.27;

    // Cork background
    ctx.fillStyle = '#C8A060';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = 'rgba(160,110,40,0.22)';
    for (let i = 0; i < 18; i++) {
      ctx.beginPath(); ctx.arc(sx + (i * 53 % sw), sy + (i * 37 % sh), 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#7B4A22'; ctx.lineWidth = 4;
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.fillStyle = '#7B4A22';
    ctx.fillRect(sx - 5, sy + sh - 9, sw + 10, 12);

    ctx.fillStyle = '#3E2000';
    ctx.font = `bold ${Math.round(ch * 0.018)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🏆 Trophy Wall', sx + sw / 2, sy + sh + ch * 0.030);

    const trophies = this.inventory.trophies;
    if (trophies.length === 0) {
      ctx.fillStyle = 'rgba(80,40,0,0.45)';
      ctx.font = `${Math.round(ch * 0.015)}px sans-serif`;
      ctx.fillText('Catch big fish!', sx + sw / 2, sy + sh * 0.52);
      ctx.textAlign = 'left'; return;
    }

    const RARITY_COLORS = { common: '#9E9E9E', uncommon: '#4CAF50', rare: '#2196F3', epic: '#9C27B0', legendary: '#FF9800' };
    const slotW = sw / 3;
    trophies.forEach((tr, i) => {
      const tx = sx + i * slotW + slotW / 2;
      const ty = sy + sh * 0.48;
      const rc = RARITY_COLORS[tr.rarity] ?? '#9E9E9E';

      ctx.fillStyle = '#8B6340';
      this._roundRect(tx - slotW * 0.40, ty - sh * 0.34, slotW * 0.80, sh * 0.72, 5); ctx.fill();
      ctx.strokeStyle = '#5C3D1E'; ctx.lineWidth = 1.5;
      this._roundRect(tx - slotW * 0.40, ty - sh * 0.34, slotW * 0.80, sh * 0.72, 5); ctx.stroke();

      ctx.fillStyle = '#C8A060';
      ctx.beginPath(); ctx.arc(tx, ty - sh * 0.30, 3, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = rc;
      ctx.beginPath(); ctx.ellipse(tx, ty - sh * 0.08, slotW * 0.28, slotW * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tx - slotW * 0.28, ty - sh * 0.08);
      ctx.lineTo(tx - slotW * 0.44, ty - sh * 0.20);
      ctx.lineTo(tx - slotW * 0.44, ty + sh * 0.04);
      ctx.closePath(); ctx.fill();

      const shortName = tr.name.length > 9 ? tr.name.slice(0, 8) + '…' : tr.name;
      ctx.fillStyle = '#F5E0C0';
      ctx.font = `bold ${Math.round(ch * 0.013)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(shortName, tx, ty + sh * 0.18);
      ctx.font = `${Math.round(ch * 0.011)}px sans-serif`;
      ctx.fillStyle = 'rgba(245,224,192,0.75)';
      ctx.fillText(`${tr.weight} lbs`, tx, ty + sh * 0.30);
    });
    ctx.textAlign = 'left';
  }

  _drawBed(cw, ch) {
    const ctx = this.ctx;
    const bx = cw * 0.03, by = ch * 0.44;
    const bw = cw * 0.27, bh = ch * 0.30;

    ctx.fillStyle = '#5C3D1E';
    ctx.fillRect(bx, by - bh * 0.12, bw, bh * 0.14);
    ctx.fillStyle = '#7B4A22';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#E8D0A0';
    ctx.fillRect(bx + bw * 0.04, by + bh * 0.08, bw * 0.92, bh * 0.78);

    ctx.fillStyle = '#FAFAFA';
    this._roundRect(bx + bw * 0.07, by + bh * 0.11, bw * 0.37, bh * 0.28, 4); ctx.fill();

    const blanketGrad = ctx.createLinearGradient(bx, by + bh * 0.40, bx, by + bh);
    blanketGrad.addColorStop(0, '#5C7AC8');
    blanketGrad.addColorStop(1, '#3A5096');
    ctx.fillStyle = blanketGrad;
    ctx.fillRect(bx + bw * 0.04, by + bh * 0.40, bw * 0.92, bh * 0.44);
    ctx.fillStyle = '#4A68B6';
    ctx.fillRect(bx + bw * 0.04, by + bh * 0.40, bw * 0.92, bh * 0.06);
    ctx.fillStyle = '#5C3D1E';
    ctx.fillRect(bx, by + bh, bw, bh * 0.06);

    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.font = `${Math.round(ch * 0.015)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('💤 TAP TO SLEEP', bx + bw / 2, by + bh + bh * 0.06 + ch * 0.024);
    ctx.textAlign = 'left';
  }

  _drawRodRack(cw, ch) {
    const ctx = this.ctx;
    const rx = cw * 0.60, ry = ch * 0.42;
    const rw = cw * 0.37, rh = ch * 0.34;

    ctx.fillStyle = '#8B5E2A';
    this._roundRect(rx, ry, rw, rh * 0.28, 4); ctx.fill();
    ctx.strokeStyle = '#5C3D1E'; ctx.lineWidth = 2;
    this._roundRect(rx, ry, rw, rh * 0.28, 4); ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(rx + rw * (i / 4), ry); ctx.lineTo(rx + rw * (i / 4), ry + rh * 0.28); ctx.stroke();
    }

    ctx.fillStyle = '#5C3D1E';
    for (const hp of [0.15, 0.38, 0.62, 0.85]) {
      ctx.beginPath(); ctx.arc(rx + rw * hp, ry + rh * 0.14, rw * 0.028, 0, Math.PI * 2); ctx.fill();
    }

    const rodColors = ['#7B4A22','#5C3D1E','#9B6A30'];
    const rodTipColors = ['#C8A060','#A07040','#D4B070'];
    const rodAngles = [-0.10, 0.0, 0.10];
    const rodBaseX = [rx + rw * 0.18, rx + rw * 0.50, rx + rw * 0.82];
    const rodLen = rh * 0.72;

    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.translate(rodBaseX[i], ry + rh * 0.26); ctx.rotate(rodAngles[i]);
      ctx.strokeStyle = rodColors[i]; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -rodLen * 0.55); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -rodLen * 0.55); ctx.lineTo(0, -rodLen); ctx.stroke();
      ctx.strokeStyle = rodTipColors[i]; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -rodLen * 0.90); ctx.lineTo(0, -rodLen); ctx.stroke();

      ctx.fillStyle = '#3E3E3E';
      ctx.beginPath(); ctx.ellipse(0, -rh * 0.08, rw * 0.035, rh * 0.022, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.stroke();

      ctx.strokeStyle = '#C0C0C0'; ctx.lineWidth = 1;
      for (let g = 1; g <= 3; g++) {
        ctx.beginPath(); ctx.arc(0, -rodLen * (0.25 + g * 0.18), 3, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(200,220,255,0.5)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, -rodLen); ctx.lineTo(rw * 0.04, -rodLen + rh * 0.04); ctx.stroke();
      ctx.restore();
    }

    const shelfY = ry + rh * 0.80;
    ctx.fillStyle = '#7B4A22'; ctx.fillRect(rx, shelfY, rw, rh * 0.055);
    ctx.strokeStyle = '#5C3D1E'; ctx.lineWidth = 1.5; ctx.strokeRect(rx, shelfY, rw, rh * 0.055);
    ctx.fillStyle = '#5C3D1E';
    ctx.fillRect(rx + rw * 0.08, shelfY, rw * 0.04, rh * 0.10);
    ctx.fillRect(rx + rw * 0.88, shelfY, rw * 0.04, rh * 0.10);

    const boxColors = ['#3A7A3A','#3A3A8A','#8A3A3A'];
    for (let i = 0; i < 3; i++) {
      const bx2 = rx + rw * [0.08,0.40,0.72][i];
      const boxY = shelfY - rh * 0.095;
      const boxW = rw * 0.22, boxH = rh * 0.10;
      ctx.fillStyle = boxColors[i];
      this._roundRect(bx2, boxY, boxW, boxH, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
      this._roundRect(bx2, boxY, boxW, boxH, 2); ctx.stroke();
      ctx.fillStyle = '#C8A060';
      ctx.fillRect(bx2 + boxW * 0.40, boxY + boxH * 0.35, boxW * 0.20, boxH * 0.30);
    }

    const hbX = rx + rw * 0.02, hbY = ry + rh * 0.30;
    ctx.fillStyle = '#9B6A30'; ctx.fillRect(hbX, hbY, rw * 0.96, rh * 0.07);
    ctx.strokeStyle = '#5C3D1E'; ctx.lineWidth = 1.5; ctx.strokeRect(hbX, hbY, rw * 0.96, rh * 0.07);
    ctx.strokeStyle = '#C8C8C8'; ctx.lineWidth = 1.5;
    for (const hp of [0.12,0.28,0.44,0.60,0.76,0.92]) {
      const hkX = hbX + rw * 0.96 * hp, hkY = hbY + rh * 0.035;
      ctx.beginPath(); ctx.arc(hkX, hkY, rw * 0.018, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hkX + rw * 0.018, hkY); ctx.lineTo(hkX + rw * 0.018, hkY + rh * 0.025); ctx.stroke();
    }
  }

  _drawDoor(cw, ch) {
    const ctx = this.ctx;
    const dx = cw * 0.44, dy = ch * 0.60;
    const dw = cw * 0.13, dh = ch * 0.30;

    // Door frame
    ctx.fillStyle = '#5C3D1E';
    ctx.fillRect(dx - 5, dy - 5, dw + 10, dh + 5);
    ctx.beginPath(); ctx.arc(dx + dw / 2, dy, dw / 2 + 5, Math.PI, 0); ctx.fill();

    // Door body
    ctx.fillStyle = '#A07040';
    ctx.fillRect(dx, dy, dw, dh);
    ctx.beginPath(); ctx.arc(dx + dw / 2, dy, dw / 2, Math.PI, 0); ctx.fill();

    // Door panels
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
    ctx.strokeRect(dx + dw * 0.1, dy + dh * 0.07, dw * 0.8, dh * 0.38);
    ctx.strokeRect(dx + dw * 0.1, dy + dh * 0.52, dw * 0.8, dh * 0.36);

    // Knob
    ctx.fillStyle = '#D4A060';
    ctx.beginPath(); ctx.arc(dx + dw * 0.78, dy + dh * 0.52, 4, 0, Math.PI * 2); ctx.fill();

    // Exit label
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold ${Math.round(ch * 0.016)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🚪 TAP DOOR TO EXIT', dx + dw / 2, dy + dh + ch * 0.026);
    ctx.textAlign = 'left';
  }

  _drawZzz() {
    const ctx = this.ctx;
    for (const z of this._zzz) {
      ctx.globalAlpha = z.life * 0.75;
      ctx.fillStyle = '#7777EE';
      ctx.font = `bold ${Math.round(z.size)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('z', z.x, z.y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  _drawWalkParticles() {
    const ctx = this.ctx;
    for (const p of this._walkParticles) {
      ctx.globalAlpha = p.life * 0.4;
      ctx.fillStyle = '#C8A87A';
      ctx.fillRect(Math.round(p.x - 2), Math.round(p.y - 2), 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  _drawPlayer() {
    const ctx = this.ctx;
    const { x, y, state } = this._player;
    const bounce = state === 'walking' ? Math.sin(this.t * 8) * 2 : 0;
    const py = y + bounce;

    const fur   = this.appearance?.furColor   ?? '#FFCC80';
    const shirt = this.appearance?.shirtColor ?? '#1976D2';
    const pants = this.appearance?.pantsColor ?? '#37474F';

    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(x, y + 14, 10, 4, 0, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = fur; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 5, py + 5); ctx.quadraticCurveTo(x - 20, py - 2, x - 18, py - 12); ctx.stroke();
    ctx.lineCap = 'butt';

    ctx.fillStyle = pants;
    ctx.fillRect(Math.round(x) - 6, Math.round(py) + 6, 5, 8);
    ctx.fillRect(Math.round(x) + 1, Math.round(py) + 6, 5, 8);

    ctx.fillStyle = shirt;
    ctx.fillRect(Math.round(x) - 7, Math.round(py) - 3, 14, 10);

    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.moveTo(x-7,py-13); ctx.lineTo(x-4,py-22); ctx.lineTo(x-1,py-13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+1,py-13); ctx.lineTo(x+4,py-22); ctx.lineTo(x+7,py-13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FF8FAB';
    ctx.beginPath(); ctx.moveTo(x-6,py-14); ctx.lineTo(x-4,py-20); ctx.lineTo(x-2,py-14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+2,py-14); ctx.lineTo(x+4,py-20); ctx.lineTo(x+6,py-14); ctx.closePath(); ctx.fill();

    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.arc(x, py - 9, 8, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#2d2d2d';
    ctx.beginPath(); ctx.ellipse(x-3, py-11, 2, 1.5, -0.25, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+3, py-11, 2, 1.5,  0.25, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(x-2.2, py-11.5, 0.8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+3.8, py-11.5, 0.8, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = '#FF8FAB';
    ctx.beginPath(); ctx.arc(x, py - 7.5, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(80,40,0,0.35)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(x-5-i*1.8, py-7.5, 0.8, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x+5+i*1.8, py-7.5, 0.8, 0, Math.PI*2); ctx.fill();
    }
  }

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  destroy() {
    this.canvas.removeEventListener('click', this._onMouseClick);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
    this._sleepConfirmEl?.remove();
    document.getElementById('home-aquarium-panel')?.remove();
    document.getElementById('home-challenges-panel')?.remove();
  }
}
