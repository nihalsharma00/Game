const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const canvasWrapper = document.getElementById("canvasWrapper");
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

// Player object with rectangular size and slightly smaller dimensions
let player = {
  x: canvas.width / 2,
  y: canvas.height - 60,
  width: 30,
  height: 20,
  speed: 5,
  color: "white",
  directionAngle: 0,
};

let bullets = [];
let specialBullets = [];
let enemies = [];
let explosions = [];
let powerUps = [];
let particles = [];

let score = 0,
  level = 1,
  lives = 3,
  kills = 0;
let isGameOver = false,
  isGameStarted = false,
  isPaused = false;
let specialAttackReady = false,
  specialCooldown = false;

let keys = {},
  lastBulletTime = 0,
  fireRate = 0.3,
  enemySpeed = 1;

let highScore = localStorage.getItem("highScore") || 0;

let touchStart = null;

const specialCooldownDuration = 15000,
  powerUpDuration = 6000;
let freezeTimer = 0,
  rapidFireTimer = 0,
  swiftShadowTimer = 0;

const originalFireRate = fireRate,
  originalSpeed = player.speed;

const terrainSettings = {
  forest: {
    background: ["#1c3420", "#0d1a0d"],
    enemyColor: "lime",
    enemySpeedMultiplier: 1,
    particleColor: "rgba(34,139,34,0.15)",
    particleCount: 70,
    particleType: "leaf",
    image: "forest.png",
  },

  ice: {
    background: ["#a5d8ff", "#040d21"],
    enemyColor: "#99ccff",
    enemySpeedMultiplier: 0.75,
    particleColor: "rgba(250, 250, 255, 0.3)",
    particleCount: 80,
    particleType: "snow",
    image: "snow.png",
  },

  sahara: {
    background: ["#f0d9a6", "#855e0f"],
    enemyColor: "#d6a941",
    enemySpeedMultiplier: 1.3,
    particleColor: "rgba(244, 196, 48, 0.25)",
    particleCount: 60,
    particleType: "dust",
    image: "desert.jpg",
  },

  volcano: {
    background: ["#7b0f0f", "#220a0a"],
    enemyColor: "#ff4500",
    enemySpeedMultiplier: 1.1,
    particleColor: "rgba(255, 69, 0, 0.25)",
    particleCount: 75,
    particleType: "ember",
    image: "unnamed.png",
  },

  city: {
    background: ["#1b1b1b", "#121212"],
    enemyColor: "#00ffff",
    enemySpeedMultiplier: 1,
    particleColor: "rgba(0, 255, 255, 0.2)",
    particleCount: 65,
    particleType: "rain",
    image: "city.png",
  },
};

const powerUpTypes = [
  {
    name: "Time Freeze",
    effect: () => {
      freezeTimer = 4000;
    },
    dropRate: 0.05,
    color: "blue",
  },

  {
    name: "Rapid Fire",
    effect: () => {
      rapidFireTimer = 6000;
      fireRate = originalFireRate / 2;
    },
    dropRate: 0.08,
    color: "red",
  },

  {
    name: "Swift Shadow",
    effect: () => {
      swiftShadowTimer = 6000;
      player.speed = originalSpeed * 1.5;
    },
    dropRate: 0.07,
    color: "purple",
  },
];

const sounds = {
  shoot: new Audio(
    "https://freesound.org/data/previews/320/320181_5260877-lq.mp3"
  ),
  explosion: new Audio(
    "https://freesound.org/data/previews/178/178186_2859974-lq.mp3"
  ),
  hurt: new Audio("https://freesound.org/data/previews/191/191839_2394245-lq.mp3"),
  levelUp: new Audio(
    "https://freesound.org/data/previews/466/466080_10152444-lq.mp3"
  ),
  special: new Audio(
    "https://freesound.org/data/previews/331/331912_3248244-lq.mp3"
  ),
};

// Terrain Select
document.querySelectorAll(".terrain-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    terrain = btn.dataset.terrain;
    terrainScreen.style.display = "none";
    tankScreen.style.display = "block";
    document.getElementById("terrain-display").textContent = `Terrain: ${terrain}`;
    setTerrainBackgroundImage(terrain);
  });
});

// Tank Select
const tankButtons = document.querySelectorAll(".tank-btn");
const tankChooseBtn = document.getElementById("tankChooseBtn");

tankButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tankButtons.forEach((b) => b.classList.remove("selected"));
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

function applyPlayerTank(tankName) {
  playerTankImage.src = tankName + ".png";
}

// Home Buttons
pauseHomeBtn.addEventListener("click", () => {
  resetToHome();
});
gameOverHomeBtn.addEventListener("click", () => {
  resetToHome();
});

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

  bullets = [];
  specialBullets = [];
  enemies = [];
  explosions = [];
  powerUps = [];
  particles = [];

  score = 0;
  level = 1;
  lives = 3;
  kills = 0;
  fireRate = 0.3;
  enemySpeed = 1;

  selectedTank = null;
  tankButtons.forEach((b) => b.classList.remove("selected"));
  tankChooseBtn.disabled = true;

  updateHUD();
}

// Start, Restart, Pause controls
document.getElementById("restartBtn").addEventListener("click", restartGame);

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  if (!isGameStarted && e.key === "Enter") startGame();
  else if (isGameOver && e.key === "Enter") restartGame();
  else if (e.key === "j" && specialAttackReady && !specialCooldown) triggerSpecial();
  else if (e.key === "p" && isGameStarted && !isGameOver) togglePause();
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

canvas.addEventListener("mousedown", () => {
  if (!isPaused && isGameStarted && !isGameOver) shoot();
});

document.addEventListener("touchstart", (e) => {
  if (!isPaused && isGameStarted && !isGameOver) shoot();
  touchStart = e.touches[0];
});

document.addEventListener("touchmove", (e) => {
  if (!touchStart) return;

  const touch = e.touches;
  const dx = touch.clientX - touchStart.clientX;
  const dy = touch.clientY - touchStart.clientY;

  player.x += dx * 0.15;
  player.y += dy * 0.15;

  touchStart = touch;
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  player.x = canvas.width / 2;
  player.y = canvas.height - 60;
  setTerrainBackgroundImage(terrain);
});

// --- Helper functions ---

// Get player's rectangular bounding box (for collisions)
function getPlayerBox() {
  return {
    x: player.x - player.width / 2,
    y: player.y - player.height / 2,
    width: player.width,
    height: player.height,
  };
}

// Rectangle intersection for hitbox collision
function rectsIntersect(r1, r2) {
  return !(
    r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y
  );
}

// Draw the player tank (rectangle with rotation and image)
function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate((player.directionAngle * Math.PI) / 180);

  if (playerTankImage.complete) {
    ctx.drawImage(
      playerTankImage,
      -player.width / 2,
      -player.height / 2,
      player.width,
      player.height
    );
  } else {
    ctx.fillStyle = player.color;
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
  }
  ctx.restore();
}

// ---- Game Logic ----

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function createEnemy() {
  const maxEnemies = 7 + level * 1;

  if (enemies.length >= maxEnemies) return;

  const explosiveChance = Math.min(0.1 + level * 0.01, 0.3);
  const isExplosive = Math.random() < explosiveChance;
  const size = isExplosive ? 25 : 20,
    offset = 30;
  let attempts = 0,
    x,
    y,
    validPosition = false;

  // Calculate player diagonal for safe spawn margin
  const playerHalfDiag = Math.sqrt(
    (player.width / 2) * (player.width / 2) + (player.height / 2) * (player.height / 2)
  );

  while (!validPosition && attempts < 30) {
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) {
      x = Math.random() * canvas.width;
      y = -offset;
    } else if (edge === 1) {
      x = canvas.width + offset;
      y = Math.random() * canvas.height;
    } else if (edge === 2) {
      x = Math.random() * canvas.width;
      y = canvas.height + offset;
    } else {
      x = -offset;
      y = Math.random() * canvas.height;
    }

    if (Math.hypot(x - player.x, y - player.y) <= playerHalfDiag * 4) {
      attempts++;
      continue;
    }

    validPosition = !enemies.some((e) => Math.hypot(x - e.x, y - e.y) < size * 2);
  }

  if (!validPosition) return;

  enemies.push({
    x,
    y,
    size,
    isExplosive,
    exploded: false,
    speed: enemySpeed * terrainSettings[terrain].enemySpeedMultiplier,
    createdAt: Date.now(),
  });
}

function drawEnemies() {
  enemies.forEach((e) => {
    ctx.fillStyle = terrainSettings[terrain]?.enemyColor || (e.isExplosive ? "red" : "lime");
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBullets() {
  ctx.fillStyle = "yellow";
  bullets.forEach((b) => ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size));
  ctx.fillStyle = "cyan";
  specialBullets.forEach((b) => ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size));
}

// Player collision with enemies checking rectangular hitbox
function checkPlayerCollisionWithEnemy() {
  const playerBox = getPlayerBox();

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const enemyBox = {
      x: e.x - e.size,
      y: e.y - e.size,
      width: e.size * 2,
      height: e.size * 2,
    };

    if (rectsIntersect(playerBox, enemyBox)) {
      handlePlayerHit();
      enemies.splice(i, 1);
      playSound("hurt");
    }
  }
}

// Move enemies logic
function moveEnemies() {
  if (freezeTimer > 0) return;
  enemies.forEach((e) => {
    const dx = player.x - e.x,
      dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    e.x += (dx / dist) * e.speed;
    e.y += (dy / dist) * e.speed;
  });
}

// Move bullets logic
function moveBullets() {
  bullets.forEach((b) => {
    b.x += b.dx;
    b.y += b.dy;
  });
  specialBullets.forEach((b) => {
    b.x += b.dx;
    b.y += b.dy;
  });
}

// Collision checks (player collision updated to rectangles)
function checkCollisions() {
  enemies.forEach((e, ei) => {
    if (e.isExplosive && !e.exploded && Date.now() - e.createdAt >= 5000) {
      explosions.push({ x: e.x, y: e.y, radius: e.size * 3, time: Date.now() });
      e.exploded = true;
      enemies.splice(ei, 1);
      playSound("explosion");
      return;
    }

    bullets.forEach((b, bi) => {
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.size) {
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        increaseScore(false);
        playSound("explosion");
        if (kills >= 20 && !specialCooldown) specialAttackReady = true;
        return;
      }
    });
  });

  // Check player collision separately as rectangle-rectangle
  checkPlayerCollisionWithEnemy();
}

function drawExplosions() {
  explosions.forEach((ex, i) => {
    ctx.strokeStyle = "orange";
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
    ctx.stroke();

    if (Date.now() - ex.time > 500) {
      explosions.splice(i, 1);
    }
  });
}

function createParticles() {
  if (!terrain) return;
  const settings = terrainSettings[terrain];
  while (particles.length < settings.particleCount) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: Math.random() * 0.7 + 0.3,
      color: settings.particleColor,
      type: settings.particleType,
    });
  }
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.fillStyle = p.color;
    switch (p.type) {
      case "snow":
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "rain":
        ctx.beginPath();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 1, p.y + 10);
        ctx.stroke();
        break;
      case "leaf":
      case "dust":
      case "ember":
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * 1.5, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  });
}

function dropPowerUp(powerUp) {
  powerUps.push({
    id: crypto.randomUUID(),
    x: player.x,
    y: player.y - player.height,
    size: 15,
    type: powerUp,
    createdAt: Date.now(),
  });
}

function drawPowerUps() {
  powerUps.forEach((pu) => {
    ctx.fillStyle = pu.type.color;
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, pu.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(pu.type.name, pu.x, pu.y - pu.size - 5);
  });
}

function updatePowerUps() {
  const now = Date.now();
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const pu = powerUps[i];
    if (now - pu.createdAt > powerUpDuration) {
      powerUps.splice(i, 1);
      continue;
    }
    // Pickup check (simple circle to rectangle approx)
    const playerBox = getPlayerBox();
    if (
      pu.x > playerBox.x &&
      pu.x < playerBox.x + playerBox.width &&
      pu.y > playerBox.y &&
      pu.y < playerBox.y + playerBox.height
    ) {
      pu.type.effect();
      powerUps.splice(i, 1);
      playSound("levelUp");
    }
  }
}

function updateHUD() {
  document.getElementById("scoreDisplay").textContent = `Score: ${score}`;
  document.getElementById("levelDisplay").textContent = `Level: ${level}`;
  document.getElementById("livesDisplay").textContent = `Lives: ${lives}`;
  document.getElementById("killsDisplay").textContent = `Kills: ${kills}`;
  document.getElementById("special-status").textContent = specialAttackReady
    ? "Special Ready (Press J)"
    : "Special Not Ready";
}

function shoot() {
  const now = Date.now();
  if (now - lastBulletTime < fireRate * 1000) return;

  const rad = (player.directionAngle * Math.PI) / 180;
  const speed = 9;

  bullets.push({
    x: player.x,
    y: player.y,
    size: 5,
    dx: Math.cos(rad) * speed,
    dy: Math.sin(rad) * speed,
  });

  lastBulletTime = now;
  playSound("shoot");
}

function triggerSpecial() {
  specialAttackReady = false;
  specialCooldown = true;
  kills = 0;
  playSound("special");

  let angle = 0;
  const count = Math.floor(50 + level * 2);
  for (let i = 0; i < count; i++) {
    const rad = (angle * Math.PI) / 180;
    const speed = 7;

    specialBullets.push({
      x: player.x,
      y: player.y,
      size: 7,
      dx: Math.cos(rad) * speed,
      dy: Math.sin(rad) * speed,
    });

    angle += 360 / count;
  }

  setTimeout(() => {
    specialCooldown = false;
  }, specialCooldownDuration);
}

function updateGame() {
  drawBackground();
  drawParticles();
  drawPowerUps();
  drawEnemies();
  drawBullets();
  drawExplosions();
  drawPlayer();

  moveEnemies();
  moveBullets();

  updatePowerUps();

  checkCollisions();

  if (freezeTimer > 0) freezeTimer -= 16;
  if (rapidFireTimer > 0) rapidFireTimer -= 16;
  else fireRate = originalFireRate;
  if (swiftShadowTimer > 0) swiftShadowTimer -= 16;
  else player.speed = originalSpeed;

  if (score >= level * 1000) {
    level++;
    enemySpeed = 1 + level * 0.3;
    fireRate = Math.max(0.2, fireRate * 0.9);
    playSound("levelUp");
  }

  updateHUD();

  if (!isPaused && !isGameOver && isGameStarted) requestAnimationFrame(updateGame);
}

function restartGame() {
  player = {
    x: canvas.width / 2,
    y: canvas.height - 60,
    width: 30,
    height: 20,
    speed: 5,
    color: "white",
    directionAngle: 0,
  };

  bullets = [];
  specialBullets = [];
  enemies = [];
  explosions = [];
  powerUps = [];
  particles = [];

  score = 0;
  level = 1;
  lives = 3;
  kills = 0;
  enemySpeed = 1;
  fireRate = 0.3;
  specialAttackReady = false;
  specialCooldown = false;
  isGameOver = false;
  isGameStarted = true;
  isPaused = false;

  gameOverScreen.style.display = "none";
  pauseScreen.style.display = "none";
  setTerrainBackgroundImage(terrain);
  applyPlayerTank(selectedTank);
  updateHUD();
  updateGame();
}

function startGame() {
  if (!terrain) {
    alert("Please select a terrain first!");
    return;
  }
  if (!selectedTank) {
    alert("Please select a tank first!");
    return;
  }

  isGameStarted = true;
  isGameOver = false;
  isPaused = false;

  startScreen.style.display = "none";
  gameOverScreen.style.display = "none";
  terrainScreen.style.display = "none";
  pauseScreen.style.display = "none";
  tankScreen.style.display = "none";

  setTerrainBackgroundImage(terrain);

  setInterval(() => {
    if (!isPaused && !isGameOver && isGameStarted) createEnemy();
  }, 1000);

  updateGame();
}

function togglePause() {
  isPaused = !isPaused;
  pauseScreen.style.display = isPaused ? "block" : "none";
  if (!isPaused) updateGame();
}

function playSound(name) {
  if (!sounds[name]) return;
  sounds[name].pause();
  sounds[name].currentTime = 0;
  sounds[name].play().catch(() => {});
}

function setTerrainBackgroundImage(terrain) {
  backgroundImage.src = terrainSettings[terrain]?.image || "";
  backgroundImage.style.opacity = "1";
}

// Additional required functions such as increaseScore(), handlePlayerHit() etc. should also be included here as from your original code to ensure full game functionality.

