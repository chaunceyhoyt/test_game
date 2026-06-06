// Surface any uncaught errors visually — wraps text so full message is readable
window.addEventListener('error', (e) => {
  const canvas = document.getElementById('game');
  if (!canvas) return;
  if (!canvas.width || !canvas.height) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  const ctx = canvas.getContext('2d');
  const cw = canvas.width, ch = canvas.height;
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, cw, ch);

  const fs = Math.max(11, Math.min(14, Math.round(cw / 28)));
  ctx.font = `bold ${fs}px monospace`;
  ctx.textAlign = 'left';
  const pad = 20, maxW = cw - pad * 2, lineH = fs * 1.6;

  function wrapText(text, color) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines.map(l => ({ text: l, color }));
  }

  const rows = [
    ...wrapText('ERROR: ' + e.message, '#ff6b6b'),
    { text: (e.filename?.split('/').pop() ?? '') + ':' + e.lineno, color: '#888' },
    { text: 'Tap to reload', color: '#555' },
  ];

  const startY = Math.max(fs * 2, ch / 2 - (rows.length * lineH) / 2);
  rows.forEach((row, i) => { ctx.fillStyle = row.color; ctx.fillText(row.text, pad, startY + i * lineH); });

  canvas.onclick = () => location.reload();
});

import { GameTime }            from './systems/GameTime.js';
import { FishDatabase }        from './systems/FishDatabase.js';
import { Inventory }           from './systems/Inventory.js';
import { FishSelector }        from './systems/FishSelector.js';
import { CharacterAppearance } from './systems/CharacterAppearance.js';
import { WorldScene }          from './scenes/WorldScene.js';
import { FishingScene }        from './scenes/FishingScene.js';
import { HUD }                 from './ui/HUD.js';
import { InventoryPanel }      from './ui/InventoryPanel.js';
import { ShopPanel }           from './ui/ShopPanel.js';
import { DialogPanel }         from './ui/DialogPanel.js';
import { SettingsPanel }       from './ui/SettingsPanel.js';
import { DebugOverlay }        from './ui/DebugOverlay.js';
import { WeatherSystem }       from './systems/WeatherSystem.js';

// ── Setup ────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

const gameTime   = new GameTime();
const fishDb     = new FishDatabase();
const inventory  = new Inventory();
const selector   = new FishSelector(fishDb);
const appearance = new CharacterAppearance();

// ── UI ───────────────────────────────────────────────────────────────────────
const settings       = { musicVolume: 80, sfxVolume: 80, debugMode: false };
const weatherSystem  = new WeatherSystem(gameTime);
const debugOverlay   = new DebugOverlay(gameTime, weatherSystem);

const settingsPanel = new SettingsPanel(settings, (key, value) => {
  if (key === 'debugMode') value ? debugOverlay.show() : debugOverlay.hide();
});

const hud         = new HUD(inventory, gameTime, () => invPanel.toggle(), () => settingsPanel.open());
const invPanel    = new InventoryPanel(inventory, fishDb, appearance);
const shopPanel   = new ShopPanel(inventory, fishDb);
const dialogPanel = new DialogPanel();

const SHOP_NPC_DIALOG = {
  portrait: '🧑‍🦳',
  name:     'Old Pete',
  lines: [
    "Welcome to the Rusty Anchor, angler!",
    "Finest gear on the whole lake.",
    "What can I do for ya?",
  ],
  choices: [
    { label: '🛒 Browse Goods', cb: () => shopPanel.openBuy()  },
    { label: '💰 Sell Fish',    cb: () => shopPanel.openSell() },
    { label: '👋 Leave',        cb: () => {}                   },
  ],
};

// ── Scenes ───────────────────────────────────────────────────────────────────
let activeScene = 'world';
let worldScene, fishingScene;
let worldState  = null; // full world state persisted across fishing trips

function startWorld(state) {
  fishingScene?.destroy();
  fishingScene = null;
  activeScene  = 'world';
  worldScene   = new WorldScene(
    canvas, gameTime,
    (spot) => startFishing(spot),
    state,
    appearance,
    inventory,
    () => dialogPanel.show(SHOP_NPC_DIALOG)
  );
}

function startFishing(spot) {
  worldState   = worldScene?.getState(); // capture boat pos, zoom, playerOnBoat
  activeScene  = 'fishing';
  worldScene?.destroy();
  worldScene   = null;
  fishingScene = new FishingScene(canvas, selector, inventory, gameTime, (result) => {
    if (result) showCatchToast(result.fish, result.weight);
    startWorld(worldState);
  });
  fishingScene.start(spot);
}

// ── Catch toast ──────────────────────────────────────────────────────────────
function showCatchToast(fish, weight) {
  const rarityColors = { common:'#9E9E9E', uncommon:'#4CAF50', rare:'#2196F3', epic:'#9C27B0', legendary:'#FF9800' };
  const rc = rarityColors[fish.rarity] ?? '#9E9E9E';
  const toast = document.createElement('div');
  toast.className = 'catch-toast';
  toast.style.borderColor = rc;
  toast.innerHTML = `<strong style="color:${rc}">${fish.name}</strong> added to bag! (${weight} lbs)`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 2500);
}

// ── Resize ───────────────────────────────────────────────────────────────────
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  worldScene?.onResize();
}
window.addEventListener('resize', resize);
resize();

// ── Game loop ────────────────────────────────────────────────────────────────
let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  gameTime.update(dt);
  dialogPanel.update(dt);

  if (activeScene === 'world'   && worldScene)   { worldScene.update(dt);   worldScene?.draw(); }
  if (activeScene === 'fishing' && fishingScene) { fishingScene.update(dt); fishingScene?.draw(); }

  weatherSystem.update(dt);
  weatherSystem.draw(ctx, canvas.width, canvas.height);

  hud.update();
  if (settings.debugMode) debugOverlay.update(gameTime);
  requestAnimationFrame(loop);
}

// ── Start ────────────────────────────────────────────────────────────────────
startWorld(null);
document.getElementById('diag')?.remove();
requestAnimationFrame(t => { lastTime = t; loop(t); });
