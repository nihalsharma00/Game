const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const canvasWrapper = document.getElementById("canvasWrapper");
const backgroundImage = document.getElementById("backgroundImage");

const pauseHomeBtn = document.getElementById("pauseHomeBtn");
const gameOverHomeBtn = document.getElementById("gameOverHomeBtn");

const terrainScreen = document.getElementById("terrainScreen");
const tankScreen = document.getElementById("tankScreen");
const startScreen = document.getElementById("startScreen");
const pauseScreen = document.getElementById("pauseScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

let terrain = null;
let selectedTank = null;
let playerTankImage = new Image();

let player = {
  x: canvas.width / 2,
  y: canvas.height - 60,
  size: 20,
  speed: 5,
  color: "white",
  directionAngle: 0,
};

let bullets = [],
  specialBullets = [],
  enemies = [],
  explosions = [],
  powerUps = [],
  particles = [];

let score = 0,
  level = 1,
  lives = 3,
  kills = 0;

let isGameOver = false,
  isGameStarted = false,
  isPaused = false;

let specialAttackReady = false,
  specialCooldown = false;

let keys = {},
  lastBulletTime = 0,
  fireRate = 0.3,
  enemySpeed = 1;

let highScore = localStorage.getItem("highScore") || 0;
let touchStart = null;

const specialCooldownDuration = 15000,
  powerUpDuration = 6000;

let freezeTimer = 0,
  rapidFireTimer = 0,
  swiftShadowTimer = 0;

const originalFireRate = fireRate,
  originalSpeed = player.speed;

const terrainSettings = {
  forest: {
    background: ["#1c3420", "#0d1a0d"],
    enemyColor: "lime",
    enemySpeedMultiplier: 1,
    particleColor: "rgba(34,139,34,0.15)",
    particleCount: 70,
    particleType: "leaf",
    image: "forest.png",
  },

  ice: {
    background: ["#a5d8ff", "#040d21"],
    enemyColor: "#99ccff",
    enemySpeedMultiplier: 0.75,
    particleColor: "rgba(250, 250, 255, 0.3)",
    particleCount: 80,
    particleType: "snow",
    image: "snow.png",
  },

  sahara: {
    background: ["#f0d9a6", "#855e0f"],
    enemyColor: "#d6a941",
    enemySpeedMultiplier: 1.3,
    particleColor: "rgba(244, 196, 48, 0.25)",
    particleCount: 60,
    particleType: "dust",
    image: "desert.jpg",
  },

  volcano: {
    background: ["#7b0f0f", "#220a0a"],
    enemyColor: "#ff4500",
    enemySpeedMultiplier: 1.1,
    particleColor: "rgba(255, 69, 0, 0.25)",
    particleCount: 75,
    particleType: "ember",
    image: "unnamed.png",
  },

  city: {
    background: ["#1b1b1b", "#121212"],
    enemyColor: "#00ffff",
    enemySpeedMultiplier: 1,
    particleColor: "rgba(0, 255, 255, 0.2)",
    particleCount: 65,
    particleType: "rain",
    image: "city.png",
  },
};

const powerUpTypes = [
  {
    name: "Time Freeze",
    effect: () => {
      freezeTimer = 4000;
    },
    dropRate: 0.05,
    color: "blue",
  },
  {
    name: "Rapid Fire",
    effect: () => {
      rapidFireTimer = 6000;
      fireRate = originalFireRate / 2;
    },
    dropRate: 0.08,
    color: "red",
  },
  {
    name: "Swift Shadow",
    effect: () => {
      swiftShadowTimer = 6000;
      player.speed = originalSpeed * 1.5;
    },
    dropRate: 0.07,
    color: "purple",
  },
];

const sounds = {
  shoot: new Audio(
    "https://freesound.org/data/previews/320/320181_5260877-lq.mp3"
  ),
  explosion: new Audio(
    "https://freesound.org/data/previews/178/178186_2859974-lq.mp3"
  ),
  hurt: new Audio("https://freesound.org/data/previews/191/191839_2394245-lq.mp3"),
  levelUp: new Audio(
    "https://freesound.org/data/previews/466/466080_10152444-lq.mp3"
  ),
  special: new Audio(
    "https://freesound.org/data/previews/331/331912_3248244-lq.mp3"
  ),
};

// Terrain Select
const terrainButtonsArr = Array.from(document.querySelectorAll(".terrain-btn"));
const tankButtonsArr = Array.from(document.querySelectorAll(".tank-btn"));
const tankChooseBtn = document.getElementById("tankChooseBtn");

// Arrow key navigation helper for buttons
function setupArrowKeyNavigation(buttons, onSelect) {
  let selectedIndex = 0;
  buttons.forEach((btn) => {
    btn.tabIndex = 0; // Make buttons focusable
  });
  buttons[selectedIndex].classList.add("selected");
  buttons[selectedIndex].focus();

  document.addEventListener("keydown", (e) => {
    if (!buttons.length) return;

    // Only react if the focus is within these buttons
    if (
      document.activeElement !== buttons[selectedIndex] &&
      !buttons.includes(document.activeElement)
    )
      return;

    if (["ArrowRight", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      buttons[selectedIndex].classList.remove("selected");
      selectedIndex = (selectedIndex + 1) % buttons.length;
      buttons[selectedIndex].classList.add("selected");
      buttons[selectedIndex].focus();
    } else if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      buttons[selectedIndex].classList.remove("selected");
      selectedIndex = (selectedIndex - 1 + buttons.length) % buttons.length;
      buttons[selectedIndex].classList.add("selected");
      buttons[selectedIndex].focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      buttons[selectedIndex].click();
      if (onSelect) onSelect(selectedIndex);
    }
  });
}

// Apply arrow key navigation on terrain buttons
setupArrowKeyNavigation(terrainButtonsArr, (idx) => {
  terrain = terrainButtonsArr[idx].dataset.terrain;
  terrainScreen.style.display = "none";
  tankScreen.style.display = "block";
  document.getElementById("terrain-display").textContent = `Terrain: ${terrain}`;
  setTerrainBackgroundImage(terrain);
});

// Terrain buttons click handler (already present)
terrainButtonsArr.forEach((btn) => {
  btn.addEventListener("click", () => {
    terrain = btn.dataset.terrain;
    terrainScreen.style.display = "none";
    tankScreen.style.display = "block";
    document.getElementById("terrain-display").textContent = `Terrain: ${terrain}`;
    setTerrainBackgroundImage(terrain);
  });
});

// Apply arrow key navigation on tank buttons
setupArrowKeyNavigation(tankButtonsArr, (idx) => {
  tankButtonsArr.forEach((b) => b.classList.remove("selected"));
  tankButtonsArr[idx].classList.add("selected");
  selectedTank = tankButtonsArr[idx].dataset.tank;
  tankChooseBtn.disabled = false;

  // IMPORTANT FIX:
  // When user presses Enter on a tank button, also trigger the tankChooseBtn click
  // to proceed to start screen and apply player tank.
  tankChooseBtn.click();
});

// Tank buttons click handler (already present)
tankButtonsArr.forEach((btn) => {
  btn.addEventListener("click", () => {
    tankButtonsArr.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedTank = btn.dataset.tank;
    tankChooseBtn.disabled = false;
  });
});

tankChooseBtn.addEventListener("click", () => {
  if (!selectedTank) return;
  tankScreen.style.display = "none";
  startScreen.style.display = "block";
  applyPlayerTank(selectedTank);
});

function applyPlayerTank(tankName) {
  playerTankImage.src = tankName + ".png";
}

// Home Buttons
pauseHomeBtn.addEventListener("click", () => {
  resetToHome();
});
gameOverHomeBtn.addEventListener("click", () => {
  resetToHome();
});

function resetToHome() {
  isGameStarted = false;
  isGameOver = false;
  isPaused = false;
  specialAttackReady = false;
  specialCooldown = false;
  startScreen.style.display = "none";
  pauseScreen.style.display = "none";
  gameOverScreen.style.display = "none";
  tankScreen.style.display = "none";
  terrainScreen.style.display = "block";
  backgroundImage.style.opacity = "1";
  bullets = [];
  specialBullets = [];
  enemies = [];
  explosions = [];
  powerUps = [];
  particles = [];
  score = 0;
  level = 1;
  lives = 3;
  kills = 0;
  fireRate = 0.3;
  enemySpeed = 1;
  selectedTank = null;
  tankButtonsArr.forEach((b) => b.classList.remove("selected"));
  tankChooseBtn.disabled = true;
  updateHUD();
}

// Pause screen: Enter triggers home button
document.addEventListener("keydown", (e) => {
  if (isPaused && pauseScreen.style.display !== "none" && e.key === "Enter") {
    pauseHomeBtn.click();
  }
});

// Game Over screen: arrow keys toggle and enter activates buttons
let gameOverSelected = "home"; // "home" or "restart"

function updateGameOverSelection() {
  if (gameOverSelected === "home") {
    gameOverHomeBtn.classList.add("selected");
    document.getElementById("restartBtn").classList.remove("selected");
    gameOverHomeBtn.focus();
  } else {
    gameOverHomeBtn.classList.remove("selected");
    document.getElementById("restartBtn").classList.add("selected");
    document.getElementById("restartBtn").focus();
  }
}

document.addEventListener("keydown", (e) => {
  if (isGameOver && gameOverScreen.style.display !== "none") {
    if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
    ) {
      e.preventDefault();
      gameOverSelected = gameOverSelected === "home" ? "restart" : "home";
      updateGameOverSelection();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (gameOverSelected === "home") gameOverHomeBtn.click();
      else document.getElementById("restartBtn").click();
    }
  }
});

function showGameOverScreen() {
  gameOverScreen.style.display = "block";
  gameOverSelected = "home";
  updateGameOverSelection();
}

// Replace earlier gameOver screen show calls with this function
function gameOver() {
  isGameOver = true;
  highScore = Math.max(score, highScore);
  localStorage.setItem("highScore", highScore);
  document.getElementById("finalScore").textContent = `Score: ${score}`;
  document.getElementById("highScore").textContent = `High Score: ${highScore}`;

  showGameOverScreen();
}

// Global keydown for game start and other controls
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  // Start the game when Enter is pressed on the Start screen
  if (!isGameStarted && e.key === "Enter") {
    if (!terrain) {
      alert("Please select a terrain first!");
      return;
    }
    if (!selectedTank) {
      alert("Please select a tank first!");
      return;
    }
    startGame();
  } else if (isGameOver && e.key === "Enter") {
    restartGame();
  } else if (e.key === "j" && specialAttackReady && !specialCooldown) {
    triggerSpecial();
  } else if (e.key === "p" && isGameStarted && !isGameOver) {
    togglePause();
  }
});
document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

canvas.addEventListener("mousedown", () => {
  if (!isPaused && isGameStarted && !isGameOver) shoot();
});

document.addEventListener("touchstart", (e) => {
  if (!isPaused && isGameStarted && !isGameOver) shoot();
  touchStart = e.touches[0];
});

document.addEventListener("touchmove", (e) => {
  if (!touchStart) return;
  const touch = e.touches;
  const dx = touch.clientX - touchStart.clientX;
  const dy = touch.clientY - touchStart.clientY;
  player.x += dx * 0.15;
  player.y += dy * 0.15;
  touchStart = touch;
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  player.x = canvas.width / 2;
  player.y = canvas.height - 60;
  setTerrainBackgroundImage(terrain);
});

// Rest of your existing game logic continues here...

function setTerrainBackgroundImage(terrain) {
  backgroundImage.src = terrainSettings[terrain]?.image || "";
  backgroundImage.style.opacity = "1";
}

function updateHUD() {
  // Update your HUD elements with current score, level, lives, etc.
}

// ... Other game functions remain unchanged ...
