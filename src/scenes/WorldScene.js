const FUEL_DRAIN = 0.5; // fuel units per second of motor use

export class WorldScene {
  constructor(canvas, gameTime, onStartFishing, state = null, appearance = null, inventory = null, onOpenShop = null, onEnterHome = null) {
    this.canvas        = canvas;
    this.ctx           = canvas.getContext('2d');
    this.gameTime      = gameTime;
    this.onStartFishing = onStartFishing;
    this.appearance    = appearance;
    this.inventory     = inventory;
    this.onOpenShop    = onOpenShop;
    this.onEnterHome   = onEnterHome;

    this.player = { x: 0, y: 0, tx: 0, ty: 0, speed: 130, state: 'idle', pendingSpot: null, _path: [], _pathIdx: 0 };
    this.boat   = { x: 0, y: 0, tx: 0, ty: 0, heading: -Math.PI / 2 };

    this.playerOnBoat       = false;
    this.boardingBoat       = false;
    this._boatTarget        = null; // { x, y, type: 'water'|'dock'|'fish', landTarget?, spot? }
    this._pendingInteraction = null;

    this.zoom         = state?.zoom ?? 1.0;
    this._pinchDist   = 0;
    this._pinchZoom   = 1;
    this._isPinching  = false;
    this._tapStartX   = 0;
    this._tapStartY   = 0;

    this.ripples       = [];
    this.walkParticles = [];
    this.t             = 0;

    this._shopOwnerState = Math.random() < 0.5 ? 'counter' : 'sweeping';
    this._shopOwnerTimer = 15 + Math.random() * 15;

    this._initSpots();

    // Apply saved or default player position
    if (state?.playerPos) {
      this.player.x = this.player.tx = state.playerPos.x;
      this.player.y = this.player.ty = state.playerPos.y;
    } else {
      this._initPlayer();
    }

    // Apply saved or default boat position
    this._initBoat();
    if (state?.boatPos) {
      this.boat.x = this.boat.tx = state.boatPos.x;
      this.boat.y = this.boat.ty = state.boatPos.y;
    }

    if (state?.playerOnBoat) {
      this.playerOnBoat = true;
      // Place player on top of boat (for visual continuity)
      this.player.x = this.player.tx = this.boat.x;
      this.player.y = this.player.ty = this.boat.y;
    }

    // ── Input listeners ────────────────────────────────────────────────────
    this._onMouseClick   = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) * (this.canvas.width  / rect.width);
      const sy = (e.clientY - rect.top)  * (this.canvas.height / rect.height);
      const { x, y } = this._screenToWorld(sx, sy);
      this._handleTap(x, y);
    };
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove  = this._onTouchMove.bind(this);
    this._onTouchEnd   = this._onTouchEnd.bind(this);

    canvas.addEventListener('click',      this._onMouseClick);
    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  this._onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   this._onTouchEnd,   { passive: false });
  }

  // ── Touch / Pinch ──────────────────────────────────────────────────────────

  _onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 2) {
      this._pinchDist  = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      this._pinchZoom  = this.zoom;
      this._isPinching = true;
    } else if (e.touches.length === 1) {
      this._isPinching = false;
      this._tapStartX  = e.touches[0].clientX;
      this._tapStartY  = e.touches[0].clientY;
    }
  }

  _onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 2 && this._isPinching) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      this.zoom = Math.max(0.5, Math.min(2.0, this._pinchZoom * d / this._pinchDist));
    }
  }

  _onTouchEnd(e) {
    if (this._isPinching) {
      if (e.touches.length < 2) this._isPinching = false;
      return;
    }
    if (e.changedTouches.length !== 1) return;
    const t  = e.changedTouches[0];
    const dx = Math.abs(t.clientX - this._tapStartX);
    const dy = Math.abs(t.clientY - this._tapStartY);
    if (dx < 12 && dy < 12) {
      const rect = this.canvas.getBoundingClientRect();
      const sx = (t.clientX - rect.left) * (this.canvas.width  / rect.width);
      const sy = (t.clientY - rect.top)  * (this.canvas.height / rect.height);
      const { x, y } = this._screenToWorld(sx, sy);
      this._handleTap(x, y);
    }
  }

  _screenToWorld(sx, sy) {
    const subject = this.playerOnBoat ? this.boat : this.player;
    const camX = this.canvas.width  / 2 - subject.x * this.zoom;
    const camY = this.canvas.height / 2 - subject.y * this.zoom;
    return { x: (sx - camX) / this.zoom, y: (sy - camY) / this.zoom };
  }

  // ── State export ───────────────────────────────────────────────────────────

  getState() {
    return {
      playerPos:    this.playerOnBoat
        ? { x: this.boat.x, y: this.boat.y }
        : { x: this.player.x, y: this.player.y },
      boatPos:      { x: this.boat.x, y: this.boat.y },
      playerOnBoat: this.playerOnBoat,
      zoom:         this.zoom,
    };
  }

  // Keep old API for callers that only need player pos
  getPlayerPos() { return { x: this.player.x, y: this.player.y }; }

  // ── Initialisation ─────────────────────────────────────────────────────────

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

    this.trees = [
      { x: cw * 0.06, y: this.waterY + 50 },
      { x: cw * 0.12, y: this.waterY + 80 },
      { x: cw * 0.92, y: this.waterY + 45 },
      { x: cw * 0.88, y: this.waterY + 90 },
      { x: cw * 0.04, y: ch * 0.85 },
      { x: cw * 0.95, y: ch * 0.78 },
    ];

    this.shop = { x: cw * 0.62, y: ch * 0.72 };
    this.home = { x: cw * 0.20, y: ch * 0.72 };

    this.obstacles = [
      ...this.trees.map(tr => ({ x: tr.x, y: tr.y, r: 22 })),
      { x: this.shop.x, y: this.shop.y - 10, r: 32 },
      { x: this.home.x, y: this.home.y - 10, r: 30 },
    ];

    if (this.player.x) {
      this.player.x  = Math.max(0, Math.min(cw, this.player.x));
      this.player.tx = this.player.x;
      this.player.y  = Math.max(0, Math.min(ch, this.player.y));
      this.player.ty = this.player.y;
    }
  }

  _initPlayer() {
    const cw = this.canvas.width, ch = this.canvas.height;
    this.player.x = this.player.tx = cw * 0.35;
    this.player.y = this.player.ty = ch * 0.68;
  }

  _initBoat() {
    this.boat.x = this.boat.tx = this.dockLeft - 22;
    this.boat.y = this.boat.ty = this.waterY - 8;
  }

  destroy() {
    this.canvas.removeEventListener('click',      this._onMouseClick);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove',  this._onTouchMove);
    this.canvas.removeEventListener('touchend',   this._onTouchEnd);
  }

  // ── Tap handling ───────────────────────────────────────────────────────────

  _handleTap(wx, wy) {
    if (document.getElementById('dialog-panel')?.style.display === 'flex') return;
    // ── On boat ──
    if (this.playerOnBoat) {
      // Fishing spot?
      for (const spot of this.spots) {
        if (Math.hypot(wx - spot.wx, wy - spot.wy) < 55) {
          this._boatTarget = { x: spot.wx, y: spot.wy, type: 'fish', spot };
          return;
        }
      }
      // Land or dock → deboard (boat always returns to home slip west of dock)
      const tappedDock = wy >= this.dockY && wx >= this.dockLeft && wx <= this.dockRight;
      if (wy >= this.waterY - 4 || tappedDock) {
        const shore = { x: this.dockLeft - 22, y: this.waterY - 8 };
        const landPt = this._nearestWalkable(wx, wy);
        this._boatTarget = { x: shore.x, y: shore.y, type: 'dock', landTarget: landPt };
        return;
      }
      // Open water
      this._boatTarget = {
        x: Math.max(10, Math.min(this.canvas.width - 10, wx)),
        y: Math.max(10, Math.min(this.waterY - 6, wy)),
        type: 'water',
      };
      return;
    }

    // ── Not on boat ──

    // Tap boat → walk to shore edge beside boat and auto-board
    if (!this.boardingBoat) {
      const bd = Math.hypot(wx - this.boat.x, wy - this.boat.y);
      if (bd < 35) {
        this._walkTo(this.boat.x, this.waterY + 8);
        this.player.pendingSpot = null;
        this.boardingBoat = true;
        return;
      }
    }

    // Tap home building
    if (Math.hypot(wx - this.home.x, wy - this.home.y) < 48) {
      const target = this._nearestWalkable(this.home.x, this.home.y + 28);
      this._walkTo(target.x, target.y);
      this.player.pendingSpot   = null;
      this._pendingInteraction  = 'home';
      this.boardingBoat         = false;
      return;
    }

    // Tap shop building
    if (Math.hypot(wx - this.shop.x, wy - this.shop.y) < 48) {
      const target = this._nearestWalkable(this.shop.x, this.shop.y + 28);
      this._walkTo(target.x, target.y);
      this.player.pendingSpot   = null;
      this._pendingInteraction  = 'shop';
      this.boardingBoat         = false;
      return;
    }

    // Tap fishing spot
    for (const spot of this.spots) {
      if (Math.hypot(wx - spot.wx, wy - spot.wy) < 55) {
        this._walkTo(spot.sx, spot.sy);
        this.player.pendingSpot = spot;
        this.boardingBoat = false;
        this._pendingInteraction = null;
        return;
      }
    }

    // Walk somewhere
    const target = this._nearestWalkable(wx, wy);
    this._walkTo(target.x, target.y);
    this.player.pendingSpot   = null;
    this.boardingBoat         = false;
    this._pendingInteraction  = null;
  }

  // ── Pathfinding ────────────────────────────────────────────────────────────

  _segmentClear(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    for (const obs of this.obstacles) {
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((obs.x - x1) * dx + (obs.y - y1) * dy) / len2));
      const cx = x1 + t * dx - obs.x;
      const cy = y1 + t * dy - obs.y;
      if (cx * cx + cy * cy < (obs.r + 6) * (obs.r + 6)) return false;
    }
    return true;
  }

  _buildPath(sx, sy, tx, ty, depth = 0) {
    const end = { x: tx, y: ty };
    if (depth >= 4 || this._segmentClear(sx, sy, tx, ty)) return [end];

    const ddx = tx - sx, ddy = ty - sy;
    const segLen2 = ddx * ddx + ddy * ddy;
    if (segLen2 === 0) return [end];

    let blocking = null, bestT = Infinity;
    for (const obs of this.obstacles) {
      const t = Math.max(0, Math.min(1, ((obs.x - sx) * ddx + (obs.y - sy) * ddy) / segLen2));
      const cx = sx + t * ddx - obs.x;
      const cy = sy + t * ddy - obs.y;
      if (cx * cx + cy * cy < (obs.r + 8) * (obs.r + 8) && t < bestT) {
        bestT = t; blocking = obs;
      }
    }
    if (!blocking) return [end];

    const len = Math.hypot(ddx, ddy);
    const px = -ddy / len, py = ddx / len;
    const margin = blocking.r + 18;
    const cw = this.canvas.width;

    const w1 = {
      x: Math.max(5, Math.min(cw - 5, blocking.x + px * margin)),
      y: Math.max(this.waterY + 4, blocking.y + py * margin),
    };
    const w2 = {
      x: Math.max(5, Math.min(cw - 5, blocking.x - px * margin)),
      y: Math.max(this.waterY + 4, blocking.y - py * margin),
    };

    const d1 = Math.hypot(w1.x - sx, w1.y - sy) + Math.hypot(tx - w1.x, ty - w1.y);
    const d2 = Math.hypot(w2.x - sx, w2.y - sy) + Math.hypot(tx - w2.x, ty - w2.y);
    const w = d1 <= d2 ? w1 : w2;

    return [w, ...this._buildPath(w.x, w.y, tx, ty, depth + 1)];
  }

  _walkTo(tx, ty) {
    const path = this._buildPath(this.player.x, this.player.y, tx, ty);
    this.player._path    = path;
    this.player._pathIdx = 0;
    this.player.tx       = path[0].x;
    this.player.ty       = path[0].y;
    this.player.state    = 'walking';
  }

  // ── Walkability ────────────────────────────────────────────────────────────

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
    if (ny < this.waterY) {
      const onDock = nx >= this.dockLeft && nx <= this.dockRight && ny >= this.dockY;
      if (!onDock) {
        nx = Math.max(this.dockLeft + 10, Math.min(this.dockRight - 10, nx));
        ny = Math.max(this.waterY + 2, ny);
      }
    }
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

  // ── Update ─────────────────────────────────────────────────────────────────

  update(dt) {
    this.t += dt;

    this._updatePlayer(dt);
    this._updateBoat(dt);

    // Auto-board when player reaches dock edge near boat
    if (this.boardingBoat) {
      const d = Math.hypot(this.player.x - this.boat.x, this.player.y - (this.waterY + 8));
      if (d < 16 && this.player.state === 'idle') {
        this.playerOnBoat = true;
        this.boardingBoat = false;
      }
    }

    // Shop interaction trigger
    if (this._pendingInteraction === 'shop' && this.player.state === 'idle') {
      this._pendingInteraction = null;
      this.onOpenShop?.();
    }

    // Home interaction trigger
    if (this._pendingInteraction === 'home' && this.player.state === 'idle') {
      this._pendingInteraction = null;
      this.onEnterHome?.();
    }

    // Shop owner state toggle
    this._shopOwnerTimer -= dt;
    if (this._shopOwnerTimer <= 0) {
      this._shopOwnerState = this._shopOwnerState === 'counter' ? 'sweeping' : 'counter';
      this._shopOwnerTimer = 15 + Math.random() * 15;
    }

    // Ambient ripples
    if (Math.random() < dt * 2) {
      const spot = this.spots[Math.floor(Math.random() * this.spots.length)];
      this.ripples.push({ x: spot.wx + (Math.random()-0.5)*30, y: spot.wy + (Math.random()-0.5)*12, r: 2, maxR: 22 + Math.random()*14, life: 1 });
    }
    this.ripples        = this.ripples.filter(r => { r.r += dt * 16; r.life -= dt * 1.2; return r.life > 0; });
    this.walkParticles  = this.walkParticles.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt * 2.5;
      return p.life > 0;
    });
  }

  _updatePlayer(dt) {
    if (this.playerOnBoat) return;

    const p = this.player;
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 3) {
      const step = Math.min(dist, p.speed * dt);
      const nx = p.x + (dx / dist) * step;
      const ny = p.y + (dy / dist) * step;

      if      (this._isWalkable(nx, ny))   { p.x = nx; p.y = ny; }
      else if (this._isWalkable(nx, p.y))  { p.x = nx; }
      else if (this._isWalkable(p.x, ny))  { p.y = ny; }

      if (Math.random() < 0.3)
        this.walkParticles.push({ x: p.x, y: p.y + 8, vx: (Math.random()-0.5)*20, vy: -10, life: 0.4 });
    } else {
      p.x = p.tx; p.y = p.ty;

      // Advance to next waypoint, or finish
      if (p._path.length > 0 && p._pathIdx < p._path.length - 1) {
        p._pathIdx++;
        p.tx = p._path[p._pathIdx].x;
        p.ty = p._path[p._pathIdx].y;
      } else if (p.state === 'walking') {
        p.state = 'idle';
        if (p.pendingSpot) {
          this.onStartFishing(p.pendingSpot);
          p.pendingSpot = null;
        }
      }
    }
  }

  _isBoatPassable(x, y) {
    if (y >= this.waterY - 3) return false;
    if (y < 5) return false;
    if (x < 5 || x > this.canvas.width - 5) return false;
    if (y >= this.dockY && x >= this.dockLeft && x <= this.dockRight) return false;
    return true;
  }

  _updateBoat(dt) {
    if (!this.playerOnBoat || !this._boatTarget) return;

    const b   = this.boat;
    const dx  = this._boatTarget.x - b.x;
    const dy  = this._boatTarget.y - b.y;
    const dist = Math.hypot(dx, dy);

    const motor   = this.inventory?.getEquippedMotor?.();
    const hasFuel = (this.inventory?.fuel ?? 0) > 0;
    const speed   = motor
      ? (hasFuel ? 160 : (this.inventory?.hasSail ? 80 : 35))
      : 25; // paddling — slow, no fuel use

    if (dist > 6) {
      const step = Math.min(dist, speed * dt);
      const nx = b.x + (dx / dist) * step;
      const ny = b.y + (dy / dist) * step;

      if      (this._isBoatPassable(nx, ny))   { b.x = nx; b.y = ny; }
      else if (this._isBoatPassable(nx, b.y))  { b.x = nx; }
      else if (this._isBoatPassable(b.x, ny))  { b.y = ny; }

      b.heading = Math.atan2(dy, dx);

      // Only burn fuel when motor is equipped and fueled
      if (motor && hasFuel && this.inventory) {
        this.inventory.fuel = Math.max(0, this.inventory.fuel - FUEL_DRAIN * dt);
      }
    } else {
      // Arrived
      b.x = this._boatTarget.x;
      b.y = this._boatTarget.y;
      const tgt = this._boatTarget;
      this._boatTarget = null;

      if (tgt.type === 'dock') {
        // Deboard player at the dock entrance (inside dock x-range so they can
        // walk to any dock or land target without hitting the water boundary)
        this.playerOnBoat  = false;
        this.player.x  = this.dockLeft + 10;
        this.player.y  = this.waterY + 8;
        if (tgt.landTarget) {
          this.player.tx    = tgt.landTarget.x;
          this.player.ty    = tgt.landTarget.y;
          this.player.state = 'walking';
        } else {
          this.player.tx    = this.player.x;
          this.player.ty    = this.player.y;
          this.player.state = 'idle';
        }
      } else if (tgt.type === 'fish') {
        this.onStartFishing(tgt.spot);
      }
      // type 'water' — just stop
    }

    // Keep player riding the boat
    if (this.playerOnBoat) {
      this.player.x = b.x;
      this.player.y = b.y;
    }
  }

  // ── Draw ───────────────────────────────────────────────────────────────────

  draw() {
    const ctx = this.ctx;
    const cw  = this.canvas.width, ch = this.canvas.height;

    // Background fill to avoid black edges when zoomed out
    ctx.fillStyle = this.gameTime.waterColor;
    ctx.fillRect(0, 0, cw, ch);

    const subject = this.playerOnBoat ? this.boat : this.player;
    const camX = cw / 2 - subject.x * this.zoom;
    const camY = ch / 2 - subject.y * this.zoom;

    ctx.save();
    ctx.translate(camX, camY);
    ctx.scale(this.zoom, this.zoom);

    this._drawSky(cw, ch);
    this._drawWater(cw, ch);
    this._drawBoat();
    this._drawDock(cw, ch);
    this._drawLand(cw, ch);
    this._drawTrees(cw, ch);
    this._drawHome();
    this._drawShop();
    this._drawFishingSpots();
    this._drawWalkParticles();
    if (!this.playerOnBoat) this._drawPlayer();
    this._drawSpotLabels();

    ctx.restore();

    // Fuel warning (screen-space, not world-space)
    if (this.playerOnBoat) this._drawFuelHud(cw, ch);
  }

  _drawFuelHud(cw, ch) {
    const ctx  = this.ctx;
    const fuel = this.inventory?.fuel ?? 0;
    const max  = this.inventory?.maxFuel ?? 100;
    const pct  = fuel / max;

    const bw = 120, bh = 10;
    const bx = (cw - bw) / 2;
    const by = ch - 52;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    this._roundRect(bx - 10, by - 6, bw + 20, bh + 16, 8);
    ctx.fill();

    ctx.fillStyle = '#333';
    this._roundRect(bx, by, bw, bh, 4);
    ctx.fill();

    const fuelColor = pct > 0.4 ? '#4CAF50' : pct > 0.15 ? '#FFC107' : '#F44336';
    ctx.fillStyle = fuelColor;
    this._roundRect(bx, by, bw * pct, bh, 4);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    const motor = this.inventory?.getEquippedMotor?.();
    const label = !motor ? '🚣 PADDLING'
      : (fuel <= 0 && this.inventory?.hasSail) ? '⛵ SAILING'
      : `⛽ ${Math.ceil(fuel)}/${max}`;
    ctx.fillText(label, bx + bw / 2, by - 1);
  }

  _drawSky(cw, ch) {
    const ctx  = this.ctx;
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

  _drawHome() {
    const ctx = this.ctx;
    const { x, y } = this.home;
    const bw = 56, bh = 44;

    // Building body (cream walls)
    ctx.fillStyle = '#F2E0BC';
    ctx.fillRect(x - bw / 2, y - bh, bw, bh);

    // Wood grain lines
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x - bw / 2, y - bh + i * (bh / 5));
      ctx.lineTo(x + bw / 2, y - bh + i * (bh / 5));
      ctx.stroke();
    }

    // Peaked roof (red)
    ctx.fillStyle = '#B03030';
    ctx.beginPath();
    ctx.moveTo(x - bw / 2 - 6, y - bh);
    ctx.lineTo(x,               y - bh - 22);
    ctx.lineTo(x + bw / 2 + 6, y - bh);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7A1A1A';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Chimney
    ctx.fillStyle = '#8B5A2A';
    ctx.fillRect(x + bw * 0.25, y - bh - 28, 8, 16);
    // Chimney smoke puffs
    ctx.fillStyle = 'rgba(180,180,180,0.5)';
    for (let i = 0; i < 3; i++) {
      const puffX = x + bw * 0.25 + 4 + Math.sin(this.t * 0.6 + i) * 4;
      const puffY = y - bh - 32 - i * 8;
      const puffR = 3 + i * 1.5;
      ctx.beginPath(); ctx.arc(puffX, puffY, puffR, 0, Math.PI * 2); ctx.fill();
    }

    // Door (arched)
    ctx.fillStyle = '#7B4A22';
    ctx.fillRect(x - 8, y - 22, 16, 22);
    ctx.beginPath(); ctx.arc(x, y - 22, 8, Math.PI, 0); ctx.fill();

    // Door knob
    ctx.fillStyle = '#D4A060';
    ctx.beginPath(); ctx.arc(x + 5, y - 10, 2, 0, Math.PI * 2); ctx.fill();

    // Windows (warm glow)
    const winGlow = 0.6 + 0.15 * Math.sin(this.t * 1.8);
    ctx.fillStyle = `rgba(255,210,80,${winGlow})`;
    ctx.fillRect(x - bw / 2 + 7, y - bh + 8, 11, 8);
    ctx.fillRect(x + bw / 2 - 18, y - bh + 8, 11, 8);
    ctx.strokeStyle = '#5C3D1E';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - bw / 2 + 7, y - bh + 8, 11, 8);
    ctx.strokeRect(x + bw / 2 - 18, y - bh + 8, 11, 8);
    // Window crossbars
    ctx.beginPath(); ctx.moveTo(x - bw / 2 + 12, y - bh + 8); ctx.lineTo(x - bw / 2 + 12, y - bh + 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - bw / 2 + 7, y - bh + 12); ctx.lineTo(x - bw / 2 + 18, y - bh + 12); ctx.stroke();

    // Flower boxes
    ctx.fillStyle = '#8B5A2A';
    ctx.fillRect(x - bw / 2 + 5, y - bh + 16, 15, 4);
    ctx.fillRect(x + bw / 2 - 20, y - bh + 16, 15, 4);
    const flowerColors = ['#FF6B8A', '#FFD700', '#FF8C42'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = flowerColors[i];
      ctx.beginPath(); ctx.arc(x - bw / 2 + 9 + i * 5, y - bh + 15, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + bw / 2 - 16 + i * 5, y - bh + 15, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Sign
    ctx.fillStyle = '#D4A060';
    ctx.fillRect(x - 24, y - bh - 8, 48, 12);
    ctx.strokeStyle = '#7B4A22';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 24, y - bh - 8, 48, 12);
    ctx.fillStyle = '#2A1000';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HOME', x, y - bh + 1);

    // Label
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.fillText('TAP TO ENTER', x, y + 6);
    ctx.globalAlpha = 1;
  }

  _drawShop() {
    const ctx = this.ctx;
    const { x, y } = this.shop;
    const sw = 72;

    // Back panel / stall wall
    ctx.fillStyle = '#C8A87A';
    ctx.fillRect(x - sw / 2, y - 46, sw, 46);

    // Vertical support posts
    ctx.fillStyle = '#7B4A22';
    ctx.fillRect(x - sw / 2 - 4, y - 58, 7, 58);
    ctx.fillRect(x + sw / 2 - 3, y - 58, 7, 58);

    // Striped awning
    const awW = sw + 18, awH = 18;
    const awX = x - awW / 2, awY = y - 58;
    const stripes = 8, strW = awW / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#D32F2F' : '#F5F5F5';
      ctx.fillRect(awX + i * strW, awY, strW + 0.5, awH);
    }
    // Scalloped awning edge
    const scallops = 9, scW = awW / scallops;
    for (let i = 0; i < scallops; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#D32F2F' : '#F5F5F5';
      ctx.beginPath();
      ctx.arc(awX + i * scW + scW / 2, awY + awH, scW / 2, 0, Math.PI);
      ctx.fill();
    }

    // Colorful pennant flags on a string
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - sw / 2, awY);
    ctx.quadraticCurveTo(x, awY + 6, x + sw / 2, awY);
    ctx.stroke();
    const flagColors = ['#E53935','#FB8C00','#FDD835','#43A047','#1E88E5','#8E24AA'];
    for (let i = 0; i < 6; i++) {
      const fx = x - sw / 2 + 6 + i * (sw / 6);
      const fdy = Math.sin((i / 5) * Math.PI) * 6;
      ctx.fillStyle = flagColors[i];
      ctx.beginPath();
      ctx.moveTo(fx, awY + fdy);
      ctx.lineTo(fx - 4, awY + fdy + 8);
      ctx.lineTo(fx + 4, awY + fdy + 8);
      ctx.closePath();
      ctx.fill();
    }

    // Counter ledge
    ctx.fillStyle = '#8B5A2A';
    ctx.fillRect(x - sw / 2 - 3, y - 16, sw + 6, 9);
    ctx.fillStyle = '#A07850';
    ctx.fillRect(x - sw / 2 - 3, y - 16, sw + 6, 2);

    // Fish display on counter
    const fishColors = ['#90CAF9','#A5D6A7','#FFCC80','#EF9A9A','#CE93D8'];
    for (let i = 0; i < 5; i++) {
      const fx = x - 26 + i * 13;
      const fy = y - 22;
      ctx.fillStyle = fishColors[i];
      ctx.beginPath(); ctx.ellipse(fx, fy, 6, 3.5, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx + 6, fy);
      ctx.lineTo(fx + 10, fy - 3);
      ctx.lineTo(fx + 10, fy + 3);
      ctx.closePath(); ctx.fill();
    }

    // Crate left side
    ctx.fillStyle = '#8B6340';
    ctx.fillRect(x - sw / 2 - 14, y - 12, 12, 12);
    ctx.strokeStyle = '#5C3D1E'; ctx.lineWidth = 0.8;
    ctx.strokeRect(x - sw / 2 - 14, y - 12, 12, 12);
    ctx.beginPath();
    ctx.moveTo(x - sw / 2 - 14, y - 6);
    ctx.lineTo(x - sw / 2 - 2, y - 6);
    ctx.stroke();
    // Fruit in crate
    const fruitC = ['#FF7043','#FFEB3B','#66BB6A'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = fruitC[i];
      ctx.beginPath(); ctx.arc(x - sw / 2 - 11 + i * 4, y - 14, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Colorful sign
    ctx.fillStyle = '#FFF9C4';
    ctx.fillRect(x - 28, y - 44, 56, 14);
    ctx.strokeStyle = '#F9A825'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 28, y - 44, 56, 14);
    ctx.fillStyle = '#BF360C';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FRESH MARKET', x, y - 33);

    // Shop NPC (owner behind counter or sweeping outside)
    if (this._shopOwnerState === 'sweeping') {
      const npx = x + sw / 2 + 14 + Math.sin(this.t * 1.5) * 3;
      this._drawShopNpc(npx, y, 'sweeping');
    } else {
      this._drawShopNpc(x + 10, y - 20, 'counter');
    }

    // Label
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.fillText('TAP TO ENTER', x, y + 6);
    ctx.globalAlpha = 1;
  }

  _drawShopNpc(x, y, state) {
    const ctx = this.ctx;

    if (state === 'sweeping') {
      // Broom with animated sweep
      const sweepOff = Math.sin(this.t * 3) * 4;
      ctx.save();
      ctx.translate(x + 3, y - 5);
      ctx.strokeStyle = '#8B6340'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sweepOff, 9); ctx.stroke();
      ctx.fillStyle = '#D4A060';
      ctx.beginPath();
      ctx.moveTo(sweepOff - 5, 9);
      ctx.lineTo(sweepOff + 5, 9);
      ctx.lineTo(sweepOff + 3, 13);
      ctx.lineTo(sweepOff - 3, 13);
      ctx.closePath(); ctx.fill();
      ctx.lineCap = 'butt';
      ctx.restore();
    }

    // Body
    ctx.fillStyle = '#1565C0';
    ctx.fillRect(x - 4, y - 10, 8, 8);

    // Head
    ctx.fillStyle = '#FFCC80';
    ctx.beginPath(); ctx.arc(x, y - 14, 5, 0, Math.PI * 2); ctx.fill();

    // White hat (market owner)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 4, y - 21, 8, 4);
    ctx.beginPath(); ctx.ellipse(x, y - 22, 5, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Eyes
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(x - 2, y - 15, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2, y - 15, 0.9, 0, Math.PI * 2); ctx.fill();

    // Smile
    ctx.strokeStyle = '#333'; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y - 12, 2, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.lineCap = 'butt';
  }

  _drawBoat() {
    const ctx = this.ctx;
    const { x, y, heading } = this.boat;
    const hullColor  = this.appearance?.boatColor ?? '#6D4C2A';
    // Lighten hull color slightly for deck by blending with white
    const motor = this.inventory?.getEquippedMotor?.();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading + Math.PI / 2); // +90° because boat is drawn pointing up

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(2, 4, 10, 18, 0, 0, Math.PI * 2); ctx.fill();

    // Hull
    ctx.fillStyle = hullColor;
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 18, 0, 0, Math.PI * 2); ctx.fill();

    // Deck (slightly lighter overlay)
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.ellipse(0, -1, 7, 13, 0, 0, Math.PI * 2); ctx.fill();

    // Bow stripe
    ctx.fillStyle = '#C8A87A';
    ctx.fillRect(-3, -16, 6, 4);

    // Stern — motor or oars
    if (motor) {
      ctx.fillStyle = '#444';
      ctx.fillRect(-4, 8, 8, 8);  // motor block
      ctx.fillStyle = '#888';
      ctx.fillRect(-1, 14, 2, 6); // prop shaft
    } else {
      // Oars (two diagonal lines)
      ctx.strokeStyle = 'rgba(180,130,80,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-2, 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo( 8, 4); ctx.lineTo( 2, 14); ctx.stroke();
    }

    // Sail (if owned)
    if (this.inventory?.hasSail) {
      ctx.fillStyle = 'rgba(255,250,220,0.88)';
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(-7,  2);
      ctx.lineTo( 7,  2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,80,20,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();

    // Tiny cat on boat
    if (this.playerOnBoat) {
      const fur = this.appearance?.furColor ?? '#FFCC80';
      ctx.fillStyle = fur;
      ctx.beginPath(); ctx.arc(x, y - 3, 5, 0, Math.PI * 2); ctx.fill();
      // cat ears
      ctx.beginPath(); ctx.moveTo(x-4, y-7); ctx.lineTo(x-2,y-10); ctx.lineTo(x,  y-7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x,   y-7); ctx.lineTo(x+2,y-10); ctx.lineTo(x+4,y-7); ctx.closePath(); ctx.fill();
    }

    // Fuel-empty indicator bubble
    if (this.playerOnBoat && (this.inventory?.fuel ?? 1) <= 0) {
      ctx.fillStyle = '#F44336';
      ctx.beginPath(); ctx.arc(x + 12, y - 16, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', x + 12, y - 13);
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
    const ref = this.playerOnBoat ? this.boat : this.player;
    for (const spot of this.spots) {
      const near = Math.hypot(ref.x - spot.wx, ref.y - spot.wy) < 120;
      ctx.globalAlpha = near ? 1 : 0.55;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(spot.label, spot.wx, spot.wy - 18);
      if (near) {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#aef';
        ctx.fillText(this.playerOnBoat ? 'TAP TO FISH' : 'TAP TO FISH', spot.wx, spot.wy - 6);
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

    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x+6, py-2); ctx.lineTo(x+18, py-18); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,200,255,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x+18, py-18); ctx.lineTo(x+22, py-10); ctx.stroke();
    ctx.lineCap = 'butt';
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

  onResize() { this._resize(); }
}
