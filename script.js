const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player, bullets, enemies, specialBullets, explosions;
let score, level, lives, kills, isGameOver, isGameStarted;
let specialAttackReady, specialCooldown, keys, lastBulletTime, fireRate, enemySpeed;
let highScore = localStorage.getItem("highScore") || 0;
let touchStart = null, lastHitTime = 0;
let enemyInterval = null;

function init() {
  player = {
    x: canvas.width / 2,
    y: canvas.height - 60,
    size: 20,
    speed: 5
  };
  bullets = [];
  enemies = [];
  specialBullets = [];
  explosions = [];
  score = 0;
  level = 1;
  lives = 3;
  kills = 0;
  isGameOver = false;
  isGameStarted = false;
  specialAttackReady = false;
  specialCooldown = false;
  keys = {};
  lastBulletTime = 0;
  fireRate = 0.6;
  enemySpeed = 1;
  clearInterval(enemyInterval);
}

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (!isGameStarted && e.key === "Enter") startGame();
  if (isGameOver && e.key === "Enter") restartGame();
  if (e.key === "j" && specialAttackReady && !specialCooldown) triggerSpecial();
});
document.addEventListener("keyup", (e) => keys[e.key] = false);
canvas.addEventListener("mousedown", shoot);
document.getElementById("fireButton").addEventListener("touchstart", shoot);
document.addEventListener("touchstart", e => touchStart = e.touches[0]);
document.addEventListener("touchmove", e => {
  if (!touchStart) return;
  const touch = e.touches[0];
  player.x += (touch.clientX - touchStart.clientX) * 0.1;
  player.y += (touch.clientY - touchStart.clientY) * 0.1;
  touchStart = touch;
});
document.addEventListener("touchend", () => {
  if (!isGameStarted) startGame();
  if (isGameOver) restartGame();
});
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

function shoot() {
  const now = Date.now();
  if ((now - lastBulletTime) / 1000 >= fireRate) {
    bullets.push({ x: player.x, y: player.y, size: 5, speed: 7 });
    lastBulletTime = now;
  }
}

function triggerSpecial() {
  specialAttackReady = false;
  specialCooldown = true;
  kills = 0;
  let angle = 0;
  const count = Math.floor(50 + level * 2);
  for (let i = 0; i < count; i++) {
    const rad = angle * Math.PI / 180;
    specialBullets.push({
      x: player.x,
      y: player.y,
      dx: Math.cos(rad) * 5,
      dy: Math.sin(rad) * 5,
      size: 4
    });
    angle += 360 / count;
  }
  setTimeout(() => specialCooldown = false, 15000);
}

function createEnemy() {
  const isExplosive = Math.random() < 0.1;
  const size = isExplosive ? 25 : 20;
  let x = Math.random() < 0.5 ? (Math.random() < 0.5 ? 0 : canvas.width) : Math.random() * canvas.width;
  let y = Math.random() < 0.5 ? (Math.random() < 0.5 ? 0 : canvas.height) : Math.random() * canvas.height;
  enemies.push({ x, y, size, speed: isExplosive ? enemySpeed * 0.8 : enemySpeed, isExplosive, createdAt: Date.now() });
}

function drawPlayer() {
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fill();
}

function drawUI() {
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText(`Score: ${score}`, 10, 20);
  ctx.fillText(`Level: ${level}`, 10, 40);
  ctx.fillText(`Lives: ${lives}`, 10, 60);
  ctx.fillText(`Kills: ${kills}`, 10, 80);
  ctx.fillText(`Special: ${specialAttackReady ? "READY" : specialCooldown ? "COOLDOWN" : "LOCKED"}`, 10, 100);
}

function drawEntities() {
  ctx.fillStyle = "lime";
  enemies.forEach(e => {
    ctx.fillStyle = e.isExplosive ? "red" : "lime";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "yellow";
  bullets.forEach(b => ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size));
  ctx.fillStyle = "cyan";
  specialBullets.forEach(b => ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size));
  explosions.forEach(ex => {
    ctx.strokeStyle = "orange";
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function moveEntities() {
  enemies.forEach(e => {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);
    e.x += (dx / dist) * e.speed;
    e.y += (dy / dist) * e.speed;
  });
  bullets.forEach(b => b.y -= b.speed);
  specialBullets.forEach(b => {
    b.x += b.dx;
    b.y += b.dy;
  });
}

function checkCollisions() {
  const now = Date.now();
  enemies = enemies.filter((e, i) => {
    bullets = bullets.filter((b, j) => {
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.size) {
        score += 100;
        kills++;
        if (kills >= 30 && !specialCooldown) specialAttackReady = true;
        return false;
      }
      return true;
    });
    specialBullets = specialBullets.filter((b, j) => {
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.size) {
        score += 100;
        kills++;
        if (kills >= 30 && !specialCooldown) specialAttackReady = true;
        return false;
      }
      return true;
    });

    if (Math.hypot(e.x - player.x, e.y - player.y) < e.size + player.size) {
      if (now - lastHitTime > 1000) {
        lives--;
        lastHitTime = now;
      }
      return false;
    }

    if (e.isExplosive && now - e.createdAt > 5000) {
      explosions.push({ x: e.x, y: e.y, radius: e.size * 3, time: now });
      return false;
    }

    return true;
  });

  explosions = explosions.filter((ex, i) => {
    if (now - ex.time < 500) {
      if (Math.hypot(ex.x - player.x, ex.y - player.y) < ex.radius + player.size) {
        if (now - lastHitTime > 1000) {
          lives--;
          lastHitTime = now;
        }
      }
      return true;
    }
    return false;
  });
}

function handleInput() {
  if (keys["ArrowLeft"] || keys["a"]) player.x -= player.speed;
  if (keys["ArrowRight"] || keys["d"]) player.x += player.speed;
  if (keys["ArrowUp"] || keys["w"]) player.y -= player.speed;
  if (keys["ArrowDown"] || keys["s"]) player.y += player.speed;
  if (keys["n"]) shoot();

  player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
}

function updateGame() {
  if (!isGameStarted || isGameOver) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  handleInput();
  moveEntities();
  checkCollisions();
  drawPlayer();
  drawEntities();
  drawUI();

  bullets = bullets.filter(b => b.y > 0);
  specialBullets = specialBullets.filter(b =>
    b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height
  );

  if (score >= level * 1000) {
    level++;
    enemySpeed = 1 + level * 0.3;
    fireRate = Math.max(0.2, fireRate * 0.9);
  }

  if (lives <= 0) gameOver();

  requestAnimationFrame(updateGame);
}

function startGame() {
  isGameStarted = true;
  document.getElementById("startScreen").style.display = "none";
  enemyInterval = setInterval(createEnemy, 1000);
  updateGame();
}

function gameOver() {
  isGameOver = true;
  clearInterval(enemyInterval);
  highScore = Math.max(score, highScore);
  localStorage.setItem("highScore", highScore);
  document.getElementById("finalScore").textContent = `Score: ${score}`;
  document.getElementById("highScore").textContent = `High Score: ${highScore}`;
  document.getElementById("gameOverScreen").style.display = "flex";
}

function restartGame() {
  init();
  document.getElementById("gameOverScreen").style.display = "none";
  document.getElementById("startScreen").style.display = "flex";
}

init();
