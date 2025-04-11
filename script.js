const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player = {
    x: canvas.width / 2,
    y: canvas.height - 60,
    size: 20,
    speed: 5
};

let bullets = [];
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
let keys = {};
let lastBulletTime = 0;
let fireRate = 0.6; // seconds
let enemySpeed = 1;
let playerSpeed = 5;
let bulletInterval;
let touchStart = null;
let highScore = localStorage.getItem("highScore") || 0;

// Spiral attack
let specialBullets = [];

document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (!isGameStarted && e.key === "Enter") startGame();
    if (isGameOver && e.key === "Enter") restartGame();
    if (e.key === "j" && specialAttackReady && !specialCooldown) triggerSpecial();
});
document.addEventListener("keyup", (e) => keys[e.key] = false);
canvas.addEventListener("mousedown", () => shoot());
document.addEventListener("touchstart", (e) => touchStart = e.touches[0]);
document.addEventListener("touchmove", (e) => {
    if (!touchStart) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStart.clientX;
    const dy = touch.clientY - touchStart.clientY;
    player.x += dx * 0.1;
    player.y += dy * 0.1;
    touchStart = touch;
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
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? 0 : canvas.width;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? 0 : canvas.height;
    }
    const enemy = {
        x,
        y,
        size,
        speed: isExplosive ? enemySpeed * 0.8 : enemySpeed,
        isExplosive,
        createdAt: Date.now()
    };
    enemies.push(enemy);
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
    ctx.fillText(Score: ${score}, 10, 20);
    ctx.fillText(Level: ${level}, 10, 40);
    ctx.fillText(Lives: ${lives}, 10, 60);
    ctx.fillText(Kills: ${kills}, 10, 80);
    ctx.fillText(Special: ${specialAttackReady ? "READY" : specialCooldown ? "COOLDOWN" : "LOCKED"}, 10, 100);
}

function drawEnemies() {
    enemies.forEach(e => {
        ctx.fillStyle = e.isExplosive ? "red" : "lime";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawBullets() {
    ctx.fillStyle = "yellow";
    bullets.forEach(b => ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size));
    ctx.fillStyle = "cyan";
    specialBullets.forEach(b => ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size));
}

function drawExplosions() {
    explosions.forEach(ex => {
        ctx.strokeStyle = "orange";
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
        ctx.stroke();
    });
}

function moveEnemies() {
    enemies.forEach(e => {
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy);
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
    });
}

function moveBullets() {
    bullets.forEach(b => b.y -= b.speed);
    specialBullets.forEach(b => {
        b.x += b.dx;
        b.y += b.dy;
    });
}

function checkCollisions() {
    enemies.forEach((e, i) => {
        bullets.forEach((b, j) => {
            if (Math.hypot(b.x - e.x, b.y - e.y) < e.size) {
                enemies.splice(i, 1);
                bullets.splice(j, 1);
                score += 100;
                kills++;
                if (kills >= 30 && !specialCooldown) specialAttackReady = true;
            }
        });
        specialBullets.forEach((b, j) => {
            if (Math.hypot(b.x - e.x, b.y - e.y) < e.size) {
                enemies.splice(i, 1);
                specialBullets.splice(j, 1);
                score += 100;
                kills++;
                if (kills >= 30 && !specialCooldown) specialAttackReady = true;
            }
        });
        if (Math.hypot(e.x - player.x, e.y - player.y) < e.size + player.size) {
            enemies.splice(i, 1);
            lives--;
        }
        if (e.isExplosive && Date.now() - e.createdAt > 5000) {
            explosions.push({ x: e.x, y: e.y, radius: e.size * 3, time: Date.now() });
            enemies.splice(i, 1);
        }
    });
    explosions.forEach((ex, i) => {
        if (Math.hypot(ex.x - player.x, ex.y - player.y) < ex.radius + player.size) {
            lives--;
            explosions.splice(i, 1);
        }
    });
}

function updateGame() {
    if (!isGameStarted || isGameOver) return;

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

    bullets = bullets.filter(b => b.y > 0);
    specialBullets = specialBullets.filter(b => b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height);
    explosions = explosions.filter(e => Date.now() - e.time < 500);

    if (score >= level * 1000) {
        level++;
        enemySpeed = 1 + level * 0.3;
        fireRate = Math.max(0.2, fireRate * 0.9);
    }

    if (lives <= 0) {
        gameOver();
    }

    requestAnimationFrame(updateGame);
}

function handleInput() {
    if (keys["ArrowLeft"] || keys["a"]) player.x -= player.speed;
    if (keys["ArrowRight"] || keys["d"]) player.x += player.speed;
    if (keys["ArrowUp"] || keys["w"]) player.y -= player.speed;
    if (keys["ArrowDown"] || keys["s"]) player.y += player.speed;
    if (keys["n"]) shoot();
}

function startGame() {
    isGameStarted = true;
    document.getElementById("startScreen").style.display = "none";
    setInterval(createEnemy, 1000);
    updateGame();
}

function gameOver() {
    isGameOver = true;
    highScore = Math.max(score, highScore);
    localStorage.setItem("highScore", highScore);
    document.getElementById("finalScore").textContent = Score: ${score};
    document.getElementById("highScore").textContent = High Score: ${highScore};
    document.getElementById("gameOverScreen").style.display = "block";
}

function restartGame() {
    player = { x: canvas.width / 2, y: canvas.height - 60, size: 20, speed: 5 };
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
    isGameStarted = false;
    document.getElementById("gameOverScreen").style.display = "none";
    document.getElementById("startScreen").style.display = "block";
}
