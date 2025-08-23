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
  lastTrackX: null,
  lastTrackY: null,
  lastMoveAngle: 0,
};

let bullets = [], specialBullets = [], enemies = [], explosions = [], powerUps = [], particles = [];
let tankTracks = []; // for tank marks
let spitParticles = []; // for dirt bursts

let score = 0, level = 1, lives = 3, kills = 0;
let isGameOver = false, isGameStarted = false, isPaused = false;
let specialAttackReady = false, specialCooldown = false;
let keys = {}, lastBulletTime = 0, fireRate = 0.3, enemySpeed = 1;
let highScore = localStorage.getItem("highScore") || 0;
let touchStart = null;

const specialCooldownDuration = 15000, powerUpDuration = 6000;
let freezeTimer = 0, rapidFireTimer = 0, swiftShadowTimer = 0;
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
    terrainScreen.style.display = "none";
    tankScreen.style.display = "block";
    document.getElementById("terrain-display").textContent = `Terrain: ${terrain}`;
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
  tankScreen.style.display = "none";
  startScreen.style.display = "block";
  applyPlayerTank(selectedTank);
});

function applyPlayerTank(tankName) {
  playerTankImage.src = tankName + ".png";
}

// Home Buttons
pauseHomeBtn.addEventListener("click", () => { resetToHome(); });
gameOverHomeBtn.addEventListener("click", () => { resetToHome(); });

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
  bullets = []; specialBullets = []; enemies = []; explosions = [];
  powerUps = []; particles = []; tankTracks = []; spitParticles = [];
  score = 0; level = 1; lives = 3; kills = 0; fireRate = 0.3; enemySpeed = 1;
  selectedTank = null;
  tankButtons.forEach((b) => b.classList.remove("selected"));
  tankChooseBtn.disabled = true;
  updateHUD();
}

// Start, Restart, Pause
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

// ---- Game Logic ----

function lerp(a, b, t) { return a + (b - a) * t; }

function drawBackground() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

function createEnemy() {
  const maxEnemies = 7 + level * 1;
  if (enemies.length >= maxEnemies) return;
  const explosiveChance = Math.min(0.1 + level * 0.01, 0.3);
  const isExplosive = Math.random() < explosiveChance;
  const size = isExplosive ? 25 : 20, offset = 30;

  let attempts = 0, x, y, validPosition = false;
  while (!validPosition && attempts < 30) {
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { x = Math.random() * canvas.width; y = -offset; }
    else if (edge === 1) { x = canvas.width + offset; y = Math.random() * canvas.height; }
    else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + offset; }
    else { x = -offset; y = Math.random() * canvas.height; }
    if (Math.hypot(x-player.x, y-player.y) <= player.size*4) { attempts++; continue; }
    validPosition = !enemies.some((e) => Math.hypot(x-e.x, y-e.y)<e.size+size+20);
    if (!validPosition) attempts++;
  }
  if (!validPosition) {
    let tries = 0;
    do { x = Math.random()*canvas.width; y = Math.random()*canvas.height; tries++;
    } while (Math.hypot(x-player.x, y-player.y)<=player.size*4 && tries<30);
  }
  enemies.push({
    id: crypto.randomUUID(),
    x, y, size,
    speed: (terrainSettings[terrain]?.enemySpeedMultiplier||1) *
      (isExplosive?enemySpeed*0.6:enemySpeed),
    isExplosive,
    createdAt:Date.now(),
    exploded:false
  });
}

function shoot() {
  const now = Date.now();
  if ((now - lastBulletTime) / 1000 >= fireRate) {
    const rad = (player.directionAngle * Math.PI) / 180;
    const speed = 9;
    bullets.push({
      x: player.x,
      y: player.y,
      size: 5,
      dx: Math.cos(rad) * speed,
      dy: Math.sin(rad) * speed
    });
    lastBulletTime = now;
    playSound("shoot");
  }
}

function triggerSpecial() {
  specialAttackReady=false; specialCooldown=true; kills=0;
  playSound("special");
  let angle=0,count=Math.floor(50+level*2);
  for(let i=0;i<count;i++){
    const rad=(angle*Math.PI)/180;
    specialBullets.push({
      x:player.x,
      y:player.y,
      dx:Math.cos(rad)*7,
      dy:Math.sin(rad)*7,
      size:4
    });
    angle+=360/count;
  }
  setTimeout(()=>specialCooldown=false,specialCooldownDuration);
}

function increaseDropRates() {
  powerUpTypes.forEach((powerUp)=>{ powerUp.dropRate=Math.min(powerUp.dropRate+0.005,0.15); });
}

function increaseScore(isSpecial) {
  if(isSpecial){
    score+=150; increaseDropRates();
    const dropChance=Math.random();
    let cumulative=0;
    for(const powerUp of powerUpTypes){
      cumulative+=powerUp.dropRate;
      if(dropChance<=cumulative){ dropPowerUp(powerUp); break;}
    }
  }else{ score+=100;}
  kills++; playSound("explosion");
  if(kills>=20 && !specialCooldown) specialAttackReady=true;
}

function dropPowerUp(powerUp) {
  powerUps.push({
    id:crypto.randomUUID(),
    x:player.x,y:player.y-player.size*2,
    size:15,type:powerUp,createdAt:Date.now()
  });
}

function drawPowerUps() {
  powerUps.forEach((pu)=>{
    ctx.fillStyle=pu.type.color;
    ctx.beginPath();
    ctx.arc(pu.x,pu.y,pu.size,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle="white";
    ctx.font="12px monospace"; ctx.textAlign="center";
    ctx.fillText(pu.type.name,pu.x,pu.y-pu.size-5);
  });
}

function updatePowerUps() {
  const now=Date.now();
  for(let i=powerUps.length-1;i>=0;i--){
    const pu=powerUps[i];
    if(now-pu.createdAt>powerUpDuration){ powerUps.splice(i,1); continue;}
    if(Math.hypot(pu.x-player.x,pu.y-player.y)<pu.size+player.size){
      collectPowerUp(pu.type);
      powerUps.splice(i,1);
    }
  }
}
function collectPowerUp(type){ playSound("special"); type.effect(); }

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

// Tank track drawing (auto fading, 0.5s lifetime, per terrain)
function drawTankTracks() {
  const now = Date.now();
  ctx.save();
  for (let i = 0; i < tankTracks.length; i++) {
    const track = tankTracks[i];
    const age = now - track.created;
    if (age > 500) continue;

    const { color, type } = getTrackStyleForTerrain(track.terrain);
    ctx.globalAlpha = 1 - (age / 500); // fade out

    ctx.translate(track.x, track.y);
    ctx.rotate(track.angle * Math.PI / 180);

    if (type === "mud" || type === "ash" || type === "concrete" || type === "default") {
      ctx.fillStyle = color;
      ctx.fillRect(-6, -2, 12, 4);
    } else if (type === "sand") {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === "compressed") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.stroke();
    }
    ctx.rotate(-track.angle * Math.PI / 180);
    ctx.translate(-track.x, -track.y);
  }
  ctx.restore();
  // Remove marks older than 0.5s
  tankTracks = tankTracks.filter(track => (now - track.created) <= 500);
}

// Spit/dirt burst on sharp turns or movement
function emitSpitParticles(dx, dy) {
  if (Math.abs(dx) + Math.abs(dy) < 8) return; // only big moves
  const { spit } = getTrackStyleForTerrain(terrain);
  for (let i = 0; i < 4; i++) {
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

function updateSpitParticles() {
  const now = Date.now();
  for (let i = spitParticles.length - 1; i >= 0; i--) {
    const p = spitParticles[i];
    p.x += p.dx;
    p.y += p.dy;
    p.dy += 0.04; // gravity effect
    if (now - p.created > 400) {
      spitParticles.splice(i, 1);
    }
  }
}

function drawSpitParticles() {
  const now = Date.now();
  for (let i = 0; i < spitParticles.length; i++) {
    const p = spitParticles[i];
    const age = now - p.created;
    ctx.save();
    ctx.globalAlpha = 1 - (age / 400);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Call this after updating player pos in movement handlers!
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

function drawPlayer() {
  if (playerTankImage.complete && playerTankImage.naturalWidth !== 0) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate((player.directionAngle * Math.PI) / 180);
    ctx.drawImage(playerTankImage, -player.size, -player.size, player.size * 2, player.size * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();
    const dirRad = (player.directionAngle * Math.PI) / 180;
    const pointerSize = player.size + 12;
    const tipX = player.x + Math.cos(dirRad) * pointerSize;
    const tipY = player.y + Math.sin(dirRad) * pointerSize;
    ctx.fillStyle = "cyan";
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(player.x + Math.cos(dirRad + Math.PI * 0.8) * (player.size * 0.6),
               player.y + Math.sin(dirRad + Math.PI * 0.8) * (player.size * 0.6));
    ctx.lineTo(player.x + Math.cos(dirRad - Math.PI * 0.8) * (player.size * 0.6),
               player.y + Math.sin(dirRad - Math.PI * 0.8) * (player.size * 0.6));
    ctx.closePath();
    ctx.fill();
  }
}

// ...keep your drawEnemies, drawBullets, drawExplosions, createParticles, updateParticles, drawParticles, etc...

function moveEnemies() {
  if(freezeTimer>0) return;
  enemies.forEach((e)=>{
    const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy); if(dist===0)return;
    e.x+=(dx/dist)*e.speed; e.y+=(dy/dist)*e.speed;
  });
}
function moveBullets() {
  bullets.forEach((b)=> {
    b.x += b.dx;
    b.y += b.dy;
  });
  specialBullets.forEach((b)=>{ b.x+=b.dx; b.y+=b.dy; });
}
function checkCollisions(){
  enemies.forEach((e,ei)=>{
    if(e.isExplosive && !e.exploded && Date.now()-e.createdAt>=5000){
      explosions.push({x:e.x,y:e.y,radius:e.size*3,time:Date.now()});
      e.exploded=true; enemies.splice(ei,1); playSound("explosion"); return;
    }
    bullets.forEach((b,bi)=>{
      if(Math.hypot(b.x-e.x,b.y-e.y)<e.size){
        const isSpecialKill=e.isExplosive;
        enemies.splice(ei,1); bullets.splice(bi,1); increaseScore(isSpecialKill);
      }
    });
    specialBullets.forEach((b,bi)=>{
      if(Math.hypot(b.x-e.x,b.y-e.y)<e.size){
        const isSpecialKill=e.isExplosive;
        enemies.splice(ei,1); specialBullets.splice(bi,1); increaseScore(isSpecialKill);
      }
    });
    if(Math.hypot(e.x-player.x,e.y-player.y)<e.size+player.size){
      enemies.splice(ei,1); loseLife();
    }
  });
  explosions.forEach((ex,i)=>{
    if(Date.now()-ex.time>500){ explosions.splice(i,1);}
    else if(Math.hypot(ex.x-player.x,ex.y-player.y)<ex.radius+player.size){
      explosions.splice(i,1); loseLife();
    }
  });
}
function loseLife(){
  lives--; playSound("hurt"); if(lives<=0) gameOver();
}
function handleInput(){
  if(isPaused || isGameOver)return;
  let moved = false, dx = 0, dy = 0;
  if(keys["ArrowLeft"]||keys["a"]) { player.x-=player.speed; player.directionAngle=180; dx -= player.speed; moved = true;}
  if(keys["ArrowRight"]||keys["d"]) { player.x+=player.speed; player.directionAngle=0; dx += player.speed; moved = true;}
  if(keys["ArrowUp"]||keys["w"]) { player.y-=player.speed; player.directionAngle=270; dy -= player.speed; moved = true;}
  if(keys["ArrowDown"]||keys["s"]) { player.y+=player.speed; player.directionAngle=90; dy += player.speed; moved = true;}
  if(keys["n"]) shoot();
  player.x=Math.max(player.size,Math.min(canvas.width-player.size,player.x));
  player.y=Math.max(player.size,Math.min(canvas.height-player.size,player.y));
  if(moved) {
    updateTankTracks();
    emitSpitParticles(dx, dy);
  }
}
function updateHUD(){
  document.getElementById("score-display").textContent=`Score: ${score}`;
  document.getElementById("level-display").textContent=`Level: ${level}`;
  document.getElementById("lives-display").textContent=`Lives: ${lives}`;
  document.getElementById("kills-display").textContent=`Kills: ${kills}`;
  const specialText = specialAttackReady ? "READY" : specialCooldown ? "COOLDOWN" : "LOCKED";
  document.getElementById("special-status").textContent=`Special: ${specialText}`;
  document.getElementById("terrain-display").textContent=`Terrain: ${terrain}`;
}
function updateGame() {
  if(!isGameStarted||isGameOver||isPaused)return;
  drawBackground();
  updateParticles();
  createParticles();
  updateSpitParticles();
  drawTankTracks(); // draw before player!
  drawSpitParticles();
  handleInput();
  moveEnemies(); moveBullets(); checkCollisions();
  updatePowerUps();
  drawPlayer(); drawBullets(); drawEnemies(); drawExplosions(); drawPowerUps(); drawParticles();

  if(freezeTimer>0) freezeTimer-=16;
  if(rapidFireTimer>0) rapidFireTimer-=16; else fireRate=originalFireRate;
  if(swiftShadowTimer>0) swiftShadowTimer-=16; else player.speed=originalSpeed;

  bullets = bullets.filter(
    (b) => b.x > -20 && b.x < canvas.width + 20 && b.y > -20 && b.y < canvas.height + 20
  );
  specialBullets = specialBullets.filter(
    (b) => b.x > -20 && b.x < canvas.width + 20 && b.y > -20 && b.y < canvas.height + 20
  );

  if(score >= level*1000){
    level++; enemySpeed=1+level*0.3;
    fireRate=Math.max(0.2,fireRate*0.9);
    playSound("levelUp");
  }
  updateHUD();
  requestAnimationFrame(updateGame);
}
let enemySpawnInterval;
function startGame() {
  if(!terrain) { alert("Please select a terrain first!"); return; }
  if(!selectedTank) { alert("Please select a tank first!"); return; }
  isGameStarted=true; isGameOver=false; isPaused=false;
  startScreen.style.display="none";
  gameOverScreen.style.display="none"; terrainScreen.style.display="none";
  pauseScreen.style.display="none"; tankScreen.style.display="none";
  setTerrainBackgroundImage(terrain);

  clearInterval(enemySpawnInterval);
  enemySpawnInterval = setInterval(()=>{ if(!isPaused&&!isGameOver&&isGameStarted) createEnemy(); },1000);

  player.lastTrackX = player.x;
  player.lastTrackY = player.y;
  updateGame();
}
function gameOver(){
  isGameOver=true;
  highScore=Math.max(score,highScore); localStorage.setItem("highScore",highScore);
  document.getElementById("finalScore").textContent=`Score: ${score}`;
  document.getElementById("highScore").textContent=`High Score: ${highScore}`;
  gameOverScreen.style.display="block";
  clearInterval(enemySpawnInterval);
}
function restartGame(){
  player={x:canvas.width/2,y:canvas.height-60,size:20,speed:5,color:"white",directionAngle:0, lastTrackX:null, lastTrackY:null, lastMoveAngle:0};
  bullets=[];specialBullets=[];enemies=[];explosions=[];powerUps=[];particles=[];tankTracks=[];spitParticles=[];
  score=0;level=1;lives=3;kills=0;enemySpeed=1;fireRate=0.3;specialAttackReady=false;
  specialCooldown=false;isGameOver=false;isGameStarted=true;isPaused=false;
  gameOverScreen.style.display="none"; pauseScreen.style.display="none";
  setTerrainBackgroundImage(terrain);
  applyPlayerTank(selectedTank);
  player.lastTrackX = player.x;
  player.lastTrackY = player.y;
  updateHUD(); updateGame();
}
function togglePause(){
  isPaused=!isPaused;
  pauseScreen.style.display = isPaused ? "block" : "none";
  if(!isPaused) updateGame();
}
function playSound(name){
  if(!sounds[name])return;
  sounds[name].pause(); sounds[name].currentTime=0;
  sounds[name].play().catch(()=>{});
}
function setTerrainBackgroundImage(terrain) {
  backgroundImage.src = terrainSettings[terrain]?.image || "";
  backgroundImage.style.opacity = "1";
}
