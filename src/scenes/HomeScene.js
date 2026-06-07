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
    this._sleepState = 'none'; // 'none' | 'fadeout' | 'dark' | 'fadein'
    this._sleepAlpha = 0;
    this._sleepTimer = 0;

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
      x: cw * 0.05 + Math.random() * cw * 0.36,
      y: spread ? ch * 0.12 + Math.random() * ch * 0.26 : ch * 0.38,
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

    // Exit door
    if (fx >= 0.43 && fx <= 0.57 && fy >= 0.78 && fy <= 0.97) {
      this._closeAllPanels();
      this.onExit();
      return;
    }
    // Bed
    if (fx >= 0.03 && fx <= 0.32 && fy >= 0.48 && fy <= 0.82) {
      this._closeAllPanels();
      this._sleepConfirmEl.style.display = 'flex';
      return;
    }
    // Aquarium
    if (fx >= 0.03 && fx <= 0.43 && fy >= 0.07 && fy <= 0.42) {
      document.getElementById('home-challenges-panel').style.display = 'none';
      this._openAquariumPanel();
      return;
    }
    // Challenges board
    if (fx >= 0.58 && fx <= 0.97 && fy >= 0.44 && fy <= 0.86) {
      document.getElementById('home-aquarium-panel').style.display = 'none';
      this._openChallengesPanel();
      return;
    }
    // Trophy shelf
    if (fx >= 0.58 && fx <= 0.97 && fy >= 0.07 && fy <= 0.40) {
      this._closeAllPanels();
      return;
    }
    this._closeAllPanels();
  }

  _closeAllPanels() {
    document.getElementById('home-aquarium-panel').style.display = 'none';
    document.getElementById('home-challenges-panel').style.display = 'none';
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

    let html = `
      <div class="aq-cap-bar">
        <span>Capacity: ${filled} / 8</span>
        <div class="aq-cap-track"><div class="aq-cap-fill" style="width:${pct}%"></div></div>
      </div>
    `;

    if (filled > 0) {
      html += `<div class="aq-section-title">In Aquarium</div>`;
      html += inv.aquarium.map((f, i) => `
        <div class="aq-fish-row">
          <span class="aq-dot" style="color:${RARITY_COLORS[f.rarity] ?? '#9E9E9E'}">●</span>
          <span class="aq-fish-name">${f.name}</span>
          <span class="aq-fish-weight">${f.weight} lbs</span>
          <button class="aq-return-btn" data-aq="${i}">Return</button>
        </div>
      `).join('');
    }

    if (inv.caughtFish.length > 0) {
      html += `<div class="aq-section-title">Your Bag${filled >= 8 ? ' <em>(aquarium full)</em>' : ''}</div>`;
      html += inv.caughtFish.map((f, i) => `
        <div class="aq-fish-row">
          <span class="aq-dot" style="color:${RARITY_COLORS[f.rarity] ?? '#9E9E9E'}">●</span>
          <span class="aq-fish-name">${f.name}</span>
          <span class="aq-fish-weight">${f.weight} lbs</span>
          ${filled < 8
            ? `<button class="aq-place-btn" data-bag="${i}">Place</button>`
            : '<span class="aq-full-label">Full</span>'
          }
        </div>
      `).join('');
    }

    if (filled === 0 && inv.caughtFish.length === 0) {
      html += `<div class="aq-empty">Catch some fish and place them here!</div>`;
    }

    content.innerHTML = html;
    el.style.display = 'flex';

    el.querySelectorAll('.aq-return-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        inv.removeFromAquarium(+btn.dataset.aq);
        this._openAquariumPanel();
      });
    });
    el.querySelectorAll('.aq-place-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        inv.addToAquarium(+btn.dataset.bag);
        this._openAquariumPanel();
      });
    });
  }

  // ── Challenges panel ───────────────────────────────────────────────────────

  _buildChallengesPanel() {
    let el = document.getElementById('home-challenges-panel');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'home-challenges-panel';
    document.body.appendChild(el);
    el.style.display = 'none';
  }

  _openChallengesPanel() {
    const el = document.getElementById('home-challenges-panel');
    const dc = this.dailyChallenges;
    const inv = this.inventory;

    let html = `
      <div class="home-panel-header">
        <span>📋 Day ${dc.day} Challenges</span>
        <button class="home-panel-close" id="ch-close">✕</button>
      </div>
      <div class="home-panel-body">
    `;

    for (let i = 0; i < 3; i++) {
      const slot = dc._challenges[i];
      if (!slot) continue;
      const prog = dc.getProgress(i);
      const t = slot.template;
      const done = dc.isComplete(i);
      const claimed = slot.claimed;
      const pct = Math.round((prog.current / prog.total) * 100);

      html += `
        <div class="ch-card${done && !claimed ? ' ch-done' : ''}${claimed ? ' ch-claimed' : ''}">
          <div class="ch-card-top">
            <span class="ch-icon">${t.icon}</span>
            <span class="ch-desc">${t.desc}</span>
            <span class="ch-reward">$${t.reward}</span>
          </div>
          <div class="ch-progress-wrap">
            <div class="ch-progress-track">
              <div class="ch-progress-fill${done ? ' ch-fill-done' : ''}" style="width:${pct}%"></div>
            </div>
            <span class="ch-progress-label">${prog.current}/${prog.total}</span>
          </div>
          ${done && !claimed ? `<button class="ch-claim-btn" data-idx="${i}">Claim $${t.reward} ✓</button>` : ''}
          ${claimed ? '<div class="ch-claimed-badge">✓ Claimed</div>' : ''}
        </div>
      `;
    }

    // Bonus card
    const allClaimed = dc._challenges.every(s => s.claimed);
    const bonusClaimed = dc.bonusClaimed;
    const doneCnt = dc._challenges.filter(s => s.claimed).length;
    html += `
      <div class="ch-card ch-bonus-card${allClaimed ? ' ch-done' : ''}${bonusClaimed ? ' ch-claimed' : ''}">
        <div class="ch-card-top">
          <span class="ch-icon">⭐</span>
          <span class="ch-desc">Complete all 3 challenges</span>
          <span class="ch-reward">$200</span>
        </div>
        ${!allClaimed ? `<div class="ch-progress-label">${doneCnt}/3 claimed</div>` : ''}
        ${allClaimed && !bonusClaimed ? '<button class="ch-claim-btn" id="ch-bonus-btn">Claim $200 Bonus ⭐</button>' : ''}
        ${bonusClaimed ? '<div class="ch-claimed-badge">✓ Claimed</div>' : ''}
      </div>
    `;

    html += `</div>`;
    el.innerHTML = html;
    el.style.display = 'flex';

    document.getElementById('ch-close')?.addEventListener('click', () => { el.style.display = 'none'; });

    el.querySelectorAll('.ch-claim-btn[data-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const earned = dc.claimReward(+btn.dataset.idx, inv);
        if (earned) this._showToast(`+$${earned} reward!`);
        this._openChallengesPanel();
      });
    });
    document.getElementById('ch-bonus-btn')?.addEventListener('click', () => {
      const earned = dc.claimBonus(inv);
      if (earned) this._showToast(`Bonus! +$${earned}!`);
      this._openChallengesPanel();
    });
  }

  _showToast(msg) {
    const el = document.createElement('div');
    el.className = 'catch-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2200);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(dt) {
    this.t += dt;
    const ch = this.canvas.height;

    // Bubbles drift upward
    for (const b of this._bubbles) {
      b.y += b.vy * dt;
      if (b.y < ch * 0.12) Object.assign(b, this._spawnBubble(false));
    }

    // ZZZ from bed when idle
    if (this._sleepState === 'none') {
      if (Math.random() < dt * 0.75) {
        const cw = this.canvas.width;
        this._zzz.push({
          x: cw * 0.14 + (Math.random() - 0.5) * cw * 0.05,
          y: ch * 0.56,
          vx: (Math.random() - 0.5) * 9,
          vy: -(12 + Math.random() * 12),
          size: 8 + Math.random() * 9,
          life: 1,
        });
      }
    }
    this._zzz = this._zzz.filter(z => {
      z.x += z.vx * dt;
      z.y += z.vy * dt;
      z.life -= dt * 0.55;
      return z.life > 0;
    });

    // Sleep fade states
    if (this._sleepState === 'fadeout') {
      this._sleepAlpha = Math.min(1, this._sleepAlpha + dt * 1.5);
      if (this._sleepAlpha >= 1) {
        this._sleepState = 'dark';
        this._sleepTimer = 1.4;
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
    this._drawChallengesBoard(cw, ch);
    this._drawDoor(cw, ch);
    this._drawZzz();

    // Sleep overlay
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
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
      }
    }
  }

  _drawRoom(cw, ch) {
    const ctx = this.ctx;

    // Back wall
    ctx.fillStyle = '#F5E6C8';
    ctx.fillRect(0, 0, cw, ch * 0.44);

    // Wallpaper vertical stripes
    ctx.fillStyle = 'rgba(180,140,90,0.07)';
    const stripeW = cw * 0.04;
    for (let x = 0; x < cw; x += stripeW * 2) ctx.fillRect(x, 0, stripeW, ch * 0.44);

    // Baseboard trim
    ctx.fillStyle = '#A07040';
    ctx.fillRect(0, ch * 0.405, cw, ch * 0.025);

    // Floor (warm wood planks)
    const floorGrad = ctx.createLinearGradient(0, ch * 0.43, 0, ch);
    floorGrad.addColorStop(0, '#C8873C');
    floorGrad.addColorStop(1, '#8B5E2A');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, ch * 0.43, cw, ch * 0.57);

    // Plank lines
    ctx.strokeStyle = 'rgba(0,0,0,0.09)';
    ctx.lineWidth = 1;
    const plankH = ch * 0.042;
    for (let y = ch * 0.43; y < ch; y += plankH) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }
    const plankW = cw * 0.16;
    for (let x = 0; x < cw; x += plankW) {
      ctx.beginPath(); ctx.moveTo(x, ch * 0.43); ctx.lineTo(x, ch); ctx.stroke();
    }

    // Ceiling beam
    ctx.fillStyle = '#7B4A22';
    ctx.fillRect(0, 0, cw, ch * 0.048);

    // Hanging lamp cord
    const lampX = cw / 2;
    ctx.strokeStyle = '#5C3D1E';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lampX, ch * 0.048); ctx.lineTo(lampX, ch * 0.095); ctx.stroke();

    // Lamp shade
    ctx.fillStyle = '#D4A060';
    ctx.beginPath();
    ctx.moveTo(lampX - cw * 0.048, ch * 0.095);
    ctx.lineTo(lampX + cw * 0.048, ch * 0.095);
    ctx.lineTo(lampX + cw * 0.032, ch * 0.135);
    ctx.lineTo(lampX - cw * 0.032, ch * 0.135);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9B6A30';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Lamp glow
    const glow = ctx.createRadialGradient(lampX, ch * 0.135, 0, lampX, ch * 0.135, ch * 0.24);
    glow.addColorStop(0, 'rgba(255,220,100,0.28)');
    glow.addColorStop(1, 'rgba(255,220,100,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(lampX, ch * 0.135, ch * 0.24, 0, Math.PI * 2); ctx.fill();
  }

  _drawAquariumVisual(cw, ch) {
    const ctx = this.ctx;
    const x1 = cw * 0.03, y1 = ch * 0.07;
    const aw = cw * 0.40, ah = ch * 0.33;
    const x2 = x1 + aw, y2 = y1 + ah;

    // Water fill
    const wGrad = ctx.createLinearGradient(x1, y1, x1, y2);
    wGrad.addColorStop(0, 'rgba(30,120,220,0.28)');
    wGrad.addColorStop(1, 'rgba(0,50,140,0.48)');
    ctx.fillStyle = wGrad;
    ctx.fillRect(x1, y1, aw, ah);

    // Sand bottom
    ctx.fillStyle = '#C8B060';
    ctx.fillRect(x1, y2 - ah * 0.12, aw, ah * 0.12);

    // Pebbles
    ctx.fillStyle = '#A08048';
    for (let i = 0; i < 6; i++) {
      const px = x1 + aw * (0.1 + i * 0.15);
      ctx.beginPath(); ctx.ellipse(px, y2 - ah * 0.06, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Seaweed
    ctx.strokeStyle = 'rgba(30,160,60,0.6)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      const sx = x1 + aw * (0.12 + i * 0.3);
      ctx.beginPath(); ctx.moveTo(sx, y2 - ah * 0.12);
      for (let j = 1; j <= 4; j++) {
        const sy = y2 - ah * 0.12 - j * ah * 0.07;
        ctx.quadraticCurveTo(sx + Math.sin(this.t * 1.4 + i + j) * 8, sy + ah * 0.035, sx, sy);
      }
      ctx.stroke();
    }

    // Fish
    const RARITY_COLORS = { common: '#9E9E9E', uncommon: '#4CAF50', rare: '#2196F3', epic: '#9C27B0', legendary: '#FF9800' };
    this.inventory.aquarium.forEach((f, i) => {
      const n = this.inventory.aquarium.length;
      const fx = x1 + aw * (0.15 + (i / Math.max(n, 1)) * 0.7);
      const fy = y1 + ah * 0.35 + Math.sin(this.t * 1.3 + i * 1.8) * ah * 0.14;
      const fc = RARITY_COLORS[f.rarity] ?? '#9E9E9E';
      const dir = Math.sin(this.t * 0.8 + i * 2.5) > 0 ? 1 : -1;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.scale(dir, 1);
      ctx.fillStyle = fc;
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-16, -5); ctx.lineTo(-16, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(3, -1.5, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // Bubbles
    ctx.strokeStyle = 'rgba(160,210,255,0.55)';
    ctx.lineWidth = 1;
    for (const b of this._bubbles) {
      if (b.x < x1 || b.x > x2 || b.y < y1 || b.y > y2) continue;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    }

    // Glass frame
    ctx.strokeStyle = '#5C3D1E';
    ctx.lineWidth = 3;
    ctx.strokeRect(x1, y1, aw, ah);

    // Glass sheen
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x1, y1, aw * 0.12, ah);

    // Label
    const n = this.inventory.aquarium.length;
    ctx.fillStyle = n > 0 ? '#3E2000' : 'rgba(80,40,0,0.55)';
    ctx.font = `bold ${Math.round(ch * 0.018)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`🐠 Aquarium (${n}/8)  TAP`, x1 + aw / 2, y2 + ch * 0.027);
    ctx.textAlign = 'left';
  }

  _drawWindow(cw, ch) {
    const ctx = this.ctx;
    const wx = cw * 0.46, wy = ch * 0.075, ww = cw * 0.09, wh = ch * 0.22;

    ctx.fillStyle = '#B3E0FF';
    ctx.fillRect(wx, wy, ww, wh);

    ctx.globalAlpha = 0.55;
    ctx.fillStyle = this.gameTime.skyColor;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.globalAlpha = 1;

    // Cross dividers
    ctx.strokeStyle = '#5C3D1E';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();

    // Frame
    ctx.lineWidth = 3;
    ctx.strokeRect(wx, wy, ww, wh);

    // Curtains
    ctx.fillStyle = '#B04040';
    ctx.fillRect(wx - cw * 0.02, wy - 4, cw * 0.022, wh + 8);
    ctx.fillRect(wx + ww - cw * 0.002, wy - 4, cw * 0.022, wh + 8);
    // Curtain rod
    ctx.fillStyle = '#7B4A22';
    ctx.fillRect(wx - cw * 0.025, wy - 6, ww + cw * 0.052, 5);
  }

  _drawTrophyShelf(cw, ch) {
    const ctx = this.ctx;
    const sx = cw * 0.58, sy = ch * 0.07;
    const sw = cw * 0.39, sh = ch * 0.31;

    // Cork background
    ctx.fillStyle = '#C8A060';
    ctx.fillRect(sx, sy, sw, sh);

    // Cork dimples
    ctx.fillStyle = 'rgba(160,110,40,0.22)';
    for (let i = 0; i < 18; i++) {
      const cx = sx + (i * 53 % sw);
      const cy = sy + (i * 37 % sh);
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
    }

    // Frame
    ctx.strokeStyle = '#7B4A22';
    ctx.lineWidth = 4;
    ctx.strokeRect(sx, sy, sw, sh);

    // Shelf plank
    ctx.fillStyle = '#7B4A22';
    ctx.fillRect(sx - 5, sy + sh - 9, sw + 10, 12);

    // Title
    ctx.fillStyle = '#3E2000';
    ctx.font = `bold ${Math.round(ch * 0.019)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🏆 Trophy Wall', sx + sw / 2, sy + sh + ch * 0.032);

    const trophies = this.inventory.trophies;
    if (trophies.length === 0) {
      ctx.fillStyle = 'rgba(80,40,0,0.45)';
      ctx.font = `${Math.round(ch * 0.016)}px sans-serif`;
      ctx.fillText('Catch big fish!', sx + sw / 2, sy + sh * 0.52);
      ctx.textAlign = 'left';
      return;
    }

    const RARITY_COLORS = { common: '#9E9E9E', uncommon: '#4CAF50', rare: '#2196F3', epic: '#9C27B0', legendary: '#FF9800' };
    const slotW = sw / 3;
    trophies.forEach((tr, i) => {
      const tx = sx + i * slotW + slotW / 2;
      const ty = sy + sh * 0.48;
      const rc = RARITY_COLORS[tr.rarity] ?? '#9E9E9E';

      // Plaque
      ctx.fillStyle = '#8B6340';
      this._roundRect(tx - slotW * 0.40, ty - sh * 0.34, slotW * 0.80, sh * 0.72, 5);
      ctx.fill();
      ctx.strokeStyle = '#5C3D1E';
      ctx.lineWidth = 1.5;
      this._roundRect(tx - slotW * 0.40, ty - sh * 0.34, slotW * 0.80, sh * 0.72, 5);
      ctx.stroke();

      // Tack pin
      ctx.fillStyle = '#C8A060';
      ctx.beginPath(); ctx.arc(tx, ty - sh * 0.30, 3, 0, Math.PI * 2); ctx.fill();

      // Fish silhouette
      ctx.fillStyle = rc;
      ctx.beginPath(); ctx.ellipse(tx, ty - sh * 0.08, slotW * 0.28, slotW * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tx - slotW * 0.28, ty - sh * 0.08);
      ctx.lineTo(tx - slotW * 0.44, ty - sh * 0.20);
      ctx.lineTo(tx - slotW * 0.44, ty + sh * 0.04);
      ctx.closePath();
      ctx.fill();

      // Text
      const shortName = tr.name.length > 9 ? tr.name.slice(0, 8) + '…' : tr.name;
      ctx.fillStyle = '#F5E0C0';
      ctx.font = `bold ${Math.round(ch * 0.014)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(shortName, tx, ty + sh * 0.18);
      ctx.font = `${Math.round(ch * 0.012)}px sans-serif`;
      ctx.fillStyle = 'rgba(245,224,192,0.75)';
      ctx.fillText(`${tr.weight} lbs`, tx, ty + sh * 0.30);
    });
    ctx.textAlign = 'left';
  }

  _drawBed(cw, ch) {
    const ctx = this.ctx;
    const bx = cw * 0.03, by = ch * 0.50;
    const bw = cw * 0.29, bh = ch * 0.30;

    // Headboard
    ctx.fillStyle = '#5C3D1E';
    ctx.fillRect(bx, by - bh * 0.12, bw, bh * 0.14);

    // Frame
    ctx.fillStyle = '#7B4A22';
    ctx.fillRect(bx, by, bw, bh);

    // Mattress
    ctx.fillStyle = '#E8D0A0';
    ctx.fillRect(bx + bw * 0.04, by + bh * 0.08, bw * 0.92, bh * 0.78);

    // Pillow
    ctx.fillStyle = '#FAFAFA';
    this._roundRect(bx + bw * 0.07, by + bh * 0.11, bw * 0.37, bh * 0.28, 4);
    ctx.fill();

    // Blanket (blue gradient)
    const blanketGrad = ctx.createLinearGradient(bx, by + bh * 0.40, bx, by + bh);
    blanketGrad.addColorStop(0, '#5C7AC8');
    blanketGrad.addColorStop(1, '#3A5096');
    ctx.fillStyle = blanketGrad;
    ctx.fillRect(bx + bw * 0.04, by + bh * 0.40, bw * 0.92, bh * 0.44);

    // Blanket fold
    ctx.fillStyle = '#4A68B6';
    ctx.fillRect(bx + bw * 0.04, by + bh * 0.40, bw * 0.92, bh * 0.06);

    // Footboard
    ctx.fillStyle = '#5C3D1E';
    ctx.fillRect(bx, by + bh, bw, bh * 0.06);

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.font = `${Math.round(ch * 0.016)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('💤 TAP TO SLEEP', bx + bw / 2, by + bh + bh * 0.06 + ch * 0.026);
    ctx.textAlign = 'left';
  }

  _drawChallengesBoard(cw, ch) {
    const ctx = this.ctx;
    const bx = cw * 0.58, by = ch * 0.44;
    const bw = cw * 0.39, bh = ch * 0.38;

    // Cork
    ctx.fillStyle = '#C8955A';
    ctx.fillRect(bx, by, bw, bh);

    ctx.fillStyle = 'rgba(160,100,40,0.25)';
    for (let i = 0; i < 22; i++) {
      const cx = bx + (i * 47 % bw);
      const cy = by + (i * 31 % bh);
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    }

    ctx.strokeStyle = '#7B4A22';
    ctx.lineWidth = 4;
    ctx.strokeRect(bx, by, bw, bh);

    // Day header
    ctx.fillStyle = '#3E2000';
    ctx.font = `bold ${Math.round(ch * 0.019)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`📋 Day ${this.dailyChallenges.day}`, bx + bw / 2, by + ch * 0.033);

    // 3 paper slips
    const dc = this.dailyChallenges;
    const slipH = bh * 0.23;
    const slipGap = bh * 0.03;
    const slipY0 = by + bh * 0.11;

    for (let i = 0; i < 3; i++) {
      const slot = dc._challenges[i];
      if (!slot) continue;
      const prog = dc.getProgress(i);
      const t = slot.template;
      const done = dc.isComplete(i);
      const claimed = slot.claimed;
      const sy2 = slipY0 + i * (slipH + slipGap);
      const sw = bw * 0.88, shx = bx + bw * 0.06;

      ctx.fillStyle = claimed ? '#C8E8C0' : (done ? '#FFFFD0' : '#FFF8E8');
      this._roundRect(shx, sy2, sw, slipH, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,50,20,0.2)';
      ctx.lineWidth = 1;
      this._roundRect(shx, sy2, sw, slipH, 3);
      ctx.stroke();

      // Tack
      ctx.fillStyle = claimed ? '#4CAF50' : (done ? '#FFD700' : '#EF5350');
      ctx.beginPath(); ctx.arc(shx + sw * 0.5, sy2 + 5, 3.5, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#3E2000';
      ctx.font = `bold ${Math.round(ch * 0.015)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`${t.icon} ${t.desc}`, shx + sw * 0.05, sy2 + slipH * 0.42);

      ctx.font = `${Math.round(ch * 0.013)}px sans-serif`;
      ctx.fillStyle = claimed ? '#2E7D32' : '#555';
      ctx.fillText(claimed ? '✓ Claimed' : `${prog.current}/${prog.total} — $${t.reward}`, shx + sw * 0.05, sy2 + slipH * 0.72);

      if (!claimed) {
        const pct = prog.current / prog.total;
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(shx + sw * 0.05, sy2 + slipH * 0.84, sw * 0.90, 4);
        ctx.fillStyle = done ? '#4CAF50' : '#2196F3';
        ctx.fillRect(shx + sw * 0.05, sy2 + slipH * 0.84, sw * 0.90 * pct, 4);
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `${Math.round(ch * 0.015)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('TAP TO VIEW', bx + bw / 2, by + bh + ch * 0.027);
    ctx.textAlign = 'left';
  }

  _drawDoor(cw, ch) {
    const ctx = this.ctx;
    const dx = cw * 0.44, dy = ch * 0.68;
    const dw = cw * 0.13, dh = ch * 0.24;

    // Door frame
    ctx.fillStyle = '#5C3D1E';
    ctx.fillRect(dx - 5, dy - 5, dw + 10, dh + 5);

    // Arched frame top
    ctx.beginPath();
    ctx.arc(dx + dw / 2, dy, dw / 2 + 5, Math.PI, 0);
    ctx.fill();

    // Door body
    ctx.fillStyle = '#A07040';
    ctx.fillRect(dx, dy, dw, dh);

    // Arched top
    ctx.fillStyle = '#A07040';
    ctx.beginPath();
    ctx.arc(dx + dw / 2, dy, dw / 2, Math.PI, 0);
    ctx.fill();

    // Door panels
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx + dw * 0.1, dy + dh * 0.07, dw * 0.8, dh * 0.38);
    ctx.strokeRect(dx + dw * 0.1, dy + dh * 0.52, dw * 0.8, dh * 0.36);

    // Knob
    ctx.fillStyle = '#D4A060';
    ctx.beginPath(); ctx.arc(dx + dw * 0.78, dy + dh * 0.52, 4, 0, Math.PI * 2); ctx.fill();

    // Exit label
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold ${Math.round(ch * 0.017)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🚪 EXIT', dx + dw / 2, dy + dh + ch * 0.028);
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
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
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

  destroy() {
    this.canvas.removeEventListener('click', this._onMouseClick);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
    this._sleepConfirmEl?.remove();
    document.getElementById('home-aquarium-panel')?.remove();
    document.getElementById('home-challenges-panel')?.remove();
  }
}
