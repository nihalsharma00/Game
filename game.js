const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = innerWidth;
canvas.height = innerHeight;

let keys = {};
let player, bullets = [], enemies = [];
let score = 0, level = 1, kills = 0;
let specialReady = false, specialCooldown = false, lastSpecial = 0;
let lastFire = 0, fireRate = 600;
let spawnRate = 2000, lastSpawn = 0;
let gameOver = false;
let gameStarted = false;
let paused = false;

document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;

  if (e.key === 'Enter') {
    if (!gameStarted || gameOver) {
      location.reload();
    }
  }

  if (e.key === ' ') {
    if (gameStarted && !gameOver) {
      paused = !paused;
    }
  }
});

document.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

document.getElementById('restartBtn').onclick = () => location.reload();

class Player {
  constructor() {
    this.x = canvas.width / 2;
    this.y = canvas.height - 60;
    this.radius = 15;
    this.speed = 4;
    this.lives = 3;
  }

  update() {
    if (keys['arrowup'] || keys['w']) this.y -= this.speed;
    if (keys['arrowdown'] || keys['s']) this.y += this.speed;
    if (keys['arrowleft'] || keys['a']) this.x -= this.speed;
    if (keys['arrowright'] || keys['d']) this.x += this.speed;

    this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
  }
}

class Bullet {
  constructor(x, y, angle = -Math.PI / 2, speed = 8) {
    this.x = x;
    this.y = y;
    this.radius = 4;
    this.speed = speed;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'yellow';
    ctx.fill();
  }
}

class Enemy {
  constructor() {
    const edge = Math.floor(Math.random() * 4);
    const buffer = 50;
    if (edge === 0) { this.x = Math.random() * canvas.width; this.y = -buffer; }
    if (edge === 1) { this.x = canvas.width + buffer; this.y = Math.random() * canvas.height; }
    if (edge === 2) { this.x = Math.random() * canvas.width; this.y = canvas.height + buffer; }
    if (edge === 3) { this.x = -buffer; this.y = Math.random() * canvas.height; }
    this.radius = 15;
    this.speed = 1.5 + level * 0.2;
  }

  update() {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const angle = Math.atan2(dy, dx);
    this.x += Math.cos(angle) * this.speed;
    this.y += Math.sin(angle) * this.speed;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
  }
}

function fireBullet() {
  const now = Date.now();
  if (now - lastFire >= fireRate) {
    bullets.push(new Bullet(player.x, player.y));
    lastFire = now;
  }
}

function fireSpecial() {
  const now = Date.now();
  if (specialReady && !specialCooldown) {
    const totalBullets = Math.floor(50 * (1 + 0.02 * level));
    let fired = 0;
    specialReady = false;
    specialCooldown = true;
    lastSpecial = now;

    const interval = setInterval(() => {
      const angle = (Math.PI * 2 * fired) / totalBullets;
      bullets.push(new Bullet(player.x, player.y, angle));
      fired++;
      if (fired >= totalBullets) clearInterval(interval);
    }, 80);

    setTimeout(() => {
      kills = 0;
      specialCooldown = false;
    }, 15000);
  }
}

function spawnEnemies() {
  const now = Date.now();
  if (now - lastSpawn >= spawnRate) {
    enemies.push(new Enemy());
    lastSpawn = now;
  }
}

function checkCollisions() {
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      const dist = Math.hypot(b.x - e.x, b.y - e.y);
      if (dist < b.radius + e.radius) {
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        score += 100;
        kills++;
        if (!specialCooldown && kills >= 30) specialReady = true;
      }
    });
  });

  enemies.forEach((e, ei) => {
    const dist = Math.hypot(e.x - player.x, e.y - player.y);
    if (dist < e.radius + player.radius) {
      enemies.splice(ei, 1);
      player.lives--;
      if (player.lives <= 0) endGame();
    }
  });
}

function endGame() {
  gameOver = true;
  document.getElementById('gameOverScreen').style.display = 'block';
  document.getElementById('finalScore').textContent = 'Score: ' + score;
  const high = Math.max(score, localStorage.getItem('highScore') || 0);
  localStorage.setItem('highScore', high);
  document.getElementById('highScore').textContent = 'High Score: ' + high;
}

function updateUI() {
  ctx.fillStyle = 'white';
  ctx.font = '16px monospace';
  ctx.fillText(`Score: ${score}`, 10, 20);
  ctx.fillText(`Level: ${level}`, 10, 40);
  ctx.fillText(`Lives: ${player.lives}`, 10, 60);
  ctx.fillText(`Kills: ${kills}`, 10, 80);
  ctx.fillText(`Special: ${specialReady ? 'READY' : specialCooldown ? 'Cooldown' : 'Charging...'}`, 10, 100);
}

function drawStartScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  ctx.font = 'bold 40px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('▶ Press ENTER to Start', canvas.width / 2, canvas.height / 2);
}

function gameLoop() {
  if (!gameStarted) {
    drawStartScreen();
    requestAnimationFrame(gameLoop);
    return;
  }

  if (paused || gameOver) {
    requestAnimationFrame(gameLoop);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  player.update();
  player.draw();

  if (keys['n']) fireBullet();
  if (keys['j']) fireSpecial();

  spawnEnemies();
  checkCollisions();

  bullets = bullets.filter(b => b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height);
  bullets.forEach(b => { b.update(); b.draw(); });

  enemies.forEach(e => { e.update(); e.draw(); });

  if (score >= level * 1000) {
    level++;
    fireRate *= 0.9;
    spawnRate = Math.max(500, spawnRate - 100);
  }

  updateUI();
  requestAnimationFrame(gameLoop);
}

function init() {
  player = new Player();
  gameStarted = true;
  gameLoop();
}

drawStartScreen();

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !gameStarted) {
    init();
  }
});
