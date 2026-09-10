// Felt-cutout style cat sprite sheet.
// Pre-renders 4 directions × 3 walk frames to an offscreen canvas.
// Each logical frame is FRAME_W × FRAME_H pixels (scaled 2× internally for sharpness).

export const FRAME_W = 38;
export const FRAME_H = 56;

const SCALE = 2; // internal render scale
const FW = FRAME_W * SCALE;
const FH = FRAME_H * SCALE;

const DIRS = ['down', 'left', 'right', 'up'];
const WALK_FRAMES = 3;

export class PlayerSprite {
  constructor(colors = {}) {
    this.fur   = colors.fur   ?? '#FFCC80';
    this.shirt = colors.shirt ?? '#E05C3A';
    this.pants = colors.pants ?? '#4A6741';

    this._canvas = document.createElement('canvas');
    this._canvas.width  = FW * WALK_FRAMES;
    this._canvas.height = FH * DIRS.length;
    this._ctx = this._canvas.getContext('2d');

    this._render();
  }

  _render() {
    DIRS.forEach((dir, row) => {
      for (let frame = 0; frame < WALK_FRAMES; frame++) {
        this._ctx.save();
        this._ctx.translate(frame * FW, row * FH);
        this._drawFrame(dir, frame);
        this._ctx.restore();
      }
    });
  }

  _drawFrame(dir, frame) {
    const ctx = this._ctx;
    const cx  = FW / 2;
    const cy  = FH / 2 + 4;

    // Walk offsets: frames 0,2 step left/right, frame 1 neutral
    const stepX = frame === 1 ? 0 : (frame === 0 ? -1 : 1);
    const stepY = frame === 1 ? 0 : 1; // slight crouch on stride

    this._drawShadow(ctx, cx, cy + 14 + stepY * SCALE);

    if (dir === 'up') {
      this._drawBack(ctx, cx, cy, frame, stepX, stepY);
    } else {
      this._drawFront(ctx, cx, cy, frame, stepX, stepY, dir);
    }
  }

  _stroke(ctx) {
    ctx.strokeStyle = 'rgba(30,12,0,0.7)';
    ctx.lineWidth   = SCALE * 1.2;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    ctx.stroke();
  }

  _drawShadow(ctx, x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y, 10 * SCALE, 3.5 * SCALE, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawFront(ctx, cx, cy, frame, stepX, stepY, dir) {
    const fur   = this.fur;
    const shirt = this.shirt;
    const pants = this.pants;
    const lx    = dir === 'right' ? 1 : -1; // lateral flip for side views

    const px = cx;
    const py = cy - stepY * SCALE;

    // Tail (behind body)
    if (dir === 'down' || dir === 'left') {
      ctx.strokeStyle = fur;
      ctx.lineWidth   = 3 * SCALE;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(px - 5 * SCALE, py + 5 * SCALE);
      ctx.quadraticCurveTo(px - 14 * SCALE, py - 2 * SCALE, px - 12 * SCALE, py - 10 * SCALE);
      ctx.stroke();
    }
    if (dir === 'right') {
      ctx.strokeStyle = fur;
      ctx.lineWidth   = 3 * SCALE;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(px + 5 * SCALE, py + 5 * SCALE);
      ctx.quadraticCurveTo(px + 14 * SCALE, py - 2 * SCALE, px + 12 * SCALE, py - 10 * SCALE);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';

    // Legs
    const legSpread = Math.abs(stepX) * 2 * SCALE;
    if (dir === 'down') {
      ctx.fillStyle = pants;
      ctx.beginPath();
      ctx.roundRect(px - 6 * SCALE - legSpread, py + 7 * SCALE, 5 * SCALE, 9 * SCALE, 2 * SCALE);
      ctx.fill(); this._stroke(ctx);
      ctx.beginPath();
      ctx.roundRect(px + 1 * SCALE + legSpread, py + 7 * SCALE, 5 * SCALE, 9 * SCALE, 2 * SCALE);
      ctx.fill(); this._stroke(ctx);
    } else {
      // Side view: one visible leg
      const legOff = stepX * 2 * SCALE;
      ctx.fillStyle = pants;
      ctx.beginPath();
      ctx.roundRect(px - 2 * SCALE, py + 8 * SCALE, 5 * SCALE, 8 * SCALE, 2 * SCALE);
      ctx.fill(); this._stroke(ctx);
      ctx.fillStyle = pants;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.roundRect(px - 2 * SCALE + legOff, py + 6 * SCALE, 5 * SCALE, 8 * SCALE, 2 * SCALE);
      ctx.fill(); this._stroke(ctx);
      ctx.globalAlpha = 1;
    }

    // Body / shirt
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.roundRect(px - 7 * SCALE, py - 2 * SCALE, 14 * SCALE, 10 * SCALE, 3 * SCALE);
    ctx.fill(); this._stroke(ctx);

    // Ears (behind head)
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.moveTo(px - 7 * SCALE, py - 13 * SCALE);
    ctx.lineTo(px - 4 * SCALE, py - 20 * SCALE);
    ctx.lineTo(px - 1 * SCALE, py - 13 * SCALE);
    ctx.closePath();
    ctx.fill(); this._stroke(ctx);

    if (dir === 'down') {
      ctx.beginPath();
      ctx.moveTo(px + 1 * SCALE, py - 13 * SCALE);
      ctx.lineTo(px + 4 * SCALE, py - 20 * SCALE);
      ctx.lineTo(px + 7 * SCALE, py - 13 * SCALE);
      ctx.closePath();
      ctx.fill(); this._stroke(ctx);
    }

    // Inner ear
    ctx.fillStyle = '#FF8FAB';
    ctx.beginPath();
    ctx.moveTo(px - 6 * SCALE, py - 14 * SCALE);
    ctx.lineTo(px - 4 * SCALE, py - 19 * SCALE);
    ctx.lineTo(px - 2 * SCALE, py - 14 * SCALE);
    ctx.closePath(); ctx.fill();

    if (dir === 'down') {
      ctx.beginPath();
      ctx.moveTo(px + 2 * SCALE, py - 14 * SCALE);
      ctx.lineTo(px + 4 * SCALE, py - 19 * SCALE);
      ctx.lineTo(px + 6 * SCALE, py - 14 * SCALE);
      ctx.closePath(); ctx.fill();
    }

    // Head
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.arc(px, py - 9 * SCALE, 8.5 * SCALE, 0, Math.PI * 2);
    ctx.fill(); this._stroke(ctx);

    // Straw hat brim
    ctx.fillStyle = '#D4A837';
    ctx.beginPath();
    ctx.ellipse(px, py - 16 * SCALE, 12 * SCALE, 3 * SCALE, 0, 0, Math.PI * 2);
    ctx.fill(); this._stroke(ctx);

    // Straw hat crown
    ctx.fillStyle = '#E8C247';
    ctx.beginPath();
    ctx.roundRect(px - 7 * SCALE, py - 24 * SCALE, 14 * SCALE, 9 * SCALE, 3 * SCALE);
    ctx.fill(); this._stroke(ctx);

    // Hat band
    ctx.fillStyle = '#8B5E2A';
    ctx.fillRect(px - 7 * SCALE, py - 17 * SCALE, 14 * SCALE, 2 * SCALE);

    // Hat highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(px - 5 * SCALE, py - 23 * SCALE, 6 * SCALE, 2 * SCALE);

    if (dir === 'down') {
      // Eyes
      ctx.fillStyle = '#2d2d2d';
      ctx.beginPath(); ctx.ellipse(px - 3 * SCALE, py - 10 * SCALE, 2 * SCALE, 1.8 * SCALE, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(px + 3 * SCALE, py - 10 * SCALE, 2 * SCALE, 1.8 * SCALE,  0.2, 0, Math.PI * 2); ctx.fill();
      // Eye shine
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(px - 2 * SCALE, py - 10.5 * SCALE, 0.9 * SCALE, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + 4 * SCALE, py - 10.5 * SCALE, 0.9 * SCALE, 0, Math.PI * 2); ctx.fill();
      // Nose
      ctx.fillStyle = '#FF8FAB';
      ctx.beginPath(); ctx.arc(px, py - 7 * SCALE, 1.3 * SCALE, 0, Math.PI * 2); ctx.fill();
      // Whisker dots
      ctx.fillStyle = 'rgba(80,40,0,0.3)';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(px - 5 * SCALE - i * 1.5 * SCALE, py - 7 * SCALE, 0.7 * SCALE, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 5 * SCALE + i * 1.5 * SCALE, py - 7 * SCALE, 0.7 * SCALE, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // Side eye
      const ex = dir === 'right' ? px + 3 * SCALE : px - 3 * SCALE;
      ctx.fillStyle = '#2d2d2d';
      ctx.beginPath(); ctx.ellipse(ex, py - 10 * SCALE, 1.8 * SCALE, 1.5 * SCALE, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(ex + 0.8 * SCALE, py - 10.5 * SCALE, 0.7 * SCALE, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FF8FAB';
      ctx.beginPath(); ctx.arc(ex, py - 7 * SCALE, 1 * SCALE, 0, Math.PI * 2); ctx.fill();
    }

    // Fishing rod
    const rodDirX = dir === 'left' ? -1 : 1;
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth   = 2 * SCALE;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(px + rodDirX * 6 * SCALE, py - 2 * SCALE);
    ctx.lineTo(px + rodDirX * 18 * SCALE, py - 18 * SCALE);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200,200,255,0.5)';
    ctx.lineWidth = 1 * SCALE;
    ctx.beginPath();
    ctx.moveTo(px + rodDirX * 18 * SCALE, py - 18 * SCALE);
    ctx.lineTo(px + rodDirX * 22 * SCALE, py - 10 * SCALE);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  _drawBack(ctx, cx, cy, frame, stepX, stepY) {
    const fur   = this.fur;
    const shirt = this.shirt;
    const pants = this.pants;
    const px = cx, py = cy - stepY * SCALE;

    // Tail
    ctx.strokeStyle = fur;
    ctx.lineWidth   = 3 * SCALE;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(px + 5 * SCALE, py + 5 * SCALE);
    ctx.quadraticCurveTo(px + 14 * SCALE, py - 4 * SCALE, px + 12 * SCALE, py - 12 * SCALE);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Legs
    const legSpread = Math.abs(stepX) * 2 * SCALE;
    ctx.fillStyle = pants;
    ctx.beginPath();
    ctx.roundRect(px - 6 * SCALE - legSpread, py + 7 * SCALE, 5 * SCALE, 9 * SCALE, 2 * SCALE);
    ctx.fill(); this._stroke(ctx);
    ctx.beginPath();
    ctx.roundRect(px + 1 * SCALE + legSpread, py + 7 * SCALE, 5 * SCALE, 9 * SCALE, 2 * SCALE);
    ctx.fill(); this._stroke(ctx);

    // Body
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.roundRect(px - 7 * SCALE, py - 2 * SCALE, 14 * SCALE, 10 * SCALE, 3 * SCALE);
    ctx.fill(); this._stroke(ctx);

    // Ears
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.moveTo(px - 7 * SCALE, py - 13 * SCALE); ctx.lineTo(px - 4 * SCALE, py - 20 * SCALE); ctx.lineTo(px - 1 * SCALE, py - 13 * SCALE); ctx.closePath();
    ctx.fill(); this._stroke(ctx);
    ctx.beginPath(); ctx.moveTo(px + 1 * SCALE, py - 13 * SCALE); ctx.lineTo(px + 4 * SCALE, py - 20 * SCALE); ctx.lineTo(px + 7 * SCALE, py - 13 * SCALE); ctx.closePath();
    ctx.fill(); this._stroke(ctx);

    // Head (back)
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.arc(px, py - 9 * SCALE, 8.5 * SCALE, 0, Math.PI * 2);
    ctx.fill(); this._stroke(ctx);

    // Straw hat brim
    ctx.fillStyle = '#D4A837';
    ctx.beginPath();
    ctx.ellipse(px, py - 16 * SCALE, 12 * SCALE, 3 * SCALE, 0, 0, Math.PI * 2);
    ctx.fill(); this._stroke(ctx);

    // Crown
    ctx.fillStyle = '#E8C247';
    ctx.beginPath();
    ctx.roundRect(px - 7 * SCALE, py - 24 * SCALE, 14 * SCALE, 9 * SCALE, 3 * SCALE);
    ctx.fill(); this._stroke(ctx);

    ctx.fillStyle = '#8B5E2A';
    ctx.fillRect(px - 7 * SCALE, py - 17 * SCALE, 14 * SCALE, 2 * SCALE);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(px - 5 * SCALE, py - 23 * SCALE, 6 * SCALE, 2 * SCALE);

    // Fishing rod pointing up-left
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth   = 2 * SCALE;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(px - 6 * SCALE, py - 2 * SCALE);
    ctx.lineTo(px - 18 * SCALE, py - 20 * SCALE);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  /** Draw the sprite to a canvas context at world position (x, y). */
  draw(ctx, x, y, dir = 'down', frame = 0) {
    const row  = DIRS.indexOf(dir);
    const col  = Math.max(0, Math.min(WALK_FRAMES - 1, frame));
    const sx   = col * FW;
    const sy   = row >= 0 ? row * FH : 0;
    ctx.drawImage(
      this._canvas,
      sx, sy, FW, FH,
      Math.round(x - FRAME_W / 2), Math.round(y - FRAME_H + 14),
      FRAME_W, FRAME_H
    );
  }
}
