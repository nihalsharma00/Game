// Add to top of game.js:
let powerUps = [];
let powerUpDuration = 6000; // 6 seconds to collect drop
let freezeTimer = 0;
let rapidFireTimer = 0;
let swiftShadowTimer = 0;
let originalFireRate = fireRate;
let originalSpeed = player.speed;

// Define power-up types with effects and drop rates
const powerUpTypes = [
  {
    name: "Time Freeze",
    effect: () => {
      freezeTimer = 4000;
    },
    dropRate: 0.05, // 5%
    color: "blue",
  },
  {
    name: "Rapid Fire",
    effect: () => {
      rapidFireTimer = 6000;
      fireRate = originalFireRate / 2; // double fire speed
    },
    dropRate: 0.08, // 8%
    color: "red",
  },
  {
    name: "Swift Shadow",
    effect: () => {
      swiftShadowTimer = 6000;
      player.speed = originalSpeed * 1.5;
    },
    dropRate: 0.07, // 7%
    color: "purple",
  },
];

// Modify createEnemy() spawn position check to avoid near player position (4x player.size)
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

    const distToPlayer = Math.hypot(x - player.x, y - player.y);
    // Check distance from player > 4 * player size
    if (distToPlayer <= player.size * 4) {
      attempts++;
      continue;
    }

    validPosition = !enemies.some((e) => {
      const dist = Math.hypot(x - e.x, y - e.y);
      return dist < e.size + size + 20;
    });
    if (!validPosition) attempts++;
  }

  if (!validPosition) {
    // fallback: spawn anywhere outside obvious immediate near player
    let tries = 0;
    do {
      x = Math.random() * canvas.width;
      y = Math.random() * canvas.height;
      tries++;
    } while (Math.hypot(x - player.x, y - player.y) <= player.size * 4 && tries < 30);
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

// Modify score increase and special (explosive enemy) kill logic to give 1.5x score + chance to drop power-up
function increaseScore(isSpecial) {
  if (isSpecial) {
    score += 150; // 1.5x 100
    // Attempt power-up drop
    const dropChance = Math.random();
    let dropTotal = 0;
    for (const powerUp of powerUpTypes) {
      dropTotal += powerUp.dropRate;
      if (dropChance <= dropTotal) {
        dropPowerUp(powerUp);
        break;
      }
    }
  } else {
    score += 100;
  }
  kills++;
  playSound("explosion");
  if (kills >= 20 && !specialCooldown) specialAttackReady = true;
}

// Function to spawn a power-up drop at position
function dropPowerUp(powerUp) {
  powerUps.push({
    id: crypto.randomUUID(),
    x: player.x,
    y: player.y - player.size * 2,
    size: 15,
    type: powerUp,
    createdAt: Date.now(),
  });
}

// Draw power-ups on canvas
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

// Update power-ups: remove expired, check collection
function updatePowerUps() {
  const now = Date.now();

  for (let i = powerUps.length - 1; i >= 0; i--) {
    const pu = powerUps[i];
    // Remove power-up after 6s
    if (now - pu.createdAt > powerUpDuration) {
      powerUps.splice(i, 1);
      continue;
    }

    // Check collection by player
    if (Math.hypot(pu.x - player.x, pu.y - player.y) < pu.size + player.size) {
      collectPowerUp(pu.type);
      powerUps.splice(i, 1);
    }
  }
}

// When player collects power-up, activate the corresponding effect
function collectPowerUp(type) {
  playSound("special");
  type.effect();
}

// Modify checkCollisions to call increaseScore(true) on special enemy kill and add all new draw/update calls in game loop

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
        const specialKill = e.isExplosive;
        enemies.splice(ei, 1);
        bullets.splice(bi, 1);
        increaseScore(specialKill);
      }
    });

    specialBullets.forEach((b, bi) => {
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.size) {
        const specialKill = e.isExplosive;
        enemies.splice(ei, 1);
        specialBullets.splice(bi, 1);
        increaseScore(specialKill);
      }
    });

    if (Math.hypot(e.x - player.x, e.y - player.y) < e.size + player.size) {
      enemies.splice(ei, 1);
      loseLife();
    }
  });

  explosions.forEach((ex, i) => {
    if (Date.now() - ex.time > 500) {
      explosions.splice(i, 1);
    } else if (Math.hypot(ex.x - player.x, ex.y - player.y) < ex.radius + player.size) {
      explosions.splice(i, 1);
      loseLife();
    }
  });
}

// Update game loop to handle power-ups and their timers, and freeze enemies if freezeTimer active

function updateGame() {
  if (!isGameStarted || isGameOver || isPaused) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  handleInput();

  // Freeze enemies if freeze active
  if (freezeTimer > 0) {
    freezeTimer -= 16;
  } else {
    moveEnemies();
  }

  moveBullets();
  checkCollisions();

  updatePowerUps();

  drawPlayer();
  drawBullets();
  drawEnemies();
  drawExplosions();
  drawPowerUps();
  drawUI();

  // Reset effects once their timers expire
  if (rapidFireTimer > 0) {
    rapidFireTimer -= 16;
  } else {
    fireRate = originalFireRate;
  }

  if (swiftShadowTimer > 0) {
    swiftShadowTimer -= 16;
  } else {
    player.speed = originalSpeed;
  }

  bullets = bullets.filter((b) => b.y > -20);
  specialBullets = specialBullets.filter(
    (b) => b.x > -20 && b.x < canvas.width + 20 && b.y > -20 && b.y < canvas.height + 20
  );

  if (score >= level * 1000) {
    level++;
    enemySpeed = 1 + level * 0.3;
    fireRate = Math.max(0.2, fireRate * 0.9);
    playSound("levelUp");
  }
  requestAnimationFrame(updateGame);
}
