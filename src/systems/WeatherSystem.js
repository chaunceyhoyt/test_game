const CFG = {
  clear:       {},
  snow:        { count: 150, wind: 30  },
  blizzard:    { count: 380, wind: 200, fog: 0.14 },
  rain:        { count: 260, wind: 80  },
  thunderstorm:{ count: 400, wind: 110, lightning: true },
  petals:      { count: 70,  wind: 28  },
  leaves:      { count: 55,  wind: 65  },
  fog:         {              wind: 0,   fog: 0.36 },
  fireflies:   { count: 28              },
  aurora:      {},
};

const SEASON_TABLE = {
  winter: ['snow','snow','snow','blizzard','snow','fog','aurora','clear'],
  spring: ['rain','rain','thunderstorm','petals','rain','fog','clear'],
  summer: ['rain','thunderstorm','rain','fireflies','clear','thunderstorm'],
  fall:   ['leaves','rain','thunderstorm','rain','leaves','fog','clear'],
};

const LEAF_COLORS = ['#D4722A','#E8922C','#C0392B','#8B4513','#DAA520','#CD853F'];

export class WeatherSystem {
  constructor(gameTime) {
    this.gameTime    = gameTime;
    this.current     = 'clear';
    this._override   = null;
    this._particles  = [];
    this._wind       = 0;
    this._targetWind = 0;
    this._flash      = 0;
    this._nextStrike = 8;
    this._changeTimer = 0;
    this._auroraT    = 0;
    this._w = window.innerWidth;
    this._h = window.innerHeight;

    window.addEventListener('resize', () => {
      this._w = window.innerWidth;
      this._h = window.innerHeight;
    });

    this._pickWeather();
  }

  get weather() { return this._override ?? this.current; }

  setOverride(type) {
    this._override = (type === 'auto') ? null : type;
    if (this._override) this._applyWeather(this._override);
    else               this._pickWeather();
  }

  _pickWeather() {
    const table = SEASON_TABLE[this.gameTime.season] ?? ['clear'];
    const next  = table[Math.floor(Math.random() * table.length)];
    this.current = next;
    this._applyWeather(next);
    this._changeTimer = 20 + Math.random() * 40;
  }

  _applyWeather(type) {
    const cfg = CFG[type] ?? {};
    const dir = (type === 'blizzard') ? 1 : (Math.random() < 0.3 ? -1 : 1);
    this._targetWind  = (cfg.wind ?? 0) * dir * (0.75 + Math.random() * 0.5);
    this._flash       = 0;
    this._nextStrike  = 5 + Math.random() * 14;
    this._particles   = [];
    const count = cfg.count ?? 0;
    for (let i = 0; i < count; i++) this._particles.push(this._spawn(type, true));
  }

  _spawn(type, spread = false) {
    const w = this._w, h = this._h;
    switch (type) {
      case 'snow': case 'blizzard': return {
        type,
        x: Math.random() * w, y: spread ? Math.random() * h : -6,
        vy: 45 + Math.random() * 75,
        size: 1.5 + Math.random() * 3,
        alpha: 0.45 + Math.random() * 0.55,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 1.0 + Math.random() * 2.0,
        wobbleAmp: 12 + Math.random() * 28,
      };
      case 'rain': case 'thunderstorm': return {
        type,
        x: Math.random() * w * 1.4 - w * 0.2,
        y: spread ? Math.random() * h : -25,
        vy: 650 + Math.random() * 350,
        length: 10 + Math.random() * 18,
        alpha: 0.22 + Math.random() * 0.38,
      };
      case 'petals': return {
        type,
        x: Math.random() * w, y: spread ? Math.random() * h : -10,
        vy: 25 + Math.random() * 50,
        size: 3 + Math.random() * 4.5,
        alpha: 0.65 + Math.random() * 0.35,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 3.2,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 1.0 + Math.random() * 1.8,
        wobbleAmp: 10 + Math.random() * 22,
        color: Math.random() > 0.4 ? '#FFB7C5' : '#ffe0ea',
      };
      case 'leaves': return {
        type,
        x: Math.random() * w, y: spread ? Math.random() * h : -16,
        vy: 50 + Math.random() * 75,
        size: 6 + Math.random() * 8,
        alpha: 0.75 + Math.random() * 0.25,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 4.8,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.8 + Math.random() * 1.4,
        wobbleAmp: 22 + Math.random() * 38,
        color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      };
      case 'fireflies': return {
        type,
        x: Math.random() * w,
        y: h * 0.44 + Math.random() * h * 0.52,
        vx: (Math.random() - 0.5) * 28,
        vy: (Math.random() - 0.5) * 20,
        size: 2 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 1.2 + Math.random() * 2.2,
        driftTimer: Math.random() * 3,
      };
      default: return { type, x: 0, y: 0 };
    }
  }

  update(dt) {
    const w   = this.weather;
    const cfg = CFG[w] ?? {};

    if (!this._override) {
      this._changeTimer -= dt;
      if (this._changeTimer <= 0) this._pickWeather();
    }

    this._wind   += (this._targetWind - this._wind) * Math.min(1, dt * 0.7);
    this._auroraT += dt;

    const cw = this._w, ch = this._h;

    for (const p of this._particles) {
      switch (p.type) {
        case 'snow': case 'blizzard':
          p.wobble += p.wobbleSpeed * dt;
          p.x += (this._wind + Math.sin(p.wobble) * p.wobbleAmp) * dt;
          p.y += p.vy * dt;
          if (p.y > ch + 10 || p.x < -30 || p.x > cw + 30) {
            p.x = Math.random() * cw; p.y = -6;
          }
          break;
        case 'rain': case 'thunderstorm':
          p.x += this._wind * dt;
          p.y += p.vy * dt;
          if (p.y > ch + 25) { p.x = Math.random() * cw * 1.4 - cw * 0.2; p.y = -25; }
          break;
        case 'petals': case 'leaves':
          p.angle  += p.spin * dt;
          p.wobble += p.wobbleSpeed * dt;
          p.x += (this._wind + Math.sin(p.wobble) * p.wobbleAmp) * dt;
          p.y += p.vy * dt;
          if (p.y > ch + 25 || p.x < -60 || p.x > cw + 60) {
            p.x = Math.random() * cw; p.y = p.type === 'leaves' ? -16 : -10;
          }
          break;
        case 'fireflies':
          p.phase += p.phaseSpeed * dt;
          p.driftTimer -= dt;
          if (p.driftTimer <= 0) {
            p.vx = (Math.random() - 0.5) * 28;
            p.vy = (Math.random() - 0.5) * 20;
            p.driftTimer = 1.5 + Math.random() * 3;
          }
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.x < 0)        { p.x = 0;        p.vx =  Math.abs(p.vx); }
          if (p.x > cw)       { p.x = cw;       p.vx = -Math.abs(p.vx); }
          if (p.y < ch * 0.42){ p.y = ch * 0.42; p.vy =  Math.abs(p.vy); }
          if (p.y > ch)       { p.y = ch;       p.vy = -Math.abs(p.vy); }
          break;
      }
    }

    // Lightning
    if (cfg.lightning) {
      this._nextStrike -= dt;
      if (this._nextStrike <= 0) {
        this._flash      = 0.72;
        this._nextStrike = 5 + Math.random() * 20;
      }
    }
    if (this._flash > 0) this._flash = Math.max(0, this._flash - dt * 3.5);
  }

  draw(ctx, cw, ch) {
    const w   = this.weather;
    const cfg = CFG[w] ?? {};

    // Fog overlay
    if (cfg.fog) {
      ctx.fillStyle = `rgba(175,192,210,${cfg.fog})`;
      ctx.fillRect(0, 0, cw, ch);
    }

    // Aurora
    if (w === 'aurora') this._drawAurora(ctx, cw, ch);

    // Particles
    ctx.save();
    ctx.lineWidth = 1;

    for (const p of this._particles) {
      switch (p.type) {
        case 'snow': case 'blizzard':
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
          ctx.fill();
          break;
        case 'rain': case 'thunderstorm': {
          const vx = this._wind, vy = p.vy;
          const mag = Math.sqrt(vx * vx + vy * vy);
          const nx = vx / mag, ny = vy / mag;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + nx * p.length, p.y + ny * p.length);
          ctx.strokeStyle = `rgba(180,210,255,${p.alpha})`;
          ctx.stroke();
          break;
        }
        case 'petals':
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.angle);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle   = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        case 'leaves':
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.angle);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle   = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        case 'fireflies': {
          const glow = (Math.sin(p.phase) + 1) * 0.5;
          if (glow > 0.12) {
            const r    = p.size * 5;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            grad.addColorStop(0,   `rgba(255,255,80,${glow * 0.95})`);
            grad.addColorStop(0.4, `rgba(255,220,60,${glow * 0.4})`);
            grad.addColorStop(1,   'rgba(255,255,80,0)');
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
          }
          break;
        }
      }
    }

    ctx.restore();

    // Lightning flash on top
    if (this._flash > 0) {
      ctx.fillStyle = `rgba(220,230,255,${this._flash * 0.62})`;
      ctx.fillRect(0, 0, cw, ch);
    }
  }

  _drawAurora(ctx, cw, ch) {
    const t = this._auroraT;
    ctx.save();
    const BANDS = [
      { r: 0,   g: 255, b: 140, baseY: ch * 0.07, amp: 30, freq: 1/145, speed: 0.22, phase: 0,   thick: ch * 0.055 },
      { r: 60,  g: 130, b: 255, baseY: ch * 0.12, amp: 20, freq: 1/100, speed: 0.38, phase: 2.1, thick: ch * 0.045 },
      { r: 180, g: 55,  b: 255, baseY: ch * 0.17, amp: 24, freq: 1/125, speed: 0.19, phase: 4.3, thick: ch * 0.04  },
    ];
    for (const b of BANDS) {
      ctx.globalAlpha = 0.21;
      ctx.fillStyle   = `rgb(${b.r},${b.g},${b.b})`;
      ctx.beginPath();
      // Bottom wavy edge
      for (let x = 0; x <= cw; x += 5) {
        const y = b.baseY
          + Math.sin(x * b.freq + t * b.speed + b.phase) * b.amp
          + Math.sin(x * b.freq * 1.8 + t * b.speed * 1.6 + b.phase * 0.6) * b.amp * 0.38;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      // Top wavy edge (reversed)
      for (let x = cw; x >= 0; x -= 5) {
        const y = b.baseY - b.thick
          + Math.sin(x * b.freq * 1.3 + t * b.speed * 0.75 + b.phase + 1) * b.amp * 0.45;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}
