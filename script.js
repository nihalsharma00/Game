const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = innerWidth;
canvas.height = innerHeight;

const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const livesDisplay = document.getElementById('lives');
const killsDisplay = document.getElementById('kills');
const specialDisplay = document.getElementById('special');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScore = document.getElementById('finalScore');
const highScore = document.getElementById('highScore');
const restartButton = document.getElementById('restartButton');

let player, bullets = [], enemies = [];
let score = 0, level = 1, lives = 3, kills = 0;
let gameStarted = false, gameOver = false;
let keys = {}, mouseDown = false;
let lastShot = 0, shootInterval = 600;
let specialReady = false, killSinceLastSpecial = 0, specialUsedAt = 0;

class Player {
  constructor() {
    this.size = 20;
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.speed = 4;
    this.touching = false;
  }
  move() {
    if (keys['ArrowUp'] || keys['w']) this.y -= this.speed;
    if (keys['ArrowDown'] || keys['s']) this.y += this.speed;
    if (keys['ArrowLeft'] || keys['a']) this.x -= this.speed;
    if (keys['ArrowRight'] || keys['d']) this.x += this.speed;
    this.x = Math.max(this.size, Math.min(canvas.width - this.size, this.x));
    this.y = Math.max(this.size, Math.min(canvas.height - this.size, this.y));
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = '#0f0';
    ctx.fill();
  }
}

class Bullet {
  constructor(x, y, angle = -Math.PI / 2, speed = 7) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.radius = 5;
  }
  update() {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'yellow';
    ctx.fill();
  }
}

class Enemy {
  constructor(type = 'normal') {
    this.type = type;
    this.size = type === 'exploder' ? 20 : 15;
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) {
      this.x = 0;
      this.y = Math.random() * canvas.height;
    } else if (edge === 1) {
      this.x = canvas.width;
      this.y = Math.random() * canvas.height;
    } else if (edge === 2) {
      this.x = Math.random() * canvas.width;
      this.y = 0;
    } else {
      this.x = Math.random() * canvas.width;
      this.y = canvas.height;
    }
    this.speed = 1.5 + level * 0.2;
    this.spawnTime = Date.now();
    this.explodes = type === 'exploder';
  }
  update() {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.x += (dx / dist) * this.speed;
    this.y += (dy / dist) * this.speed;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.explodes ? 'red' : 'white';
    ctx.fill();
  }
  shouldExplode() {
    return this.explodes && Date.now() - this.spawnTime > 5000;
  }
  explode() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'orange';
    ctx.stroke();
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    if (Math.hypot(dx, dy) < this.size * 3) {
      lives--;
      checkGameOver();
    }
  }
}

function shoot() {
  if (Date.now() - lastShot > shootInterval) {
    bullets.push(new Bullet(player.x, player.y));
    lastShot = Date.now();
  }
}

function fireSpecial() {
  if (!specialReady) return;
  const total = Math.floor(50 + level * 2);
  for (let i = 0; i < total; i++) {
    const angle = (2 * Math.PI / total) * i;
    bullets.push(new Bullet(player.x, player.y, angle, 6));
  }
  specialReady = false;
  specialUsedAt = Date.now();
  killSinceLastSpecial = 0;
}

function spawnEnemy() {
  const type = Math.random() < 0.1 ? 'exploder' : 'normal';
  enemies.push(new Enemy(type));
}

function checkGameOver() {
  if (lives <= 0) {
    gameOver = true;
    gameStarted = false;
    finalScore.textContent = score;
    const hs = Math.max(score, +localStorage.getItem('highScore') || 0);
    localStorage.setItem('highScore', hs);
    highScore.textContent = hs;
    gameOverScreen.style.display = 'block';
  }
}

function updateUI() {
  scoreDisplay.textContent = score;
  levelDisplay.textContent = level;
  livesDisplay.textContent = lives;
  killsDisplay.textContent = kills;
  specialDisplay.textContent = specialReady ? 'Ready!' : 'Not Ready';
}

function animate() {
  if (!gameStarted) return requestAnimationFrame(animate);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  player.move();
  player.draw();

  bullets.forEach((b, i) => {
    b.update();
    b.draw();
    if (b.x < 0 || b.y < 0 || b.x > canvas.width || b.y > canvas.height) bullets.splice(i, 1);
  });

  enemies.forEach((e, i) => {
    e.update();
    e.draw();
    if (e.shouldExplode()) {
      e.explode();
      enemies.splice(i, 1);
    }
    bullets.forEach((b, j) => {
      if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.size) {
        bullets.splice(j, 1);
        enemies.splice(i, 1);
        score += 100;
        kills++;
        killSinceLastSpecial++;
        if (killSinceLastSpecial >= 30 && Date.now() - specialUsedAt >= 15000) specialReady = true;
      }
    });
    if (!e.explodes && Math.hypot(player.x - e.x, player.y - e.y) < e.size + player.size) {
      enemies.splice(i, 1);
      lives--;
      checkGameOver();
    }
  });

  if (score >= level * 1000) {
    level++;
    shootInterval *= 0.9;
  }

  if (Math.random() < 0.01 + level * 0.002) spawnEnemy();
  updateUI();
  requestAnimationFrame(animate);
}

function startGame() {
  player = new Player();
  bullets = [];
  enemies = [];
  score = 0;
  level = 1;
  lives = 3;
  kills = 0;
  gameStarted = true;
  gameOver = false;
  shootInterval = 600;
  killSinceLastSpecial = 0;
  specialReady = false;
  startScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';
  animate();
}

window.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (!gameStarted) startGame();
    else if (gameOver) startGame();
  }
  if (e.key === 'n') shoot();
  if (e.key === 'j') fireSpecial();
  keys[e.key] = true;
});
window.addEventListener('keyup', e => keys[e.key] = false);
window.addEventListener('mousedown', () => mouseDown = true);
window.addEventListener('mouseup', () => mouseDown = false);
canvas.addEventListener('touchstart', e => {
  const touch = e.touches[0];
  player.x = touch.clientX;
  player.y = touch.clientY;
});
canvas.addEventListener('touchmove', e => {
  const touch = e.touches[0];
  player.x = touch.clientX;
  player.y = touch.clientY;
});
restartButton.addEventListener('click', () => startGame());
canvas.addEventListener('click', () => shoot());
