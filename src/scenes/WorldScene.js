export class WorldScene {
  constructor(canvas, gameTime, onStartFishing) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gameTime = gameTime;
    this.onStartFishing = onStartFishing;

    this.player = { x: 0, y: 0, tx: 0, ty: 0, speed: 130, state: 'idle', pendingSpot: null };
    this.ripples = [];
    this.walkParticles = [];
    this.t = 0;

    this._initSpots();
    this._initPlayer();

    this._handleTap = this._handleTap.bind(this);
    canvas.addEventListener('click', this._handleTap);
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const t = e.touches[0];
      this._handleTap({ clientX: t.clientX, clientY: t.clientY, _touch: true, preventDefault: () => {} }, r);
    }, { passive: false });
  }

  _initSpots() {
    // Fishing spots defined as fractions; resolved in _resize
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
    this.waterY   = ch * 0.44;
    this.dockY    = ch * 0.40;
    this.dockLeft = cw * 0.18;
    this.dockRight= cw * 0.82;

    this.spots = this.spotDefs.map(d => ({
      wx: cw * d.fx,
      wy: ch * d.fy,
      sx: cw * d.fx,
      sy: this.waterY + 12,
      location: d.location,
      label: d.label,
    }));

    const px = this.player.x || cw / 2;
    const py = this.player.y || ch * 0.68;
    this.player.x = px; this.player.tx = px;
    this.player.y = py; this.player.ty = py;
  }

  _initPlayer() {
    const cw = this.canvas.width, ch = this.canvas.height;
    this.player.x = this.player.tx = cw / 2;
    this.player.y = this.player.ty = ch * 0.68;
  }

  destroy() {
    this.canvas.removeEventListener('click', this._handleTap);
  }

  _handleTap(e, preRect) {
    const rect = preRect || this.canvas.getBoundingClientRect();
    const sx = this.canvas.width  / rect.width;
    const sy = this.canvas.height / rect.height;
    const x  = (e.clientX - rect.left) * sx;
    const y  = (e.clientY - rect.top)  * sy;

    // Check fishing spot tap
    for (const spot of this.spots) {
      if (Math.hypot(x - spot.wx, y - spot.wy) < 55) {
        this.player.tx = spot.sx;
        this.player.ty = spot.sy;
        this.player.state = 'walking';
        this.player.pendingSpot = spot;
        return;
      }
    }

    // Walk to nearest walkable point
    const target = this._nearestWalkable(x, y);
    this.player.tx = target.x;
    this.player.ty = target.y;
    this.player.state = 'walking';
    this.player.pendingSpot = null;
  }

  _isWalkable(x, y) {
    const cw = this.canvas.width;
    // On dock (extends into water slightly)
    if (y >= this.dockY && x >= this.dockLeft && x <= this.dockRight) return true;
    // On land below water line
    return y >= this.waterY;
  }

  _nearestWalkable(x, y) {
    if (this._isWalkable(x, y)) return { x, y };
    // Clamp to dock/land boundary
    return {
      x: Math.max(this.dockLeft + 10, Math.min(this.dockRight - 10, x)),
      y: Math.max(this.waterY + 2, y),
    };
  }

  update(dt) {
    this.t += dt;

    const p = this.player;
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 3) {
      const step = Math.min(dist, p.speed * dt);
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;

      // Walk dust
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

    // Ripples
    if (Math.random() < dt * 2) {
      const spot = this.spots[Math.floor(Math.random() * this.spots.length)];
      this.ripples.push({ x: spot.wx + (Math.random()-0.5)*30, y: spot.wy + (Math.random()-0.5)*12, r: 2, maxR: 22 + Math.random()*14, life: 1 });
    }
    this.ripples = this.ripples.filter(r => { r.r += dt * 16; r.life -= dt * 1.2; return r.life > 0; });

    // Walk particles
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
    const sky = this.gameTime.skyColor;
    const grad = ctx.createLinearGradient(0, 0, 0, this.waterY);
    grad.addColorStop(0, sky);
    grad.addColorStop(1, this.gameTime.waterColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, this.waterY);

    // Stars at night
    if (this.gameTime.timeOfDay === 'night') {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 137.5 + 23) % cw);
        const sy = ((i * 97.3 + 11) % (this.waterY * 0.8));
        const blink = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.5 + i));
        ctx.globalAlpha = blink;
        ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  _drawWater(cw, ch) {
    const ctx = this.ctx;
    const wc = this.gameTime.waterColor;
    ctx.fillStyle = wc;
    ctx.fillRect(0, this.waterY - 6, cw, ch - this.waterY + 6);

    // Animated wave lines
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const wy = this.waterY + 6 + i * 14;
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
    const dw = this.dockRight - this.dockLeft;

    // Dock planks
    ctx.fillStyle = '#7D5A3C';
    ctx.fillRect(this.dockLeft, this.dockY, dw, this.waterY - this.dockY + 20);

    // Plank lines
    ctx.strokeStyle = '#5C3D1E';
    ctx.lineWidth = 1;
    for (let x = this.dockLeft; x < this.dockRight; x += 18) {
      ctx.beginPath(); ctx.moveTo(x, this.dockY); ctx.lineTo(x, this.waterY + 20); ctx.stroke();
    }

    // Dock edge highlight
    ctx.fillStyle = '#8B6340';
    ctx.fillRect(this.dockLeft, this.dockY, dw, 4);

    // Dock posts
    ctx.fillStyle = '#5C3D1E';
    for (const px of [this.dockLeft + 20, cw * 0.35, cw / 2, cw * 0.65, this.dockRight - 20]) {
      ctx.fillRect(px - 4, this.dockY - 16, 8, 20);
    }
  }

  _drawLand(cw, ch) {
    const ctx = this.ctx;
    // Main land
    const grad = ctx.createLinearGradient(0, this.waterY, 0, ch);
    grad.addColorStop(0, '#4CAF50');
    grad.addColorStop(1, '#2E7D32');
    ctx.fillStyle = grad;
    ctx.fillRect(0, this.waterY + 14, cw, ch - this.waterY - 14);

    // Grass texture dots
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 80; i++) {
      const gx = (i * 139.7 + 5) % cw;
      const gy = this.waterY + 20 + (i * 83.3) % (ch - this.waterY - 24);
      ctx.fillRect(Math.round(gx), Math.round(gy), 3, 2);
    }
  }

  _drawTrees(cw, ch) {
    const ctx = this.ctx;
    const trees = [
      { x: cw * 0.06, y: this.waterY + 50 },
      { x: cw * 0.12, y: this.waterY + 80 },
      { x: cw * 0.92, y: this.waterY + 45 },
      { x: cw * 0.88, y: this.waterY + 90 },
      { x: cw * 0.04, y: ch * 0.85 },
      { x: cw * 0.95, y: ch * 0.78 },
    ];
    for (const tr of trees) {
      // Trunk
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(tr.x - 4, tr.y, 8, 22);
      // Foliage layers (pixel art style)
      ctx.fillStyle = '#1B5E20';
      ctx.beginPath(); ctx.arc(tr.x, tr.y - 4, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2E7D32';
      ctx.beginPath(); ctx.arc(tr.x, tr.y - 16, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#388E3C';
      ctx.beginPath(); ctx.arc(tr.x, tr.y - 26, 8, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawFishingSpots() {
    const ctx = this.ctx;
    for (const spot of this.spots) {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 2.5);

      // Ripples from spawn
      for (const r of this.ripples.filter(r => Math.hypot(r.x - spot.wx, r.y - spot.wy) < 60)) {
        ctx.strokeStyle = `rgba(255,255,255,${r.life * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
      }

      // Glow halo
      const glow = ctx.createRadialGradient(spot.wx, spot.wy, 2, spot.wx, spot.wy, 30);
      glow.addColorStop(0, `rgba(100,220,255,${0.3 * pulse})`);
      glow.addColorStop(1, 'rgba(100,220,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(spot.wx, spot.wy, 30, 0, Math.PI * 2); ctx.fill();

      // Center dot
      ctx.fillStyle = `rgba(180,240,255,${0.7 + 0.3 * pulse})`;
      ctx.beginPath(); ctx.arc(spot.wx, spot.wy, 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawSpotLabels() {
    const ctx = this.ctx;
    for (const spot of this.spots) {
      const nearPlayer = Math.hypot(this.player.x - spot.sx, this.player.y - spot.sy) < 120;
      const alpha = nearPlayer ? 1 : 0.55;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(spot.label, spot.wx, spot.wy - 18);

      // Tap hint
      if (nearPlayer) {
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

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(x, y + 14, 10, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Legs (pixel blocks)
    ctx.fillStyle = '#37474F';
    ctx.fillRect(Math.round(x) - 6, Math.round(py) + 6, 5, 8);
    ctx.fillRect(Math.round(x) + 1, Math.round(py) + 6, 5, 8);

    // Body / shirt
    ctx.fillStyle = '#1976D2';
    ctx.fillRect(Math.round(x) - 7, Math.round(py) - 3, 14, 10);

    // Head
    ctx.fillStyle = '#FFCC80';
    ctx.beginPath(); ctx.arc(x, py - 9, 7, 0, Math.PI * 2); ctx.fill();

    // Hat brim + cap
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(Math.round(x) - 9, Math.round(py) - 14, 18, 4);
    ctx.fillRect(Math.round(x) - 6, Math.round(py) - 22, 12, 9);

    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(Math.round(x) - 3, Math.round(py) - 11, 2, 2);
    ctx.fillRect(Math.round(x) + 1, Math.round(py) - 11, 2, 2);

    // Fishing rod idle pose
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, py - 2);
    ctx.lineTo(x + 18, py - 18);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200,200,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 18, py - 18);
    ctx.lineTo(x + 22, py - 10);
    ctx.stroke();
  }

  onResize() { this._resize(); }
}
