export class ShopPanel {
  constructor(inventory, fishDb) {
    this.inventory = inventory;
    this.fishDb    = fishDb;
    this.isOpen    = false;
    this._state    = 'greeting'; // 'greeting' | 'buy' | 'sell'
    this._buyTab   = 'equipment'; // 'equipment' | 'bait' | 'fuel'

    this.el = document.createElement('div');
    this.el.id = 'shop-panel';

    // Apply the same parchment/wood inline style as #inventory-panel
    Object.assign(this.el.style, {
      position:     'fixed',
      left:         '0',
      right:        '0',
      bottom:       '0',
      height:       '70vh',
      maxHeight:    '600px',
      background:   'linear-gradient(160deg, #F6EAD0 0%, #EDD9A0 55%, #E2CC84 100%)',
      color:        '#2A1000',
      borderTop:    '3px solid #7B4A22',
      borderRadius: '16px 16px 0 0',
      overflowY:    'auto',
      transform:    'translateY(100%)',
      transition:   'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
      zIndex:       '200',
      display:      'flex',
      flexDirection:'column',
      fontFamily:   'inherit',
    });

    document.body.appendChild(this.el);

    // Swipe-down to close
    let _startY = 0;
    this.el.addEventListener('touchstart', e => { _startY = e.touches[0].clientY; }, { passive: true });
    this.el.addEventListener('touchend', e => {
      if (e.changedTouches[0].clientY - _startY > 60) this.close();
    }, { passive: true });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  open(state = 'greeting') {
    this._state = state;
    this.isOpen = true;
    this.el.style.transform = 'translateY(0)';
    this._render();
  }

  openBuy() {
    this._state  = 'buy';
    this._buyTab = 'equipment';
    this.isOpen  = true;
    this.el.style.transform = 'translateY(0)';
    this._render();
  }

  openSell() {
    this._state = 'sell';
    this.isOpen = true;
    this.el.style.transform = 'translateY(0)';
    this._render();
  }

  close() {
    this.isOpen = false;
    this.el.style.transform = 'translateY(100%)';
    this._removeConfirmOverlay();
  }

  toggle() { this.isOpen ? this.close() : this.open(); }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  _sellPrice(entry) {
    return entry.value;
  }

  _starsHtml(stars) {
    const total = 3;
    let html = '';
    for (let i = 0; i < total; i++) {
      if (i < stars) {
        html += `<span style="color:#C07020">★</span>`;
      } else {
        html += `<span style="color:rgba(42,16,0,0.3)">☆</span>`;
      }
    }
    return html;
  }

  // ── Render dispatcher ────────────────────────────────────────────────────────

  _render() {
    if (this._state === 'greeting') this.el.innerHTML = this._renderGreeting();
    else if (this._state === 'buy') this.el.innerHTML = this._renderBuy();
    else if (this._state === 'sell') this.el.innerHTML = this._renderSell();

    this._bindEvents();
  }

  // ── Handle bar (shared across all states) ────────────────────────────────────

  _handleBarHtml() {
    return `<div id="shop-handle" style="
      width:40px; height:5px; border-radius:3px;
      background:rgba(42,16,0,0.25); margin:10px auto 6px;
      cursor:pointer; flex-shrink:0;
    "></div>`;
  }

  // ── Greeting view ─────────────────────────────────────────────────────────────

  _renderGreeting() {
    return `
      ${this._handleBarHtml()}
      <div style="padding:16px 20px 24px; display:flex; flex-direction:column; align-items:center; gap:14px;">
        <div style="font-size:1.5rem; font-weight:700; letter-spacing:0.5px;">🏪 Rusty Anchor Shop</div>
        <div style="font-size:1rem; color:rgba(42,16,0,0.7); font-style:italic; text-align:center;">
          "Welcome, angler! What'll it be?"
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-top:8px;">
          <button id="shop-browse-btn" style="${this._btnStyle('#7B4A22', '#fff')}">🛒 Browse Goods</button>
          <button id="shop-sell-btn"   style="${this._btnStyle('#4A7B3A', '#fff')}">💰 Sell Fish</button>
          <button id="shop-leave-btn"  style="${this._btnStyle('rgba(42,16,0,0.15)', '#2A1000')}">👋 Leave</button>
        </div>
      </div>
    `;
  }

  // ── Buy view ──────────────────────────────────────────────────────────────────

  _renderBuy() {
    const tabs = ['equipment', 'bait', 'fuel'];
    const tabLabels = { equipment: '⚙️ Equipment', bait: '🪱 Bait', fuel: '⛽ Fuel' };

    const tabBar = `<div style="display:flex; border-bottom:2px solid rgba(123,74,34,0.3); margin:0 0 4px;">
      ${tabs.map(t => `
        <button data-buy-tab="${t}" style="
          flex:1; padding:10px 4px; border:none; cursor:pointer; font-size:0.82rem;
          font-weight:${this._buyTab === t ? '700' : '500'};
          background:${this._buyTab === t ? 'rgba(123,74,34,0.15)' : 'transparent'};
          color:${this._buyTab === t ? '#7B4A22' : 'rgba(42,16,0,0.6)'};
          border-bottom:${this._buyTab === t ? '3px solid #7B4A22' : '3px solid transparent'};
          transition:all 0.15s;
        ">${tabLabels[t]}</button>
      `).join('')}
    </div>`;

    const catalog = (this.inventory.shopCatalog ?? []).filter(item => item.tab === this._buyTab);

    let itemsHtml;
    if (catalog.length === 0) {
      itemsHtml = `<div style="padding:32px 0; text-align:center; color:rgba(42,16,0,0.5); font-style:italic;">Nothing in stock right now.</div>`;
    } else {
      itemsHtml = catalog.map(item => {
        const isOwned   = this._isOwned(item);
        const canAfford = this.inventory.money >= item.price;
        const disabled  = isOwned || !canAfford;
        const btnLabel  = isOwned ? 'Owned' : `Buy $${item.price}`;
        const btnBg     = isOwned ? 'rgba(42,16,0,0.12)' : canAfford ? '#7B4A22' : 'rgba(42,16,0,0.2)';
        const btnColor  = isOwned ? 'rgba(42,16,0,0.4)' : canAfford ? '#fff' : 'rgba(42,16,0,0.4)';
        return `
          <div style="
            display:flex; align-items:center; gap:10px;
            padding:12px 16px; border-bottom:1px solid rgba(123,74,34,0.18);
          ">
            <div style="flex:1; min-width:0;">
              <div style="font-weight:600; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${item.name}
              </div>
              ${item.desc ? `<div style="font-size:0.78rem; color:rgba(42,16,0,0.6); margin-top:2px;">${item.desc}</div>` : ''}
            </div>
            <div style="font-weight:700; color:#7B4A22; white-space:nowrap; margin-right:4px;">$${item.price}</div>
            <button
              data-buy-item="${item.id}"
              ${disabled ? 'disabled' : ''}
              style="
                padding:7px 13px; border:none; border-radius:8px; cursor:${disabled ? 'default' : 'pointer'};
                background:${btnBg}; color:${btnColor}; font-size:0.82rem; font-weight:600;
                white-space:nowrap; opacity:${disabled ? '0.7' : '1'};
              "
            >${btnLabel}</button>
          </div>`;
      }).join('');
    }

    return `
      ${this._handleBarHtml()}
      <div style="display:flex; align-items:center; gap:8px; padding:8px 16px 4px;">
        <button id="shop-back-btn" style="${this._backBtnStyle()}">← Back</button>
        <div style="font-size:1.1rem; font-weight:700;">🛒 Browse Goods</div>
        <div style="margin-left:auto; font-size:0.9rem; color:#7B4A22; font-weight:600;">💰 $${this.inventory.money}</div>
      </div>
      ${tabBar}
      <div style="overflow-y:auto; flex:1;">
        ${itemsHtml}
      </div>
    `;
  }

  // ── Sell view ─────────────────────────────────────────────────────────────────

  _renderSell() {
    const fish     = this.inventory.caughtFish;
    const totalVal = fish.reduce((sum, f) => sum + this._sellPrice(f), 0);
    const hasfish  = fish.length > 0;

    const headerRow = `
      <div style="
        display:flex; align-items:center; justify-content:space-between;
        padding:10px 16px 6px;
      ">
        <div style="font-weight:700; font-size:0.95rem;">Your Catch</div>
        <button
          id="shop-sell-all-btn"
          ${hasfish ? '' : 'disabled'}
          style="
            padding:7px 14px; border:none; border-radius:8px; font-size:0.82rem; font-weight:600;
            background:${hasfish ? '#4A7B3A' : 'rgba(42,16,0,0.12)'};
            color:${hasfish ? '#fff' : 'rgba(42,16,0,0.35)'};
            cursor:${hasfish ? 'pointer' : 'default'};
            opacity:${hasfish ? '1' : '0.7'};
          "
        >Sell All ($${totalVal})</button>
      </div>
    `;

    let fishRows;
    if (!hasfish) {
      fishRows = `<div style="padding:32px 0; text-align:center; color:rgba(42,16,0,0.5); font-style:italic;">No fish to sell.</div>`;
    } else {
      fishRows = fish.map((entry, i) => {
        const price = this._sellPrice(entry);
        const stars = this._starsHtml(entry.stars ?? 0);
        return `
          <div style="
            display:flex; align-items:center; gap:10px;
            padding:11px 16px; border-bottom:1px solid rgba(123,74,34,0.18);
          ">
            <div style="flex:1; min-width:0;">
              <div style="font-weight:600; font-size:0.93rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${entry.name}
              </div>
              <div style="font-size:0.78rem; color:rgba(42,16,0,0.6); margin-top:2px;">
                ${entry.weight} lbs &nbsp; ${stars}
              </div>
            </div>
            <div style="font-weight:700; color:#4A7B3A; white-space:nowrap; margin-right:4px;">$${price}</div>
            <button
              data-sell-fish="${i}"
              style="${this._btnStyle('#4A7B3A', '#fff', '7px 13px', '0.82rem')}"
            >Sell</button>
          </div>`;
      }).join('');
    }

    return `
      ${this._handleBarHtml()}
      <div style="display:flex; align-items:center; gap:8px; padding:8px 16px 0;">
        <button id="shop-back-btn" style="${this._backBtnStyle()}">← Back</button>
        <div style="font-size:1.1rem; font-weight:700;">💰 Sell Fish</div>
        <div style="margin-left:auto; font-size:0.9rem; color:#7B4A22; font-weight:600;">💰 $${this.inventory.money}</div>
      </div>
      ${headerRow}
      <div style="overflow-y:auto; flex:1;">
        ${fishRows}
      </div>
    `;
  }

  // ── Style helpers ─────────────────────────────────────────────────────────────

  _btnStyle(bg, color, padding = '10px 22px', fontSize = '0.92rem') {
    return `
      padding:${padding}; border:none; border-radius:10px; cursor:pointer;
      background:${bg}; color:${color}; font-size:${fontSize}; font-weight:600;
      font-family:inherit; transition:opacity 0.15s;
    `;
  }

  _backBtnStyle() {
    return `
      padding:6px 12px; border:none; border-radius:8px; cursor:pointer;
      background:rgba(42,16,0,0.12); color:#2A1000; font-size:0.82rem; font-weight:600;
      font-family:inherit;
    `;
  }

  _isOwned(item) {
    if (item.type === 'pole')  return this.inventory.poles.find(p => p.id === item.poleId)?.owned ?? false;
    if (item.type === 'sail')  return this.inventory.hasSail;
    if (item.type === 'motor') return this.inventory.motors?.find(m => m.id === item.motorId)?.owned ?? false;
    return false; // consumables are never "owned"
  }

  // ── Event binding ─────────────────────────────────────────────────────────────

  _bindEvents() {
    // Panel handle — click to close
    this.el.querySelector('#shop-handle')?.addEventListener('click', () => this.close());

    // Greeting buttons
    this.el.querySelector('#shop-browse-btn')?.addEventListener('click', () => {
      this._state = 'buy';
      this._render();
    });

    this.el.querySelector('#shop-sell-btn')?.addEventListener('click', () => {
      this._state = 'sell';
      this._render();
    });

    this.el.querySelector('#shop-leave-btn')?.addEventListener('click', () => this.close());

    // Back button (buy & sell views)
    this.el.querySelector('#shop-back-btn')?.addEventListener('click', () => {
      this._state = 'greeting';
      this._render();
    });

    // Buy tab switching
    this.el.querySelectorAll('[data-buy-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._buyTab = btn.dataset.buyTab;
        this._render();
      });
    });

    // Buy item buttons — show confirmation first
    this.el.querySelectorAll('[data-buy-item]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = (this.inventory.shopCatalog ?? []).find(i => i.id === btn.dataset.buyItem);
        if (item) this._showConfirm(item);
      });
    });

    // Sell individual fish
    this.el.querySelectorAll('[data-sell-fish]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.inventory.sellFish(+btn.dataset.sellFish);
        this._render();
      });
    });

    // Sell all fish
    this.el.querySelector('#shop-sell-all-btn')?.addEventListener('click', () => {
      this.inventory.sellAllFish();
      this._render();
    });
  }

  // ── Purchase confirmation overlay ────────────────────────────────────────────

  _showConfirm(item) {
    this._removeConfirmOverlay();
    const overlay = document.createElement('div');
    overlay.id = 'shop-confirm-overlay';
    overlay.style.cssText = `
      position:absolute; inset:0; z-index:10;
      background:rgba(42,16,0,0.72); backdrop-filter:blur(3px);
      display:flex; align-items:center; justify-content:center;
      padding:24px; border-radius:inherit;
    `;
    const newBal = this.inventory.money - item.price;
    overlay.innerHTML = `
      <div style="
        background:linear-gradient(160deg,#F6EAD0 0%,#EDD9A0 100%);
        border-radius:16px; padding:22px 20px;
        width:100%; max-width:280px;
        box-shadow:0 8px 32px rgba(0,0,0,0.5);
        border:2px solid #7B4A22; color:#2A1000;
        font-family:inherit;
      ">
        <div style="font-size:1rem;font-weight:800;text-align:center;margin-bottom:6px;">Confirm Purchase</div>
        <div style="font-size:0.85rem;color:rgba(42,16,0,0.65);text-align:center;margin-bottom:4px;">
          ${item.name}
        </div>
        <div style="font-size:1.3rem;font-weight:800;color:#7B4A22;text-align:center;margin-bottom:14px;">
          $${item.price}
        </div>
        <div style="font-size:0.78rem;color:rgba(42,16,0,0.5);text-align:center;margin-bottom:16px;">
          Balance: $${this.inventory.money} → <strong style="color:${newBal >= 0 ? '#3D7A1A' : '#C62828'}">$${newBal}</strong>
        </div>
        <div style="display:flex;gap:10px;">
          <button id="shop-confirm-cancel" style="
            flex:1;padding:10px;border:none;border-radius:10px;cursor:pointer;
            background:rgba(42,16,0,0.12);color:#2A1000;
            font-size:0.88rem;font-weight:600;font-family:inherit;
          ">Cancel</button>
          <button id="shop-confirm-buy" style="
            flex:1;padding:10px;border:none;border-radius:10px;cursor:pointer;
            background:#7B4A22;color:#fff;
            font-size:0.88rem;font-weight:600;font-family:inherit;
          ">Buy!</button>
        </div>
      </div>
    `;
    this.el.style.position = 'relative';
    this.el.appendChild(overlay);

    overlay.querySelector('#shop-confirm-cancel').addEventListener('click', () => this._removeConfirmOverlay());
    overlay.querySelector('#shop-confirm-buy').addEventListener('click', () => {
      this.inventory.buyItem(item.id);
      this._removeConfirmOverlay();
      this._render();
    });
  }

  _removeConfirmOverlay() {
    this.el.querySelector('#shop-confirm-overlay')?.remove();
  }

  destroy() { this.el.remove(); }
}
