const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth;
canvas.height = innerHeight;

const bg = document.getElementById("backgroundImage");

/* ─────────────── SOUND SYSTEM ─────────────── */
class SoundManager {
  constructor() { this.sounds = {}; this.muted = false; this.volume = 0.5; }
  load(name, urls, loop = false) {
    this.sounds[name] = urls.map(u => {
      const a = new Audio(u); a.volume = this.volume; a.loop = loop; return a;
    });
  }
  play(name) {
    if (this.muted || !this.sounds[name]) return;
    const s = this.sounds[name][Math.floor(Math.random() * this.sounds[name].length)];
    s.currentTime = 0; s.play().catch(() => {});
  }
}
const sound = new SoundManager();
sound.load("shoot",     ["https://freesound.org/data/previews/320/320181_5260877-lq.mp3"]);
sound.load("explosion", ["https://freesound.org/data/previews/178/178186_2859974-lq.mp3"]);
sound.load("hit",       ["https://freesound.org/data/previews/191/191839_2394245-lq.mp3"]);
sound.load("special",   ["https://freesound.org/data/previews/331/331912_3248244-lq.mp3"]);

/* ─────────────── GAME STATE ─────────────── */
let terrain = null, selectedTank = null;
let isStarted = false, isGameOver = false;

const terrainImages = {
  forest: "forest.png", ice: "snow.png",
  sahara: "desert.jpg", volcano: "unnamed.png", city: "city.png"
};

/* ─────────────── PLAYER ─────────────── */
const playerImage = new Image();
const player = {
  x: canvas.width / 2, y: canvas.height - 80,
  width: 44, height: 44, speed: 5, angle: 270,
  lastShot: 0, shootCooldown: 250
};

/* ─────────────── ENTITIES ─────────────── */
let bullets = [];        // player bullets
let enemyBullets = [];   // enemy bullets
let enemies = [];
let particles = [];
let score = 0, level = 1, lives = 3, kills = 0;
let specialReady = false, specialActive = false, specialTimer = 0;
const SPECIAL_KILLS = 20;
const SPECIAL_DURATION = 5000; // ms of invincibility + rapid fire
let killsForLevel = 10;        // kills needed to level up

/* ─────────────── INPUT ─────────────── */
const keys = {};
let mouseX = canvas.width / 2, mouseY = canvas.height / 2;

addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === "Enter" && !isStarted) startGame();
  if ((e.key === " " || e.key === "f" || e.key === "F") && isStarted) activateSpecial();
});
addEventListener("keyup", e => { keys[e.key] = false; });
canvas.addEventListener("mousemove", e => { mouseX = e.clientX; mouseY = e.clientY; });
canvas.addEventListener("mousedown", e => { if (e.button === 0) shoot(); });

/* ─────────────── UI – TERRAIN ─────────────── */
document.querySelectorAll(".terrain-btn").forEach(b => {
  b.onclick = () => {
    terrain = b.dataset.terrain;
    bg.src = terrainImages[terrain];
    document.getElementById("terrainScreen").style.display = "none";
    document.getElementById("tankScreen").style.display = "block";
  };
});

/* ─────────────── UI – TANK (all 4) ─────────────── */
document.querySelectorAll(".tank-btn").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll(".tank-btn").forEach(x => x.classList.remove("selected"));
    b.classList.add("selected");
    selectedTank = b.dataset.tank;
    playerImage.src = selectedTank + ".png";
    document.getElementById("tankChooseBtn").disabled = false;
  };
});
document.getElementById("tankChooseBtn").onclick = () => {
  document.getElementById("tankScreen").style.display = "none";
  document.getElementById("startScreen").style.display = "block";
};

/* ─────────────── PARTICLES ─────────────── */
function spawnExplosion(x, y, color = "#f39c12") {
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      x, y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      life: 1, decay: 0.03 + Math.random() * 0.04,
      size: 3 + Math.random() * 5, color
    });
  }
}

/* ─────────────── GAME LOGIC ─────────────── */
function startGame() {
  if (!terrain || !selectedTank) return;
  isStarted = true;
  document.getElementById("startScreen").style.display = "none";
  spawnLoop();
  requestAnimationFrame(loop);
}

let spawnInterval = null;
function spawnLoop() {
  if (spawnInterval) clearInterval(spawnInterval);
  const interval = Math.max(400, 1200 - (level - 1) * 80);
  spawnInterval = setInterval(spawnEnemy, interval);
}

function shoot() {
  if (!isStarted || isGameOver) return;
  const now = Date.now();
  const cooldown = specialActive ? 80 : player.shootCooldown;
  if (now - player.lastShot < cooldown) return;
  player.lastShot = now;

  const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
  bullets.push({
    x: player.x, y: player.y,
    dx: Math.cos(angle) * 10,
    dy: Math.sin(angle) * 10,
    color: specialActive ? "#00f5ff" : "#ffe44e"
  });
  sound.play("shoot");
}

function activateSpecial() {
  if (!specialReady || specialActive) return;
  specialReady = false;
  specialActive = true;
  specialTimer = Date.now() + SPECIAL_DURATION;
  kills = 0; // reset kill counter for next special
  sound.play("special");

  // Blast all current enemies
  enemies.forEach(e => spawnExplosion(e.x, e.y));
  enemies = [];
  document.getElementById("special-status").textContent = "Special: ACTIVE!";
}

function spawnEnemy() {
  if (!isStarted || isGameOver) return;
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * canvas.width; y = -40; }
  else if (edge === 1) { x = canvas.width + 40; y = Math.random() * canvas.height; }
  else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + 40; }
  else { x = -40; y = Math.random() * canvas.height; }

  enemies.push({
    x, y, w: 36, h: 28,
    speed: 1 + level * 0.25,
    angle: 0,
    hp: 1 + Math.floor(level / 3),
    maxHp: 1 + Math.floor(level / 3),
    lastShot: 0,
    shootInterval: Math.max(800, 2500 - level * 120)
  });
}

function rectsCollide(a, b) {
  return (
    a.x - a.w / 2 < b.x + b.w / 2 &&
    a.x + a.w / 2 > b.x - b.w / 2 &&
    a.y - a.h / 2 < b.y + b.h / 2 &&
    a.y + a.h / 2 > b.y - b.h / 2
  );
}

/* ─────────────── DRAW ─────────────── */
function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
  ctx.rotate(angle + Math.PI / 2); // images face up, rotate to aim at mouse
  if (specialActive) {
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 20;
  }
  ctx.drawImage(playerImage, -player.width / 2, -player.height / 2, player.width, player.height);
  ctx.restore();
}

function drawEnemyTank(e) {
  // Body
  ctx.save();
  ctx.translate(e.x, e.y);

  // Color shifts by HP
  const hpRatio = e.hp / e.maxHp;
  const r = Math.round(46 + (1 - hpRatio) * 200);
  const g = Math.round(204 - (1 - hpRatio) * 150);
  ctx.fillStyle = `rgb(${r},${g},71)`;
  ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);

  // Turret aimed at player
  e.angle = Math.atan2(player.y - e.y, player.x - e.x);
  ctx.rotate(e.angle);
  ctx.fillStyle = "#27ae60";
  ctx.fillRect(0, -3, 22, 6);
  ctx.restore();

  // HP bar
  if (e.maxHp > 1) {
    ctx.fillStyle = "#333";
    ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2 - 8, e.w, 4);
    ctx.fillStyle = hpRatio > 0.5 ? "#2ecc71" : "#e74c3c";
    ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2 - 8, e.w * hpRatio, 4);
  }
}

function drawBullets() {
  // Player bullets
  bullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = b.color || "#ffe44e";
    ctx.shadowColor = b.color || "#ffe44e";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  // Enemy bullets
  enemyBullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#e74c3c";
    ctx.shadowColor = "#e74c3c";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawSpecialBar() {
  const barW = 200, barH = 12;
  const bx = canvas.width / 2 - barW / 2;
  const by = canvas.height - 30;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);

  if (specialActive) {
    const remaining = Math.max(0, specialTimer - Date.now()) / SPECIAL_DURATION;
    ctx.fillStyle = "#00f5ff";
    ctx.fillRect(bx, by, barW * remaining, barH);
    ctx.fillStyle = "#fff";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SPECIAL ACTIVE", canvas.width / 2, by - 4);
  } else {
    const progress = Math.min(1, kills / SPECIAL_KILLS);
    const grad = ctx.createLinearGradient(bx, 0, bx + barW, 0);
    grad.addColorStop(0, "#f39c12");
    grad.addColorStop(1, specialReady ? "#00f5ff" : "#e74c3c");
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, barW * progress, barH);
    ctx.fillStyle = "#ccc";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(specialReady ? "PRESS SPACE / F" : `SPECIAL: ${kills}/${SPECIAL_KILLS}`, canvas.width / 2, by - 4);
  }
  ctx.textAlign = "left";
}

/* ─────────────── MAIN LOOP ─────────────── */
let lastTime = 0;
function loop(ts) {
  if (isGameOver) return;
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* ── Special timer ── */
  if (specialActive && Date.now() > specialTimer) {
    specialActive = false;
  }

  /* ── Player movement (aim follows mouse) ── */
  if (keys["a"] || keys["ArrowLeft"])  player.x -= player.speed;
  if (keys["d"] || keys["ArrowRight"]) player.x += player.speed;
  if (keys["w"] || keys["ArrowUp"])    player.y -= player.speed;
  if (keys["s"] || keys["ArrowDown"])  player.y += player.speed;
  player.x = Math.max(22, Math.min(canvas.width - 22, player.x));
  player.y = Math.max(22, Math.min(canvas.height - 22, player.y));

  /* Auto-shoot when mouse held (special mode only) */
  if (keys["mouse"] && specialActive) shoot();

  /* ── Move player bullets ── */
  bullets = bullets.filter(b => b.x > -10 && b.x < canvas.width + 10 && b.y > -10 && b.y < canvas.height + 10);
  bullets.forEach(b => { b.x += b.dx; b.y += b.dy; });

  /* ── Enemy update: move + shoot ── */
  const now = Date.now();
  enemies.forEach(e => {
    const dx = player.x - e.x, dy = player.y - e.y;
    const d = Math.hypot(dx, dy);
    e.x += (dx / d) * e.speed;
    e.y += (dy / d) * e.speed;

    // Enemy fires at player
    if (now - e.lastShot > e.shootInterval && d < 450) {
      e.lastShot = now;
      const spd = 4 + level * 0.3;
      enemyBullets.push({
        x: e.x, y: e.y,
        dx: (dx / d) * spd,
        dy: (dy / d) * spd
      });
    }
  });

  /* ── Move enemy bullets ── */
  enemyBullets = enemyBullets.filter(b => b.x > -10 && b.x < canvas.width + 10 && b.y > -10 && b.y < canvas.height + 10);
  enemyBullets.forEach(b => { b.x += b.dx; b.y += b.dy; });

  /* ── Collision: player bullets → enemies ── */
  const deadEnemies = new Set();
  const deadBullets = new Set();
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (deadBullets.has(bi) || deadEnemies.has(ei)) return;
      if (rectsCollide({ x: b.x, y: b.y, w: 6, h: 6 }, { x: e.x, y: e.y, w: e.w, h: e.h })) {
        e.hp--;
        deadBullets.add(bi);
        if (e.hp <= 0) {
          deadEnemies.add(ei);
          score += 100 * level;
          kills++;
          spawnExplosion(e.x, e.y);
          sound.play("explosion");
          if (kills >= SPECIAL_KILLS && !specialReady && !specialActive) {
            specialReady = true;
          }
          // Level up check
          if (kills > 0 && kills % killsForLevel === 0) {
            level++;
            spawnLoop(); // adjust spawn rate
          }
        } else {
          spawnExplosion(e.x, e.y, "#3498db"); // hit flash
        }
      }
    });
  });
  enemies = enemies.filter((_, i) => !deadEnemies.has(i));
  bullets = bullets.filter((_, i) => !deadBullets.has(i));

  /* ── Collision: enemy bullets → player ── */
  if (!specialActive) {
    const deadEB = new Set();
    enemyBullets.forEach((b, bi) => {
      if (deadEB.has(bi)) return;
      if (rectsCollide({ x: b.x, y: b.y, w: 6, h: 6 }, { x: player.x, y: player.y, w: player.width, h: player.height })) {
        deadEB.add(bi);
        lives--;
        sound.play("hit");
        spawnExplosion(player.x, player.y, "#e74c3c");
        if (lives <= 0) { gameOver(); return; }
      }
    });
    enemyBullets = enemyBullets.filter((_, i) => !deadEB.has(i));

    /* ── Collision: enemies touching player ── */
    enemies = enemies.filter(e => {
      if (rectsCollide(
        { x: player.x, y: player.y, w: player.width, h: player.height },
        { x: e.x, y: e.y, w: e.w, h: e.h }
      )) {
        lives--;
        sound.play("hit");
        spawnExplosion(e.x, e.y, "#e74c3c");
        if (lives <= 0) gameOver();
        return false;
      }
      return true;
    });
  }

  /* ── Particles ── */
  particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.life -= p.decay; p.size *= 0.97; });
  particles = particles.filter(p => p.life > 0);

  /* ── Draw everything ── */
  drawParticles();
  drawBullets();
  enemies.forEach(drawEnemyTank);
  drawPlayer();
  drawSpecialBar();

  /* ── HUD ── */
  document.getElementById("score-display").textContent = "Score: " + score;
  document.getElementById("level-display").textContent = "Level: " + level;
  document.getElementById("lives-display").textContent = "Lives: " + "❤️".repeat(Math.max(0, lives));
  if (!specialActive) {
    document.getElementById("special-status").textContent =
      specialReady ? "Special: READY (Space/F)" : `Special: ${kills}/${SPECIAL_KILLS}`;
  }

  requestAnimationFrame(loop);
}

function gameOver() {
  isGameOver = true;
  clearInterval(spawnInterval);
  document.getElementById("final-score").textContent = score;
  document.getElementById("gameOverScreen").style.display = "block";
}
