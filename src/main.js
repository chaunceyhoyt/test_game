import { GameTime }       from './systems/GameTime.js';
import { FishDatabase }   from './systems/FishDatabase.js';
import { Inventory }      from './systems/Inventory.js';
import { FishSelector }   from './systems/FishSelector.js';
import { WorldScene }     from './scenes/WorldScene.js';
import { FishingScene }   from './scenes/FishingScene.js';
import { HUD }            from './ui/HUD.js';
import { InventoryPanel } from './ui/InventoryPanel.js';

// ── Setup ────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

const gameTime  = new GameTime();
const fishDb    = new FishDatabase();
const inventory = new Inventory();
const selector  = new FishSelector(fishDb);

// ── UI ───────────────────────────────────────────────────────────────────────
const hud   = new HUD(inventory, gameTime, () => invPanel.toggle());
const invPanel = new InventoryPanel(inventory, fishDb);

// ── Scenes ───────────────────────────────────────────────────────────────────
let activeScene = 'world';
let worldScene, fishingScene;

function startWorld() {
  fishingScene?.destroy();
  fishingScene = null;
  activeScene = 'world';
  worldScene = new WorldScene(canvas, gameTime, (spot) => startFishing(spot));
}

function startFishing(spot) {
  activeScene = 'fishing';
  worldScene?.destroy();
  worldScene = null;
  fishingScene = new FishingScene(canvas, selector, inventory, gameTime, (result) => {
    if (result) {
      // Show brief catch notification
      showCatchToast(result.fish, result.weight);
    }
    startWorld();
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

  if (activeScene === 'world'   && worldScene)   { worldScene.update(dt);   worldScene.draw(); }
  if (activeScene === 'fishing' && fishingScene) { fishingScene.update(dt); fishingScene.draw(); }

  hud.update();
  requestAnimationFrame(loop);
}

// ── Start ────────────────────────────────────────────────────────────────────
startWorld();
requestAnimationFrame(t => { lastTime = t; loop(t); });
