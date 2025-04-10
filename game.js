const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

const bgMusic = document.getElementById("bg-music");
const startScreen = document.getElementById("start-screen");
const gameOverScreen = document.getElementById("game-over");
const finalScoreEl = document.getElementById("final-score");
const highScoreEl = document.getElementById("high-score");
const restartButton = document.getElementById("restart-button");

let keys = {}, touches = {};
let gameRunning = false, gameOver = false, score = 0, level = 1, kills = 0;
let lastSpecial = 0;
let player, bullets = [], enemies = [], explosions = [];

class Player {
  constructor() {
    this.x = width / 2;
    this.y = height / 2;
    this.radius = 20;
    this.speed = 4;
    this.lives = 3;
    this.cooldown = 0;
  }

  move() {
    if (keys['ArrowUp'] || keys['w']) this.y -= this.speed;
    if (keys['ArrowDown'] || keys['s']) this.y += this.speed;
    if (keys['ArrowLeft'] || keys['a']) this.x -= this.speed;
    if (keys['ArrowRight'] || keys['d']) this.x += this.speed;

    this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));
  }

  draw() {
    ctx.beginPath();
    ctx.fillStyle = '#0ff';
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
