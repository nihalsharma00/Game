const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const backgroundImage = document.getElementById("backgroundImage");

// Terrain and tank selections
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
  lastTrackX: null,
  lastTrackY: null,
};

let enemySpawnInterval = null;
let bullets = [], specialBullets = [], enemies = [], explosions = [], powerUps = [], particles = [], tankTracks = [], spitParticles = [];

let score = 0, level = 1, lives = 3, kills = 0;
let isGameOver = false, isGameStarted = false, isPaused = false;
let specialAttackReady = false, specialCooldown = false;
let keys = {}, lastBulletTime = 0, fireRate = 0.3, enemySpeed = 1;
let highScore = localStorage.getItem("highScore") || 0;
let touchStart = null;

const originalFireRate = fireRate, originalSpeed = player.speed;

const terrainSettings = {
  forest: {
    background: ["#1c3420", "#0d1a0d"],
    enemyColor: "lime",
    enemySpeedMultiplier: 1,
    particleColor: "rgba(34,139,34,0.15)",
    particleCount: 70,
    particleType: "leaf",
    image: "forest.png"
  },
  ice: {
    background: ["#a5d8ff", "#040d21"],
    enemyColor: "#99ccff",
    enemySpeedMultiplier: 0.75,
    particleColor: "rgba(250, 250, 255, 0.3)",
    particleCount: 80,
    particleType: "snow",
    image: "snow.png"
  },
  sahara: {
    background: ["#f0d9a6", "#855e0f"],
    enemyColor: "#d6a941",
    enemySpeedMultiplier: 1.3,
    particleColor: "rgba(244, 196, 48, 0.25)",
    particleCount: 60,
    particleType: "dust",
    image: "desert.jpg"
  },
  volcano: {
    background: ["#7b0f0f", "#220a0a"],
    enemyColor: "#ff4500",
    enemySpeedMultiplier: 1.1,
    particleColor: "rgba(255, 69, 0, 0.25)",
    particleCount: 75,
    particleType: "ember",
    image: "unnamed.png"
  },
  city: {
    background: ["#1b1b1b", "#121212"],
    enemyColor: "#00ffff",
    enemySpeedMultiplier: 1,
    particleColor: "rgba(0, 255, 255, 0.2)",
    particleCount: 65,
    particleType: "rain",
    image: "city.png"
  },
};

const powerUpTypes = [
  {
    name: "Time Freeze",
    effect: () => { freezeTimer = 4000; },
    dropRate: 0.05,
    color: "blue"
  },
  {
    name: "Rapid Fire",
    effect: () => { rapidFireTimer = 6000; fireRate = originalFireRate / 2; },
    dropRate: 0.08,
    color: "red"
  },
  {
    name: "Swift Shadow",
    effect: () => { swiftShadowTimer = 6000; player.speed = originalSpeed * 1.5; },
    dropRate: 0.07,
    color: "purple"
  }
];

const sounds = {
  shoot: new Audio("https://freesound.org/data/previews/320/320181_5260877-lq.mp3"),
  explosion: new Audio("https://freesound.org/data/previews/178/178186_2859974-lq.mp3"),
  hurt: new Audio("https://freesound.org/data/previews/191/191839_2394245-lq.mp3"),
  levelUp: new Audio("https://freesound.org/data/previews/466/466080_10152444-lq.mp3"),
  special: new Audio("https://freesound.org/data/previews/331/331912_3248244-lq.mp3"),
};

// Terrain Select
document.querySelectorAll(".terrain-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    terrain = btn.dataset.terrain;
    document.getElementById("terrain-display").textContent = `Terrain: ${terrain}`;
    document.getElementById("terrainScreen").style.display = "none";
    document.getElementById("tankScreen").style.display = "block";
    setTerrainBackgroundImage(terrain);
  });
});

// Tank Select
const tankButtons = document.querySelectorAll(".tank-btn");
const tankChooseBtn = document.getElementById("tankChooseBtn");

tankButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tankButtons.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedTank = btn.dataset.tank;
    tankChooseBtn.disabled = false;
  });
});

tankChooseBtn.addEventListener("click", () => {
  if (!selectedTank) return;
  document.getElementById("tankScreen").style.display = "none";
  document.getElementById("startScreen").style.display = "block";
  applyPlayerTank(selectedTank);
});

function applyPlayerTank(tankName) {
  playerTankImage.src = tankName + ".png";
  playerTankImage.onload = () => {
    console.log("Tank image loaded:", playerTankImage.src);
  };
  playerTankImage.onerror = () => {
    console.error("Failed to load tank image:", playerTankImage.src);
  };
}

// Home Buttons
document.getElementById("pauseHomeBtn").addEventListener("click", resetToHome);
document.getElementById("gameOverHomeBtn").addEventListener("click", resetToHome);

function resetToHome() {
  isGameStarted = false;
  isGameOver = false;
  isPaused = false;
  specialAttackReady = false;
  specialCooldown = false;
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("pauseScreen").style.display = "none";
  document.getElementById("gameOverScreen").style.display = "none";
  document.getElementById("tankScreen").style.display = "none";
  document.getElementById("terrainScreen").style.display = "block";
  backgroundImage.style.opacity = "1";
  bullets = []; specialBullets = []; enemies = []; explosions = [];
  powerUps = []; particles = []; tankTracks = []; spitParticles = [];
  score = 0; level = 1; lives = 3; kills = 0; fireRate = 0.3; enemySpeed = 1;
  selectedTank = null;
  tankButtons.forEach((b) => b.classList.remove("selected"));
  tankChooseBtn.disabled = true;
  updateHUD();
}

// Start, Restart, Pause controls
document.getElementById("restartBtn").addEventListener("click", restartGame);

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (!isGameStarted && e.key === "Enter") startGame();
  else if (isGameOver && e.key === "Enter") restartGame();
  else if (e.key === "j" && specialAttackReady && !specialCooldown)
    triggerSpecial();
  else if (e.key === "p" && isGameStarted && !isGameOver) togglePause();
});
document.addEventListener("keyup", (e) => { keys[e.key] = false; });
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
  updateTankTracks();
  emitSpitParticles(dx, dy);
  touchStart = touch;
});
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  player.x = canvas.width / 2;
  player.y = canvas.height - 60;
  setTerrainBackgroundImage(terrain);
});

// All your gameplay logic functions like moveEnemies, moveBullets, createEnemy, shoot, triggerSpecial...

// Tank Tracks

function getTrackStyleForTerrain(terrain) {
  switch (terrain) {
    case "forest":   return { color: "rgba(70,50,20,0.6)", type: "mud",  spit: "rgba(90,65,32,0.4)" };
    case "ice":      return { color: "rgba(190,220,255,0.7)", type: "compressed", spit: "rgba(190,220,255,0.5)" };
    case "sahara":   return { color: "rgba(220,180,100,0.7)", type: "sand", spit: "rgba(240,200,90,0.5)" };
    case "volcano":  return { color: "rgba(110,60,20,0.7)", type: "ash", spit: "rgba(120,80,60,0.5)" };
    case "city":     return { color: "rgba(70,70,70,0.5)", type: "concrete", spit: "rgba(120,120,120,0.4)" };
    default:         return { color: "rgba(80,80,80,0.5)", type: "default", spit: "rgba(100,100,100,0.4)" };
  }
}

function updateTankTracks() {
  if (isGameStarted && !isPaused && !isGameOver &&
    (player.lastTrackX !== player.x || player.lastTrackY !== player.y)) {
    tankTracks.push({
      x: player.x,
      y: player.y,
      angle: player.directionAngle,
      created: Date.now(),
      terrain: terrain
    });
    if (tankTracks.length > 160) tankTracks.shift();
    player.lastTrackX = player.x;
    player.lastTrackY = player.y;
  }
}

function drawTankTracks() {
  const now = Date.now();
  ctx.save();
  for(let track of tankTracks){
    const age = now - track.created;
    if(age > 500) continue;
    const { color, type } = getTrackStyleForTerrain(track.terrain);
    ctx.globalAlpha = 1 - (age / 500);
    ctx.translate(track.x, track.y);
    ctx.rotate(track.angle * Math.PI / 180);
    if(type === "mud" || type === "ash" || type === "concrete" || type === "default"){
      ctx.fillStyle = color;
      ctx.fillRect(-6, -2, 12, 4);
    } else if(type === "sand"){
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 3, 0, 0, Math.PI*2);
      ctx.fill();
    } else if(type === "compressed"){
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-7,0);
      ctx.lineTo(7,0);
      ctx.stroke();
    }
    ctx.rotate(-track.angle * Math.PI / 180);
    ctx.translate(-track.x, -track.y);
  }
  ctx.restore();
  tankTracks = tankTracks.filter(t => (now - t.created) <= 500);
}

function emitSpitParticles(dx, dy){
  if(Math.abs(dx)+Math.abs(dy) < 8) return;
  const { spit } = getTrackStyleForTerrain(terrain);
  for(let i=0;i<4;i++){
    const angle = player.directionAngle + (Math.random() - 0.5) * 90;
    const rad = (angle * Math.PI) / 180;
    const speed = 2 + Math.random()*2;
    spitParticles.push({
      x: player.x,
      y: player.y,
      dx: Math.cos(rad) * speed,
      dy: Math.sin(rad) * speed,
      size: 3 + Math.random()*2,
      color: spit,
      created: Date.now()
    });
  }
}

function updateSpitParticles(){
  const now = Date.now();
  for(let i=spitParticles.length-1;i>=0;i--){
    let p = spitParticles[i];
    p.x += p.dx;
    p.y += p.dy;
    p.dy += 0.04; // gravity
    if(now - p.created > 400){
      spitParticles.splice(i,1);
    }
  }
}

function drawSpitParticles(){
  const now = Date.now();
  for(let p of spitParticles){
    const age = now - p.created;
    ctx.save();
    ctx.globalAlpha = 1 - (age / 400);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

// Drawing player tank
function drawPlayer() {
  if(playerTankImage.complete && playerTankImage.naturalWidth !== 0){
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.directionAngle * Math.PI / 180);
    ctx.drawImage(playerTankImage, -player.size, -player.size, player.size*2, player.size*2);
    ctx.restore();
  } else {
    // fallback simple player
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI*2);
    ctx.fill();
    const dirRad = player.directionAngle * Math.PI / 180;
    const pointerSize = player.size + 12;
    const tipX = player.x + Math.cos(dirRad) * pointerSize;
    const tipY = player.y + Math.sin(dirRad) * pointerSize;
    ctx.fillStyle = "cyan";
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(player.x + Math.cos(dirRad + Math.PI*0.8)*(player.size*0.6), player.y + Math.sin(dirRad + Math.PI*0.8)*(player.size*0.6));
    ctx.lineTo(player.x + Math.cos(dirRad - Math.PI*0.8)*(player.size*0.6), player.y + Math.sin(dirRad - Math.PI*0.8)*(player.size*0.6));
    ctx.closePath();
    ctx.fill();
  }
}

// Add the rest of your game logic here: moveEnemies, moveBullets, checkCollisions, handleInput, updatePowerUps, etc.

// Main update loop
function updateGame(){
  if(!isGameStarted || isGameOver || isPaused) return;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  updateParticles();
  createParticles();

  updateSpitParticles();

  drawTankTracks();

  drawSpitParticles();

  handleInput();

  moveEnemies();
  moveBullets();

  checkCollisions();

  updatePowerUps();

  drawPlayer();

  drawBullets();
  drawEnemies();
  drawExplosions();
  drawPowerUps();
  drawParticles();

  if(freezeTimer>0) freezeTimer-=16;
  if(rapidFireTimer>0) rapidFireTimer-=16; else fireRate = originalFireRate;
  if(swiftShadowTimer>0) swiftShadowTimer-=16; else player.speed= originalSpeed;

  bullets = bullets.filter(b => b.x > -20 && b.x < canvas.width + 20 && b.y > -20 && b.y < canvas.height + 20);
  specialBullets = specialBullets.filter(b => b.x > -20 && b.x < canvas.width + 20 && b.y > -20 && b.y < canvas.height + 20);

  if(score >= level * 1000){
    level++;
    enemySpeed = 1 + level * 0.3;
    fireRate = Math.max(0.2, fireRate * 0.9);
    playSound("levelUp");
  }

  updateHUD();

  requestAnimationFrame(updateGame);
}

// Implement your startGame(), restartGame(), gameOver(), togglePause(), shoot() and other functions from previous corrected code snippets.

// Remember to call applyPlayerTank(selectedTank) when tank is selected

// Make sure to handle window resize event to update canvas size and player position

// Finally, playSound is your standard audio play utility function
