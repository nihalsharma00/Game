const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const backgroundImage = document.getElementById("backgroundImage");
const pauseHomeBtn = document.getElementById("pauseHomeBtn");
const gameOverHomeBtn = document.getElementById("gameOverHomeBtn");
const terrainScreen = document.getElementById("terrainScreen");
const tankScreen = document.getElementById("tankScreen");
const startScreen = document.getElementById("startScreen");
const pauseScreen = document.getElementById("pauseScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

let terrain = null;
let selectedTank = null;
let playerTankImage = new Image();

let player = {
  x: canvas.width / 2,
  y: canvas.height - 60,
  size: 20,
  speed: 5,
  color: "white",
  directionAngle: 0,
};

let bullets = [], specialBullets = [], enemies = [], explosions = [], powerUps = [], particles = [];

let score = 0, level = 1, lives = 3, kills = 0;
let isGameOver = false, isGameStarted = false, isPaused = false;
let specialAttackReady = false, specialCooldown = false;
let keys = {}, lastBulletTime = 0, fireRate = 0.3, enemySpeed = 1;
let highScore = localStorage.getItem("highScore") || 0;
let touchStart = null;

const specialCooldownDuration = 15000;
const powerUpDuration = 6000;
let freezeTimer = 0, rapidFireTimer = 0, swiftShadowTimer = 0;
const originalFireRate = fireRate, originalSpeed = player.speed;

// Terrain and enemy colors for tanks
const terrainSettings = {
  forest: {
    enemyColor: "#228B22", particleColor: "rgba(34,139,34,0.15)", enemySpeedMultiplier: 1, particleCount: 70, particleType: "leaf", image: "forest.png"
  },
  ice: {
    enemyColor: "#d9f0ff", particleColor: "rgba(250, 250, 255, 0.3)", enemySpeedMultiplier: 0.75, particleCount: 80, particleType: "snow", image: "snow.png"
  },
  sahara: {
    enemyColor: "#d6a941", particleColor: "rgba(244, 196, 48, 0.25)", enemySpeedMultiplier: 1.3, particleCount: 60, particleType: "dust", image: "desert.jpg"
  },
  volcano: {
    enemyColor: "#ff4500", particleColor: "rgba(255, 69, 0, 0.25)", enemySpeedMultiplier: 1.1, particleCount: 75, particleType: "ember", image: "unnamed.png"
  },
  city: {
    enemyColor: "#00ffff", particleColor: "rgba(0, 255, 255, 0.2)", enemySpeedMultiplier: 1, particleCount: 65, particleType: "rain", image: "city.png"
  },
};
// Power-ups unchanged for brevity

// Sounds unchanged for brevity

// --- UTILITIES ---
function shadeColor(color, percent) {
  try {
    let f = parseInt(color.slice(1), 16),
      t = percent < 0 ? 0 : 255,
      p = percent < 0 ? percent * -1 : percent,
      R = f >> 16,
      G = (f >> 8) & 0x00ff,
      B = f & 0x0000ff;
    return (
      "#" +
      (
        0x1000000 +
        (Math.round((t - R) * p) + R) * 0x10000 +
        (Math.round((t - G) * p) + G) * 0x100 +
        (Math.round((t - B) * p) + B)
      )
        .toString(16)
        .slice(1)
    );
  } catch {
    return color;
  }
}

// --- ENEMY MANAGEMENT ---
function createEnemy() {
  const maxEnemies = 7 + level;
  if (enemies.length >= maxEnemies) return;
  let size = 20, offset = 30;

  // Random spawn outside canvas edges avoiding player proximity
  let x, y;
  let validPos = false;
  let tries = 0;
  while (!validPos && tries < 50) {
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { x = Math.random() * canvas.width; y = -offset; }
    else if (edge === 1) { x = canvas.width + offset; y = Math.random() * canvas.height; }
    else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + offset; }
    else { x = -offset; y = Math.random() * canvas.height; }
    if (Math.hypot(x - player.x, y - player.y) > player.size * 4) validPos = true;
    tries++;
  }
  if (!validPos) return; // No spawn this frame if no valid position

  enemies.push({
    id: crypto.randomUUID(),
    x, y,
    size,
    speed: enemySpeed * (terrainSettings[terrain]?.enemySpeedMultiplier || 1),
    turretAngle: 0,
    turretRotationSpeed: (Math.random() * 0.04 + 0.015) * (Math.random() < 0.5 ? 1 : -1),
  });
}

function drawEnemyTank(e) {
  const baseColor = terrainSettings[terrain]?.enemyColor || "lime";
  const { x, y, size, turretAngle } = e;

  ctx.save();
  ctx.translate(x, y);

  const bodySize = size * 1.4;
  ctx.fillStyle = baseColor;
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.fillRect(-bodySize / 2, -bodySize / 2, bodySize, bodySize);
  ctx.strokeRect(-bodySize / 2, -bodySize / 2, bodySize, bodySize);

  // Treads
  ctx.fillStyle = shadeColor(baseColor, -30);
  const treadWidth = bodySize * 0.3;
  const treadHeight = bodySize;
  ctx.fillRect(-bodySize / 2 - treadWidth, -treadHeight / 2, treadWidth, treadHeight);
  ctx.fillRect(bodySize / 2, -treadHeight / 2, treadWidth, treadHeight);

  // Turret base
  const turretBaseSize = size * 0.9;
  ctx.fillStyle = shadeColor(baseColor, 20);
  ctx.fillRect(-turretBaseSize / 2, -turretBaseSize / 2, turretBaseSize, turretBaseSize);
  ctx.strokeRect(-turretBaseSize / 2, -turretBaseSize / 2, turretBaseSize, turretBaseSize);

  // Barrel
  ctx.rotate(turretAngle);
  ctx.fillStyle = shadeColor(baseColor, 60);
  const barrelWidth = turretBaseSize * 0.15;
  const barrelLength = turretBaseSize * 1.2;
  ctx.fillRect(0, -barrelWidth / 2, barrelLength, barrelWidth);
  ctx.strokeRect(0, -barrelWidth / 2, barrelLength, barrelWidth);

  ctx.restore();
}

function drawEnemies() {
  enemies.forEach(e => {
    // Animate turret rotation
    e.turretAngle += e.turretRotationSpeed;
    if (e.turretAngle > 0.4 || e.turretAngle < -0.4) e.turretRotationSpeed = -e.turretRotationSpeed;
    drawEnemyTank(e);
  });
}

// --- PLAYER ---
function applyPlayerTank(tankName) {
  playerTankImage.src = tankName + ".png";
}

function drawPlayer() {
  if (playerTankImage.complete && playerTankImage.naturalWidth !== 0) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate((player.directionAngle * Math.PI) / 180);
    ctx.drawImage(playerTankImage, -player.size, -player.size, player.size * 2, player.size * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- BULLETS ---
function shoot() {
  const now = Date.now();
  if ((now - lastBulletTime) / 1000 >= fireRate) {
    const rad = (player.directionAngle * Math.PI) / 180;
    const speed = 9;
    bullets.push({
      x: player.x,
      y: player.y,
      size: 5,
      dx: Math.cos(rad) * speed,
      dy: Math.sin(rad) * speed
    });
    lastBulletTime = now;
    playSound("shoot");
  }
}

function moveBullets() {
  bullets.forEach(b => { b.x += b.dx; b.y += b.dy; });
  specialBullets.forEach(b => { b.x += b.dx; b.y += b.dy; });
  bullets = bullets.filter(b => b.x > -20 && b.x < canvas.width + 20 && b.y > -20 && b.y < canvas.height + 20);
  specialBullets = specialBullets.filter(b => b.x > -20 && b.x < canvas.width + 20 && b.y > -20 && b.y < canvas.height + 20);
}

// --- COLLISIONS, SCORE, POWERUPS unchanged (add full implementations here in your actual file) ---

// --- INPUT ---
document.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (!isGameStarted && e.key === "Enter") startGame();
  else if (isGameOver && e.key === "Enter") restartGame();
  else if (e.key === "j" && specialAttackReady && !specialCooldown) triggerSpecial();
  else if (e.key === "p" && isGameStarted && !isGameOver) togglePause();
});
document.addEventListener("keyup", e => { keys[e.key] = false; });
canvas.addEventListener("mousedown", () => {
  if (!isPaused && isGameStarted && !isGameOver) shoot();
});
document.addEventListener("touchstart", e => {
  if (!isPaused && isGameStarted && !isGameOver) shoot();
  touchStart = e.touches[0];
});
document.addEventListener("touchmove", e => {
  if (!touchStart) return;
  const touch = e.touches;
  const dx = touch.clientX - touchStart.clientX;
  const dy = touch.clientY - touchStart.clientY;
  player.x += dx * 0.15;
  player.y += dy * 0.15;
  touchStart = touch;
});

// --- GAME LOOP ---
function handleInput() {
  if (isPaused) return;
  if (keys["ArrowLeft"] || keys["a"]) { player.x -= player.speed; player.directionAngle = 180; }
  if (keys["ArrowRight"] || keys["d"]) { player.x += player.speed; player.directionAngle = 0; }
  if (keys["ArrowUp"] || keys["w"]) { player.y -= player.speed; player.directionAngle = 270; }
  if (keys["ArrowDown"] || keys["s"]) { player.y += player.speed; player.directionAngle = 90; }
  if (keys["n"]) shoot();
  player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
}

function updateHUD() {
  document.getElementById("score-display").textContent = `Score: ${score}`;
  document.getElementById("level-display").textContent = `Level: ${level}`;
  document.getElementById("lives-display").textContent = `Lives: ${lives}`;
  document.getElementById("kills-display").textContent = `Kills: ${kills}`;
  const specialText = specialAttackReady ? "READY" : specialCooldown ? "COOLDOWN" : "LOCKED";
  document.getElementById("special-status").textContent = `Special: ${specialText}`;
  document.getElementById("terrain-display").textContent = `Terrain: ${terrain}`;
}

function updateGame() {
  if (!isGameStarted || isGameOver || isPaused) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  handleInput();
  moveBullets();

  // enemies movement and collisions handled here...

  drawPlayer();
  drawEnemies();

  updateHUD();

  requestAnimationFrame(updateGame);
}

// --- Start/Restart/Pause functions (unchanged except for showing/hiding UI screens) ---

function startGame() {
  if (!terrain) { alert("Please select a terrain first!"); return; }
  if (!selectedTank) { alert("Please select a tank first!"); return; }
  isGameStarted = true; isGameOver = false; isPaused = false;
  startScreen.style.display = "none";
  gameOverScreen.style.display = "none"; terrainScreen.style.display = "none";
  pauseScreen.style.display = "none"; tankScreen.style.display = "none";
  setTerrainBackgroundImage(terrain);
  setInterval(() => { if (!isPaused && !isGameOver && isGameStarted) createEnemy(); }, 1000);
  updateGame();
}

function restartGame() {
  player = { x: canvas.width / 2, y: canvas.height - 60, size: 20, speed: 5, color: "white", directionAngle: 0 };
  bullets = []; specialBullets = []; enemies = []; explosions = []; powerUps = []; particles = [];
  score = 0; level = 1; lives = 3; kills = 0; enemySpeed = 1; fireRate = 0.3; specialAttackReady = false;
  specialCooldown = false; isGameOver = false; isGameStarted = true; isPaused = false;
  gameOverScreen.style.display = "none"; pauseScreen.style.display = "none";
  setTerrainBackgroundImage(terrain);
  applyPlayerTank(selectedTank);
  updateHUD();
  updateGame();
}

function togglePause() {
  isPaused = !isPaused;
  pauseScreen.style.display = isPaused ? "block" : "none";
  if (!isPaused) updateGame();
}

function setTerrainBackgroundImage(terrain) {
  backgroundImage.src = terrainSettings[terrain]?.image || "";
  backgroundImage.style.opacity = "1";
}

// --- Play sound helper ---
function playSound(name) {
  if (!sounds[name]) return;
  sounds[name].pause();
  sounds[name].currentTime = 0;
  sounds[name].play().catch(() => { });
}

// --- TERRAIN AND TANK SELECTION ---

document.querySelectorAll(".terrain-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    terrain = btn.dataset.terrain;
    terrainScreen.style.display = "none";
    tankScreen.style.display = "block";
    document.getElementById("terrain-display").textContent = `Terrain: ${terrain}`;
    setTerrainBackgroundImage(terrain);
  });
});

tankButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tankButtons.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedTank = btn.dataset.tank;
    tankChooseBtn.disabled = false;
  });
});

tankChooseBtn.addEventListener("click", () => {
  if (!selectedTank) return;
  tankScreen.style.display = "none";
  startScreen.style.display = "block";
  applyPlayerTank(selectedTank);
});

// Home Buttons for pause & gameover
pauseHomeBtn.addEventListener("click", resetToHome);
gameOverHomeBtn.addEventListener("click", resetToHome);

function resetToHome() {
  isGameStarted = false;
  isGameOver = false;
  isPaused = false;
  specialAttackReady = false;
  specialCooldown = false;
  startScreen.style.display = "none";
  pauseScreen.style.display = "none";
  gameOverScreen.style.display = "none";
  tankScreen.style.display = "none";
  terrainScreen.style.display = "block";
  backgroundImage.style.opacity = "1";
  bullets = []; specialBullets = []; enemies = []; explosions = [];
  powerUps = []; particles = [];
  score = 0; level = 1; lives = 3; kills = 0; fireRate = 0.3; enemySpeed = 1;
  selectedTank = null;
  tankButtons.forEach(b => b.classList.remove("selected"));
  tankChooseBtn.disabled = true;
  updateHUD();
}
