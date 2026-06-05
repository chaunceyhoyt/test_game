export class HUD {
  constructor(inventory, gameTime, onOpenInventory, onOpenSettings) {
    this.inventory = inventory;
    this.gameTime  = gameTime;

    this.el = document.createElement('div');
    this.el.id = 'hud';
    this.el.innerHTML = `
      <div id="hud-top">
        <span class="hud-stat" id="hud-money">💰 <span>0</span></span>
        <span class="hud-stat" id="hud-fuel">⛽ <span>0</span></span>
        <span class="hud-spacer"></span>
        <span class="hud-stat" id="hud-time"></span>
        <span class="hud-stat" id="hud-season"></span>
      </div>
      <div id="hud-bottom">
        <button class="nav-btn" id="btn-settings" title="Settings">
          <div class="nav-btn-icon">⚙️</div>
        </button>
        <button class="nav-btn nav-btn-main" id="btn-bag" title="Tackle Box">
          <div class="nav-btn-icon">🧰</div>
        </button>
      </div>
    `;
    document.body.appendChild(this.el);

    document.getElementById('btn-bag').addEventListener('click', onOpenInventory);
    document.getElementById('btn-settings').addEventListener('click', onOpenSettings);
  }

  update() {
    document.querySelector('#hud-money span').textContent = `$${this.inventory.money}`;
    document.querySelector('#hud-fuel span').textContent =
      `${Math.ceil(this.inventory.fuel)}/${this.inventory.maxFuel}`;
    document.getElementById('hud-time').textContent = this.gameTime.displayTime;

    const seasonIcons = { spring: '🌸', summer: '☀️', fall: '🍂', winter: '❄️' };
    document.getElementById('hud-season').textContent = seasonIcons[this.gameTime.season] ?? '';
  }

  destroy() {
    this.el.remove();
  }
}
