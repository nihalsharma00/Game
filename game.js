const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth;
canvas.height = innerHeight;

const bg = document.getElementById("backgroundImage");

/* ---------------- SOUND SYSTEM ---------------- */
class SoundManager {
  constructor() {
    this.sounds = {};
    this.muted = false;
    this.volume = 0.6;
  }
  load(name, urls, loop=false) {
    this.sounds[name] = urls.map(u => {
      const a = new Audio(u);
      a.volume = this.volume;
      a.loop = loop;
      return a;
    });
  }
  play(name) {
    if (this.muted || !this.sounds[name]) return;
    const s = this.sounds[name][Math.floor(Math.random()*this.sounds[name].length)];
    s.currentTime = 0;
    s.play().catch(()=>{});
  }
}

const sound = new SoundManager();
sound.load("shoot", ["https://freesound.org/data/previews/320/320181_5260877-lq.mp3"]);
sound.load("explosion", ["https://freesound.org/data/previews/178/178186_2859974-lq.mp3"]);
sound.load("hit", ["https://freesound.org/data/previews/191/191839_2394245-lq.mp3"]);
sound.load("special", ["https://freesound.org/data/previews/331/331912_3248244-lq.mp3"]);

/* ---------------- GAME STATE ---------------- */
let terrain = null;
let selectedTank = null;
let isStarted = false;
let isGameOver = false;

const terrainImages = {
  forest: "forest.png",
  ice: "snow.png",
  sahara: "desert.jpg",
  volcano: "unnamed.png",
  city: "city.png"
};

/* ---------------- PLAYER ---------------- */
const playerImage = new Image();
const player = {
  x: canvas.width/2,
  y: canvas.height-80,
  width: 44,
  height: 44,
  speed: 5,
  angle: 270
};

/* ---------------- ENTITIES ---------------- */
let bullets = [];
let enemies = [];
let score = 0;
let level = 1;
let lives = 3;
let kills = 0;
let specialReady = false;

/* ---------------- INPUT ---------------- */
const keys = {};
addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === "Enter" && !isStarted) startGame();
});
addEventListener("keyup", e => keys[e.key] = false);
canvas.addEventListener("mousedown", shoot);

/* ---------------- UI ---------------- */
document.querySelectorAll(".terrain-btn").forEach(b=>{
  b.onclick=()=>{
    terrain=b.dataset.terrain;
    bg.src=terrainImages[terrain];
    terrainScreen.style.display="none";
    tankScreen.style.display="block";
  }
});

document.querySelectorAll(".tank-btn").forEach(b=>{
  b.onclick=()=>{
    selectedTank=b.dataset.tank;
    playerImage.src=selectedTank+".png";
    tankChooseBtn.disabled=false;
  }
});

tankChooseBtn.onclick=()=>{
  tankScreen.style.display="none";
  startScreen.style.display="block";
};

/* ---------------- GAME FUNCTIONS ---------------- */

function startGame(){
  if(!terrain || !selectedTank) return;
  isStarted=true;
  startScreen.style.display="none";
  loop();
  setInterval(spawnEnemy, 1200);
}

function shoot(){
  if(!isStarted) return;
  bullets.push({
    x:player.x,
    y:player.y,
    dx:Math.cos(player.angle*Math.PI/180)*8,
    dy:Math.sin(player.angle*Math.PI/180)*8
  });
  sound.play("shoot");
}

function spawnEnemy(){
  enemies.push({
    x:Math.random()*canvas.width,
    y:-40,
    w:36,
    h:28,
    speed:1+level*0.2,
    turret:0,
    hp:2
  });
}

function rectsCollide(a,b){
  return (
    a.x-a.w/2 < b.x+b.w/2 &&
    a.x+a.w/2 > b.x-b.w/2 &&
    a.y-a.h/2 < b.y+b.h/2 &&
    a.y+a.h/2 > b.y-b.h/2
  );
}

/* ---------------- DRAWING ---------------- */

function drawPlayer(){
  ctx.save();
  ctx.translate(player.x,player.y);
  ctx.rotate(player.angle*Math.PI/180);
  ctx.drawImage(playerImage,-player.width/2,-player.height/2,player.width,player.height);
  ctx.restore();
}

function drawEnemyTank(e){
  ctx.fillStyle="#2ecc71";
  ctx.fillRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h);

  ctx.save();
  ctx.translate(e.x,e.y);
  e.turret=Math.atan2(player.y-e.y,player.x-e.x);
  ctx.rotate(e.turret);
  ctx.fillStyle="#27ae60";
  ctx.fillRect(0,-3,20,6);
  ctx.restore();
}

/* ---------------- LOOP ---------------- */

function loop(){
  if(isGameOver) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if(keys["a"]) player.x-=player.speed, player.angle=180;
  if(keys["d"]) player.x+=player.speed, player.angle=0;
  if(keys["w"]) player.y-=player.speed, player.angle=270;
  if(keys["s"]) player.y+=player.speed, player.angle=90;

  bullets.forEach(b=>{b.x+=b.dx; b.y+=b.dy;});
  enemies.forEach(e=>{
    const dx=player.x-e.x, dy=player.y-e.y;
    const d=Math.hypot(dx,dy);
    e.x+=(dx/d)*e.speed;
    e.y+=(dy/d)*e.speed;
  });

  bullets.forEach((b,bi)=>{
    enemies.forEach((e,ei)=>{
      if(rectsCollide({x:b.x,y:b.y,w:4,h:4},{x:e.x,y:e.y,w:e.w,h:e.h})){
        enemies.splice(ei,1);
        bullets.splice(bi,1);
        score+=100;
        kills++;
        sound.play("explosion");
        if(kills>=20) specialReady=true;
      }
    });
  });

  enemies.forEach((e,ei)=>{
    if(rectsCollide(
      {x:player.x,y:player.y,w:player.width,h:player.height},
      {x:e.x,y:e.y,w:e.w,h:e.h}
    )){
      enemies.splice(ei,1);
      lives--;
      sound.play("hit");
      if(lives<=0) isGameOver=true;
    }
  });

  bullets.forEach(b=>ctx.fillRect(b.x,b.y,4,4));
  enemies.forEach(drawEnemyTank);
  drawPlayer();

  scoreDisplay.textContent="Score: "+score;
  livesDisplay.textContent="Lives: "+lives;
  specialStatus.textContent="Special: "+(specialReady?"READY":"LOCKED");

  requestAnimationFrame(loop);
}
