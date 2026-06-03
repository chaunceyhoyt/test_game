export class WorldScene {
  constructor(canvas, gameTime, onStartFishing, startPos = null, appearance = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gameTime = gameTime;
    this.onStartFishing = onStartFishing;
    this.appearance = appearance;

    this.player = { x: 0, y: 0, tx: 0, ty: 0, speed: 130, state: 'idle', pendingSpot: null };
    this.ripples = [];
    this.walkParticles = [];
    this.t = 0;

    this._initSpots();
    if (startPos) {
      this.player.x = this.player.tx = startPos.x;
      this.player.y = this.player.ty = startPos.y;
    } else {
      this._initPlayer();
    }

    this._handleTap   = this._handleTap.bind(this);
    this._handleTouch = (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const t = e.touches[0];
      this._handleTap({ clientX: t.clientX, clientY: t.clientY }, r);
    };
    canvas.addEventListener('click',      this._handleTap);
    canvas.addEventListener('touchstart', this._handleTouch, { passive: false });
  }

  getPlayerPos() { return { x: this.player.x, y: this.player.y }; }

  _initSpots() {
    this.spotDefs = [
      { fx: 0.28, fy: 0.30, label: 'Pond',  location: 'pond' },
      { fx: 0.55, fy: 0.27, label: 'Lake',  location: 'lake' },
      { fx: 0.78, fy: 0.31, label: 'River', location: 'river' },
    ];
    this.spots = [];
    this._resize();
  }

  _resize() {
    const cw = this.canvas.width, ch = this.canvas.height;
    this.waterY    = ch * 0.44;
    this.dockY     = ch * 0.40;
    this.dockLeft  = cw * 0.18;
    this.dockRight = cw * 0.82;

    this.spots = this.spotDefs.map(d => ({
      wx: cw * d.fx,
      wy: ch * d.fy,
      sx: cw * d.fx,
      sy: this.waterY + 12,
      location: d.location,
      label: d.label,
    }));

    // Tree positions shared between drawing and collision
    this.trees = [
      { x: cw * 0.06, y: this.waterY + 50 },
      { x: cw * 0.12, y: this.waterY + 80 },
      { x: cw * 0.92, y: this.waterY + 45 },
      { x: cw * 0.88, y: this.waterY + 90 },
      { x: cw * 0.04, y: ch * 0.85 },
      { x: cw * 0.95, y: ch * 0.78 },
    ];

    // Collision circles: trees (radius 22) — add houses/shops here later
    this.obstacles = this.trees.map(tr => ({ x: tr.x, y: tr.y, r: 22 }));

    // Preserve player position across resize
    if (this.player.x) {
      this.player.x  = Math.max(0, Math.min(cw, this.player.x));
      this.player.tx = this.player.x;
      this.player.y  = Math.max(0, Math.min(ch, this.player.y));
      this.player.ty = this.player.y;
    }
  }

  _initPlayer() {
    const cw = this.canvas.width, ch = this.canvas.height;
    this.player.x = this.player.tx = cw / 2;
    this.player.y = this.player.ty = ch * 0.68;
  }

  destroy() {
    this.canvas.removeEventListener('click',      this._handleTap);
    this.canvas.removeEventListener('touchstart', this._handleTouch);
  }

  _handleTap(e, preRect) {
    const rect = preRect || this.canvas.getBoundingClientRect();
    const sx = this.canvas.width  / rect.width;
    const sy = this.canvas.height / rect.height;
    const x  = (e.clientX - rect.left) * sx;
    const y  = (e.clientY - rect.top)  * sy;

    for (const spot of this.spots) {
      if (Math.hypot(x - spot.wx, y - spot.wy) < 55) {
        this.player.tx = spot.sx;
        this.player.ty = spot.sy;
        this.player.state = 'walking';
        this.player.pendingSpot = spot;
        return;
      }
    }

    const target = this._nearestWalkable(x, y);
    this.player.tx = target.x;
    this.player.ty = target.y;
    this.player.state = 'walking';
    this.player.pendingSpot = null;
  }

  _isWalkable(x, y) {
    const onDock = y >= this.dockY && x >= this.dockLeft && x <= this.dockRight;
    if (!onDock && y < this.waterY) return false;
    for (const obs of this.obstacles) {
      if (Math.hypot(x - obs.x, y - obs.y) < obs.r) return false;
    }
    return true;
  }

  _nearestWalkable(x, y) {
    let nx = x, ny = y;
    // Clamp to land/dock
    if (ny < this.waterY) {
      nx = Math.max(this.dockLeft + 10, Math.min(this.dockRight - 10, nx));
      ny = Math.max(this.waterY + 2, ny);
    }
    // Push out of obstacles
    for (const obs of this.obstacles) {
      const d = Math.hypot(nx - obs.x, ny - obs.y);
      if (d < obs.r + 2) {
        const ang = Math.atan2(ny - obs.y, nx - obs.x);
        nx = obs.x + Math.cos(ang) * (obs.r + 4);
        ny = obs.y + Math.sin(ang) * (obs.r + 4);
      }
    }
    return { x: nx, y: ny };
  }

  update(dt) {
    this.t += dt;

    const p = this.player;
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 3) {
      const step = Math.min(dist, p.speed * dt);
      const nx = p.x + (dx / dist) * step;
      const ny = p.y + (dy / dist) * step;

      // Slide along obstacles rather than stopping cold
      if (this._isWalkable(nx, ny)) {
        p.x = nx; p.y = ny;
      } else if (this._isWalkable(nx, p.y)) {
        p.x = nx;
      } else if (this._isWalkable(p.x, ny)) {
        p.y = ny;
      }

      if (Math.random() < 0.3) {
        this.walkParticles.push({ x: p.x, y: p.y + 8, vx: (Math.random()-0.5)*20, vy: -10, life: 0.4 });
      }
    } else {
      p.x = p.tx; p.y = p.ty;
      if (p.state === 'walking') {
        p.state = 'idle';
        if (p.pendingSpot) {
          this.onStartFishing(p.pendingSpot);
          p.pendingSpot = null;
        }
      }
    }

    if (Math.random() < dt * 2) {
      const spot = this.spots[Math.floor(Math.random() * this.spots.length)];
      this.ripples.push({ x: spot.wx + (Math.random()-0.5)*30, y: spot.wy + (Math.random()-0.5)*12, r: 2, maxR: 22 + Math.random()*14, life: 1 });
    }
    this.ripples = this.ripples.filter(r => { r.r += dt * 16; r.life -= dt * 1.2; return r.life > 0; });

    this.walkParticles = this.walkParticles.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt * 2.5;
      return p.life > 0;
    });
  }

  draw() {
    const ctx = this.ctx;
    const cw = this.canvas.width, ch = this.canvas.height;

    this._drawSky(cw, ch);
    this._drawWater(cw, ch);
    this._drawDock(cw, ch);
    this._drawLand(cw, ch);
    this._drawTrees(cw, ch);
    this._drawFishingSpots();
    this._drawWalkParticles();
    this._drawPlayer();
    this._drawSpotLabels();
  }

  _drawSky(cw, ch) {
    const ctx = this.ctx;
    const sky  = this.gameTime.skyColor;
    const grad = ctx.createLinearGradient(0, 0, 0, this.waterY);
    grad.addColorStop(0, sky);
    grad.addColorStop(1, this.gameTime.waterColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, this.waterY);

    if (this.gameTime.timeOfDay === 'night') {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 137.5 + 23) % cw);
        const sy = ((i * 97.3  + 11) % (this.waterY * 0.8));
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.5 + i));
        ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  _drawWater(cw, ch) {
    const ctx = this.ctx;
    ctx.fillStyle = this.gameTime.waterColor;
    ctx.fillRect(0, this.waterY - 6, cw, ch - this.waterY + 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const wy     = this.waterY + 6 + i * 14;
      const offset = Math.sin(this.t * 0.8 + i) * 6;
      ctx.beginPath();
      for (let x = 0; x <= cw; x += 18) {
        const wave = Math.sin((x / cw) * Math.PI * 5 + this.t * 1.2 + i * 0.7) * 3 + offset;
        x === 0 ? ctx.moveTo(x, wy + wave) : ctx.lineTo(x, wy + wave);
      }
      ctx.stroke();
    }
  }

  _drawDock(cw, ch) {
    const ctx = this.ctx;
    const dw  = this.dockRight - this.dockLeft;
    ctx.fillStyle = '#7D5A3C';
    ctx.fillRect(this.dockLeft, this.dockY, dw, this.waterY - this.dockY + 20);
    ctx.strokeStyle = '#5C3D1E';
    ctx.lineWidth = 1;
    for (let x = this.dockLeft; x < this.dockRight; x += 18) {
      ctx.beginPath(); ctx.moveTo(x, this.dockY); ctx.lineTo(x, this.waterY + 20); ctx.stroke();
    }
    ctx.fillStyle = '#8B6340';
    ctx.fillRect(this.dockLeft, this.dockY, dw, 4);
    ctx.fillStyle = '#5C3D1E';
    for (const px of [this.dockLeft + 20, cw * 0.35, cw / 2, cw * 0.65, this.dockRight - 20]) {
      ctx.fillRect(px - 4, this.dockY - 16, 8, 20);
    }
  }

  _drawLand(cw, ch) {
    const ctx  = this.ctx;
    const grad = ctx.createLinearGradient(0, this.waterY, 0, ch);
    grad.addColorStop(0, '#4CAF50');
    grad.addColorStop(1, '#2E7D32');
    ctx.fillStyle = grad;
    ctx.fillRect(0, this.waterY + 14, cw, ch - this.waterY - 14);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 80; i++) {
      const gx = (i * 139.7 + 5) % cw;
      const gy = this.waterY + 20 + (i * 83.3) % (ch - this.waterY - 24);
      ctx.fillRect(Math.round(gx), Math.round(gy), 3, 2);
    }
  }

  _drawTrees(cw, ch) {
    const ctx = this.ctx;
    for (const tr of this.trees) {
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(tr.x - 4, tr.y, 8, 22);
      ctx.fillStyle = '#1B5E20';
      ctx.beginPath(); ctx.arc(tr.x, tr.y - 4,  18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2E7D32';
      ctx.beginPath(); ctx.arc(tr.x, tr.y - 16, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#388E3C';
      ctx.beginPath(); ctx.arc(tr.x, tr.y - 26,  8, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawFishingSpots() {
    const ctx = this.ctx;
    for (const spot of this.spots) {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 2.5);
      for (const r of this.ripples.filter(r => Math.hypot(r.x - spot.wx, r.y - spot.wy) < 60)) {
        ctx.strokeStyle = `rgba(255,255,255,${r.life * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
      }
      const glow = ctx.createRadialGradient(spot.wx, spot.wy, 2, spot.wx, spot.wy, 30);
      glow.addColorStop(0, `rgba(100,220,255,${0.3 * pulse})`);
      glow.addColorStop(1, 'rgba(100,220,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(spot.wx, spot.wy, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(180,240,255,${0.7 + 0.3 * pulse})`;
      ctx.beginPath(); ctx.arc(spot.wx, spot.wy, 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawSpotLabels() {
    const ctx = this.ctx;
    for (const spot of this.spots) {
      const near  = Math.hypot(this.player.x - spot.sx, this.player.y - spot.sy) < 120;
      ctx.globalAlpha = near ? 1 : 0.55;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(spot.label, spot.wx, spot.wy - 18);
      if (near) {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#aef';
        ctx.fillText('TAP TO FISH', spot.wx, spot.wy - 6);
      }
    }
    ctx.globalAlpha = 1;
  }

  _drawWalkParticles() {
    const ctx = this.ctx;
    for (const p of this.walkParticles) {
      ctx.globalAlpha = p.life * 0.5;
      ctx.fillStyle = '#c8e6c9';
      ctx.fillRect(Math.round(p.x - 2), Math.round(p.y - 2), 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  _drawPlayer() {
    const ctx = this.ctx;
    const { x, y, state } = this.player;
    const bounce = state === 'walking' ? Math.sin(this.t * 8) * 2 : 0;
    const py = y + bounce;

    const fur   = this.appearance?.furColor   ?? '#FFCC80';
    const shirt = this.appearance?.shirtColor ?? '#1976D2';
    const pants = this.appearance?.pantsColor ?? '#37474F';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(x, y + 14, 10, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Tail
    ctx.strokeStyle = fur;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 5, py + 5);
    ctx.quadraticCurveTo(x - 20, py - 2, x - 18, py - 12);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Legs
    ctx.fillStyle = pants;
    ctx.fillRect(Math.round(x) - 6, Math.round(py) + 6, 5, 8);
    ctx.fillRect(Math.round(x) + 1, Math.round(py) + 6, 5, 8);

    // Body / shirt
    ctx.fillStyle = shirt;
    ctx.fillRect(Math.round(x) - 7, Math.round(py) - 3, 14, 10);

    // Cat ears (behind head)
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.moveTo(x - 7, py - 13); ctx.lineTo(x - 4, py - 22); ctx.lineTo(x - 1, py - 13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 1, py - 13); ctx.lineTo(x + 4, py - 22); ctx.lineTo(x + 7, py - 13); ctx.closePath(); ctx.fill();
    // Inner ear (always pink)
    ctx.fillStyle = '#FF8FAB';
    ctx.beginPath(); ctx.moveTo(x - 6, py - 14); ctx.lineTo(x - 4, py - 20); ctx.lineTo(x - 2, py - 14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 2, py - 14); ctx.lineTo(x + 4, py - 20); ctx.lineTo(x + 6, py - 14); ctx.closePath(); ctx.fill();

    // Head
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.arc(x, py - 9, 8, 0, Math.PI * 2); ctx.fill();

    // Eyes (slightly slanted for cat look)
    ctx.fillStyle = '#2d2d2d';
    ctx.beginPath(); ctx.ellipse(x - 3, py - 11, 2, 1.5, -0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 3, py - 11, 2, 1.5,  0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(x - 2.2, py - 11.5, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 3.8, py - 11.5, 0.8, 0, Math.PI * 2); ctx.fill();

    // Nose
    ctx.fillStyle = '#FF8FAB';
    ctx.beginPath(); ctx.arc(x, py - 7.5, 1.2, 0, Math.PI * 2); ctx.fill();

    // Whisker dots
    ctx.fillStyle = 'rgba(80,40,0,0.35)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(x - 5 - i * 1.8, py - 7.5, 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 5 + i * 1.8, py - 7.5, 0.8, 0, Math.PI * 2); ctx.fill();
    }

    // Fishing rod
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 6, py - 2); ctx.lineTo(x + 18, py - 18); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,200,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 18, py - 18); ctx.lineTo(x + 22, py - 10); ctx.stroke();
    ctx.lineCap = 'butt';
  }

  onResize() { this._resize(); }
}
