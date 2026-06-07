import {
  WORLD_W, WORLD_H, LAND_Y,
  ZONES, FISHING_SPOTS, DOCKS, BUILDINGS,
  PLAYER_START, BOAT_START,
  getZoneAt, isWaterAt, isDockAt,
} from '../systems/WorldMap.js';

const FUEL_DRAIN = 0.5;
const MIN_ZOOM   = 0.25;
const MAX_ZOOM   = 2.0;

function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

export class WorldScene {
  constructor(canvas, gameTime, onStartFishing, state = null, appearance = null, inventory = null, onOpenShop = null, onEnterHome = null) {
    this.canvas          = canvas;
    this.ctx             = canvas.getContext('2d');
    this.gameTime        = gameTime;
    this.onStartFishing  = onStartFishing;
    this.appearance      = appearance;
    this.inventory       = inventory;
    this.onOpenShop      = onOpenShop;
    this.onEnterHome     = onEnterHome;

    this.player = { x: 0, y: 0, tx: 0, ty: 0, speed: 130, state: 'idle', pendingSpot: null, _path: [], _pathIdx: 0 };
    this.boat   = { x: 0, y: 0, tx: 0, ty: 0, heading: -Math.PI / 2 };

    this.playerOnBoat        = false;
    this.boardingBoat        = false;
    this._boatTarget         = null;
    this._pendingInteraction = null;

    this.zoom        = state?.zoom ?? 1.0;
    this._pinchDist  = 0;
    this._pinchZoom  = 1;
    this._isPinching = false;
    this._tapStartX  = 0;
    this._tapStartY  = 0;

    this.ripples       = [];
    this.walkParticles = [];
    this.t             = 0;

    this._shopOwnerState = Math.random() < 0.5 ? 'counter' : 'sweeping';
    this._shopOwnerTimer = 15 + Math.random() * 15;

    this._currentZone    = null;
    this._zoneLabel      = null;
    this._zoneLabelTimer = 0;

    this.spots = FISHING_SPOTS.map(s => ({ ...s, location: s.zone }));
    this.home  = BUILDINGS.home;
    this.shop  = BUILDINGS.shop;

    this.obstacles = [
      { x: this.home.x, y: this.home.y - 10, r: 32 },
      { x: this.shop.x, y: this.shop.y - 10, r: 32 },
    ];

    this._trees = this._generateTrees();

    if (state?.playerPos) {
      this.player.x = this.player.tx = state.playerPos.x;
      this.player.y = this.player.ty = state.playerPos.y;
    } else {
      this.player.x = this.player.tx = PLAYER_START.x;
      this.player.y = this.player.ty = PLAYER_START.y;
    }

    this.boat.x = this.boat.tx = state?.boatPos?.x ?? BOAT_START.x;
    this.boat.y = this.boat.ty = state?.boatPos?.y ?? BOAT_START.y;

    if (state?.playerOnBoat) {
      this.playerOnBoat = true;
      this.player.x = this.player.tx = this.boat.x;
      this.player.y = this.player.ty = this.boat.y;
    }

    this._onMouseClick = (e) => {
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

  _generateTrees() {
    const rand  = seededRand(42);
    const trees = [];
    for (let i = 0; i < 200; i++) {
      const x = rand() * WORLD_W;
      const y = LAND_Y + 20 + rand() * (WORLD_H - LAND_Y - 40);
      if (Math.hypot(x - this.home.x, y - this.home.y) < 90) continue;
      if (Math.hypot(x - this.shop.x, y - this.shop.y) < 90) continue;
      if (isDockAt(x, y)) continue;
      if (x > 800 && x < 1700 && y > 2080 && y < WORLD_H) continue;
      trees.push({ x, y, r: 8 + rand() * 7 });
    }
    return trees;
  }

  // ── Touch / Pinch ──────────────────────────────────────────────────────────

  _onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 2) {
      this._pinchDist  = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
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
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this._pinchZoom * d / this._pinchDist));
    }
  }

  _onTouchEnd(e) {
    if (this._isPinching) { if (e.touches.length < 2) this._isPinching = false; return; }
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

  _camera() {
    const cw = this.canvas.width, ch = this.canvas.height;
    const sub = this.playerOnBoat ? this.boat : this.player;
    const camX = Math.max(cw - WORLD_W * this.zoom, Math.min(0, cw / 2 - sub.x * this.zoom));
    const camY = Math.max(ch - WORLD_H * this.zoom, Math.min(0, ch / 2 - sub.y * this.zoom));
    return { camX, camY };
  }

  _screenToWorld(sx, sy) {
    const { camX, camY } = this._camera();
    return { x: (sx - camX) / this.zoom, y: (sy - camY) / this.zoom };
  }

  _viewport() {
    const cw = this.canvas.width, ch = this.canvas.height;
    const { camX, camY } = this._camera();
    return { left: -camX / this.zoom, right: (-camX + cw) / this.zoom, top: -camY / this.zoom, bottom: (-camY + ch) / this.zoom };
  }

  getState() {
    return {
      playerPos:    this.playerOnBoat ? { x: this.boat.x, y: this.boat.y } : { x: this.player.x, y: this.player.y },
      boatPos:      { x: this.boat.x, y: this.boat.y },
      playerOnBoat: this.playerOnBoat,
      zoom:         this.zoom,
    };
  }

  getPlayerPos() { return { x: this.player.x, y: this.player.y }; }

  destroy() {
    this.canvas.removeEventListener('click',      this._onMouseClick);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove',  this._onTouchMove);
    this.canvas.removeEventListener('touchend',   this._onTouchEnd);
  }

  // ── Tap handling ───────────────────────────────────────────────────────────

  _handleTap(wx, wy) {
    if (document.getElementById('dialog-panel')?.style.display === 'flex') return;

    if (this.playerOnBoat) {
      for (const spot of this.spots) {
        if (Math.hypot(wx - spot.wx, wy - spot.wy) < 80) {
          this._boatTarget = { x: spot.wx, y: spot.wy, type: 'fish', spot };
          return;
        }
      }
      if (isDockAt(wx, wy) || wy >= LAND_Y) {
        const dp = this._nearestDockEdge(this.boat.x, this.boat.y);
        // Target 5px inside the dock (guaranteed isDockAt=true, so boat can reach it).
        // Land target is 5px past the dock onto walkable ground.
        this._boatTarget = { x: dp.x, y: dp.y - 5, type: 'dock', landTarget: { x: dp.x, y: dp.y + 5 } };
        return;
      }
      if (isWaterAt(wx, wy)) this._boatTarget = { x: wx, y: wy, type: 'water' };
      return;
    }

    // Board boat
    if (!this.boardingBoat && Math.hypot(wx - this.boat.x, wy - this.boat.y) < 55) {
      const dp = this._nearestDockEdge(this.boat.x, this.boat.y);
      this._walkTo(dp.x, dp.y + 5);
      this.player.pendingSpot = null;
      this.boardingBoat = true;
      return;
    }

    // Home
    if (Math.hypot(wx - this.home.x, wy - this.home.y) < 65) {
      this._walkTo(this.home.x, this.home.y + 32);
      this.player.pendingSpot   = null;
      this._pendingInteraction  = 'home';
      this.boardingBoat         = false;
      return;
    }

    // Shop
    if (Math.hypot(wx - this.shop.x, wy - this.shop.y) < 65) {
      this._walkTo(this.shop.x, this.shop.y + 32);
      this.player.pendingSpot   = null;
      this._pendingInteraction  = 'shop';
      this.boardingBoat         = false;
      return;
    }

    // Fishing spots (walk to nearest dock)
    for (const spot of this.spots) {
      if (Math.hypot(wx - spot.wx, wy - spot.wy) < 80) {
        const dp = this._nearestDockEdge(spot.wx, spot.wy);
        this._walkTo(dp.x, dp.y + 5);
        this.player.pendingSpot  = spot;
        this.boardingBoat        = false;
        this._pendingInteraction = null;
        return;
      }
    }

    // Walk
    if (this._isWalkable(wx, wy)) {
      this._walkTo(wx, wy);
      this.player.pendingSpot   = null;
      this.boardingBoat         = false;
      this._pendingInteraction  = null;
    }
  }

  _nearestDockEdge(wx, wy) {
    let best = null, bestD = Infinity;
    for (const d of DOCKS) {
      const cx = Math.max(d.x + 20, Math.min(d.x + d.w - 20, wx));
      const cy = d.y + d.h;
      const dist = Math.hypot(wx - cx, wy - cy);
      if (dist < bestD) { bestD = dist; best = { x: cx, y: cy }; }
    }
    return best ?? { x: wx, y: LAND_Y };
  }

  // ── Pathfinding ────────────────────────────────────────────────────────────

  _segmentClear(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy;
    for (const obs of this.obstacles) {
      const t  = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((obs.x - x1) * dx + (obs.y - y1) * dy) / len2));
      const cx = x1 + t * dx - obs.x, cy = y1 + t * dy - obs.y;
      if (cx * cx + cy * cy < (obs.r + 6) * (obs.r + 6)) return false;
    }
    return true;
  }

  _buildPath(sx, sy, tx, ty, depth = 0) {
    const end = { x: tx, y: ty };
    if (depth >= 4 || this._segmentClear(sx, sy, tx, ty)) return [end];
    const ddx = tx - sx, ddy = ty - sy, segLen2 = ddx * ddx + ddy * ddy;
    if (segLen2 === 0) return [end];
    let blocking = null, bestT = Infinity;
    for (const obs of this.obstacles) {
      const t  = Math.max(0, Math.min(1, ((obs.x - sx) * ddx + (obs.y - sy) * ddy) / segLen2));
      const cx = sx + t * ddx - obs.x, cy = sy + t * ddy - obs.y;
      if (cx * cx + cy * cy < (obs.r + 8) * (obs.r + 8) && t < bestT) { bestT = t; blocking = obs; }
    }
    if (!blocking) return [end];
    const len = Math.hypot(ddx, ddy), px = -ddy / len, py = ddx / len, margin = blocking.r + 18;
    const w1 = { x: Math.max(0, Math.min(WORLD_W, blocking.x + px * margin)), y: Math.max(LAND_Y, Math.min(WORLD_H - 5, blocking.y + py * margin)) };
    const w2 = { x: Math.max(0, Math.min(WORLD_W, blocking.x - px * margin)), y: Math.max(LAND_Y, Math.min(WORLD_H - 5, blocking.y - py * margin)) };
    const d1 = Math.hypot(w1.x - sx, w1.y - sy) + Math.hypot(tx - w1.x, ty - w1.y);
    const d2 = Math.hypot(w2.x - sx, w2.y - sy) + Math.hypot(tx - w2.x, ty - w2.y);
    const w  = d1 <= d2 ? w1 : w2;
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

  _isWalkable(wx, wy) {
    if (isDockAt(wx, wy)) return true;
    if (wy < LAND_Y || wy >= WORLD_H) return false;
    for (const obs of this.obstacles) { if (Math.hypot(wx - obs.x, wy - obs.y) < obs.r) return false; }
    return true;
  }

  _isBoatPassable(wx, wy) {
    if (wy >= LAND_Y || wy < 0 || wx < 0 || wx >= WORLD_W) return false;
    return isWaterAt(wx, wy) || isDockAt(wx, wy);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(dt) {
    this.t += dt;
    this._updatePlayer(dt);
    this._updateBoat(dt);
    this._updateZoneLabel(dt);

    if (this.boardingBoat) {
      const dp = this._nearestDockEdge(this.boat.x, this.boat.y);
      if (Math.hypot(this.player.x - dp.x, this.player.y - (dp.y + 5)) < 22 && this.player.state === 'idle') {
        this.playerOnBoat = true;
        this.boardingBoat = false;
      }
    }

    if (this._pendingInteraction === 'shop' && this.player.state === 'idle') { this._pendingInteraction = null; this.onOpenShop?.(); }
    if (this._pendingInteraction === 'home' && this.player.state === 'idle') { this._pendingInteraction = null; this.onEnterHome?.(); }

    this._shopOwnerTimer -= dt;
    if (this._shopOwnerTimer <= 0) {
      this._shopOwnerState = this._shopOwnerState === 'counter' ? 'sweeping' : 'counter';
      this._shopOwnerTimer = 15 + Math.random() * 15;
    }

    if (Math.random() < dt * 1.5 && this.spots.length > 0) {
      const spot = this.spots[Math.floor(Math.random() * this.spots.length)];
      this.ripples.push({ x: spot.wx + (Math.random()-0.5)*50, y: spot.wy + (Math.random()-0.5)*25, r: 2, life: 1 });
    }
    this.ripples       = this.ripples.filter(r => { r.r += dt * 18; r.life -= dt * 1.2; return r.life > 0; });
    this.walkParticles = this.walkParticles.filter(p => { p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 60*dt; p.life -= dt*2.5; return p.life > 0; });
  }

  _updateZoneLabel(dt) {
    const ref  = this.playerOnBoat ? this.boat : this.player;
    const zone = getZoneAt(ref.x, ref.y);
    const zid  = zone?.id ?? null;
    if (zid !== this._currentZone) {
      this._currentZone = zid;
      if (zone) { this._zoneLabel = zone.label; this._zoneLabelTimer = 3; }
    }
    if (this._zoneLabelTimer > 0) this._zoneLabelTimer -= dt;
  }

  _updatePlayer(dt) {
    if (this.playerOnBoat) return;
    const p = this.player;
    const dx = p.tx - p.x, dy = p.ty - p.y, dist = Math.hypot(dx, dy);
    if (dist > 3) {
      const step = Math.min(dist, p.speed * dt);
      const nx = p.x + (dx / dist) * step, ny = p.y + (dy / dist) * step;
      if      (this._isWalkable(nx, ny))  { p.x = nx; p.y = ny; }
      else if (this._isWalkable(nx, p.y)) { p.x = nx; }
      else if (this._isWalkable(p.x, ny)) { p.y = ny; }
      if (Math.random() < 0.3)
        this.walkParticles.push({ x: p.x, y: p.y + 8, vx: (Math.random()-0.5)*20, vy: -10, life: 0.4 });
    } else {
      p.x = p.tx; p.y = p.ty;
      if (p._path.length > 0 && p._pathIdx < p._path.length - 1) {
        p._pathIdx++; p.tx = p._path[p._pathIdx].x; p.ty = p._path[p._pathIdx].y;
      } else if (p.state === 'walking') {
        p.state = 'idle';
        if (p.pendingSpot) { this.onStartFishing(p.pendingSpot); p.pendingSpot = null; }
      }
    }
  }

  _updateBoat(dt) {
    if (!this.playerOnBoat || !this._boatTarget) return;
    const b = this.boat;
    const dx = this._boatTarget.x - b.x, dy = this._boatTarget.y - b.y, dist = Math.hypot(dx, dy);
    const motor = this.inventory?.getEquippedMotor?.(), hasFuel = (this.inventory?.fuel ?? 0) > 0;
    const speed = motor ? (hasFuel ? 160 : (this.inventory?.hasSail ? 80 : 35)) : 25;
    if (dist > 6) {
      const step = Math.min(dist, speed * dt);
      const nx = b.x + (dx/dist)*step, ny = b.y + (dy/dist)*step;
      if      (this._isBoatPassable(nx, ny))  { b.x = nx; b.y = ny; }
      else if (this._isBoatPassable(nx, b.y)) { b.x = nx; }
      else if (this._isBoatPassable(b.x, ny)) { b.y = ny; }
      b.heading = Math.atan2(dy, dx);
      if (motor && hasFuel && this.inventory) this.inventory.fuel = Math.max(0, this.inventory.fuel - FUEL_DRAIN * dt);
    } else {
      b.x = this._boatTarget.x; b.y = this._boatTarget.y;
      const tgt = this._boatTarget; this._boatTarget = null;
      if (tgt.type === 'dock') {
        this.playerOnBoat = false;
        this.player.x = this.player.tx = tgt.landTarget.x;
        this.player.y = this.player.ty = tgt.landTarget.y;
        this.player.state = 'idle';
      } else if (tgt.type === 'fish') {
        this.onStartFishing(tgt.spot);
      }
    }
    if (this.playerOnBoat) { this.player.x = b.x; this.player.y = b.y; }
  }

  // ── Draw ───────────────────────────────────────────────────────────────────

  draw() {
    const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
    const { camX, camY } = this._camera();
    const vp = this._viewport();

    ctx.fillStyle = this.gameTime.skyColor ?? '#87CEEB';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(camX, camY);
    ctx.scale(this.zoom, this.zoom);

    this._drawTerrain(vp);
    this._drawDocks(vp);
    this._drawTrees(vp);
    this._drawHome();
    this._drawShop();
    this._drawFishingSpots(vp);
    this._drawWalkParticles();
    this._drawBoat();
    if (!this.playerOnBoat) this._drawPlayer();
    this._drawSpotLabels(vp);

    ctx.restore();

    if (this.playerOnBoat) this._drawFuelHud(cw, ch);
    this._drawZoneLabel(cw, ch);
  }

  _drawTerrain(vp) {
    const ctx = this.ctx;

    // Land base
    const lg = ctx.createLinearGradient(0, LAND_Y, 0, WORLD_H);
    lg.addColorStop(0, '#4CAF50'); lg.addColorStop(1, '#2E7D32');
    ctx.fillStyle = lg;
    ctx.fillRect(vp.left, LAND_Y, vp.right - vp.left, WORLD_H - LAND_Y);

    // Grass texture
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < 400; i++) {
      const gx = (i * 139.7 + 5) % WORLD_W;
      const gy = LAND_Y + 15 + (i * 83.3 + 7) % (WORLD_H - LAND_Y - 20);
      if (gx < vp.left - 5 || gx > vp.right + 5 || gy < vp.top || gy > vp.bottom) continue;
      ctx.fillRect(Math.round(gx), Math.round(gy), 4, 3);
    }

    // Water zones
    for (const zone of ZONES) {
      if (zone.x + zone.w < vp.left || zone.x > vp.right || zone.y + zone.h < vp.top || zone.y > vp.bottom) continue;
      ctx.fillStyle = zone.water;
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h);

      if (zone.wave) {
        ctx.strokeStyle = zone.wave; ctx.lineWidth = 1.5;
        const rows = Math.min(6, Math.ceil(zone.h / 60));
        for (let i = 0; i < rows; i++) {
          const wy = zone.y + (i + 0.5) * (zone.h / rows);
          if (wy < vp.top - 10 || wy > vp.bottom + 10) continue;
          ctx.beginPath();
          for (let x = zone.x; x <= zone.x + zone.w; x += 28) {
            const wave = Math.sin((x / zone.w) * Math.PI * 4 + this.t * 1.1 + i * 0.6) * 3;
            x === zone.x ? ctx.moveTo(x, wy + wave) : ctx.lineTo(x, wy + wave);
          }
          ctx.stroke();
        }
      }

      if (zone.fog) { ctx.fillStyle = zone.fog; ctx.fillRect(zone.x, zone.y, zone.w, zone.h); }

      if (zone.id === 'arctic')     this._drawArcticFx(zone, vp);
      if (zone.id === 'deep_ocean') this._drawDeepFx(zone, vp);
      if (zone.id === 'swamp')      this._drawSwampFx(zone, vp);
    }

    // Shore strip
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(vp.left, LAND_Y - 10, vp.right - vp.left, 14);
    ctx.fillStyle = '#C8A87A';
    ctx.fillRect(vp.left, LAND_Y - 5,  vp.right - vp.left, 7);
  }

  _drawArcticFx(zone, vp) {
    const ctx = this.ctx, rand = seededRand(7);
    for (let i = 0; i < 22; i++) {
      const ix = zone.x + rand() * zone.w, iy = zone.y + rand() * zone.h;
      if (ix < vp.left - 40 || ix > vp.right + 40 || iy < vp.top - 20 || iy > vp.bottom + 20) continue;
      const iw = 22 + rand() * 35, ih = 9 + rand() * 14;
      ctx.fillStyle = `rgba(220,240,255,${0.55 + rand() * 0.35})`;
      ctx.beginPath(); ctx.ellipse(ix, iy, iw/2, ih/2, rand()*0.4, 0, Math.PI*2); ctx.fill();
    }
  }

  _drawDeepFx(zone, vp) {
    const ctx = this.ctx;
    for (let i = 0; i < 35; i++) {
      const bx = zone.x + (i * 137.5 + 11) % zone.w, by = zone.y + (i * 97.3 + 7) % zone.h;
      if (bx < vp.left || bx > vp.right || by < vp.top || by > vp.bottom) continue;
      const alpha = 0.25 + 0.45 * Math.abs(Math.sin(this.t * 1.3 + i));
      ctx.fillStyle = `rgba(0,200,180,${alpha})`;
      ctx.beginPath(); ctx.arc(bx, by, 2 + Math.sin(this.t + i) * 1, 0, Math.PI*2); ctx.fill();
    }
  }

  _drawSwampFx(zone, vp) {
    const ctx = this.ctx, rand = seededRand(13);
    for (let i = 0; i < 18; i++) {
      const lx = zone.x + rand() * zone.w, ly = zone.y + rand() * zone.h;
      if (lx < vp.left - 20 || lx > vp.right + 20 || ly < vp.top - 20 || ly > vp.bottom + 20) continue;
      ctx.fillStyle = '#2D5A1B';
      ctx.beginPath(); ctx.ellipse(lx, ly, 12 + rand()*6, 8 + rand()*4, rand()*Math.PI, 0, Math.PI*2); ctx.fill();
    }
  }

  _drawDocks(vp) {
    const ctx = this.ctx;
    for (const dock of DOCKS) {
      if (dock.x + dock.w < vp.left || dock.x > vp.right || dock.y + dock.h < vp.top || dock.y > vp.bottom) continue;
      ctx.fillStyle = '#7D5A3C';
      ctx.fillRect(dock.x, dock.y, dock.w, dock.h);
      ctx.strokeStyle = '#5C3D1E'; ctx.lineWidth = 1;
      const sp = Math.max(14, Math.min(22, dock.w / 32));
      for (let x = dock.x; x < dock.x + dock.w; x += sp) {
        ctx.beginPath(); ctx.moveTo(x, dock.y); ctx.lineTo(x, dock.y + dock.h); ctx.stroke();
      }
      ctx.fillStyle = '#8B6340';
      ctx.fillRect(dock.x, dock.y, dock.w, 4);
      ctx.fillStyle = '#5C3D1E';
      const pilSp = Math.max(80, dock.w / 7);
      for (let x = dock.x + 24; x < dock.x + dock.w - 10; x += pilSp) {
        ctx.fillRect(x - 4, dock.y - 16, 8, 20);
      }
    }
  }

  _drawTrees(vp) {
    const ctx = this.ctx;
    for (const tr of this._trees) {
      if (tr.x < vp.left - 35 || tr.x > vp.right + 35 || tr.y < vp.top - 50 || tr.y > vp.bottom + 10) continue;
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(tr.x - 4, tr.y, 8, 26);
      ctx.fillStyle = '#1B5E20';
      ctx.beginPath(); ctx.arc(tr.x, tr.y - 4, tr.r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#2E7D32';
      ctx.beginPath(); ctx.arc(tr.x, tr.y - tr.r - 4, tr.r * 0.75, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#388E3C';
      ctx.beginPath(); ctx.arc(tr.x, tr.y - tr.r * 1.7 - 4, tr.r * 0.5, 0, Math.PI*2); ctx.fill();
    }
  }

  _drawHome() {
    const ctx = this.ctx, { x, y } = this.home;
    const bw = 80, bh = 60;

    ctx.fillStyle = '#F2E0BC';
    ctx.fillRect(x - bw/2, y - bh, bw, bh);
    ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - bw/2, y - bh + i*bh/5); ctx.lineTo(x + bw/2, y - bh + i*bh/5); ctx.stroke(); }

    ctx.fillStyle = '#B03030';
    ctx.beginPath(); ctx.moveTo(x - bw/2 - 8, y - bh); ctx.lineTo(x, y - bh - 30); ctx.lineTo(x + bw/2 + 8, y - bh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7A1A1A'; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.fillStyle = '#8B5A2A'; ctx.fillRect(x + bw*0.25, y - bh - 36, 10, 20);
    ctx.fillStyle = 'rgba(180,180,180,0.5)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(x + bw*0.25 + 5 + Math.sin(this.t*0.6+i)*5, y - bh - 40 - i*9, 4 + i*2, 0, Math.PI*2); ctx.fill();
    }

    ctx.fillStyle = '#7B4A22'; ctx.fillRect(x - 10, y - 28, 20, 28);
    ctx.beginPath(); ctx.arc(x, y - 28, 10, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#D4A060'; ctx.beginPath(); ctx.arc(x + 6, y - 14, 2.5, 0, Math.PI*2); ctx.fill();

    const wg = 0.6 + 0.15 * Math.sin(this.t * 1.8);
    ctx.fillStyle = `rgba(255,210,80,${wg})`;
    ctx.fillRect(x - bw/2 + 9, y - bh + 10, 14, 12);
    ctx.fillRect(x + bw/2 - 23, y - bh + 10, 14, 12);
    ctx.strokeStyle = '#5C3D1E'; ctx.lineWidth = 1;
    ctx.strokeRect(x - bw/2 + 9, y - bh + 10, 14, 12);
    ctx.strokeRect(x + bw/2 - 23, y - bh + 10, 14, 12);

    ctx.fillStyle = '#D4A060'; ctx.fillRect(x - 28, y - bh - 10, 56, 14);
    ctx.strokeStyle = '#7B4A22'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 28, y - bh - 10, 56, 14);
    ctx.fillStyle = '#2A1000'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('HOME', x, y - bh + 1);
    ctx.globalAlpha = 0.75; ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif';
    ctx.fillText('TAP TO ENTER', x, y + 9); ctx.globalAlpha = 1;
  }

  _drawShop() {
    const ctx = this.ctx, { x, y } = this.shop, sw = 90;

    ctx.fillStyle = '#C8A87A'; ctx.fillRect(x - sw/2, y - 56, sw, 56);
    ctx.fillStyle = '#7B4A22';
    ctx.fillRect(x - sw/2 - 5, y - 68, 8, 68);
    ctx.fillRect(x + sw/2 - 3, y - 68, 8, 68);

    const awW = sw + 20, awH = 20, awX = x - awW/2, awY = y - 68, strW = awW / 8;
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i%2===0 ? '#D32F2F' : '#F5F5F5'; ctx.fillRect(awX + i*strW, awY, strW + 0.5, awH); }
    const scW = awW / 9;
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i%2===0 ? '#D32F2F' : '#F5F5F5';
      ctx.beginPath(); ctx.arc(awX + i*scW + scW/2, awY + awH, scW/2, 0, Math.PI); ctx.fill();
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x - sw/2, awY); ctx.quadraticCurveTo(x, awY + 7, x + sw/2, awY); ctx.stroke();
    const fc = ['#E53935','#FB8C00','#FDD835','#43A047','#1E88E5','#8E24AA'];
    for (let i = 0; i < 6; i++) {
      const fx = x - sw/2 + 7 + i*(sw/6), fdy = Math.sin((i/5)*Math.PI)*7;
      ctx.fillStyle = fc[i];
      ctx.beginPath(); ctx.moveTo(fx, awY+fdy); ctx.lineTo(fx-5, awY+fdy+9); ctx.lineTo(fx+5, awY+fdy+9); ctx.closePath(); ctx.fill();
    }

    ctx.fillStyle = '#8B5A2A'; ctx.fillRect(x - sw/2 - 4, y - 18, sw + 8, 10);
    ctx.fillStyle = '#A07850'; ctx.fillRect(x - sw/2 - 4, y - 18, sw + 8, 2);

    const fishC = ['#90CAF9','#A5D6A7','#FFCC80','#EF9A9A','#CE93D8'];
    for (let i = 0; i < 5; i++) {
      const fx = x - 30 + i*15, fy = y - 25;
      ctx.fillStyle = fishC[i];
      ctx.beginPath(); ctx.ellipse(fx, fy, 7, 4, 0.15, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fx+7,fy); ctx.lineTo(fx+12,fy-3); ctx.lineTo(fx+12,fy+3); ctx.closePath(); ctx.fill();
    }

    ctx.fillStyle = '#FFF9C4'; ctx.fillRect(x - 32, y - 54, 64, 16);
    ctx.strokeStyle = '#F9A825'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 32, y - 54, 64, 16);
    ctx.fillStyle = '#BF360C'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('FRESH MARKET', x, y - 41);

    if (this._shopOwnerState === 'sweeping') {
      this._drawShopNpc(x + sw/2 + 16 + Math.sin(this.t*1.5)*3, y, 'sweeping');
    } else {
      this._drawShopNpc(x + 12, y - 22, 'counter');
    }

    ctx.globalAlpha = 0.75; ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif';
    ctx.fillText('TAP TO ENTER', x, y + 9); ctx.globalAlpha = 1;
  }

  _drawShopNpc(x, y, state) {
    const ctx = this.ctx;
    if (state === 'sweeping') {
      const sw = Math.sin(this.t * 3) * 5;
      ctx.save(); ctx.translate(x + 3, y - 5);
      ctx.strokeStyle = '#8B6340'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sw, 10); ctx.stroke();
      ctx.fillStyle = '#D4A060';
      ctx.beginPath(); ctx.moveTo(sw-6,10); ctx.lineTo(sw+6,10); ctx.lineTo(sw+4,14); ctx.lineTo(sw-4,14); ctx.closePath(); ctx.fill();
      ctx.lineCap = 'butt'; ctx.restore();
    }
    ctx.fillStyle = '#1565C0'; ctx.fillRect(x-5, y-11, 10, 9);
    ctx.fillStyle = '#FFCC80'; ctx.beginPath(); ctx.arc(x, y-15, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x-5, y-24, 10, 5);
    ctx.beginPath(); ctx.ellipse(x, y-25, 6, 3.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(x-2, y-16, 1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+2, y-16, 1, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y-13, 2, 0.2, Math.PI-0.2); ctx.stroke();
    ctx.lineCap = 'butt';
  }

  _drawBoat() {
    const ctx = this.ctx, { x, y, heading } = this.boat;
    const hullColor = this.appearance?.boatColor ?? '#6D4C2A';
    const motor     = this.inventory?.getEquippedMotor?.();
    ctx.save(); ctx.translate(x, y); ctx.rotate(heading + Math.PI/2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(2, 4, 12, 22, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = hullColor;            ctx.beginPath(); ctx.ellipse(0, 0, 12, 22, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(0, -1, 8, 16, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#C8A87A'; ctx.fillRect(-4, -19, 8, 5);
    if (motor) {
      ctx.fillStyle = '#444'; ctx.fillRect(-5, 10, 10, 9);
      ctx.fillStyle = '#888'; ctx.fillRect(-1, 17, 2, 7);
    } else {
      ctx.strokeStyle = 'rgba(180,130,80,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-10, 5); ctx.lineTo(-3, 17); ctx.stroke();
      ctx.beginPath(); ctx.moveTo( 10, 5); ctx.lineTo( 3, 17); ctx.stroke();
    }
    if (this.inventory?.hasSail) {
      ctx.fillStyle = 'rgba(255,250,220,0.88)';
      ctx.beginPath(); ctx.moveTo(0,-17); ctx.lineTo(-9,3); ctx.lineTo(9,3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(120,80,20,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
    if (this.playerOnBoat) {
      const fur = this.appearance?.furColor ?? '#FFCC80';
      ctx.fillStyle = fur; ctx.beginPath(); ctx.arc(x, y-4, 6, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x-5,y-9); ctx.lineTo(x-2,y-13); ctx.lineTo(x,  y-9); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x,  y-9); ctx.lineTo(x+2,y-13); ctx.lineTo(x+5,y-9); ctx.closePath(); ctx.fill();
    }
    if (this.playerOnBoat && (this.inventory?.fuel ?? 1) <= 0) {
      ctx.fillStyle = '#F44336'; ctx.beginPath(); ctx.arc(x+14, y-20, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', x+14, y-17);
    }
  }

  _drawFishingSpots(vp) {
    const ctx = this.ctx;
    for (const spot of this.spots) {
      if (spot.wx < vp.left-60 || spot.wx > vp.right+60 || spot.wy < vp.top-60 || spot.wy > vp.bottom+60) continue;
      const pulse = 0.5 + 0.5*Math.sin(this.t*2.5);
      for (const r of this.ripples) {
        if (Math.hypot(r.x - spot.wx, r.y - spot.wy) >= 90) continue;
        ctx.strokeStyle = `rgba(255,255,255,${r.life*0.3})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI*2); ctx.stroke();
      }
      const g = ctx.createRadialGradient(spot.wx, spot.wy, 2, spot.wx, spot.wy, 45);
      g.addColorStop(0, `rgba(100,220,255,${0.35*pulse})`); g.addColorStop(1, 'rgba(100,220,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(spot.wx, spot.wy, 45, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(180,240,255,${0.7+0.3*pulse})`;
      ctx.beginPath(); ctx.arc(spot.wx, spot.wy, 6, 0, Math.PI*2); ctx.fill();
    }
  }

  _drawSpotLabels(vp) {
    const ctx = this.ctx, ref = this.playerOnBoat ? this.boat : this.player;
    for (const spot of this.spots) {
      if (spot.wx < vp.left-70 || spot.wx > vp.right+70 || spot.wy < vp.top-70 || spot.wy > vp.bottom+70) continue;
      const near = Math.hypot(ref.x - spot.wx, ref.y - spot.wy) < 160;
      ctx.globalAlpha = near ? 1 : 0.55;
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(spot.label, spot.wx, spot.wy - 24);
      if (near) { ctx.font = '11px sans-serif'; ctx.fillStyle = '#aef'; ctx.fillText('TAP TO FISH', spot.wx, spot.wy - 9); }
    }
    ctx.globalAlpha = 1;
  }

  _drawWalkParticles() {
    const ctx = this.ctx;
    for (const p of this.walkParticles) {
      ctx.globalAlpha = p.life * 0.5; ctx.fillStyle = '#c8e6c9';
      ctx.fillRect(Math.round(p.x-2), Math.round(p.y-2), 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  _drawPlayer() {
    const ctx = this.ctx, { x, y, state } = this.player;
    const bounce = state === 'walking' ? Math.sin(this.t*8)*2 : 0, py = y + bounce;
    const fur = this.appearance?.furColor ?? '#FFCC80', shirt = this.appearance?.shirtColor ?? '#1976D2', pants = this.appearance?.pantsColor ?? '#37474F';

    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(x, y+14, 10, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = fur; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x-5, py+5); ctx.quadraticCurveTo(x-20, py-2, x-18, py-12); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = pants; ctx.fillRect(Math.round(x)-6, Math.round(py)+6, 5, 8); ctx.fillRect(Math.round(x)+1, Math.round(py)+6, 5, 8);
    ctx.fillStyle = shirt; ctx.fillRect(Math.round(x)-7, Math.round(py)-3, 14, 10);
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.moveTo(x-7,py-13); ctx.lineTo(x-4,py-22); ctx.lineTo(x-1,py-13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+1,py-13); ctx.lineTo(x+4,py-22); ctx.lineTo(x+7,py-13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FF8FAB';
    ctx.beginPath(); ctx.moveTo(x-6,py-14); ctx.lineTo(x-4,py-20); ctx.lineTo(x-2,py-14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+2,py-14); ctx.lineTo(x+4,py-20); ctx.lineTo(x+6,py-14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = fur; ctx.beginPath(); ctx.arc(x, py-9, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2d2d2d';
    ctx.beginPath(); ctx.ellipse(x-3, py-11, 2, 1.5, -0.25, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+3, py-11, 2, 1.5,  0.25, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(x-2.2, py-11.5, 0.8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+3.8, py-11.5, 0.8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FF8FAB'; ctx.beginPath(); ctx.arc(x, py-7.5, 1.2, 0, Math.PI*2); ctx.fill();
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

  // ── Screen-space overlays ──────────────────────────────────────────────────

  _drawFuelHud(cw, ch) {
    const ctx = this.ctx, fuel = this.inventory?.fuel ?? 0, max = this.inventory?.maxFuel ?? 100, pct = fuel / max;
    const bw = 130, bh = 11, bx = (cw-bw)/2, by = ch - 56;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; this._roundRect(bx-10, by-7, bw+20, bh+18, 8); ctx.fill();
    ctx.fillStyle = '#333'; this._roundRect(bx, by, bw, bh, 4); ctx.fill();
    ctx.fillStyle = pct > 0.4 ? '#4CAF50' : pct > 0.15 ? '#FFC107' : '#F44336';
    this._roundRect(bx, by, bw*pct, bh, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    const motor = this.inventory?.getEquippedMotor?.();
    ctx.fillText(!motor ? '🚣 PADDLING' : (fuel<=0 && this.inventory?.hasSail) ? '⛵ SAILING' : `⛽ ${Math.ceil(fuel)}/${max}`, bx+bw/2, by-2);
  }

  _drawZoneLabel(cw, ch) {
    if (this._zoneLabelTimer <= 0 || !this._zoneLabel) return;
    const ctx = this.ctx;
    ctx.globalAlpha = Math.min(1, this._zoneLabelTimer);
    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    const tw = ctx.measureText(this._zoneLabel).width;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    this._roundRect(cw/2 - tw/2 - 18, ch*0.15 - 22, tw + 36, 38, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(this._zoneLabel, cw/2, ch*0.15 + 5);
    ctx.globalAlpha = 1;
  }

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath();
  }

  onResize() {}
}
