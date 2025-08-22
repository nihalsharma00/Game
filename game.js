const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const canvasWrapper = document.getElementById("canvasWrapper");
const backgroundImage = document.getElementById("backgroundImage");
const pauseHomeBtn = document.getElementById("pauseHomeBtn");
const gameOverHomeBtn = document.getElementById("gameOverHomeBtn");
const terrainScreen = document.getElementById("terrainScreen");
const startScreen = document.getElementById("startScreen");
const pauseScreen = document.getElementById("pauseScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

let terrain = null;

let player = {
  x: canvas.width / 2,
  y: canvas.height - 60,
  size: 20,
  speed: 5,
  color: "white",
  directionAngle: 0,
};
let bullets = [], specialBullets = [], enemies = [], explosions = [], powerUps = [], particles = [];

let score = 0, level = 1, lives = 3, kills = 0;
let isGameOver = false, isGameStarted = false, isPaused = false;
let specialAttackReady = false, specialCooldown = false;
let keys = {}, lastBulletTime = 0, fireRate = 0.6, enemySpeed = 1;
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
    startScreen.style.display = "block";
    document.getElementById("terrain-display").textContent = `Terrain: ${terrain}`;
    setTerrainBackgroundImage(terrain);
  });
});

function setTerrainBackgroundImage(terrain) {
  backgroundImage.src = terrainSettings[terrain]?.image || "";
  backgroundImage.style.opacity = "1";
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
  terrainScreen.style.display = "block";
  backgroundImage.style.opacity = "1";
  bullets = []; specialBullets = []; enemies = []; explosions = [];
  powerUps = []; particles = [];
  score = 0; level = 1; lives = 3; kills = 0; fireRate = 0.6; enemySpeed = 1;
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
  if((now-lastBulletTime)/1000>=fireRate){
    bullets.push({x:player.x,y:player.y,size:5,speed:9});
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

function drawPlayer() {
  ctx.fillStyle=player.color;
  ctx.beginPath();
  ctx.arc(player.x,player.y,player.size,0,Math.PI*2);
  ctx.fill();
  const dirRad=(player.directionAngle*Math.PI)/180;
  const pointerSize=player.size+12;
  const tipX=player.x+Math.cos(dirRad)*pointerSize;
  const tipY=player.y+Math.sin(dirRad)*pointerSize;
  ctx.fillStyle="cyan";
  ctx.beginPath();
  ctx.moveTo(tipX,tipY);
  ctx.lineTo(player.x+Math.cos(dirRad+Math.PI*0.8)*(player.size*0.6),
             player.y+Math.sin(dirRad+Math.PI*0.8)*(player.size*0.6));
  ctx.lineTo(player.x+Math.cos(dirRad-Math.PI*0.8)*(player.size*0.6),
             player.y+Math.sin(dirRad-Math.PI*0.8)*(player.size*0.6));
  ctx.closePath(); ctx.fill();
}

function drawEnemies(){
  enemies.forEach((e)=>{
    ctx.fillStyle=terrainSettings[terrain]?.enemyColor||(e.isExplosive?"red":"lime");
    ctx.beginPath(); ctx.arc(e.x,e.y,e.size,0,Math.PI*2); ctx.fill();
  });
}

function drawBullets(){
  ctx.fillStyle="yellow";
  bullets.forEach((b)=>ctx.fillRect(b.x-b.size/2,b.y-b.size/2,b.size,b.size));
  ctx.fillStyle="cyan";
  specialBullets.forEach((b)=>ctx.fillRect(b.x-b.size/2,b.y-b.size/2,b.size,b.size));
}
function drawExplosions(){
  explosions.forEach((ex)=>{ ctx.strokeStyle="orange";
    ctx.beginPath(); ctx.arc(ex.x,ex.y,ex.radius,0,Math.PI*2); ctx.stroke();
  });
}

function createParticles(){
  if(!terrain) return;
  const settings=terrainSettings[terrain];
  while(particles.length<settings.particleCount){
    particles.push({
      x:Math.random()*canvas.width,
      y:Math.random()*canvas.height,
      size:Math.random()*3+1,
      speedY:(settings.particleType==="snow"?0.5:
        settings.particleType==="rain"?4:Math.random()*0.7+0.3),
      speedX:(settings.particleType==="leaf"?(Math.random()-0.5)*0.2:0),
      type:settings.particleType,
      color:settings.particleColor
    });
  }
}
function updateParticles(){
  particles.forEach((p)=>{
    p.x+=p.speedX; p.y+=p.speedY;
    if(p.y>canvas.height)p.y=-10;
    if(p.x>canvas.width)p.x=0;
    if(p.x<0)p.x=canvas.width;
  });
}
function drawParticles(){
  particles.forEach((p)=>{
    ctx.fillStyle=p.color;
    switch (p.type){
      case "snow": ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); break;
      case "rain": ctx.beginPath(); ctx.strokeStyle=p.color; ctx.lineWidth=1.5;
                   ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-1,p.y+10); ctx.stroke(); break;
      case "leaf": case "dust": case "ember":
        ctx.beginPath(); ctx.ellipse(p.x,p.y,p.size*1.5,p.size,0,0,Math.PI*2); ctx.fill(); break;
    }
  });
}

function moveEnemies() {
  if(freezeTimer>0) return;
  enemies.forEach((e)=>{
    const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy); if(dist===0)return;
    e.x+=(dx/dist)*e.speed; e.y+=(dy/dist)*e.speed;
  });
}
function moveBullets() {
  bullets.forEach((b)=>b.y-=b.speed);
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
  if(isPaused)return;
  if(keys["ArrowLeft"]||keys["a"]) { player.x-=player.speed; player.directionAngle=180; }
  if(keys["ArrowRight"]||keys["d"]) { player.x+=player.speed; player.directionAngle=0; }
  if(keys["ArrowUp"]||keys["w"]) { player.y-=player.speed; player.directionAngle=270; }
  if(keys["ArrowDown"]||keys["s"]) { player.y+=player.speed; player.directionAngle=90; }
  if(keys["n"]) shoot();
  player.x=Math.max(player.size,Math.min(canvas.width-player.size,player.x));
  player.y=Math.max(player.size,Math.min(canvas.height-player.size,player.y));
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
  handleInput();
  moveEnemies(); moveBullets(); checkCollisions();
  updatePowerUps();
  drawPlayer(); drawBullets(); drawEnemies(); drawExplosions(); drawPowerUps(); drawParticles();

  if(freezeTimer>0) freezeTimer-=16;
  if(rapidFireTimer>0) rapidFireTimer-=16; else fireRate=originalFireRate;
  if(swiftShadowTimer>0) swiftShadowTimer-=16; else player.speed=originalSpeed;

  bullets=bullets.filter((b)=>b.y>-20);
  specialBullets=specialBullets.filter((b)=>b.x>-20&&b.x<canvas.width+20&&b.y>-20&&b.y<canvas.height+20);

  if(score>=level*1000){
    level++; enemySpeed=1+level*0.3;
    fireRate=Math.max(0.2,fireRate*0.9);
    playSound("levelUp");
  }
  updateHUD();
  requestAnimationFrame(updateGame);
}
function startGame() {
  if(!terrain) { alert("Please select a terrain first!"); return; }
  isGameStarted=true; isGameOver=false; isPaused=false;
  startScreen.style.display="none";
  gameOverScreen.style.display="none"; terrainScreen.style.display="none";
  pauseScreen.style.display="none";
  setTerrainBackgroundImage(terrain);
  setInterval(()=>{ if(!isPaused&&!isGameOver&&isGameStarted) createEnemy(); },1000);
  updateGame();
}
function gameOver(){
  isGameOver=true;
  highScore=Math.max(score,highScore); localStorage.setItem("highScore",highScore);
  document.getElementById("finalScore").textContent=`Score: ${score}`;
  document.getElementById("highScore").textContent=`High Score: ${highScore}`;
  gameOverScreen.style.display="block";
}
function restartGame(){
  player={x:canvas.width/2,y:canvas.height-60,size:20,speed:5,color:"white",directionAngle:0};
  bullets=[];specialBullets=[];enemies=[];explosions=[];powerUps=[];particles=[];
  score=0;level=1;lives=3;kills=0;enemySpeed=1;fireRate=0.6;specialAttackReady=false;
  specialCooldown=false;isGameOver=false;isGameStarted=true;isPaused=false;
  gameOverScreen.style.display="none"; pauseScreen.style.display="none";
  setTerrainBackgroundImage(terrain);
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
