const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScoreEl = document.getElementById("finalScore");
const highScoreEl = document.getElementById("highScore");
const restartBtn = document.getElementById("restartBtn");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let bullets = [];
let enemies = [];
let explosions = [];
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let level = 1;
let kills = 0;
let specialReady = false;
let specialActive = false;
let gameStarted = false;
let gameOver = false;

const keys = {};

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (!gameStarted && e.key === "Enter") startGame();
  if (gameOver && e.key === "Enter") startGame();
  if (e.key === "j" && specialReady && !specialActive) fireSpecial();
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

restartBtn.addEventListener("click", startGame);

class Player {
  constructor() {
    this.x = canvas.width / 2;
    this.y = canvas.height - 100;
    this.radius = 20;
    this.speed = 6;
    this.lives = 3;
    this.lastShot = 0;
    this.fireRate = 600;
  }

  move() {
    if (keys["ArrowLeft"] || keys["a"]) this.x -= this.speed;
    if (keys["ArrowRight"] || keys["d"]) this.x += this.speed;
    if (keys["ArrowUp"] || keys["w"]) this.y -= this.speed;
    if (keys["ArrowDown"] || keys["s"]) this.y += this.speed;

    this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
  }

  shoot() {
    const now = Date.now();
    if (now - this.lastShot >= this.fireRate) {
      bullets.push(new Bullet(this.x, this.y));
      this.lastShot = now;
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
  }
}

class Bullet {
  constructor(x, y, dx = 0, dy = -10) {
    this.x = x;
    this.y = y;
    this.radius = 5;
    this.dx = dx;
    this.dy = dy;
  }

  update() {
    this.x += this.dx;
    this.y += this.dy;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "yellow";
    ctx.fill();
  }
}

class Enemy {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = -20;
    this.radius = 20;
    this.speed = 1 + level * 0.5;
    this.spawnTime = Date.now();
  }

  update() {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.x += (dx / dist) * this.speed;
    this.y += (dy / dist) * this.speed;

    if (Date.now() - this.spawnTime > 5000) {
      explosions.push(new Explosion(this.x, this.y));
      enemies.splice(enemies.indexOf(this), 1);
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "red";
    ctx.fill();
  }
}

class Explosion {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 60;
    this.created = Date.now();
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "orange";
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

function fireSpecial() {
  specialActive = true;
  const count = 36;
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    bullets.push(new Bullet(player.x, player.y, Math.cos(angle) * 5, Math.sin(angle) * 5));
  }
  specialReady = false;
  setTimeout(() => {
    specialActive = false;
  }, 1000);
}

function spawnEnemy() {
  if (Math.random() < 0.03 + level * 0.002) {
    enemies.push(new Enemy());
  }
}

function checkCollisions() {
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      const dist = Math.hypot(b.x - e.x, b.y - e.y);
      if (dist < b.radius + e.radius) {
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        score += 10;
        kills++;
        if (kills % 30 === 0) {
          specialReady = true;
        }
        if (score > level * 100 + level * 10) {
          level++;
        }
      }
    });
  });

  explosions.forEach((ex, i) => {
    if (Date.now() - ex.created > 300) {
      explosions.splice(i, 1);
    } else {
      const dist = Math.hypot(player.x - ex.x, player.y - ex.y);
      if (dist < ex.radius) {
        player.lives--;
        explosions.splice(i, 1);
        if (player.lives <= 0) endGame();
      }
    }
  });

  enemies.forEach((e, i) => {
    const dist = Math.hypot(player.x - e.x, player.y - e.y);
    if (dist < e.radius + player.radius) {
      player.lives--;
      enemies.splice(i, 1);
      if (player.lives <= 0) endGame();
    }
  });
}

function drawUI() {
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText(`Score: ${score}`, 20, 30);
  ctx.fillText(`Lives: ${player.lives}`, 20, 50);
  ctx.fillText(`Level: ${level}`, 20, 70);
  ctx.fillText(`Special: ${specialReady ? "READY (J)" : "Not ready"}`, 20, 90);
}

function endGame() {
  gameOver = true;
  gameStarted = false;
  finalScoreEl.innerText = score;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }
  highScoreEl.innerText = highScore;
  gameOverScreen.style.display = "flex";
}

let player;

function startGame() {
  gameStarted = true;
  gameOver = false;
  score = 0;
  kills = 0;
  level = 1;
  bullets = [];
  enemies = [];
  explosions = [];
  specialReady = false;
  specialActive = false;
  player = new Player();
  startScreen.style.display = "none";
  gameOverScreen.style.display = "none";
  requestAnimationFrame(gameLoop);
}

function gameLoop() {
  if (!gameStarted || gameOver) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  player.move();
  if (keys[" "]) player.shoot();
  player.draw();

  bullets.forEach((b, i) => {
    b.update();
    b.draw();
    if (b.y < 0 || b.x < 0 || b.x > canvas.width || b.y > canvas.height) bullets.splice(i, 1);
  });

  enemies.forEach(e => {
    e.update();
    e.draw();
  });

  explosions.forEach(e => e.draw());

  spawnEnemy();
  checkCollisions();
  drawUI();

  requestAnimationFrame(gameLoop);
}
