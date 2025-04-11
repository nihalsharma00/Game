const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = innerWidth;
canvas.height = innerHeight;

let player, bullets = [], enemies = [], score = 0, level = 1, lives = 3, kills = 0;
let canShoot = true, shootCooldown = 600, lastShotTime = 0;
let isGameRunning = false, isGameOver = false;
let mouseX = canvas.width / 2, mouseY = canvas.height / 2;
let keys = {};
let specialUnlocked = false, specialCooldown = false;
let spawnTimer = 0, spawnInterval = 1000, maxEnemies = 20;

document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === 'Enter') {
    if (!isGameRunning) startGame();
    else if (isGameOver) restartGame();
  }
  if (e.key === 'j' || e.key === 'J') useSpecial();
});

document.addEventListener('keyup', e => keys[e.key] = false);
document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});
document.addEventListener('mousedown', () => shoot());
document.addEventListener('touchstart', e => {
  if (!isGameRunning) startGame();
  else shoot();
}, { passive: false });

class Player {
  constructor() {
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.radius = 20;
    this.speed = 4;
  }

  move() {
    if (keys['w'] || keys['ArrowUp']) this.y -= this.speed;
    if (keys['s'] || keys['ArrowDown']) this.y += this.speed;
    if (keys['a'] || keys['ArrowLeft']) this.x -= this.speed;
    if (keys['d'] || keys['ArrowRight']) this.x += this.speed;

    // Limit to screen
    this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0ff';
    ctx.fill();
  }
}

class Bullet {
  constructor(x, y, angle = -Math.PI / 2, speed = 8) {
    this.x = x;
    this.y = y;
    this.radius = 5;
    this.speed = speed;
    this.angle = angle;
  }

  update() {
    this.x += this.speed * Math.cos(this.angle);
    this.y += this.speed * Math.sin(this.angle);
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
}

class Enemy {
  constructor(x, y, isSpecial = false) {
    this.x = x;
    this.y = y;
    this.radius = isSpecial ? 20 : 15;
    this.isSpecial = isSpecial;
    this.speed = isSpecial ? 1.5 : 2 + level * 0.2;
    this.spawnTime = Date.now();
  }

  update() {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const angle = Math.atan2(dy, dx);
    this.x += Math.cos(angle) * this.speed;
    this.y += Math.sin(angle) * this.speed;

    if (this.isSpecial && Date.now() - this.spawnTime > 5000) {
      this.explode();
    }
  }

  explode() {
    const dist = Math.hypot(this.x - player.x, this.y - player.y);
    if (dist < this.radius * 3) {
      lives--;
      checkGameOver();
    }
    enemies = enemies.filter(e => e !== this);
    drawExplosion(this.x, this.y);
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.isSpecial ? 'orange' : 'red';
    ctx.fill();
  }
}

function drawExplosion(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 60, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,165,0,0.4)';
  ctx.fill();
}

function shoot() {
  if (Date.now() - lastShotTime >= shootCooldown && isGameRunning) {
    bullets.push(new Bullet(player.x, player.y));
    lastShotTime = Date.now();
  }
}

function useSpecial() {
  if (kills >= 30 && !specialCooldown && isGameRunning) {
    let bulletCount = Math.floor(50 + level * 2);
    for (let i = 0; i < bulletCount; i++) {
      const angle = (2 * Math.PI * i) / bulletCount;
      bullets.push(new Bullet(player.x, player.y, angle, 6));
    }
    kills = 0;
    specialCooldown = true;
    setTimeout(() => specialCooldown = false, 15000);
  }
}

function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * canvas.width; y = -20; }
  else if (edge === 1) { x = canvas.width + 20; y = Math.random() * canvas.height; }
  else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + 20; }
  else { x = -20; y = Math.random() * canvas.height; }

  const isSpecial = Math.random() < 0.1;
  enemies.push(new Enemy(x, y, isSpecial));
}

function updateGame(deltaTime) {
  player.move();
  bullets.forEach(b => b.update());
  bullets = bullets.filter(b => b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height);

  enemies.forEach(e => e.update());

  // Check bullet collisions
  bullets.forEach(bullet => {
    enemies.forEach(enemy => {
      const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
      if (dist < bullet.radius + enemy.radius) {
        bullets = bullets.filter(b => b !== bullet);
        enemies = enemies.filter(e => e !== enemy);
        score += 100;
        kills++;

        if (score >= level * 1000) {
          level++;
          shootCooldown = Math.max(100, shootCooldown * 0.9);
          spawnInterval = Math.max(300, spawnInterval - 50);
        }
      }
    });
  });

  // Check player collision
  enemies.forEach(enemy => {
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (!enemy.isSpecial && dist < enemy.radius + player.radius) {
      enemies = enemies.filter(e => e !== enemy);
      lives--;
      checkGameOver();
    }
  });

  // Spawn control
  spawnTimer += deltaTime;
  if (spawnTimer >= spawnInterval && enemies.length < maxEnemies) {
    spawnEnemy();
    spawnTimer = 0;
  }
}

function drawUI() {
  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  ctx.fillText(`Score: ${score}`, 10, 20);
  ctx.fillText(`Level: ${level}`, 10, 40);
  ctx.fillText(`Lives: ${lives}`, 10, 60);
  ctx.fillText(`Kills: ${kills}`, 10, 80);
  ctx.fillText(`Special: ${kills >= 30 && !specialCooldown ? "Ready (J)" : specialCooldown ? "Cooldown" : "Locked"}`, 10, 100);
}

let lastTime = 0;
function animate(time = 0) {
  if (!isGameRunning) return;
  const deltaTime = time - lastTime;
  lastTime = time;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  player.draw();
  bullets.forEach(b => b.draw());
  enemies.forEach(e => e.draw());
  drawUI();

  updateGame(deltaTime);
  if (!isGameOver) requestAnimationFrame(animate);
}

function startGame() {
  document.getElementById('startScreen').style.display = 'none';
  isGameRunning = true;
  isGameOver = false;
  player = new Player();
  bullets = [];
  enemies = [];
  score = 0;
  level = 1;
  lives = 3;
  kills = 0;
  shootCooldown = 600;
  spawnInterval = 1000;
  lastTime = performance.now();
  requestAnimationFrame(animate);
}

function restartGame() {
  document.getElementById('gameOverScreen').style.display = 'none';
  startGame();
}

function checkGameOver() {
  if (lives <= 0) {
    isGameOver = true;
    isGameRunning = false;
    document.getElementById('gameOverScreen').style.display = 'flex';
    document.getElementById('finalScore').textContent = `Your Score: ${score}`;
    const highScore = Math.max(score, localStorage.getItem('highScore') || 0);
    localStorage.setItem('highScore', highScore);
    document.getElementById('highScore').textContent = `High Score: ${highScore}`;
  }
}
