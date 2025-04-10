const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player, bullets = [], enemies = [], score = 0, level = 1, lives = 3, kills = 0;
let gameStarted = false, gameOver = false, lastShot = 0, shootInterval = 600;
let specialReady = false, specialUsedAt = 0, killSinceLastSpecial = 0;
let keys = {}, mouse = { x: canvas.width / 2, y: canvas.height / 2 }, dragging = false;
let highScore = localStorage.getItem('highScore') || 0;

const ui = document.getElementById('gameUI');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreText = document.getElementById('finalScore');
const highScoreText = document.getElementById('highScore');
const restartButton = document.getElementById('restartButton');

class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.size = 20;
        this.speed = 4;
    }

    move() {
        if (keys['ArrowUp'] || keys['w']) this.y -= this.speed;
        if (keys['ArrowDown'] || keys['s']) this.y += this.speed;
        if (keys['ArrowLeft'] || keys['a']) this.x -= this.speed;
        if (keys['ArrowRight'] || keys['d']) this.x += this.speed;

        if (dragging) {
            this.x += (mouse.x - this.x) * 0.15;
            this.y += (mouse.y - this.y) * 0.15;
        }

        this.x = Math.max(this.size, Math.min(canvas.width - this.size, this.x));
        this.y = Math.max(this.size, Math.min(canvas.height - this.size, this.y));
    }

    draw() {
        ctx.fillStyle = '#0f0';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Bullet {
    constructor(x, y, angle = -Math.PI / 2, speed = 7) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.speed = speed;
        this.angle = angle;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw() {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Enemy {
    constructor(x, y, isExplosive = false) {
        this.x = x;
        this.y = y;
        this.size = isExplosive ? 18 : 14;
        this.speed = 1.5 + level * 0.1;
        this.spawnedAt = Date.now();
        this.explodes = isExplosive;
    }

    update() {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
    }

    draw() {
        ctx.fillStyle = this.explodes ? 'orange' : 'red';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    shouldExplode() {
        return this.explodes && Date.now() - this.spawnedAt >= 5000;
    }

    explode() {
        ctx.strokeStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
        ctx.stroke();

        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= this.size * 3) {
            lives--;
            checkGameOver();
        }
    }
}

function spawnEnemy() {
    const isExplosive = Math.random() < 0.1;
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) { x = Math.random() * canvas.width; y = -30; }
    else if (edge === 1) { x = canvas.width + 30; y = Math.random() * canvas.height; }
    else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + 30; }
    else { x = -30; y = Math.random() * canvas.height; }

    enemies.push(new Enemy(x, y, isExplosive));
}

function fireBullet(angle = -Math.PI / 2) {
    if (Date.now() - lastShot >= shootInterval) {
        bullets.push(new Bullet(player.x, player.y - player.size, angle));
        lastShot = Date.now();
    }
}

function fireSpecial() {
    if (!specialReady) return;
    specialReady = false;
    killSinceLastSpecial = 0;
    specialUsedAt = Date.now();
    const count = Math.floor(50 * (1 + level * 0.02));
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        bullets.push(new Bullet(player.x, player.y, angle, 6));
    }
}

function checkGameOver() {
    if (lives <= 0) {
        gameOver = true;
        gameOverScreen.style.display = 'block';
        finalScoreText.innerText = `Score: ${score}`;
        highScore = Math.max(score, highScore);
        localStorage.setItem('highScore', highScore);
        highScoreText.innerText = `High Score: ${highScore}`;
    }
}

function updateUI() {
    ui.innerHTML = `Score: ${score}<br>Level: ${level}<br>Lives: ${lives}<br>Kills: ${kills}<br>Special: ${specialReady ? 'Ready' : 'Locked'}`;
}

function animate() {
    if (!gameStarted || gameOver) return;

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
            const dx = b.x - e.x;
            const dy = b.y - e.y;
            const dist = Math.hypot(dx, dy);
            if (dist < b.radius + e.size) {
                bullets.splice(j, 1);
                enemies.splice(i, 1);
                score += 100;
                kills++;
                killSinceLastSpecial++;
                if (killSinceLastSpecial >= 30 && Date.now() - specialUsedAt >= 15000) {
                    specialReady = true;
                }
            }
        });

        const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
        if (!e.explodes && distToPlayer < e.size + player.size) {
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
    gameOver = false;
    gameStarted = true;
    lastShot = 0;
    shootInterval = 600;
    specialReady = false;
    killSinceLastSpecial = 0;
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    animate();
}

// Controls
window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (!gameStarted && e.key === 'Enter') startGame();
    if (gameOver && e.key === 'Enter') startGame();
    if (e.key === 'n' || e.key === 'N') fireBullet();
    if (e.key === 'j' || e.key === 'J') fireSpecial();
});

window.addEventListener('keyup', e => keys[e.key] = false);
window.addEventListener('mousedown', e => fireBullet());
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('touchstart', e => {
    dragging = true;
    const touch = e.touches[0];
    mouse.x = touch.clientX;
    mouse.y = touch.clientY;
});
canvas.addEventListener('touchmove', e => {
    const touch = e.touches[0];
    mouse.x = touch.clientX;
    mouse.y = touch.clientY;
});
canvas.addEventListener('touchend', () => dragging = false);
restartButton.addEventListener('click', () => startGame());
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
