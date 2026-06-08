import {
  WORLD_W, WORLD_H, LAND_Y,
  ZONES, FISHING_SPOTS, DOCKS, BUILDINGS,
} from '../systems/WorldMap.js';

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

const BOAT_COLORS = [
  { label: 'Oak',      value: '#8B6340' },
  { label: 'Mahogany', value: '#5C2E00' },
  { label: 'Teak',     value: '#C4863C' },
  { label: 'Ebony',    value: '#2D1A0A' },
  { label: 'Navy',     value: '#1A3A6B' },
  { label: 'Forest',   value: '#2E5A2E' },
  { label: 'Crimson',  value: '#8B1A1A' },
  { label: 'White',    value: '#F0EEE8' },
];

export class InventoryPanel {
  constructor(inventory, fishDb, appearance, dailyChallenges) {
    this.inventory       = inventory;
    this.fishDb          = fishDb;
    this.appearance      = appearance;
    this.dailyChallenges = dailyChallenges;
    this.activeTab       = 'inventory';
    this.activeSubTab    = 'fish';
    this.isOpen          = false;
    this._worldRef       = null;
    this._fishSort       = { by: 'id', dir: 'asc' };
    this._dexSort        = { by: 'id', dir: 'asc' };

    this.el = document.createElement('div');
    this.el.id = 'inventory-panel';
    this.el.innerHTML = `
      <div class="panel-handle"></div>
      <div class="panel-tabs">
        <button class="tab-btn" data-tab="map">🗺️ Map</button>
        <button class="tab-btn active" data-tab="inventory">🎒 Inventory</button>
        <button class="tab-btn" data-tab="fishdex">📖 FishDex</button>
        <button class="tab-btn" data-tab="goals">📋 Goals</button>
        <button class="tab-btn" data-tab="style">🎨 Style</button>
      </div>
      <div id="panel-subtabs" class="panel-subtabs">
        <button class="subtab-btn active" data-subtab="fish">🐟 Fish</button>
        <button class="subtab-btn" data-subtab="gear">🎣 Gear</button>
      </div>
      <div id="panel-content" class="panel-content"></div>
    `;
    document.body.appendChild(this.el);

    this.el.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });

    this.el.querySelectorAll('.subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => this._switchSubTab(btn.dataset.subtab));
    });

    let startY = 0, swipeFromHandle = false;
    this.el.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY;
      const content = document.getElementById('panel-content');
      swipeFromHandle = !content?.contains(e.target);
    }, { passive: true });
    this.el.addEventListener('touchend', e => {
      if (swipeFromHandle && e.changedTouches[0].clientY - startY > 60) this.close();
    }, { passive: true });

    this.el.querySelector('.panel-handle').addEventListener('click', () => this.close());
  }

  setWorldRef(fn) { this._worldRef = fn; }

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
    if (tab !== 'inventory') {
      this.activeSubTab = 'fish';
      this.el.querySelectorAll('.subtab-btn').forEach(b => b.classList.toggle('active', b.dataset.subtab === 'fish'));
    }
    this.el.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    this._render();
  }

  _switchSubTab(subtab) {
    this.activeSubTab = subtab;
    this.el.querySelectorAll('.subtab-btn').forEach(b => b.classList.toggle('active', b.dataset.subtab === subtab));
    this._render();
  }

  _render() {
    const el = document.getElementById('panel-content');

    // Show subtabs only when on inventory tab
    const subtabsEl = document.getElementById('panel-subtabs');
    if (subtabsEl) {
      subtabsEl.style.display = this.activeTab === 'inventory' ? '' : 'none';
    }

    if (this.activeTab === 'map')                                         el.innerHTML = this._renderMap();
    if (this.activeTab === 'inventory' && this.activeSubTab === 'fish')   el.innerHTML = this._renderFish();
    if (this.activeTab === 'inventory' && this.activeSubTab === 'gear')   el.innerHTML = this._renderGear();
    if (this.activeTab === 'fishdex')                                     el.innerHTML = this._renderDex();
    if (this.activeTab === 'goals')                                       el.innerHTML = this._renderGoals();
    if (this.activeTab === 'style')                                       el.innerHTML = this._renderStyle();

    // Sort buttons (fish bag)
    el.querySelectorAll('.sort-btn[data-fish-sort]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.fishSort;
        if (this._fishSort.by === key) {
          this._fishSort.dir = this._fishSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          this._fishSort = { by: key, dir: key === 'weight' ? 'desc' : 'asc' };
        }
        this._render();
      });
    });

    // Sort buttons (fishdex)
    el.querySelectorAll('.sort-btn[data-dex-sort]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.dexSort;
        if (this._dexSort.by === key) {
          this._dexSort.dir = this._dexSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          this._dexSort = { by: key, dir: key === 'weight' ? 'desc' : 'asc' };
        }
        this._render();
      });
    });

    // Claim challenge rewards
    el.querySelectorAll('.ch-claim-btn[data-claim-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.dailyChallenges?.claimReward(parseInt(btn.dataset.claimIdx), this.inventory);
        this._render();
      });
    });
    el.querySelectorAll('.ch-claim-btn[data-claim-bonus]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.dailyChallenges?.claimBonus(this.inventory);
        this._render();
      });
    });

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

    if (this.activeTab === 'style') {
      requestAnimationFrame(() => this._drawPreview());
    }
    if (this.activeTab === 'map') {
      requestAnimationFrame(() => this._drawMap());
    }
  }

  // ── Character + boat preview canvas ────────────────────────────────────────

  _drawPreview() {
    const canvas = document.getElementById('char-preview');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const fur      = this.appearance?.furColor   ?? '#FFCC80';
    const shirt    = this.appearance?.shirtColor ?? '#1976D2';
    const pants    = this.appearance?.pantsColor ?? '#37474F';
    const boatCol  = this.appearance?.boatColor  ?? '#8B6340';

    // Draw at 3× scale so the character fills the preview nicely
    const S = 3;
    ctx.save();
    ctx.scale(S, S);

    // Shift character left to make room for the boat on the right
    const x = cw / (2 * S) - 18;  // ≈ 15 in scaled coords
    const y = (ch * 0.62) / S;    // ≈ 36

    // Shadow under character
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

    // ── Boat on the right ──────────────────────────────────────────────────
    const bx = 72;  // boat center x in scaled coords
    const by = 48;  // boat center y in scaled coords

    // Water-line pixels
    ctx.fillStyle = 'rgba(80,160,220,0.35)';
    for (let wx = bx - 14; wx <= bx + 14; wx += 3) {
      ctx.fillRect(wx, by + 8, 2, 1);
    }

    // Hull
    ctx.fillStyle = boatCol;
    ctx.beginPath(); ctx.ellipse(bx, by, 16, 7, 0, 0, Math.PI * 2); ctx.fill();

    // Bow stripe (lighter highlight along top of hull)
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.ellipse(bx, by - 2, 14, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Gunwale (dark rim)
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(bx, by, 16, 7, 0, 0, Math.PI * 2); ctx.stroke();

    // Simple oars (two lines extending out each side)
    ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx - 8, by - 1); ctx.lineTo(bx - 22, by + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 8, by - 1); ctx.lineTo(bx + 22, by + 5); ctx.stroke();
    // Oar blades
    ctx.fillStyle = '#A1887F';
    ctx.beginPath(); ctx.ellipse(bx - 22, by + 6, 3, 1.5, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(bx + 22, by + 6, 3, 1.5, -0.4, 0, Math.PI * 2); ctx.fill();
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

  _sortBar(sortState, btnAttr, keys) {
    const dir = sortState.dir === 'asc' ? '↑' : '↓';
    const btns = keys.map(({ key, label }) =>
      `<button class="sort-btn${sortState.by === key ? ' sort-active' : ''}" data-${btnAttr}="${key}">${label}</button>`
    ).join('');
    return `<div class="sort-bar"><span>Sort:</span>${btns}<span class="sort-dir">${dir}</span></div>`;
  }

  _renderFish() {
    const { caughtFish } = this.inventory;
    if (!caughtFish.length) {
      return `<div class="empty-msg">No fish yet!<br><span>Go catch some 🎣</span></div>`;
    }

    const { by, dir } = this._fishSort;
    const sorted = [...caughtFish].sort((a, b) => {
      let va, vb;
      if (by === 'name')   { va = a.name.toLowerCase();  vb = b.name.toLowerCase(); }
      else if (by === 'weight') { va = a.weight; vb = b.weight; }
      else                 { va = a.fishId;    vb = b.fishId; }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ?  1 : -1;
      return 0;
    });

    const totalValue = caughtFish.reduce((s, f) => s + f.value, 0);
    let html = `<div class="fish-summary">
      ${caughtFish.length} fish &nbsp;·&nbsp; Bag value: <strong>$${totalValue}</strong>
      <span style="font-size:11px;color:var(--text-dim);margin-left:auto">Sell at Shop</span>
    </div>`;
    html += this._sortBar(this._fishSort, 'fish-sort', [
      { key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'weight', label: 'Weight' },
    ]);

    sorted.forEach((entry) => {
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

  _renderGear() {
    const poles          = this.inventory.poles.filter(p => p.owned);
    const baits          = this.inventory.baits;
    const equippedId     = this.inventory.equippedPoleId;
    const equippedBaitId = this.inventory.equippedBaitId;
    const motors         = this.inventory.motors ?? [];
    const equippedMotorId = this.inventory.equippedMotorId;
    const isPaddling     = equippedMotorId == null;

    // ── Poles ──
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
    html += `</div>`;

    // ── Baits ──
    html += `<div class="equip-section"><div class="equip-header">🪱 Bait</div>`;
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

    // ── Motors ──
    html += `<div class="equip-section"><div class="equip-header">⚙️ Motor</div>
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

  _renderDex() {
    const allFish = this.fishDb.getAll();
    const caught  = allFish.filter(f => this.inventory.hasCaught(f.id));

    const { by, dir } = this._dexSort;
    const sorted = [...allFish].sort((a, b) => {
      let va, vb;
      if (by === 'name')        { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (by === 'weight') { va = this.inventory.bestWeight(a.id); vb = this.inventory.bestWeight(b.id); }
      else                      { va = a.id; vb = b.id; }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ?  1 : -1;
      return 0;
    });

    let html = `<div class="dex-summary">
      <span class="dex-count">${caught.length} / ${allFish.length}</span>
      <div class="dex-progress-bar">
        <div class="dex-progress-fill" style="width:${(caught.length/allFish.length*100).toFixed(0)}%"></div>
      </div>
    </div>`;
    html += this._sortBar(this._dexSort, 'dex-sort', [
      { key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'weight', label: 'Best Weight' },
    ]);

    html += `<div class="dex-grid">`;
    for (const fish of sorted) {
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

  _renderStyle() {
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
        <canvas id="char-preview" width="280" height="175" class="char-preview-canvas"></canvas>
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
      <div class="char-section">
        <div class="char-label">🎨 Hull Color</div>
        ${swatchRow('boatColor', BOAT_COLORS, a.boatColor)}
      </div>
      <div class="char-hint">More options coming — accessories &amp; hats soon!</div>
    `;
  }

  _renderGoals() {
    const dc = this.dailyChallenges;
    if (!dc) return `<div class="empty-msg">No goals available.</div>`;

    const challenges = dc.challenges;
    let html = `<div style="padding:10px 16px 4px;font-size:12px;color:var(--text-dim)">Day ${dc.day} &nbsp;·&nbsp; Daily Challenges</div>`;

    for (let i = 0; i < challenges.length; i++) {
      const slot    = challenges[i];
      const { template, claimed } = slot;
      const { current, total }   = dc.getProgress(i);
      const complete = dc.isComplete(i);
      const pct      = Math.min(100, (current / total) * 100).toFixed(0);

      const claimBtn = claimed
        ? `<div class="ch-claimed-badge">✓ Claimed</div>`
        : complete
          ? `<button class="ch-claim-btn" data-claim-idx="${i}">Claim $${template.reward}</button>`
          : '';

      html += `
        <div class="ch-card${complete ? ' ch-done' : ''}${claimed ? ' ch-claimed' : ''}">
          <div class="ch-card-top">
            <span class="ch-icon">${template.icon}</span>
            <div class="ch-desc">${template.desc}</div>
            <div class="ch-reward">$${template.reward}</div>
          </div>
          <div class="ch-progress-wrap">
            <div class="ch-progress-track">
              <div class="ch-progress-fill${claimed ? ' ch-fill-done' : ''}" style="width:${pct}%"></div>
            </div>
            <div class="ch-progress-label">${current} / ${total}</div>
          </div>
          ${claimBtn}
        </div>`;
    }

    const allClaimed   = challenges.every(s => s.claimed);
    const bonusClaimed = dc.bonusClaimed;
    const doneCount    = challenges.filter((_, i) => dc.isComplete(i)).length;

    html += `
      <div class="ch-bonus-card${bonusClaimed ? ' ch-claimed' : allClaimed ? ' ch-done' : ''}">
        <div class="ch-card-top">
          <span class="ch-icon">🌟</span>
          <div class="ch-desc">Complete all 3 daily challenges</div>
          <div class="ch-reward">$200</div>
        </div>
        ${bonusClaimed
          ? `<div class="ch-claimed-badge">✓ Bonus Claimed!</div>`
          : allClaimed
            ? `<button class="ch-claim-btn" data-claim-bonus="1">Claim Bonus $200</button>`
            : `<div class="ch-progress-label" style="font-size:11px;color:var(--text-dim)">${doneCount}/3 complete</div>`
        }
      </div>`;

    return html;
  }

  _renderMap() {
    return `
      <div style="padding:14px 14px 0;">
        <canvas id="world-map-canvas"
          style="display:block;width:100%;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:#0a1a0a"></canvas>
      </div>
      <div style="padding:10px 16px 6px;display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--text-dim);line-height:1.8">
        <span style="display:flex;align-items:center;gap:5px"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#FFEB3B;border:1.5px solid #fff"></span> You</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#8B6340;border:1.5px solid #fff"></span> Boat</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#00E5FF"></span> Fishing spot</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="display:inline-block;width:12px;height:7px;background:#F2E0BC;border-radius:2px"></span> Home</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="display:inline-block;width:12px;height:7px;background:#D32F2F;border-radius:2px"></span> Shop</span>
      </div>
    `;
  }

  _drawMap() {
    const canvas = document.getElementById('world-map-canvas');
    if (!canvas) return;

    // Size canvas to fill its CSS width, maintaining 5:3 world aspect ratio
    const rect = canvas.parentElement.getBoundingClientRect();
    const mw   = Math.floor(rect.width - 28);
    const mh   = Math.floor(mw * (WORLD_H / WORLD_W));
    canvas.width  = mw;
    canvas.height = mh;

    const ctx = canvas.getContext('2d');
    const sx = mw / WORLD_W, sy = mh / WORLD_H;

    ctx.clearRect(0, 0, mw, mh);

    // Land
    const lg = ctx.createLinearGradient(0, LAND_Y * sy, 0, mh);
    lg.addColorStop(0, '#4CAF50'); lg.addColorStop(1, '#2E7D32');
    ctx.fillStyle = lg;
    ctx.fillRect(0, LAND_Y * sy, mw, mh - LAND_Y * sy);

    // Water zones
    ctx.globalAlpha = 0.92;
    for (const zone of ZONES) {
      ctx.fillStyle = zone.water;
      ctx.fillRect(zone.x * sx, zone.y * sy, zone.w * sx, zone.h * sy);
    }
    ctx.globalAlpha = 1;

    // Shore strip
    ctx.fillStyle = '#C8A87A';
    ctx.fillRect(0, LAND_Y * sy - 1, mw, 2);

    // Zone labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const zone of ZONES) {
      const zw = zone.w * sx, zh = zone.h * sy;
      if (zw < 24 || zh < 10) continue;
      const cx = (zone.x + zone.w / 2) * sx, cy = (zone.y + zone.h / 2) * sy;
      const fs = Math.max(6, Math.min(10, Math.floor(Math.min(zw / 8, zh / 3))));
      ctx.font = `bold ${fs}px sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillText(zone.label, cx + 0.5, cy + 0.5);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(zone.label, cx, cy);
    }

    // Docks
    ctx.fillStyle = '#8B6340';
    for (const d of DOCKS) {
      ctx.fillRect(d.x * sx, d.y * sy, Math.max(2, d.w * sx), Math.max(2, d.h * sy));
    }

    // Fishing spots
    for (const spot of FISHING_SPOTS) {
      ctx.fillStyle = 'rgba(0,229,255,0.25)';
      ctx.beginPath(); ctx.arc(spot.wx * sx, spot.wy * sy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#00E5FF';
      ctx.beginPath(); ctx.arc(spot.wx * sx, spot.wy * sy, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Home + shop buildings
    ctx.fillStyle = '#F2E0BC';
    ctx.fillRect(BUILDINGS.home.x * sx - 4, BUILDINGS.home.y * sy - 5, 8, 6);
    ctx.strokeStyle = '#7B4A22'; ctx.lineWidth = 0.8; ctx.strokeRect(BUILDINGS.home.x * sx - 4, BUILDINGS.home.y * sy - 5, 8, 6);
    ctx.fillStyle = '#D32F2F';
    ctx.fillRect(BUILDINGS.shop.x * sx - 4, BUILDINGS.shop.y * sy - 5, 8, 6);
    ctx.strokeStyle = '#7B1A1A'; ctx.strokeRect(BUILDINGS.shop.x * sx - 4, BUILDINGS.shop.y * sy - 5, 8, 6);

    // Live player + boat from world scene
    const ws = this._worldRef?.();
    if (ws) {
      const boatColor = ws.appearance?.boatColor ?? '#8B6340';
      // Boat
      ctx.fillStyle = boatColor;
      ctx.beginPath(); ctx.arc(ws.boat.x * sx, ws.boat.y * sy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
      ctx.stroke();

      // Player (separate dot when not on boat)
      if (!ws.playerOnBoat) {
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath(); ctx.arc(ws.player.x * sx, ws.player.y * sy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
      } else {
        // When on boat, highlight the boat dot in yellow
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath(); ctx.arc(ws.boat.x * sx, ws.boat.y * sy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
      }
    }

    ctx.textBaseline = 'alphabetic';
  }

  destroy() { this.el.remove(); }
}
