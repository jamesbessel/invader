// ── Space Invaders Game ─────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// WebSocket connection
let ws = null;
function connectWS() {
    ws = new WebSocket(`ws://${window.location.host}/ws`);
    ws.onmessage = (event) => {
        // Can handle server messages if needed
    };
}
connectWS();

// ── Sound Effects using Web Audio API ─────────────────────────────
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    switch(type) {
        case 'shoot':
            // Quick high-pitched laser
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
            
        case 'explosion':
            // Low noise-like sound for explosion
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
            
        case 'playerHit':
            // Harsh impact sound
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;
            
        case 'gameOver':
            // Descending tones
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(300, now + 0.2);
            osc.frequency.setValueAtTime(200, now + 0.4);
            osc.frequency.setValueAtTime(100, now + 0.6);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.setValueAtTime(0.15, now + 0.6);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
            osc.start(now);
            osc.stop(now + 0.8);
            break;
            
        case 'levelUp':
            // Ascending victory tones
            osc.type = 'square';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.setValueAtTime(400, now + 0.15);
            osc.frequency.setValueAtTime(500, now + 0.3);
            osc.frequency.setValueAtTime(600, now + 0.45);
            osc.frequency.setValueAtTime(800, now + 0.6);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.setValueAtTime(0.1, now + 0.6);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
            osc.start(now);
            osc.stop(now + 0.8);
            break;
            
        case 'invaderShoot':
            // Quick blip
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
    }
}

// Game constants
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 30;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 7;
const INVADER_ROWS = 5;
const INVADER_COLS = 11;
const INVADER_WIDTH = 40;
const INVADER_HEIGHT = 30;
const INVADER_PADDING = 15;
const INVADER_OFFSET_TOP = 50;
const INVADER_OFFSET_LEFT = 50;

// Game state
const game = {
    state: 'start', // start, playing, paused, gameover, win, levelup
    score: 0,
    level: 1,
    lives: 3,
    player: null,
    bullets: [],
    invaderBullets: [],
    invaders: [],
    invaderDirection: 1,
    invaderSpeed: 1,
    lastShot: 0,
    lastInvaderShot: 0,
    keys: {},
    animationId: null
};

// Initialize player
function initPlayer() {
    game.player = {
        x: canvas.width / 2 - PLAYER_WIDTH / 2,
        y: canvas.height - PLAYER_HEIGHT - 20,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        color: '#00ff00'
    };
}

// Initialize invaders
function initInvaders() {
    game.invaders = [];
    for (let row = 0; row < INVADER_ROWS; row++) {
        for (let col = 0; col < INVADER_COLS; col++) {
            const x = INVADER_OFFSET_LEFT + col * (INVADER_WIDTH + INVADER_PADDING);
            const y = INVADER_OFFSET_TOP + row * (INVADER_HEIGHT + INVADER_PADDING);
            game.invaders.push({
                x: x,
                y: y,
                width: INVADER_WIDTH,
                height: INVADER_HEIGHT,
                row: row,
                col: col,
                alive: true,
                type: row < 1 ? 3 : row < 3 ? 2 : 1 // Points: 30, 20, 10
            });
        }
    }
    game.invaderSpeed = 1 + (game.level - 1) * 0.3;
}

// Reset game
function resetGame() {
    game.score = 0;
    game.level = 1;
    game.lives = 3;
    game.bullets = [];
    game.invaderBullets = [];
    initPlayer();
    initInvaders();
    updateHUD();
}

// Start new level
function nextLevel() {
    game.level++;
    game.bullets = [];
    game.invaderBullets = [];
    initInvaders();
    initPlayer();
    updateHUD();
}

// Draw player ship (classic triangular shape)
function drawPlayer() {
    const p = game.player;
    ctx.fillStyle = p.color;
    
    // Main body triangle
    ctx.beginPath();
    ctx.moveTo(p.x + p.width / 2, p.y);
    ctx.lineTo(p.x + p.width, p.y + p.height);
    ctx.lineTo(p.x + p.width / 2, p.y + p.height - 8);
    ctx.lineTo(p.x, p.y + p.height);
    ctx.closePath();
    ctx.fill();
    
    // Cannon
    ctx.fillStyle = '#00cc00';
    ctx.fillRect(p.x + p.width / 2 - 4, p.y - 8, 8, 10);
}

// Draw invader (classic pixel art style)
function drawInvader(invader) {
    if (!invader.alive) return;
    
    const x = invader.x;
    const y = invader.y;
    const w = invader.width;
    const h = invader.height;
    
    // Colors based on row
    const colors = ['#ff0000', '#ff6600', '#ffff00', '#00ff00', '#00ffff'];
    ctx.fillStyle = colors[invader.row] || '#00ff00';
    
    // Different designs based on type
    if (invader.type === 3) {
        // Top row - squid-like
        ctx.fillRect(x + w * 0.2, y, w * 0.6, h * 0.3);
        ctx.fillRect(x, y + h * 0.2, w, h * 0.4);
        ctx.fillRect(x + w * 0.1, y + h * 0.5, w * 0.2, h * 0.3);
        ctx.fillRect(x + w * 0.7, y + h * 0.5, w * 0.2, h * 0.3);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(x + w * 0.3, y + h * 0.3, w * 0.15, h * 0.15);
        ctx.fillRect(x + w * 0.55, y + h * 0.3, w * 0.15, h * 0.15);
    } else if (invader.type === 2) {
        // Middle rows - crab-like
        ctx.fillRect(x + w * 0.1, y, w * 0.8, h * 0.3);
        ctx.fillRect(x, y + h * 0.2, w, h * 0.5);
        ctx.fillRect(x + w * 0.2, y + h * 0.6, w * 0.15, h * 0.3);
        ctx.fillRect(x + w * 0.65, y + h * 0.6, w * 0.15, h * 0.3);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(x + w * 0.25, y + h * 0.35, w * 0.15, h * 0.15);
        ctx.fillRect(x + w * 0.6, y + h * 0.35, w * 0.15, h * 0.15);
    } else {
        // Bottom rows - classic
        ctx.fillRect(x + w * 0.15, y, w * 0.7, h * 0.25);
        ctx.fillRect(x, y + h * 0.2, w, h * 0.55);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(x + w * 0.25, y + h * 0.4, w * 0.15, h * 0.15);
        ctx.fillRect(x + w * 0.6, y + h * 0.4, w * 0.15, h * 0.15);
    }
}

// Draw bullets
function drawBullets() {
    ctx.fillStyle = '#00ff00';
    game.bullets.forEach(bullet => {
        ctx.fillRect(bullet.x - 2, bullet.y, 4, 10);
    });
    
    ctx.fillStyle = '#ff0000';
    game.invaderBullets.forEach(bullet => {
        ctx.fillRect(bullet.x - 3, bullet.y - 10, 6, 10);
        // Bullet trail
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(bullet.x - 2, bullet.y - 20, 4, 10);
        ctx.fillStyle = '#ff0000';
    });
}

// Draw bunker/bunkers
function drawBunkers() {
    // Simple bunker shapes - could add if needed
}

// Move player
function movePlayer() {
    if (game.keys['ArrowLeft'] || game.keys['KeyA']) {
        game.player.x = Math.max(0, game.player.x - PLAYER_SPEED);
    }
    if (game.keys['ArrowRight'] || game.keys['KeyD']) {
        game.player.x = Math.min(canvas.width - PLAYER_WIDTH, game.player.x + PLAYER_SPEED);
    }
}

// Move bullets
function moveBullets() {
    // Player bullets
    game.bullets = game.bullets.filter(bullet => {
        bullet.y -= BULLET_SPEED;
        return bullet.y > 0;
    });
    
    // Invader bullets
    game.invaderBullets = game.invaderBullets.filter(bullet => {
        bullet.y += BULLET_SPEED * 0.6;
        return bullet.y < canvas.height;
    });
}

// Move invaders
function moveInvaders() {
    let hitEdge = false;
    const aliveInvaders = game.invaders.filter(inv => inv.alive);
    
    if (aliveInvaders.length === 0) {
        game.state = 'win';
        showMessage('YOU WIN!', `Score: ${game.score}\nPress SPACE for next level`);
        return;
    }
    
    // Find leftmost and rightmost alive invaders
    let minX = canvas.width, maxX = 0;
    aliveInvaders.forEach(inv => {
        if (inv.x < minX) minX = inv.x;
        if (inv.x + inv.width > maxX) maxX = inv.x + inv.width;
    });
    
    if (maxX >= canvas.width - 20 && game.invaderDirection > 0) {
        hitEdge = true;
    } else if (minX <= 20 && game.invaderDirection < 0) {
        hitEdge = true;
    }
    
    if (hitEdge) {
        game.invaderDirection *= -1;
        game.invaders.forEach(inv => {
            if (inv.alive) {
                inv.y += INVADER_HEIGHT / 2;
            }
        });
        game.invaderSpeed += 0.2;
    }
    
    game.invaders.forEach(inv => {
        if (inv.alive) {
            inv.x += game.invaderSpeed * game.invaderDirection;
            
            // Check if invaders reached player level
            if (inv.y + inv.height >= game.player.y) {
                game.lives = 0;
                game.state = 'gameover';
                playSound('gameOver');
                showMessage('GAME OVER', `Final Score: ${game.score}\nPress SPACE to restart`);
            }
        }
    });
}

// Invader shooting
function invaderShoot() {
    const now = Date.now();
    const shootInterval = Math.max(500, 2000 - game.level * 100);
    
    if (now - game.lastInvaderShot > shootInterval) {
        const aliveInvaders = game.invaders.filter(inv => inv.alive);
        if (aliveInvaders.length > 0) {
            const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
            game.invaderBullets.push({
                x: shooter.x + shooter.width / 2,
                y: shooter.y + shooter.height
            });
            game.lastInvaderShot = now;
            playSound('invaderShoot');
        }
    }
}

// Collision detection
function checkCollisions() {
    // Player bullets hitting invaders
    game.bullets = game.bullets.filter(bullet => {
        for (let inv of game.invaders) {
            if (inv.alive &&
                bullet.x >= inv.x &&
                bullet.x <= inv.x + inv.width &&
                bullet.y >= inv.y &&
                bullet.y <= inv.y + inv.height) {
                
                inv.alive = false;
                game.score += inv.type * 10;
                updateHUD();
                playSound('explosion');
                return false;
            }
        }
        return true;
    });
    
    // Invader bullets hitting player
    game.invaderBullets = game.invaderBullets.filter(bullet => {
        const p = game.player;
            if (bullet.x >= p.x &&
            bullet.x <= p.x + p.width &&
            bullet.y >= p.y &&
            bullet.y <= p.y + p.height) {
            
            game.lives--;
            updateHUD();
            playSound('playerHit');
            
            if (game.lives <= 0) {
                game.state = 'gameover';
                playSound('gameOver');
                showMessage('GAME OVER', `Final Score: ${game.score}\nPress SPACE to restart`);
            } else {
                // Reset player position
                game.player.x = canvas.width / 2 - PLAYER_WIDTH / 2;
                game.invaderBullets = [];
            }
            return false;
        }
        return true;
    });
}

// Update HUD
function updateHUD() {
    document.getElementById('score').textContent = game.score;
    document.getElementById('level').textContent = game.level;
    document.getElementById('lives').textContent = game.lives;
}

// Show message
function showMessage(title, subtitle) {
    document.getElementById('message-text').innerHTML = `${title}<br><span style="font-size: 16px">${subtitle.replace(/\n/g, '<br>')}</span>`;
    document.getElementById('message').classList.remove('hidden');
}

// Main game loop
function gameLoop() {
    if (game.state !== 'playing') return;
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw starfield background
    drawStars();
    
    // Update
    movePlayer();
    moveBullets();
    moveInvaders();
    invaderShoot();
    checkCollisions();
    
    // Draw
    drawPlayer();
    game.invaders.forEach(drawInvader);
    drawBullets();
    
    // Check for level complete
    if (game.invaders.every(inv => !inv.alive)) {
        game.state = 'levelup';
        playSound('levelUp');
        showMessage(`LEVEL ${game.level} COMPLETE!`, 'Press SPACE for next level');
    }
    
    game.animationId = requestAnimationFrame(gameLoop);
}

// Simple starfield
const stars = [];
for (let i = 0; i < 50; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.1
    });
}

function drawStars() {
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        ctx.fillRect(star.x, star.y, star.size, star.size);
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

// Start game
function startGame() {
    game.state = 'playing';
    game.bullets = [];
    game.invaderBullets = [];
    initPlayer();
    initInvaders();
    updateHUD();
    document.getElementById('message').classList.add('hidden');
    playSound('levelUp'); // Start sound
    gameLoop();
}

// Input handling
document.addEventListener('keydown', (e) => {
    initAudio(); // Initialize audio on first interaction
    game.keys[e.code] = true;
    
    if (e.code === 'Space') {
        e.preventDefault();
        
        if (game.state === 'start' || game.state === 'gameover') {
            resetGame();
            startGame();
        } else if (game.state === 'win' || game.state === 'levelup') {
            nextLevel();
            startGame();
        } else if (game.state === 'playing') {
            // Player shoots
            const now = Date.now();
            if (now - game.lastShot > 300) {
                game.bullets.push({
                    x: game.player.x + game.player.width / 2,
                    y: game.player.y
                });
                game.lastShot = now;
                playSound('shoot');
            }
        }
    }
});

document.addEventListener('keyup', (e) => {
    game.keys[e.code] = false;
});

// Show start screen
function init() {
    document.getElementById('message-text').innerHTML = 'INVADER<br><span style="font-size: 16px">Press SPACE to start</span>';
    document.getElementById('message').classList.remove('hidden');
    updateHUD();
}

init();
