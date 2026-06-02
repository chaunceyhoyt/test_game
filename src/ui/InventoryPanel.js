export class InventoryPanel {
  constructor(inventory, fishDb) {
    this.inventory = inventory;
    this.fishDb    = fishDb;
    this.activeTab = 'fish';
    this.isOpen    = false;

    this.el = document.createElement('div');
    this.el.id = 'inventory-panel';
    this.el.innerHTML = `
      <div class="panel-handle"></div>
      <div class="panel-tabs">
        <button class="tab-btn active" data-tab="fish">🐟 Fish</button>
        <button class="tab-btn" data-tab="equipment">🎣 Gear</button>
        <button class="tab-btn" data-tab="dex">📖 FishDex</button>
      </div>
      <div id="panel-content" class="panel-content"></div>
    `;
    document.body.appendChild(this.el);

    // Tab switching
    this.el.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });

    // Close on background tap (swipe down)
    let startY = 0;
    this.el.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
    this.el.addEventListener('touchend', e => {
      if (e.changedTouches[0].clientY - startY > 60) this.close();
    }, { passive: true });

    // Close button via handle double-tap
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

    // Sell individual
    el.querySelectorAll('.sell-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.inventory.sellFish(+btn.dataset.index);
        this._render();
      });
    });

    // Sell all
    el.querySelector('#sell-all')?.addEventListener('click', () => {
      while (this.inventory.caughtFish.length) this.inventory.sellFish(0);
      this._render();
    });

    // Equip pole
    el.querySelectorAll('.equip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.inventory.equipPole(btn.dataset.pole);
        this._render();
      });
    });
  }

  _rarityColor(r) {
    return { common:'#9E9E9E', uncommon:'#4CAF50', rare:'#2196F3', epic:'#9C27B0', legendary:'#FF9800' }[r] ?? '#9E9E9E';
  }

  _fishIcon(fish, caught) {
    // Small canvas-rendered fish icon as data URL
    const c = document.createElement('canvas');
    c.width = 48; c.height = 48;
    const ctx = c.getContext('2d');
    const color = caught ? fish.color : '#444';
    // Body
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(20, 24, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
    // Tail
    ctx.beginPath(); ctx.moveTo(32, 24); ctx.lineTo(44, 14); ctx.lineTo(44, 34); ctx.closePath(); ctx.fill();
    // Dorsal
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
      ${caughtFish.length} fish — Total value: <strong>$${totalValue}</strong>
      <button class="sell-all-btn" id="sell-all">Sell All</button>
    </div>`;

    caughtFish.forEach((entry, i) => {
      const fish = this.fishDb.getById(entry.fishId);
      const rc = this._rarityColor(fish?.rarity ?? 'common');
      const icon = fish ? this._fishIcon(fish, true) : '';
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
            <div class="fish-coins">💰 $${entry.value}</div>
            <button class="sell-btn" data-index="${i}">Sell</button>
          </div>
        </div>`;
    });

    return html;
  }

  _renderEquipment() {
    const poles      = this.inventory.poles;
    const baits      = this.inventory.baits;
    const equippedId = this.inventory.equippedPoleId;
    let html = `<div class="equip-section"><div class="equip-header">🎣 Fishing Poles</div>`;
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
    html += `</div><div class="equip-section"><div class="equip-header">🪱 Bait</div>`;
    for (const b of baits) {
      html += `<div class="equip-card"><span class="equip-icon">🪱</span>
        <div class="equip-info"><div class="equip-name">${b.name}</div>
        <div class="equip-stat">x${b.count}</div></div></div>`;
    }
    html += `</div>`;
    return html;
  }

  _renderDex() {
    const allFish = this.fishDb.getAll();
    const caught  = allFish.filter(f =>  this.inventory.hasCaught(f.id));
    const missing = allFish.filter(f => !this.inventory.hasCaught(f.id));

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

  destroy() { this.el.remove(); }
}
