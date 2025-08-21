const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player = {
  x: canvas.width / 2,
  y: canvas.height - 60,
  size: 20,
  speed: 5,
  color: "white",
  directionAngle: 0, // for player direction visual
};

let bullets = [];
let specialBullets = [];
let enemies = [];
let explosions = [];

let score = 0;
let level = 1;
let lives = 3;
let kills = 0;
let isGameOver = false;
let isGameStarted = false;
let specialAttackReady = false;
let specialCooldown = false;
let isPaused = false;

let keys = {};
let lastBulletTime = 0;
let fireRate = 0.6;
let enemySpeed = 1;
let highScore = localStorage.getItem("highScore") || 0;
let touchStart = null;

const specialCooldownDuration = 15000; // 15 seconds

// Sound effects
const sounds = {
  shoot: new Audio("https://freesound.org/data/previews/320/320181_5260877-lq.mp3"),
  explosion: new Audio("https://freesound.org/data/previews/178/178186_2859974-lq.mp3"),
  hurt: new Audio("https://freesound.org/data/previews/191/191839_2394245-lq.mp3"),
  levelUp: new Audio("https://freesound.org/data/previews/466/466080_10152444-lq.mp3"),
  special: new Audio("https://freesound.org/data/previews/331/331912_3248244-lq.mp3"),
};

// Event listeners
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  if (!isGameStarted && e.key === "Enter") startGame();
  else if (isGameOver && e.key === "Enter") restartGame();
  else if (e.key === "j" && specialAttackReady && !specialCooldown) triggerSpecial();
  else if (e.key === "p" && isGameStarted && !isGameOver) togglePause();
});
document.addEventListener("keyup", (e) => (keys[e.key] = false));

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
  // Optionally reposition player at center when resizing:
  player.x = canvas.width / 2;
  player.y = canvas.height - 60;
});

document.getElementById("restartBtn").addEventListener("click", restartGame);

// Functions

function shoot() {
  const now = Date.now();
  if ((now - lastBulletTime) / 1000 >= fireRate) {
    bullets.push({ x: player.x, y: player.y, size: 5, speed: 9 });
    lastBulletTime = now;
    playSound("shoot");
  }
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
    specialBullets.push({
      x: player.x,
      y: player.y,
      dx: Math.cos(rad) * 7,
      dy: Math.sin(rad) * 7,
      size: 4,
    });
    angle += 360 / count;
  }
  setTimeout(() => (specialCooldown = false), specialCooldownDuration);
}

function createEnemy() {
  const maxEnemies = 7 + level * 1;
  if (enemies.length >= maxEnemies) return;

  const explosiveChance = Math.min(0.1 + level * 0.01, 0.3);
  const isExplosive = Math.random() < explosiveChance;
  const size = isExplosive ? 25 : 20;
  const offset = 30;

  let attempts = 0;
  let x, y, validPosition = false;

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

    validPosition = !enemies.some((e) => {
      const dist = Math.hypot(x - e.x, y - e.y);
      return dist < e.size + size + 20;
    });
    attempts++;
  }

  if (!validPosition) {
    // fallback: spawn anywhere if no valid spot after attempts
    x = Math.random() * canvas.width;
    y = -offset;
  }

  enemies.push({
    id: crypto.randomUUID(),
    x,
    y,
    size,
    speed: isExplosive ? enemySpeed * 0.6 : enemySpeed,
    isExplosive,
    createdAt: Date.now(),
    exploded: false,
  });
}

function drawPlayer() {
  // Draw circle body
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fill();

  // Draw direction pointer (triangle)
  const dirRad = player.directionAngle * (Math.PI / 180);
  const pointerSize = player.size + 12;
  const tipX = player.x + Math.cos(dirRad) * pointerSize;
  const tipY = player.y + Math.sin(dirRad) * pointerSize;

  ctx.fillStyle = "cyan";
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    player.x + Math.cos(dirRad + Math.PI * 0.8) * (player.size * 0.6),
    player.y + Math.sin(dirRad + Math.PI * 0.8) * (player.size * 0.6)
  );
  ctx.lineTo(
    player.x + Math.cos(dirRad - Math.PI * 0.8) * (player.size * 0.6),
    player.y + Math.sin(dirRad - Math.PI * 0.8) * (player.size * 0.6)
  );
  ctx.closePath();
  ctx.fill();
}

function drawUI() {
  ctx.fillStyle = "white";
  ctx.font = "16px monospace";
  ctx.fillText(`Score: ${score}`, 10, 20);
  ctx.fillText(`Level: ${level}`, 10, 40);
  ctx.fillText(`Lives: ${lives}`, 10, 60);
  ctx.fillText(`Kills: ${kills}`, 10, 80);
  ctx.fillText(
    `Special: ${
      specialAttackReady ? "READY" : specialCooldown ? "COOLDOWN" : "LOCKED"
    }`,
    10,
    100
  );

  if (isPaused) {
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "22px monospace";
    ctx.fillText("PAUSED", canvas.width / 2 - 40, canvas.height / 2);
  }
}

function drawEnemies() {
  enemies.forEach((e) => {
    ctx.fillStyle = e.isExplosive ? "red" : "lime";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBullets() {
  ctx.fillStyle = "yellow";
  bullets.forEach((b) =>
    ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size)
  );
  ctx.fillStyle = "cyan";
  specialBullets.forEach((b) =>
    ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size)
  );
}

function drawExplosions() {
  explosions.forEach((ex) => {
    ctx.strokeStyle = "orange";
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function moveEnemies() {
  enemies.forEach((e) => {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    e.x += (dx / dist) * e.speed;
    e.y += (dy / dist) * e.speed;
  });
}

function moveBullets() {
  bullets.forEach((b) => (b.y -= b.speed));
  specialBullets.forEach((b) => {
    b.x += b.dx;
    b.y += b.dy;
  });
}

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
        enemies.splice(ei, 1);
        bullets.splice(bi, 1);
        increaseScore();
      }
    });

    specialBullets.forEach((b, bi) => {
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.size) {
        enemies.splice(ei, 1);
        specialBullets.splice(bi, 1);
        increaseScore();
      }
    });

    if (Math.hypot(e.x - player.x, e.y - player.y) < e.size + player.size) {
      enemies.splice(ei, 1);
      loseLife();
    }
  });

  explosions.forEach((ex, i) => {
    // Remove explosion effect after 500ms
    if (Date.now() - ex.time > 500) {
      explosions.splice(i, 1);
    }
    // If player within explosion radius
    else if (Math.hypot(ex.x - player.x, ex.y - player.y) < ex.radius + player.size) {
      explosions.splice(i, 1);
      loseLife();
    }
  });
}

function increaseScore() {
  score += 100;
  kills++;
  playSound("explosion");
  if (kills >= 20 && !specialCooldown) specialAttackReady = true;
}

function loseLife() {
  lives--;
  playSound("hurt");
  if (lives <= 0) gameOver();
}

function handleInput() {
  if (isPaused) return;

  if (keys["ArrowLeft"] || keys["a"]) {
    player.x -= player.speed;
    player.directionAngle = 180;
  }
  if (keys["ArrowRight"] || keys["d"]) {
    player.x += player.speed;
    player.directionAngle = 0;
  }
  if (keys["ArrowUp"] || keys["w"]) {
    player.y -= player.speed;
    player.directionAngle = 270;
  }
  if (keys["ArrowDown"] || keys["s"]) {
    player.y += player.speed;
    player.directionAngle = 90;
  }

  // Shoot with 'n' key
  if (keys["n"]) shoot();

  // Keep player inside canvas bounds
  player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
}

function updateGame() {
  if (!isGameStarted || isGameOver || isPaused) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  handleInput();
  moveEnemies();
  moveBullets();
  checkCollisions();

  drawPlayer();
  drawBullets();
  drawEnemies();
  drawExplosions();
  drawUI();

  // Remove bullets out of canvas bounds
  bullets = bullets.filter((b) => b.y > -20);
  specialBullets = specialBullets.filter(
    (b) => b.x > -20 && b.x < canvas.width + 20 && b.y > -20 && b.y < canvas.height + 20
  );

  // Level up and difficulty scaling
  if (score >= level * 1000) {
    level++;
    enemySpeed = 1 + level * 0.3;
    fireRate = Math.max(0.2, fireRate * 0.9);
    playSound("levelUp");
  }
  requestAnimationFrame(updateGame);
}

function startGame() {
  isGameStarted = true;
  isGameOver = false;
  isPaused = false;
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("gameOverScreen").style.display = "none";
  document.getElementById("pauseScreen").style.display = "none";

  setInterval(() => {
    if (!isPaused && !isGameOver && isGameStarted) createEnemy();
  }, 1000);

  updateGame();
}

function gameOver() {
  isGameOver = true;
  highScore = Math.max(score, highScore);
  localStorage.setItem("highScore", highScore);
  document.getElementById("finalScore").textContent = `Score: ${score}`;
  document.getElementById("highScore").textContent = `High Score: ${highScore}`;
  document.getElementById("gameOverScreen").style.display = "block";
}

function restartGame() {
  player = { x: canvas.width / 2, y: canvas.height - 60, size: 20, speed: 5, color: "white", directionAngle: 0 };
  bullets = [];
  specialBullets = [];
  enemies = [];
  explosions = [];
  score = 0;
  level = 1;
  lives = 3;
  kills = 0;
  enemySpeed = 1;
  fireRate = 0.6;
  specialAttackReady = false;
  specialCooldown = false;
  isGameOver = false;
  isGameStarted = true;
  isPaused = false;

  document.getElementById("gameOverScreen").style.display = "none";
  document.getElementById("pauseScreen").style.display = "none";

  updateGame();
}

function togglePause() {
  isPaused = !isPaused;
  const pauseUI = document.getElementById("pauseScreen");
  if (isPaused) {
    pauseUI.style.display = "block";
  } else {
    pauseUI.style.display = "none";
    updateGame();
  }
}

function playSound(name) {
  if (!sounds[name]) return;
  // Play sound with reset on each call
  sounds[name].pause();
  sounds[name].currentTime = 0;
  sounds[name].play().catch(() => {
    // Ignore play errors if audio is blocked
  });
}
