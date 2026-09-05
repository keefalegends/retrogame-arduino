/**
 * GALACTIC DEFENDER - Web Retro Arcade Game
 * Dikendalikan oleh Modul Joystick KY-023 via Web Serial API
 */

// ==========================================
// 1. SOUND SYSTEM (Web Audio API - Synthesized FX)
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playLaser() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {}
  }

  playExplosion() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.linearRampToValueAtTime(80, now + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch (e) {}
  }

  playHit() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  }

  playPowerup() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [330, 440, 554, 659];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.06;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.1);
      });
    } catch (e) {}
  }

  playGameOver() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [440, 370, 311, 220];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.16;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.25);
      });
    } catch (e) {}
  }
}

const sfx = new SoundFX();

// ==========================================
// 2. WEB SERIAL COMMUNICATION MANAGER
// ==========================================
class SerialManager {
  constructor() {
    this.port = null;
    this.reader = null;
    this.readableStreamClosed = null;
    this.isConnected = false;

    // Joystick raw & normalized
    this.rawX = 512;
    this.rawY = 512;
    this.buttonPressed = 0;
    this.btnJustPressed = false; // Edge trigger: true hanya pada saat tombol baru ditekan

    // Titik tengah yang dapat dikalibrasi
    this.centerX = parseInt(localStorage.getItem('joy_center_x') || '512', 10);
    this.centerY = parseInt(localStorage.getItem('joy_center_y') || '512', 10);

    // Axis settings
    this.invertX = false;
    this.invertY = false;

    // Normalized coordinates (-1.0 to 1.0)
    this.joyX = 0;
    this.joyY = 0;
    this.deadzone = 55;

    // Deteksi pin macet di 1023
    this.stuck1023Count = 0;

    // UI Elements
    this.connectBtn = document.getElementById('connectBtn');
    this.calibrateBtn = document.getElementById('calibrateBtn');
    this.connStatus = document.getElementById('connStatus');
    this.connIcon = document.getElementById('connIcon');
    this.hudX = document.getElementById('hudX');
    this.hudY = document.getElementById('hudY');
    this.hudBtnStatus = document.getElementById('hudBtnStatus');
    this.btnIcon = document.getElementById('btnIcon');
    this.joyDot = document.getElementById('joyDot');
    this.calibHint = document.getElementById('calibHint');
    this.stickAlert = document.getElementById('stickAlert');

    this.updateCalibHint();
    this.setupListeners();
  }

  setupListeners() {
    this.connectBtn.addEventListener('click', () => this.toggleConnect());

    if (this.calibrateBtn) {
      this.calibrateBtn.addEventListener('click', () => this.calibrateCenter());
    }

    if ('serial' in navigator) {
      navigator.serial.addEventListener('disconnect', () => {
        this.handleDisconnect('Arduino terputus');
      });
    }
  }

  calibrateCenter() {
    this.centerX = this.rawX;
    this.centerY = this.rawY;
    localStorage.setItem('joy_center_x', this.centerX.toString());
    localStorage.setItem('joy_center_y', this.centerY.toString());
    this.updateCalibHint();
    this.updateNormalized();
    this.updateHUD();

    if (this.calibrateBtn) {
      this.calibrateBtn.textContent = '✅ Terkalibrasi!';
      setTimeout(() => {
        this.calibrateBtn.innerHTML = '<span>🎯</span> Kalibrasi Tengah';
      }, 1500);
    }
  }

  updateCalibHint() {
    if (this.calibHint) {
      this.calibHint.textContent = `Pusat: ${this.centerX}, ${this.centerY}`;
    }
  }

  async toggleConnect() {
    sfx.init();
    if (this.isConnected) {
      await this.disconnect();
    } else {
      await this.connect();
    }
  }

  async connect() {
    if (!('serial' in navigator)) {
      alert('Browser Anda belum mendukung Web Serial API!\nSilakan buka game ini menggunakan Google Chrome atau Microsoft Edge terbaru.');
      return;
    }

    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });

      this.isConnected = true;
      this.connectBtn.classList.add('connected');
      this.connectBtn.innerHTML = '<span>🟢</span> Arduino Tersambung';
      this.connStatus.textContent = 'TERSAMBUNG (115200)';
      this.connStatus.style.color = 'var(--neon-green)';
      this.connIcon.textContent = '🟢';

      this.readLoop();
    } catch (err) {
      console.warn('Gagal menghubungkan serial:', err);
      if (err.name !== 'NotFoundError') {
        alert('Gagal membuka port serial: ' + err.message + '\n\nPastikan Serial Monitor di Arduino IDE sudah DITUTUP terlebih dahulu.');
      }
    }
  }

  async readLoop() {
    const textDecoder = new TextDecoderStream();
    this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    let buffer = '';

    try {
      while (this.isConnected) {
        const { value, done } = await this.reader.read();
        if (done) break;

        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Potongan baris yang belum selesai

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length > 0) {
            this.processLine(trimmed);
          }
        }
      }
    } catch (err) {
      console.error('Serial read error:', err);
    } finally {
      this.handleDisconnect();
    }
  }

  processLine(line) {
    try {
      // Parse JSON data dari Arduino: {"x":512,"y":512,"btn":0}
      const data = JSON.parse(line);
      if (data.x !== undefined && data.y !== undefined) {
        this.rawX = Number(data.x);
        this.rawY = Number(data.y);

        const newBtn = Number(data.btn) === 1 ? 1 : 0;
        // Edge detection: just pressed trigger
        if (newBtn === 1 && this.buttonPressed === 0) {
          this.btnJustPressed = true;
        }
        this.buttonPressed = newBtn;

        // Deteksi nilai mentok 1023, 1023
        if (this.rawX >= 1020 && this.rawY >= 1020 && this.centerX === 512) {
          this.stuck1023Count++;
          if (this.stuck1023Count > 40 && this.stickAlert) {
            this.stickAlert.style.display = 'block';
          }
        } else {
          this.stuck1023Count = 0;
          if (this.stickAlert) {
            this.stickAlert.style.display = 'none';
          }
        }

        this.updateNormalized();
        this.updateHUD();
      }
    } catch (e) {}
  }

  updateNormalized() {
    let dx = this.rawX - this.centerX;
    let dy = this.rawY - this.centerY;

    // Terapkan deadzone di sekitar titik tengah yang dikalibrasi
    if (Math.abs(dx) < this.deadzone) dx = 0;
    if (Math.abs(dy) < this.deadzone) dy = 0;

    let normX = dx / 512;
    let normY = dy / 512;

    normX = Math.max(-1, Math.min(1, normX));
    normY = Math.max(-1, Math.min(1, normY));

    if (this.invertX) normX = -normX;
    if (this.invertY) normY = -normY;

    this.joyX = normX;
    this.joyY = normY;
  }

  updateHUD() {
    this.hudX.textContent = this.rawX;
    this.hudY.textContent = this.rawY;

    // Indikator visual joystick
    const px = (this.joyX * 16).toFixed(1);
    const py = (this.joyY * 16).toFixed(1);
    this.joyDot.style.transform = `translate(${px}px, ${py}px)`;

    if (this.buttonPressed) {
      this.hudBtnStatus.classList.add('active');
      this.hudBtnStatus.textContent = 'PRESSED (FIRE)';
      this.btnIcon.textContent = '🔥';
    } else {
      this.hudBtnStatus.classList.remove('active');
      this.hudBtnStatus.textContent = 'RELEASED';
      this.btnIcon.textContent = '🕹️';
    }
  }

  consumeJustPressed() {
    const val = this.btnJustPressed;
    this.btnJustPressed = false;
    return val;
  }

  async disconnect() {
    this.isConnected = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (e) {}
      this.reader = null;
    }
    if (this.readableStreamClosed) {
      try {
        await this.readableStreamClosed.catch(() => {});
      } catch (e) {}
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch (e) {}
      this.port = null;
    }
    this.handleDisconnect('Arduino terputus');
  }

  handleDisconnect(msg = 'TERPUTUS') {
    this.isConnected = false;
    this.connectBtn.classList.remove('connected');
    this.connectBtn.innerHTML = '<span>🔌</span> Hubungkan Arduino';
    this.connStatus.textContent = msg;
    this.connStatus.style.color = '#ff4757';
    this.connIcon.textContent = '⚪';
  }
}

const serial = new SerialManager();

// Tombol Pengaturan Header
const soundBtn = document.getElementById('soundBtn');
soundBtn.addEventListener('click', () => {
  const isEnabled = sfx.toggle();
  soundBtn.innerHTML = isEnabled ? '<span>🔊</span> Audio: ON' : '<span>🔇</span> Audio: OFF';
});

const invertXBtn = document.getElementById('invertXBtn');
invertXBtn.addEventListener('click', () => {
  serial.invertX = !serial.invertX;
  invertXBtn.textContent = `Invert X: ${serial.invertX ? 'ON' : 'OFF'}`;
  invertXBtn.style.borderColor = serial.invertX ? 'var(--neon-yellow)' : '';
  serial.updateNormalized();
  serial.updateHUD();
});

const invertYBtn = document.getElementById('invertYBtn');
invertYBtn.addEventListener('click', () => {
  serial.invertY = !serial.invertY;
  invertYBtn.textContent = `Invert Y: ${serial.invertY ? 'ON' : 'OFF'}`;
  invertYBtn.style.borderColor = serial.invertY ? 'var(--neon-yellow)' : '';
  serial.updateNormalized();
  serial.updateHUD();
});

// ==========================================
// 3. KEYBOARD & MOUSE CONTROLS
// ==========================================
const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
  shoot: false,
  start: false
};

window.addEventListener('keydown', (e) => {
  sfx.init();
  if (['ArrowUp', 'KeyW'].includes(e.code)) keys.up = true;
  if (['ArrowDown', 'KeyS'].includes(e.code)) keys.down = true;
  if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = true;
  if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = true;
  if (e.code === 'Space') {
    keys.shoot = true;
    keys.start = true;
    e.preventDefault();
  }
  if (e.code === 'Enter') {
    keys.start = true;
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  if (['ArrowUp', 'KeyW'].includes(e.code)) keys.up = false;
  if (['ArrowDown', 'KeyS'].includes(e.code)) keys.down = false;
  if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = false;
  if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = false;
  if (e.code === 'Space') {
    keys.shoot = false;
    keys.start = false;
  }
  if (e.code === 'Enter') keys.start = false;
});

// Klik layar kanvas juga bisa memulai/mengulang permainan
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.addEventListener('pointerdown', () => {
  sfx.init();
  if (gameState === STATE.START) {
    startGame();
  } else if (gameState === STATE.GAMEOVER && gameOverCooldown <= 0) {
    startGame();
  }
});

// ==========================================
// 4. GAME ENGINE
// ==========================================
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// High Score
let highScore = parseInt(localStorage.getItem('galactic_highscore') || '0', 10);
const hudHighScore = document.getElementById('hudHighScore');
hudHighScore.textContent = String(highScore).padStart(5, '0');

const STATE = {
  START: 'START',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER'
};

let gameState = STATE.START;
let score = 0;
let waveTimer = 0;
let screenShake = 0;
let gameOverCooldown = 0; // Jeda sebelum boleh restart agar tidak langsung kepencet

// Starfield Parallax Layers
const stars = [];
for (let i = 0; i < 90; i++) {
  stars.push({
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GAME_HEIGHT,
    speed: 0.5 + Math.random() * 2.2,
    size: Math.random() * 2 + 0.8,
    color: Math.random() > 0.3 ? '#ffffff' : (Math.random() > 0.5 ? '#00f0ff' : '#ff00aa')
  });
}

// Particle System
const particles = [];
function spawnExplosion(x, y, color = '#ff9900', count = 18) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      alpha: 1,
      decay: 0.02 + Math.random() * 0.03,
      color: color
    });
  }
}

// Player Ship Object
const player = {
  x: GAME_WIDTH / 2,
  y: GAME_HEIGHT - 90,
  vx: 0,
  vy: 0,
  radius: 18,
  speed: 7.5,
  friction: 0.84,
  lives: 3,
  maxLives: 3,
  invulnerableTimer: 0,
  shootCooldown: 0,
  tripleShotTimer: 0,

  reset() {
    this.x = GAME_WIDTH / 2;
    this.y = GAME_HEIGHT - 90;
    this.vx = 0;
    this.vy = 0;
    this.lives = 3;
    this.invulnerableTimer = 180; // 3 detik perisai kebal saat mulai / respawn!
    this.shootCooldown = 0;
    this.tripleShotTimer = 0;
  },

  update() {
    // Ambil input gabungan Joystick & Keyboard
    let inputX = serial.joyX;
    let inputY = serial.joyY;

    if (keys.left) inputX = -1;
    if (keys.right) inputX = 1;
    if (keys.up) inputY = -1;
    if (keys.down) inputY = 1;

    // Akselerasi dan gesekan
    this.vx += inputX * this.speed * 0.35;
    this.vy += inputY * this.speed * 0.35;

    this.vx *= this.friction;
    this.vy *= this.friction;

    this.x += this.vx;
    this.y += this.vy;

    // Batasi dalam layar
    this.x = Math.max(this.radius, Math.min(GAME_WIDTH - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(GAME_HEIGHT - this.radius, this.y));

    if (this.invulnerableTimer > 0) this.invulnerableTimer--;
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.tripleShotTimer > 0) this.tripleShotTimer--;

    // Menembak
    const isFiring = serial.buttonPressed === 1 || keys.shoot;
    if (isFiring && this.shootCooldown <= 0) {
      this.shoot();
      this.shootCooldown = 11;
    }

    // Partikel Asap Roket
    if (Math.random() < 0.7) {
      particles.push({
        x: this.x + (Math.random() * 8 - 4),
        y: this.y + 18,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 2 + Math.random() * 3,
        size: 2.5,
        alpha: 0.9,
        decay: 0.05,
        color: Math.random() > 0.4 ? '#00f0ff' : '#ffe600'
      });
    }
  },

  shoot() {
    sfx.playLaser();

    if (this.tripleShotTimer > 0) {
      bullets.push({ x: this.x, y: this.y - 15, vx: 0, vy: -12, color: '#00f0ff' });
      bullets.push({ x: this.x - 12, y: this.y - 10, vx: -3, vy: -11, color: '#ff00aa' });
      bullets.push({ x: this.x + 12, y: this.y - 10, vx: 3, vy: -11, color: '#ff00aa' });
    } else {
      bullets.push({ x: this.x - 7, y: this.y - 15, vx: 0, vy: -12, color: '#00f0ff' });
      bullets.push({ x: this.x + 7, y: this.y - 15, vx: 0, vy: -12, color: '#00f0ff' });
    }
  },

  draw() {
    // Efek berkedip saat kebal
    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 4) % 2 === 0) {
      // Gambar lingkaran perisai pelindung saat kebal
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.8)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00ff66';
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    const tilt = (this.vx / this.speed) * 0.35;
    ctx.rotate(tilt);

    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00f0ff';

    // Badan Pesawat
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(16, 16);
    ctx.lineTo(7, 10);
    ctx.lineTo(0, 14);
    ctx.lineTo(-7, 10);
    ctx.lineTo(-16, 16);
    ctx.closePath();

    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#00f0ff';
    ctx.stroke();

    // Sayap Tambahan
    ctx.strokeStyle = '#ff0077';
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.lineTo(0, -10);
    ctx.lineTo(10, 4);
    ctx.stroke();

    // Kokpit
    ctx.beginPath();
    ctx.arc(0, -2, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe600';
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 10;
    ctx.fill();

    // Api Pendorong
    ctx.beginPath();
    ctx.moveTo(-5, 14);
    ctx.lineTo(0, 24 + Math.random() * 8);
    ctx.lineTo(5, 14);
    ctx.fillStyle = Math.random() > 0.5 ? '#00f0ff' : '#ff0077';
    ctx.fill();

    ctx.restore();
  }
};

// Arrays
const bullets = [];
const enemyBullets = [];
const asteroids = [];
const alienShips = [];
const powerups = [];

function spawnAsteroid(size = 3, startX = null, startY = null) {
  const rad = size === 3 ? 28 : (size === 2 ? 18 : 10);
  const x = startX !== null ? startX : Math.random() * (GAME_WIDTH - 60) + 30;
  const y = startY !== null ? startY : -40;

  const vertices = [];
  const numPts = 7 + Math.floor(Math.random() * 4);
  for (let i = 0; i < numPts; i++) {
    const angle = (i / numPts) * Math.PI * 2;
    const r = rad * (0.8 + Math.random() * 0.4);
    vertices.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }

  asteroids.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 1.8,
    vy: 1.2 + Math.random() * 2.2 + (score > 1000 ? 0.8 : 0),
    radius: rad,
    size: size,
    angle: Math.random() * Math.PI,
    rotSpeed: (Math.random() - 0.5) * 0.05,
    vertices: vertices,
    hp: size
  });
}

function spawnAlienShip() {
  alienShips.push({
    x: Math.random() * (GAME_WIDTH - 80) + 40,
    y: -30,
    vx: (Math.random() > 0.5 ? 1 : -1) * (1.8 + Math.random() * 1.2),
    vy: 1.2,
    radius: 16,
    shootTimer: 60 + Math.floor(Math.random() * 60)
  });
}

function spawnPowerup(x, y) {
  const types = ['SHIELD', 'TRIPLE', 'BOMB'];
  const type = types[Math.floor(Math.random() * types.length)];
  powerups.push({
    x,
    y,
    vy: 1.5,
    radius: 12,
    type,
    angle: 0
  });
}

// ==========================================
// 5. GAME LOOP & STATE MANAGEMENT
// ==========================================
function updateGame() {
  // Starfield update berjalan selalu di semua state
  for (const star of stars) {
    star.y += star.speed;
    if (star.y > GAME_HEIGHT) {
      star.y = 0;
      star.x = Math.random() * GAME_WIDTH;
    }
  }

  // Update Particles di semua state
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  // Cek Input Tombol Joystick untuk START / RESTART
  const joystickTrigger = serial.consumeJustPressed();
  const restartIntent = joystickTrigger || (serial.buttonPressed === 1) || keys.start || keys.shoot;

  // Handle State: START
  if (gameState === STATE.START) {
    if (restartIntent) {
      startGame();
    }
    return;
  }

  // Handle State: GAMEOVER
  if (gameState === STATE.GAMEOVER) {
    if (gameOverCooldown > 0) {
      gameOverCooldown--;
    } else {
      // Boleh restart jika jeda sudah selesai
      if (restartIntent) {
        startGame();
      }
    }
    return;
  }

  // Screen shake decay
  if (screenShake > 0) screenShake *= 0.88;
  if (screenShake < 0.2) screenShake = 0;

  // Update Pemain
  player.update();

  // Update Bullets Pemain
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    if (b.y < -20 || b.x < 0 || b.x > GAME_WIDTH) {
      bullets.splice(i, 1);
    }
  }

  // Update Enemy Bullets
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const eb = enemyBullets[i];
    eb.x += eb.vx;
    eb.y += eb.vy;

    if (player.invulnerableTimer <= 0) {
      const dist = Math.hypot(eb.x - player.x, eb.y - player.y);
      if (dist < player.radius + 5) {
        enemyBullets.splice(i, 1);
        handlePlayerHit();
        continue;
      }
    }

    if (eb.y > GAME_HEIGHT + 20) {
      enemyBullets.splice(i, 1);
    }
  }

  // Spawning Wave Logic
  waveTimer++;
  if (waveTimer % 65 === 0) {
    spawnAsteroid();
  }
  if (waveTimer % 240 === 0) {
    spawnAlienShip();
  }

  // Update Asteroids
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const ast = asteroids[i];
    ast.x += ast.vx;
    ast.y += ast.vy;
    ast.angle += ast.rotSpeed;

    if (ast.x < ast.radius || ast.x > GAME_WIDTH - ast.radius) {
      ast.vx *= -1;
    }

    // Tabrakan dengan Laser Pemain
    for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
      const b = bullets[bIdx];
      const dist = Math.hypot(b.x - ast.x, b.y - ast.y);
      if (dist < ast.radius + 6) {
        bullets.splice(bIdx, 1);
        ast.hp--;
        spawnExplosion(b.x, b.y, '#00f0ff', 6);

        if (ast.hp <= 0) {
          sfx.playExplosion();
          spawnExplosion(ast.x, ast.y, '#ff9900', ast.radius);
          score += ast.size * 50;

          if (ast.size > 1) {
            spawnAsteroid(ast.size - 1, ast.x, ast.y);
            spawnAsteroid(ast.size - 1, ast.x, ast.y);
          }

          if (Math.random() < 0.15) {
            spawnPowerup(ast.x, ast.y);
          }

          asteroids.splice(i, 1);
          break;
        }
      }
    }

    // Tabrakan dengan Pemain
    if (asteroids[i] && player.invulnerableTimer <= 0) {
      const dist = Math.hypot(ast.x - player.x, ast.y - player.y);
      if (dist < ast.radius + player.radius) {
        spawnExplosion(ast.x, ast.y, '#ff0055', 15);
        asteroids.splice(i, 1);
        handlePlayerHit();
      }
    }

    if (asteroids[i] && ast.y > GAME_HEIGHT + 60) {
      asteroids.splice(i, 1);
    }
  }

  // Update Alien Ships
  for (let i = alienShips.length - 1; i >= 0; i--) {
    const alien = alienShips[i];
    alien.x += alien.vx;
    alien.y += alien.vy;

    if (alien.x < 40 || alien.x > GAME_WIDTH - 40) {
      alien.vx *= -1;
    }

    alien.shootTimer--;
    if (alien.shootTimer <= 0) {
      enemyBullets.push({
        x: alien.x,
        y: alien.y + 15,
        vx: (player.x - alien.x) * 0.015,
        vy: 4.5,
        color: '#ff0055'
      });
      alien.shootTimer = 70 + Math.floor(Math.random() * 50);
    }

    for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
      const b = bullets[bIdx];
      const dist = Math.hypot(b.x - alien.x, b.y - alien.y);
      if (dist < alien.radius + 6) {
        bullets.splice(bIdx, 1);
        sfx.playExplosion();
        spawnExplosion(alien.x, alien.y, '#ff0077', 22);
        score += 250;
        spawnPowerup(alien.x, alien.y);
        alienShips.splice(i, 1);
        break;
      }
    }

    if (alienShips[i] && player.invulnerableTimer <= 0) {
      const dist = Math.hypot(alien.x - player.x, alien.y - player.y);
      if (dist < alien.radius + player.radius) {
        spawnExplosion(alien.x, alien.y, '#ff0055', 20);
        alienShips.splice(i, 1);
        handlePlayerHit();
      }
    }

    if (alienShips[i] && alien.y > GAME_HEIGHT + 50) {
      alienShips.splice(i, 1);
    }
  }

  // Update Powerups
  for (let i = powerups.length - 1; i >= 0; i--) {
    const pow = powerups[i];
    pow.y += pow.vy;
    pow.angle += 0.04;

    const dist = Math.hypot(pow.x - player.x, pow.y - player.y);
    if (dist < pow.radius + player.radius) {
      sfx.playPowerup();
      if (pow.type === 'SHIELD') {
        player.lives = Math.min(player.maxLives, player.lives + 1);
      } else if (pow.type === 'TRIPLE') {
        player.tripleShotTimer = 450;
      } else if (pow.type === 'BOMB') {
        for (const ast of asteroids) {
          spawnExplosion(ast.x, ast.y, '#ffe600', 14);
          score += 50;
        }
        asteroids.length = 0;
        screenShake = 15;
        sfx.playExplosion();
      }
      powerups.splice(i, 1);
    } else if (pow.y > GAME_HEIGHT + 30) {
      powerups.splice(i, 1);
    }
  }

  // Update High Score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('galactic_highscore', highScore.toString());
    hudHighScore.textContent = String(highScore).padStart(5, '0');
  }
}

function handlePlayerHit() {
  sfx.playHit();
  screenShake = 12;
  player.lives--;
  player.invulnerableTimer = 90;

  if (player.lives <= 0) {
    sfx.playGameOver();
    gameState = STATE.GAMEOVER;
    gameOverCooldown = 40; // 0.6 detik jeda perlindungan
  }
}

// ==========================================
// 6. RENDER ENGINE
// ==========================================
function render() {
  ctx.save();

  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShake;
    const shakeY = (Math.random() - 0.5) * screenShake;
    ctx.translate(shakeX, shakeY);
  }

  ctx.fillStyle = '#03040e';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Stars
  for (const s of stars) {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Particles
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Bullets
  for (const b of bullets) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = b.color;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - 2, b.y - 10, 4, 18);
    ctx.restore();
  }

  // Enemy Bullets
  for (const eb of enemyBullets) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = eb.color;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(eb.x, eb.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = eb.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Asteroids
  for (const ast of asteroids) {
    ctx.save();
    ctx.translate(ast.x, ast.y);
    ctx.rotate(ast.angle);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#1e293b';

    ctx.beginPath();
    ast.vertices.forEach((v, idx) => {
      if (idx === 0) ctx.moveTo(v.x, v.y);
      else ctx.lineTo(v.x, v.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(ast.radius * 0.3, -ast.radius * 0.2, ast.radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Alien Ships
  for (const alien of alienShips) {
    ctx.save();
    ctx.translate(alien.x, alien.y);
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ff0055';

    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(16, -12);
    ctx.lineTo(0, -6);
    ctx.lineTo(-16, -12);
    ctx.closePath();
    ctx.fillStyle = '#ff0055';
    ctx.fill();
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  // Powerups
  for (const pow of powerups) {
    ctx.save();
    ctx.translate(pow.x, pow.y);
    ctx.rotate(pow.angle);

    let color = '#00ff66';
    let label = '+♥';
    if (pow.type === 'TRIPLE') { color = '#00f0ff'; label = '3X'; }
    if (pow.type === 'BOMB')   { color = '#ffe600'; label = '💣'; }

    ctx.shadowBlur = 14;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(-12, -12, 24, 24);

    ctx.fillStyle = color;
    ctx.font = 'bold 11px Rajdhani';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);

    ctx.restore();
  }

  // Render Pemain jika PLAYING
  if (gameState === STATE.PLAYING) {
    player.draw();

    // In-game HUD
    ctx.save();
    ctx.font = '14px "Press Start 2P"';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`SCORE: ${score}`, 20, 36);

    ctx.fillText('SHIELD:', 20, 64);
    for (let i = 0; i < player.maxLives; i++) {
      ctx.fillStyle = i < player.lives ? '#00ff66' : '#334155';
      ctx.shadowBlur = i < player.lives ? 8 : 0;
      ctx.shadowColor = '#00ff66';
      ctx.fillRect(130 + i * 28, 50, 22, 16);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(130 + i * 28, 50, 22, 16);
    }

    if (player.tripleShotTimer > 0) {
      ctx.font = '11px "Press Start 2P"';
      ctx.fillStyle = '#ffe600';
      ctx.fillText(`TRIPLE LASER!`, 20, 92);
    }
    ctx.restore();
  }

  // Layar START
  if (gameState === STATE.START) {
    ctx.save();
    ctx.fillStyle = 'rgba(3, 4, 14, 0.78)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.textAlign = 'center';
    ctx.font = '24px "Press Start 2P"';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f0ff';
    ctx.fillText('GALACTIC DEFENDER', GAME_WIDTH / 2, 210);

    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = '#ff0077';
    ctx.shadowColor = '#ff0077';
    ctx.fillText('RETRO ARDUINO JOYSTICK EDITION', GAME_WIDTH / 2, 250);

    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.font = '12px "Press Start 2P"';
      ctx.fillStyle = '#ffe600';
      ctx.shadowColor = '#ffe600';
      ctx.fillText('TEKAN TOMBOL JOYSTICK (SW) / KLIK LAYAR', GAME_WIDTH / 2, 340);
    }

    ctx.font = '15px Rajdhani';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Goyang joystick untuk mengemudi 360° | Tekan joystick (SW) untuk menembak', GAME_WIDTH / 2, 400);

    ctx.restore();
  }

  // Layar GAMEOVER
  if (gameState === STATE.GAMEOVER) {
    ctx.save();
    ctx.fillStyle = 'rgba(3, 4, 14, 0.85)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.textAlign = 'center';
    ctx.font = '28px "Press Start 2P"';
    ctx.fillStyle = '#ff0055';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff0055';
    ctx.fillText('GAME OVER', GAME_WIDTH / 2, 210);

    ctx.font = '14px "Press Start 2P"';
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 5;
    ctx.fillText(`FINAL SCORE: ${score}`, GAME_WIDTH / 2, 270);

    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = '#00ff66';
    ctx.fillText(`HIGH SCORE: ${highScore}`, GAME_WIDTH / 2, 310);

    if (gameOverCooldown > 0) {
      ctx.font = '12px "Press Start 2P"';
      ctx.fillStyle = '#64748b';
      ctx.fillText('MENYIAPKAN...', GAME_WIDTH / 2, 390);
    } else {
      if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.font = '12px "Press Start 2P"';
        ctx.fillStyle = '#ffe600';
        ctx.shadowColor = '#ffe600';
        ctx.fillText('TEKAN JOYSTICK (SW) / KLIK UNTUK MAIN LAGI', GAME_WIDTH / 2, 390);
      }
    }

    ctx.font = '14px Rajdhani';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Atau tekan tombol SPASI / ENTER pada keyboard', GAME_WIDTH / 2, 435);

    ctx.restore();
  }

  ctx.restore();
}

function startGame() {
  sfx.init();
  score = 0;
  waveTimer = 0;
  gameOverCooldown = 0;
  bullets.length = 0;
  enemyBullets.length = 0;
  asteroids.length = 0;
  alienShips.length = 0;
  powerups.length = 0;
  player.reset();
  gameState = STATE.PLAYING;
}

// Game Loop Runner (60 FPS)
function loop() {
  updateGame();
  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
