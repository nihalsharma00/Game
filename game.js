const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const GameState = {
    MENU: "menu",
    TERRAIN: "terrain",
    TANK: "tank",
    PLAYING: "playing",
    PAUSED: "paused",
    GAME_OVER: "game_over"
};

let currentState = GameState.TERRAIN;

let terrain = null;
let selectedTank = null;

let score = 0;
let level = 1;
let lives = 3;
let kills = 0;

let specialCharge = 0;
let specialReady = false;
let specialActive = false;

const MAX_SPECIAL = 20;

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,

    width: 50,
    height: 50,

    speed: 5,

    health: 100,
    maxHealth: 100,

    fireRate: 250,
    lastShot: 0,

    angle: 0
};

const bullets = [];
const enemyBullets = [];
const enemies = [];
const particles = [];

const keys = {};
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

window.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;

    if (e.key.toLowerCase() === "p") {
        togglePause();
    }

    if (e.code === "Space") {
        activateSpecial();
    }
});

window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

canvas.addEventListener("mousedown", e => {
    if (e.button === 0) {
        shoot();
    }
});

const terrainImages = {
    forest: "forest.png",
    ice: "snow.png",
    sahara: "desert.jpg",
    city: "city.png"
};

function setTerrain(name) {
    terrain = name;

    document.getElementById("backgroundImage").src =
        terrainImages[name];

    document
        .getElementById("terrainContinueBtn")
        .disabled = false;
}

function setTank(name) {
    selectedTank = name;

    document
        .querySelectorAll(".tank-card")
        .forEach(card => card.classList.remove("selected"));

    document
        .querySelector(`[data-tank="${name}"]`)
        .classList.add("selected");

    document
        .getElementById("tankContinueBtn")
        .disabled = false;
}

document.querySelectorAll(".terrain-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        setTerrain(btn.dataset.terrain);
    });
});

document.querySelectorAll(".tank-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        setTank(btn.dataset.tank);
    });
});

document
.getElementById("terrainContinueBtn")
.addEventListener("click", () => {

    document
    .getElementById("terrainScreen")
    .classList.add("hidden");

    document
    .getElementById("tankScreen")
    .classList.remove("hidden");
});

document
.getElementById("tankContinueBtn")
.addEventListener("click", () => {

    document
    .getElementById("tankScreen")
    .classList.add("hidden");

    document
    .getElementById("startScreen")
    .classList.remove("hidden");
});

document
.getElementById("startGameBtn")
.addEventListener("click", startGame);

function startGame() {
    currentState = GameState.PLAYING;

    document
        .getElementById("startScreen")
        .classList.add("hidden");

    spawnEnemyLoop();

    requestAnimationFrame(gameLoop);
}

function togglePause() {
    if (currentState === GameState.PLAYING) {
        currentState = GameState.PAUSED;

        document
            .getElementById("pauseScreen")
            .classList.remove("hidden");
    }
    else if (currentState === GameState.PAUSED) {
        currentState = GameState.PLAYING;

        document
            .getElementById("pauseScreen")
            .classList.add("hidden");

        requestAnimationFrame(gameLoop);
    }
}

document
.getElementById("resumeBtn")
.addEventListener("click", togglePause);

function activateSpecial() {
    if (!specialReady) return;

    specialReady = false;
    specialActive = true;
    specialCharge = 0;

    enemies.length = 0;

    setTimeout(() => {
        specialActive = false;
    }, 5000);
}

function shoot() {
    const now = Date.now();

    if (now - player.lastShot < player.fireRate)
        return;

    player.lastShot = now;

    const angle =
        Math.atan2(
            mouseY - player.y,
            mouseX - player.x
        );

    bullets.push({
        x: player.x,
        y: player.y,

        dx: Math.cos(angle) * 12,
        dy: Math.sin(angle) * 12,

        radius: 5
    });
}

function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);

    let x, y;

    switch (side) {
        case 0:
            x = Math.random() * canvas.width;
            y = -50;
            break;

        case 1:
            x = canvas.width + 50;
            y = Math.random() * canvas.height;
            break;

        case 2:
            x = Math.random() * canvas.width;
            y = canvas.height + 50;
            break;

        default:
            x = -50;
            y = Math.random() * canvas.height;
    }

    enemies.push({
        x,
        y,

        width: 40,
        height: 40,

        speed: 1 + level * 0.2,

        hp: 1 + Math.floor(level / 3)
    });
}

let enemySpawner;

function spawnEnemyLoop() {
    clearInterval(enemySpawner);

    enemySpawner = setInterval(() => {
        if (currentState === GameState.PLAYING) {
            spawnEnemy();
        }
    }, Math.max(400, 1200 - level * 50));
}

function updatePlayer() {
    if (keys["w"]) player.y -= player.speed;
    if (keys["s"]) player.y += player.speed;
    if (keys["a"]) player.x -= player.speed;
    if (keys["d"]) player.x += player.speed;

    player.x =
        Math.max(
            player.width / 2,
            Math.min(
                canvas.width - player.width / 2,
                player.x
            )
        );

    player.y =
        Math.max(
            player.height / 2,
            Math.min(
                canvas.height - player.height / 2,
                player.y
            )
        );
}

function drawPlayer() {
    ctx.save();

    ctx.translate(player.x, player.y);

    player.angle =
        Math.atan2(
            mouseY - player.y,
            mouseX - player.x
        );

    ctx.rotate(player.angle);

    ctx.fillStyle = "#00d4ff";

    ctx.fillRect(
        -player.width / 2,
        -player.height / 2,
        player.width,
        player.height
    );

    ctx.restore();
}

function updateHUD() {
    document.getElementById(
        "score-display"
    ).textContent = score;

    document.getElementById(
        "level-display"
    ).textContent = level;

    document.getElementById(
        "lives-display"
    ).textContent =
        "❤️".repeat(lives);

    document.getElementById(
        "special-status"
    ).textContent =
        `${specialCharge}/${MAX_SPECIAL}`;

    document.getElementById(
        "specialBar"
    ).style.width =
        `${(specialCharge / MAX_SPECIAL) * 100}%`;
}

function gameLoop() {

    if (currentState !== GameState.PLAYING)
        return;

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    updatePlayer();

    drawPlayer();

    updateHUD();

    requestAnimationFrame(gameLoop);
}
