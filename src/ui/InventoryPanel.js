const FUR_COLORS = [
  { label: 'Sandy',    value: '#FFCC80' },
  { label: 'Cream',    value: '#FFEECB' },
  { label: 'White',    value: '#F0F0EE' },
  { label: 'Silver',   value: '#BDBDBD' },
  { label: 'Orange',   value: '#FF8C00' },
  { label: 'Ginger',   value: '#C05C08' },
  { label: 'Brown',    value: '#8D5524' },
  { label: 'Midnight', value: '#2D2D2D' },
];

const SHIRT_COLORS = [
  { label: 'Blue',   value: '#1976D2' },
  { label: 'Red',    value: '#C62828' },
  { label: 'Forest', value: '#2E7D32' },
  { label: 'Purple', value: '#6A1B9A' },
  { label: 'Teal',   value: '#00695C' },
  { label: 'Ember',  value: '#E64A19' },
  { label: 'Rose',   value: '#C2185B' },
  { label: 'Gold',   value: '#F9A825' },
];

const PANTS_COLORS = [
  { label: 'Slate',   value: '#37474F' },
  { label: 'Navy',    value: '#1A237E' },
  { label: 'Walnut',  value: '#4E342E' },
  { label: 'Olive',   value: '#558B2F' },
  { label: 'Crimson', value: '#880E4F' },
  { label: 'Tan',     value: '#A1887F' },
  { label: 'Onyx',    value: '#212121' },
  { label: 'Ash',     value: '#616161' },
];

export class InventoryPanel {
  constructor(inventory, fishDb, appearance) {
    this.inventory  = inventory;
    this.fishDb     = fishDb;
    this.appearance = appearance;
    this.activeTab  = 'fish';
    this.isOpen     = false;

    this.el = document.createElement('div');
    this.el.id = 'inventory-panel';
    this.el.innerHTML = `
      <div class="panel-handle"></div>
      <div class="panel-tabs">
        <button class="tab-btn active" data-tab="fish">🐟 Fish</button>
        <button class="tab-btn" data-tab="equipment">🎣 Gear</button>
        <button class="tab-btn" data-tab="dex">📖 FishDex</button>
        <button class="tab-btn" data-tab="boat">⛵ Boat</button>
        <button class="tab-btn" data-tab="look">🐱 Look</button>
        <button class="tab-btn" data-tab="map">🗺️ Map</button>
      </div>
      <div id="panel-content" class="panel-content"></div>
    `;
    document.body.appendChild(this.el);

    this.el.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });

    let startY = 0;
    this.el.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
    this.el.addEventListener('touchend', e => {
      if (e.changedTouches[0].clientY - startY > 60) this.close();
    }, { passive: true });

    this.el.querySelector('.panel-handle').addEventListener('click', () => this.close());
  }

  open() {
    this.isOpen = true;
    this.el.classList.add('open');
    this._render();
  }

  close() {
    this.isOpen = false;
    this.el.classList.remove('open');
  }

  toggle() { this.isOpen ? this.close() : this.open(); }

  _switchTab(tab) {
    this.activeTab = tab;
    this.el.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    this._render();
  }

  _render() {
    const el = document.getElementById('panel-content');
    if (this.activeTab === 'fish')      el.innerHTML = this._renderFish();
    if (this.activeTab === 'equipment') el.innerHTML = this._renderEquipment();
    if (this.activeTab === 'dex')       el.innerHTML = this._renderDex();
    if (this.activeTab === 'boat')      el.innerHTML = this._renderBoat();
    if (this.activeTab === 'look')      el.innerHTML = this._renderLook();
    if (this.activeTab === 'map')       el.innerHTML = this._renderMap();

    // Equip pole
    el.querySelectorAll('.equip-btn[data-pole]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.inventory.equipPole(btn.dataset.pole);
        this._render();
      });
    });

    // Equip bait
    el.querySelectorAll('.equip-btn[data-bait]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.inventory.equipBait(btn.dataset.bait);
        this._render();
      });
    });

    // Equip motor
    el.querySelectorAll('.equip-btn[data-motor]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.inventory.equipMotor(btn.dataset.motor);
        this._render();
      });
    });

    // Unequip motor (paddle mode)
    el.querySelectorAll('[data-motor-unequip]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.inventory.unequipMotor();
        this._render();
      });
    });

    // Color swatches (handles boatColor, furColor, etc.)
    el.querySelectorAll('.swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        this.appearance?.set(btn.dataset.key, btn.dataset.value);
        this._render();
        requestAnimationFrame(() => this._drawPreview());
      });
    });

    if (this.activeTab === 'look') {
      requestAnimationFrame(() => this._drawPreview());
    }
  }

  // ── Character preview canvas ────────────────────────────────────────────────

  _drawPreview() {
    const canvas = document.getElementById('char-preview');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const fur   = this.appearance?.furColor   ?? '#FFCC80';
    const shirt = this.appearance?.shirtColor ?? '#1976D2';
    const pants = this.appearance?.pantsColor ?? '#37474F';

    // Draw at 3× scale so the character fills the preview nicely
    const S = 3;
    ctx.save();
    ctx.scale(S, S);
    const x = cw / (2 * S);       // ≈ 33  (canvas center in scaled coords)
    const y = (ch * 0.62) / S;    // ≈ 36  (anchor point for character)

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(x, y + 14, 10, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Tail
    ctx.strokeStyle = fur; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 5, y + 5); ctx.quadraticCurveTo(x - 20, y - 2, x - 18, y - 12); ctx.stroke();
    ctx.lineCap = 'butt';

    // Legs
    ctx.fillStyle = pants;
    ctx.fillRect(Math.round(x) - 6, Math.round(y) + 6, 5, 8);
    ctx.fillRect(Math.round(x) + 1, Math.round(y) + 6, 5, 8);

    // Shirt
    ctx.fillStyle = shirt;
    ctx.fillRect(Math.round(x) - 7, Math.round(y) - 3, 14, 10);

    // Ears
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.moveTo(x - 7, y - 13); ctx.lineTo(x - 4, y - 22); ctx.lineTo(x - 1, y - 13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 1, y - 13); ctx.lineTo(x + 4, y - 22); ctx.lineTo(x + 7, y - 13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FF8FAB';
    ctx.beginPath(); ctx.moveTo(x - 6, y - 14); ctx.lineTo(x - 4, y - 20); ctx.lineTo(x - 2, y - 14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 2, y - 14); ctx.lineTo(x + 4, y - 20); ctx.lineTo(x + 6, y - 14); ctx.closePath(); ctx.fill();

    // Head
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.arc(x, y - 9, 8, 0, Math.PI * 2); ctx.fill();

    // Eyes
    ctx.fillStyle = '#2d2d2d';
    ctx.beginPath(); ctx.ellipse(x - 3, y - 11, 2, 1.5, -0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 3, y - 11, 2, 1.5,  0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(x - 2.2, y - 11.5, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 3.8, y - 11.5, 0.8, 0, Math.PI * 2); ctx.fill();

    // Nose + whiskers
    ctx.fillStyle = '#FF8FAB';
    ctx.beginPath(); ctx.arc(x, y - 7.5, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(80,40,0,0.35)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(x - 5 - i * 1.8, y - 7.5, 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 5 + i * 1.8, y - 7.5, 0.8, 0, Math.PI * 2); ctx.fill();
    }

    // Rod
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 6, y - 2); ctx.lineTo(x + 18, y - 18); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,200,255,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 18, y - 18); ctx.lineTo(x + 22, y - 10); ctx.stroke();
    ctx.lineCap = 'butt';

    ctx.restore();
  }

  // ── Render tabs ─────────────────────────────────────────────────────────────

  _rarityColor(r) {
    return { common:'#9E9E9E', uncommon:'#4CAF50', rare:'#2196F3', epic:'#9C27B0', legendary:'#FF9800' }[r] ?? '#9E9E9E';
  }

  _fishIcon(fish, caught) {
    const c = document.createElement('canvas');
    c.width = 48; c.height = 48;
    const ctx = c.getContext('2d');
    const color = caught ? fish.color : '#444';
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(20, 24, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(32, 24); ctx.lineTo(44, 14); ctx.lineTo(44, 34); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(14, 14); ctx.lineTo(22, 6); ctx.lineTo(28, 14); ctx.closePath(); ctx.fill();
    if (caught) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(11, 22, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(11, 22, 2, 0, Math.PI * 2); ctx.fill();
    }
    return c.toDataURL();
  }

  _renderFish() {
    const { caughtFish } = this.inventory;
    if (!caughtFish.length) {
      return `<div class="empty-msg">No fish yet!<br><span>Go catch some 🎣</span></div>`;
    }
    const totalValue = caughtFish.reduce((s, f) => s + f.value, 0);
    let html = `<div class="fish-summary">
      ${caughtFish.length} fish &nbsp;·&nbsp; Bag value: <strong>$${totalValue}</strong>
      <span style="font-size:11px;color:var(--text-dim);margin-left:auto">Sell at Shop</span>
    </div>`;

    caughtFish.forEach((entry) => {
      const fish    = this.fishDb.getById(entry.fishId);
      const rc      = this._rarityColor(fish?.rarity ?? 'common');
      const icon    = fish ? this._fishIcon(fish, true) : '';
      const stars   = entry.stars ?? 0;
      const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      html += `
        <div class="fish-card">
          <img src="${icon}" class="fish-icon-img" alt="${entry.name}">
          <div class="fish-info">
            <div class="fish-name">${entry.name}</div>
            <div class="fish-detail">${entry.weight} lbs &nbsp;·&nbsp;
              <span style="color:${rc}">${fish?.rarity ?? ''}</span>
            </div>
          </div>
          <div class="fish-value">
            <div class="fish-coins" style="color:#C07020;letter-spacing:1px">${starStr}</div>
            <div class="fish-coins">💰 $${entry.value}</div>
          </div>
        </div>`;
    });
    return html;
  }

  _renderEquipment() {
    const poles      = this.inventory.poles.filter(p => p.owned);
    const baits      = this.inventory.baits;
    const equippedId = this.inventory.equippedPoleId;
    let html = `<div class="equip-section"><div class="equip-header">🎣 Fishing Poles</div>`;
    if (!poles.length) {
      html += `<div class="empty-msg" style="padding:16px 0;font-size:13px">No poles owned — visit the Shop!</div>`;
    }
    for (const p of poles) {
      const isEquipped = p.id === equippedId;
      html += `<div class="equip-card">
        <span class="equip-icon">🎣</span>
        <div class="equip-info">
          <div class="equip-name">${p.name}</div>
          <div class="equip-stat">Power: ${p.power} · ${p.action}</div>
        </div>
        <div class="equip-actions">
          ${isEquipped
            ? `<span class="equip-badge">Equipped</span>`
            : `<button class="equip-btn" data-pole="${p.id}">Equip</button>`
          }
        </div>
      </div>`;
    }
    const equippedBaitId = this.inventory.equippedBaitId;
    html += `</div><div class="equip-section"><div class="equip-header">🪱 Bait</div>`;
    for (const b of baits) {
      const isEquipped = b.id === equippedBaitId;
      const baitIcon   = b.type === 'lure' ? '🎣' : '🪱';
      const statLabel  = b.type === 'lure' ? `Durability: ${b.health}` : `x${b.count}`;
      const isEmpty    = b.type === 'lure' ? b.health <= 0 : b.count <= 0;
      html += `<div class="equip-card${isEmpty ? ' equip-empty' : ''}">
        <span class="equip-icon">${baitIcon}</span>
        <div class="equip-info">
          <div class="equip-name">${b.name}</div>
          <div class="equip-stat">${statLabel}${isEmpty ? ' — <span style="color:#ef5350">Empty</span>' : ''}</div>
        </div>
        <div class="equip-actions">
          ${isEquipped
            ? `<span class="equip-badge">Equipped</span>`
            : `<button class="equip-btn${isEmpty ? ' equip-btn-disabled' : ''}" data-bait="${b.id}" ${isEmpty ? 'disabled' : ''}>Equip</button>`
          }
        </div>
      </div>`;
    }
    html += `</div>`;
    return html;
  }

  _renderDex() {
    const allFish = this.fishDb.getAll();
    const caught  = allFish.filter(f =>  this.inventory.hasCaught(f.id));

    let html = `<div class="dex-summary">
      <span class="dex-count">${caught.length} / ${allFish.length}</span>
      <div class="dex-progress-bar">
        <div class="dex-progress-fill" style="width:${(caught.length/allFish.length*100).toFixed(0)}%"></div>
      </div>
    </div>`;

    html += `<div class="dex-grid">`;
    for (const fish of allFish) {
      const isCaught = this.inventory.hasCaught(fish.id);
      const rc = isCaught ? this._rarityColor(fish.rarity) : '#444';
      const icon = this._fishIcon(fish, isCaught);
      const count = this.inventory.catchCount(fish.id);
      const best  = this.inventory.bestWeight(fish.id);
      html += `
        <div class="dex-card ${isCaught ? 'caught' : 'uncaught'}">
          <img src="${icon}" class="dex-fish-img" alt="">
          <div class="dex-fish-name" style="color:${rc}">${isCaught ? fish.name : '???'}</div>
          ${isCaught
            ? `<div class="dex-fish-stat">x${count} · ${best} lbs best</div>`
            : `<div class="dex-fish-stat">Not caught</div>`}
          ${isCaught ? `<div class="rarity-badge" style="background:${rc}20;color:${rc}">${fish.rarity}</div>` : ''}
        </div>`;
    }
    html += `</div>`;
    return html;
  }

  _renderLook() {
    const a = this.appearance;
    if (!a) return `<div class="empty-msg">Customization unavailable</div>`;

    const swatchRow = (key, colors, current) =>
      `<div class="swatch-row">${colors.map(c => {
        const sel = c.value.toLowerCase() === (current ?? '').toLowerCase();
        return `<button class="swatch${sel ? ' swatch-selected' : ''}"
          style="background:${c.value}"
          data-key="${key}" data-value="${c.value}"
          title="${c.label}"></button>`;
      }).join('')}</div>`;

    return `
      <div class="char-preview-wrap">
        <canvas id="char-preview" width="200" height="175" class="char-preview-canvas"></canvas>
      </div>
      <div class="char-section">
        <div class="char-label">🐱 Fur</div>
        ${swatchRow('furColor', FUR_COLORS, a.furColor)}
      </div>
      <div class="char-section">
        <div class="char-label">👕 Shirt</div>
        ${swatchRow('shirtColor', SHIRT_COLORS, a.shirtColor)}
      </div>
      <div class="char-section">
        <div class="char-label">👖 Pants</div>
        ${swatchRow('pantsColor', PANTS_COLORS, a.pantsColor)}
      </div>
      <div class="char-hint">More options coming — accessories &amp; hats soon!</div>
    `;
  }

  _renderBoat() {
    const a = this.appearance;
    const motors         = this.inventory.motors ?? [];
    const equippedMotorId = this.inventory.equippedMotorId;
    const isPaddling     = equippedMotorId == null;

    const boatColors = [
      { label: 'Oak',      value: '#8B6340' },
      { label: 'Mahogany', value: '#5C2E00' },
      { label: 'Teak',     value: '#C4863C' },
      { label: 'Ebony',    value: '#2D1A0A' },
      { label: 'Navy',     value: '#1A3A6B' },
      { label: 'Forest',   value: '#2E5A2E' },
      { label: 'Crimson',  value: '#8B1A1A' },
      { label: 'White',    value: '#F0EEE8' },
    ];

    const swatchRow = (key, colors, current) =>
      `<div class="swatch-row">${colors.map(c => {
        const sel = c.value.toLowerCase() === (current ?? '').toLowerCase();
        return `<button class="swatch${sel ? ' swatch-selected' : ''}"
          style="background:${c.value}"
          data-key="${key}" data-value="${c.value}"
          title="${c.label}"></button>`;
      }).join('')}</div>`;

    let html = `
      <div class="char-section">
        <div class="char-label">🎨 Hull Color</div>
        ${swatchRow('boatColor', boatColors, a?.boatColor)}
      </div>
      <div class="equip-section">
        <div class="equip-header">⚙️ Motor</div>
        <div class="equip-card">
          <span class="equip-icon">🚣</span>
          <div class="equip-info">
            <div class="equip-name">None (Paddle)</div>
            <div class="equip-stat">Very slow &nbsp;·&nbsp; No fuel use</div>
          </div>
          <div class="equip-actions">
            ${isPaddling
              ? `<span class="equip-badge">Active</span>`
              : `<button class="equip-btn" data-motor-unequip="1">Select</button>`}
          </div>
        </div>`;

    const ownedMotors = motors.filter(m => m.owned);
    for (const m of ownedMotors) {
      const isEquipped = m.id === equippedMotorId;
      html += `<div class="equip-card">
        <span class="equip-icon">⚙️</span>
        <div class="equip-info">
          <div class="equip-name">${m.name}</div>
          <div class="equip-stat">Speed: ${m.speed} px/s &nbsp;·&nbsp; Uses fuel</div>
        </div>
        <div class="equip-actions">
          ${isEquipped
            ? `<span class="equip-badge">Equipped</span>`
            : `<button class="equip-btn" data-motor="${m.id}">Equip</button>`}
        </div>
      </div>`;
    }

    if (!ownedMotors.length) {
      html += `<div style="font-size:12px;color:var(--text-dim);padding:8px 4px;font-style:italic">
        No motors owned — buy one at the Shop!
      </div>`;
    }

    html += `</div>`;
    return html;
  }

  _renderMap() {
    return `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center;
                  gap:12px; padding:32px 20px; color:var(--text-dim); text-align:center;">
        <div style="font-size:48px;">🗺️</div>
        <div style="font-size:1rem; font-weight:700; color:var(--text-main);">Map</div>
        <div style="font-size:0.85rem; font-style:italic;">Coming soon — full world map with fishing spots, boat location, and points of interest.</div>
      </div>
    `;
  }

  destroy() { this.el.remove(); }
}

