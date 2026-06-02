const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// --- Input ---
const input = {
  touches: [],
  tapped: false,
};

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  input.touches = Array.from(e.touches).map((t) => ({
    x: t.clientX,
    y: t.clientY,
  }));
  input.tapped = true;
}, { passive: false });

canvas.addEventListener('touchend', () => {
  input.touches = [];
});

// --- Resize ---
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Game state (replace with your own) ---
const player = { x: 0, y: 0, r: 30, color: '#4af' };

// --- Game loop ---
let lastTime = 0;

function update(dt) {
  // Move player to last tap position
  if (input.tapped && input.touches.length > 0) {
    player.x = input.touches[0].x;
    player.y = input.touches[0].y;
    input.tapped = false;
  }
  // Clamp to canvas
  player.x = Math.max(player.r, Math.min(canvas.width - player.r, player.x));
  player.y = Math.max(player.r, Math.min(canvas.height - player.r, player.y));
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Player circle
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fillStyle = player.color;
  ctx.fill();

  // Instructions
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Tap to move', canvas.width / 2, canvas.height - 24);
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // cap at 100ms
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// Start player in center
player.x = window.innerWidth / 2;
player.y = window.innerHeight / 2;

requestAnimationFrame((t) => {
  lastTime = t;
  loop(t);
});
