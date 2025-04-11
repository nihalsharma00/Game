const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player = { x: canvas.width / 2, y: canvas.height / 2, size: 20 };
let bullets = [];
let enemies = [];
let specialBullets = [];
let explosions = [];
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let lives = 3;
let level = 1;
let kills = 0;
let keys = {};
let mouse = { x: 0, y: 0, down: false };
let touchStart = null;
let isGameOver = false;
let gameStarted = false;
let lastFireTime = 0;
let specialAttackAvailable = false;
let explosionCooldown = false;
let enemyInterval;

function drawPlayer() {
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();
}

function drawBullets() {
  bullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fillStyle = "yellow";
    ctx.fill();
  });
}

function drawSpecialBullets() {
  specialBullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fillStyle = "cyan";
    ctx.fill();
  });
}

function drawEnemies() {
  enemies.forEach(e => {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fillStyle = e.type === "explosive" ? "red" : "lime";
    ctx.fill();
  });
}

function drawExplosions() {
  explosions.forEach(e => {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "orange";
    ctx.stroke();
  });
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= bullets[i].speed;
    if (bullets[i].y < 0) bullets.splice(i, 1);
  }
  for (let i = specialBullets.length - 1; i >= 0; i--) {
    specialBullets[i].x += Math.cos(specialBullets[i].angle) * specialBullets[i].speed;
    specialBullets[i].y += Math.sin(specialBullets[i].angle) * specialBullets[i].speed;
    if (
      specialBullets[i].x < 0 || specialBullets[i].x > canvas.width ||
      specialBullets[i].y < 0 || specialBullets[i].y > canvas.height
    ) {
      specialBullets.splice(i, 1);
    }
  }
}

function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const dx = player.x - enemies[i].x;
    const dy = player.y - enemies[i].y;
    const dist = Math.hypot(dx, dy);
    enemies[i].x += (dx / dist) * enemies[i].speed;
    enemies[i].y += (dy / dist) * enemies[i].speed;

    if (dist < player.size + enemies[i].size) {
      enemies.splice(i, 1);
      lives--;
      if (lives <= 0) endGame();
    }
  }
}

function handleCollisions() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    for (let j = bullets.length - 1; j >= 0; j--) {
      if (Math.hypot(bullets[j].x - enemies[i].x, bullets[j].y - enemies[i].y) < enemies[i].size) {
        if (enemies[i].type === "explosive") {
          explosions.push({ x: enemies[i].x, y: enemies[i].y, radius: 50 });
        }
        enemies.splice(i, 1);
        bullets.splice(j, 1);
        score += 10;
        kills++;
        if (kills % 30 === 0) specialAttackAvailable = true;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem("highScore", highScore);
        }
        if (score >= level * 100 + level * 10) level++;
        break;
      }
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    for (let j = specialBullets.length - 1; j >= 0; j--) {
      if (Math.hypot(specialBullets[j].x - enemies[i].x, specialBullets[j].y - enemies[i].y) < enemies[i].size) {
        if (enemies[i].type === "explosive") {
          explosions.push({ x: enemies[i].x, y: enemies[i].y, radius: 50 });
        }
        enemies.splice(i, 1);
        specialBullets.splice(j, 1);
        score += 10;
        kills++;
        break;
      }
    }
  }

  if (!explosionCooldown) {
    for (let i = explosions.length - 1; i >= 0; i--) {
      if (Math.hypot(explosions[i].x - player.x, explosions[i].y - player.y) < explosions[i].radius + player.size) {
        lives--;
        explosionCooldown = true;
        setTimeout(() => explosionCooldown = false, 1000);
        explosions.splice(i, 1);
        if (lives <= 0) endGame();
      }
    }
  }
}

function handleInput() {
  if (keys["ArrowUp"] || keys["w"]) player.y -= 5;
  if (keys["ArrowDown"] || keys["s"]) player.y += 5;
  if (keys["ArrowLeft"] || keys["a"]) player.x -= 5;
  if (keys["ArrowRight"] || keys["d"]) player.x += 5;

  player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
}

function shootBullet() {
  if (Date.now() - lastFireTime > 600) {
    bullets.push({ x: player.x, y: player.y, size: 5, speed: 8 });
    lastFireTime = Date.now();
  }
}

function fireSpecialAttack() {
  if (specialAttackAvailable && specialBullets.length === 0) {
    const numBullets = 30;
    for (let i = 0; i < numBullets; i++) {
      const angle = (Math.PI * 2 * i) / numBullets;
      specialBullets.push({ x: player.x, y: player.y, size: 4, speed: 5, angle });
    }
    specialAttackAvailable = false;
  }
}

function createEnemy() {
  const size = 20;
  const x = Math.random() < 0.5 ? Math.random() * canvas.width : Math.random() < 0.5 ? 0 : canvas.width;
  const y = Math.random() < 0.5 ? Math.random() * canvas.height : Math.random() < 0.5 ? 0 : canvas.height;
  const type = Math.random() < 0.15 ? "explosive" : "normal";
  const speed = type === "explosive" ? 2 : 1.5;
  enemies.push({ x, y, size, speed, type });
}

function drawUI() {
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText(`Score: ${score}`, 20, 30);
  ctx.fillText(`High Score: ${highScore}`, 20, 60);
  ctx.fillText(`Lives: ${lives}`, 20, 90);
  ctx.fillText(`Level: ${level}`, 20, 120);
  if (specialAttackAvailable) ctx.fillText("Press J for Special Attack", 20, 150);
}

function animate() {
  if (!gameStarted) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  handleInput();
  updateBullets();
  updateEnemies();
  handleCollisions();

  drawPlayer();
  drawBullets();
  drawSpecialBullets();
  drawEnemies();
  drawExplosions();
  drawUI();

  requestAnimationFrame(animate);
}

function startGame() {
  document.getElementById("startScreen")?.classList.add("hidden");
  resetGame();
  gameStarted = true;
  enemyInterval = setInterval(createEnemy, 1000);
  animate();
}

function endGame() {
  gameStarted = false;
  isGameOver = true;
  clearInterval(enemyInterval);
  const scoreEl = document.getElementById("finalScore");
  const highEl = document.getElementById("highScore");
  if (scoreEl && highEl) {
    scoreEl.textContent = `Score: ${score}`;
    highEl.textContent = `High Score: ${highScore}`;
  }
  document.getElementById("gameOverScreen")?.classList.remove("hidden");
}

function resetGame() {
  player = { x: canvas.width / 2, y: canvas.height / 2, size: 20 };
  bullets = [];
  specialBullets = [];
  enemies = [];
  explosions = [];
  score = 0;
  lives = 3;
  level = 1;
  kills = 0;
  lastFireTime = 0;
  specialAttackAvailable = false;
  isGameOver = false;
  explosionCooldown = false;
}

function restartGame() {
  document.getElementById("gameOverScreen")?.classList.add("hidden");
  startGame();
}

document.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === "Enter") {
    if (!gameStarted) startGame();
    else if (isGameOver) restartGame();
  }
  if (e.key.toLowerCase() === "j") fireSpecialAttack();
  if (e.key.toLowerCase() === "n") shootBullet();
});

document.addEventListener("keyup", e => {
  keys[e.key] = false;
});

canvas.addEventListener("mousedown", () => mouse.down = true);
canvas.addEventListener("mouseup", () => mouse.down = false);
canvas.addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
canvas.addEventListener("click", shootBullet);

document.addEventListener("touchstart", e => {
  e.preventDefault();
  touchStart = e.touches[0];
  shootBullet();
}, { passive: false });

document.addEventListener("touchmove", e => {
  e.preventDefault();
  const touch = e.touches[0];
  const dx = touch.clientX - touchStart.clientX;
  const dy = touch.clientY - touchStart.clientY;
  player.x += dx * 0.1;
  player.y += dy * 0.1;
  touchStart = touch;
}, { passive: false });

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});
