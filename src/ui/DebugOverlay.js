export class DebugOverlay {
  constructor(gameTime, weatherSystem) {
    this.gameTime      = gameTime;
    this._weatherSystem = weatherSystem;

    this.el = document.createElement('div');
    this.el.id = 'debug-overlay';
    this.el.innerHTML = `
      <div class="debug-title">🐛 DEBUG</div>
      <div class="debug-section">
        <div class="debug-label">TIME OF DAY</div>
        <div class="debug-btns">
          <button data-tod="morning">🌅 Morning</button>
          <button data-tod="afternoon">☀️ Noon</button>
          <button data-tod="evening">🌇 Evening</button>
          <button data-tod="night">🌙 Night</button>
        </div>
      </div>
      <div class="debug-section">
        <div class="debug-label">SEASON</div>
        <div class="debug-btns">
          <button data-season="spring">🌸 Spring</button>
          <button data-season="summer">☀️ Summer</button>
          <button data-season="fall">🍂 Fall</button>
          <button data-season="winter">❄️ Winter</button>
        </div>
      </div>
      <div class="debug-section">
        <div class="debug-label">TIME SPEED</div>
        <div class="debug-btns">
          <button data-speed="0">⏸</button>
          <button data-speed="60">1×</button>
          <button data-speed="300">5×</button>
          <button data-speed="3600">60×</button>
        </div>
      </div>
      <div class="debug-section">
        <div class="debug-label">WEATHER</div>
        <div class="debug-btns">
          <button data-weather="auto">🔄 Auto</button>
          <button data-weather="clear">☀️ Clear</button>
          <button data-weather="snow">❄️ Snow</button>
          <button data-weather="blizzard">🌨 Blizzard</button>
          <button data-weather="rain">🌧 Rain</button>
          <button data-weather="thunderstorm">⛈ Storm</button>
          <button data-weather="petals">🌸 Petals</button>
          <button data-weather="leaves">🍂 Leaves</button>
          <button data-weather="fog">🌫 Fog</button>
          <button data-weather="fireflies">✨ Flies</button>
          <button data-weather="aurora">🌌 Aurora</button>
        </div>
      </div>
      <div class="debug-log" id="debug-log"></div>
    `;
    document.body.appendChild(this.el);

    this._todBtns     = this.el.querySelectorAll('[data-tod]');
    this._seasonBtns  = this.el.querySelectorAll('[data-season]');
    this._speedBtns   = this.el.querySelectorAll('[data-speed]');
    this._weatherBtns = this.el.querySelectorAll('[data-weather]');
    this._logEl       = this.el.querySelector('#debug-log');

    this._todBtns.forEach(btn => btn.addEventListener('click', () => {
      gameTime.setTimeOfDay(btn.dataset.tod);
      this.log(`Time → ${btn.dataset.tod}`);
    }));
    this._seasonBtns.forEach(btn => btn.addEventListener('click', () => {
      gameTime.setSeason(btn.dataset.season);
      this.log(`Season → ${btn.dataset.season}`);
    }));
    this._speedBtns.forEach(btn => btn.addEventListener('click', () => {
      gameTime.speed = +btn.dataset.speed;
      this.log(`Speed → ${btn.dataset.speed === '0' ? 'paused' : btn.dataset.speed + '/min'}`);
    }));
    this._weatherBtns.forEach(btn => btn.addEventListener('click', () => {
      weatherSystem?.setOverride(btn.dataset.weather);
      this.log(`Weather → ${btn.dataset.weather}`);
    }));

    this.hide();
  }

  update(gt) {
    const tod    = gt.timeOfDay;
    const season = gt.season;
    const speed  = gt.speed;
    this._todBtns.forEach(b    => b.classList.toggle('dbg-active', b.dataset.tod    === tod));
    this._seasonBtns.forEach(b => b.classList.toggle('dbg-active', b.dataset.season === season));
    this._speedBtns.forEach(b  => b.classList.toggle('dbg-active', +b.dataset.speed  === speed));

    if (this._weatherSystem) {
      const active = this._weatherSystem._override ?? 'auto';
      this._weatherBtns.forEach(b => b.classList.toggle('dbg-active', b.dataset.weather === active));
    }
  }

  log(msg) {
    const now  = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    const line = document.createElement('div');
    line.textContent = `[${time}] ${msg}`;
    this._logEl.appendChild(line);
    while (this._logEl.children.length > 60) this._logEl.removeChild(this._logEl.firstChild);
    this._logEl.scrollTop = this._logEl.scrollHeight;
  }

  show() { this.el.style.display = 'block'; }
  hide() { this.el.style.display = 'none'; }

  destroy() { this.el.remove(); }
}
