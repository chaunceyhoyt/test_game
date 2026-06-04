export class DialogPanel {
  constructor() {
    this._visible   = false;
    this._lines     = [];
    this._lineIdx   = 0;
    this._charIdx   = 0;
    this._charTimer = 0;
    this._charSpeed = 0.038; // seconds per character
    this._choices   = [];
    this._onDone    = null;

    this._backdrop = document.createElement('div');
    this._backdrop.id = 'dialog-backdrop';
    document.body.appendChild(this._backdrop);

    this._el = document.createElement('div');
    this._el.id = 'dialog-panel';
    document.body.appendChild(this._el);

    this._el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.dialog-choice-btn')) return;
      e.stopPropagation();
      this._advance();
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  show({ portrait = '🧑', name = 'NPC', lines = [], choices = [], onDone = null } = {}) {
    this._portrait  = portrait;
    this._name      = name;
    this._lines     = lines;
    this._choices   = choices;
    this._onDone    = onDone;
    this._lineIdx   = 0;
    this._charIdx   = 0;
    this._charTimer = 0;
    this._visible   = true;

    this._backdrop.classList.add('open');
    this._el.classList.add('open');
    this._render();
  }

  hide() {
    this._visible = false;
    this._backdrop.classList.remove('open');
    this._el.classList.remove('open');
    const cb = this._onDone;
    this._onDone = null;
    cb?.();
  }

  get isVisible() { return this._visible; }

  update(dt) {
    if (!this._visible) return;
    const line = this._lines[this._lineIdx] ?? '';
    if (this._charIdx < line.length) {
      this._charTimer += dt;
      const add = Math.floor(this._charTimer / this._charSpeed);
      if (add > 0) {
        this._charTimer -= add * this._charSpeed;
        this._charIdx = Math.min(this._charIdx + add, line.length);
        this._updateText();
      }
    }
  }

  destroy() {
    this._backdrop.remove();
    this._el.remove();
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _advance() {
    const line = this._lines[this._lineIdx] ?? '';
    if (this._charIdx < line.length) {
      this._charIdx = line.length;
      this._updateText();
    } else {
      this._lineIdx++;
      if (this._lineIdx >= this._lines.length) {
        if (this._choices.length > 0) {
          this._showChoices();
        } else {
          this.hide();
        }
      } else {
        this._charIdx   = 0;
        this._charTimer = 0;
        this._updateText();
      }
    }
  }

  _render() {
    this._el.innerHTML = `
      <div id="dialog-portrait-box">
        <div id="dialog-portrait">${this._portrait}</div>
        <div id="dialog-name">${this._name}</div>
      </div>
      <div id="dialog-text-box">
        <div id="dialog-text"></div>
        <div id="dialog-tap-hint">TAP TO CONTINUE ▸</div>
      </div>
    `;
    this._updateText();
  }

  _updateText() {
    const textEl = this._el.querySelector('#dialog-text');
    if (!textEl) return;
    const line      = this._lines[this._lineIdx] ?? '';
    const shown     = line.slice(0, this._charIdx);
    const done      = this._charIdx >= line.length;
    textEl.textContent = shown + (done ? '' : '▌');
    const hint = this._el.querySelector('#dialog-tap-hint');
    if (hint) hint.style.visibility = done ? 'visible' : 'hidden';
  }

  _showChoices() {
    const textBox = this._el.querySelector('#dialog-text-box');
    if (!textBox) return;
    const btns = this._choices.map((c, i) =>
      `<button class="dialog-choice-btn" data-idx="${i}">${c.label}</button>`
    ).join('');
    textBox.innerHTML = `<div id="dialog-choices">${btns}</div>`;
    textBox.querySelectorAll('.dialog-choice-btn').forEach(btn => {
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const choice = this._choices[+btn.dataset.idx];
        this.hide();
        choice?.cb?.();
      });
    });
  }
}
