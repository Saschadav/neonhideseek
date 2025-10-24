import { CONFIG } from './config.js';
import { GameCore } from './game_core.js';
import { MenuManager } from './menu_manager.js';
import { MultiplayerManager } from './multiplayer.js';
import { MultiplayerHandler } from './multiplayer_handler.js';
import { SeekerAbility } from './seeker_ability.js';
import { MonsterSelectionManager, MONSTERS } from './monster_selection.js';

class Game {
    constructor() {
        this.gameMode = null;
        this.isPlaying = false;
        this.gameOver = false;
        this.timeRemaining = CONFIG.GAME.DURATION;
        
        this.core = new GameCore();
        this.multiplayer = new MultiplayerManager();
        this.multiplayerHandler = new MultiplayerHandler(this);
        this.seekerAbility = new SeekerAbility();
        this.monsterSelection = new MonsterSelectionManager();
        
        this.countdownRemaining = 0;
        this.isCountingDown = false;
        this.selectedMonster = null;
        
        this.init();
    }
    
    init() {
        this.core.initScene();
        this.core.initRenderer();
        this.core.initCamera();
        this.core.initPostProcessing();
        this.core.initEnvironment();
        this.core.initPlayer();
        this.core.initSeeker();
        this.core.initMinimap();
        
        this.initUI();
        this.menuManager = new MenuManager(this);
        this.multiplayerHandler.setupCallbacks();
        this.initEventListeners();
        
        this.animate();
    }
    
    initUI() {
        this.timerEl = document.getElementById('timer');
        this.gameMessageEl = document.getElementById('gameMessage');
        this.messageTextEl = document.getElementById('messageText');
        this.restartBtn = document.getElementById('restartButton');
        this.crosshairEl = document.getElementById('crosshair');
        
        this.restartBtn.addEventListener('click', () => {
            this.onGameRestart();
        });
    }
    
    initEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyM' && !e.repeat && this.isPlaying) {
                e.preventDefault();
                if (this.core.minimap.isActive) {
                    this.core.minimap.hide();
                    this.core.isPaused = false;
                } else {
                    this.core.minimap.show();
                    this.core.isPaused = true;
                }
            }
            
            if (e.code === 'KeyQ' && !e.repeat) {
                const waitingMenu = document.getElementById('roomWaitingMenu');
                if (!waitingMenu.classList.contains('hidden')) {
                    this.multiplayer.toggleRole();
                }
            }
            
            if (e.code === 'KeyE' && !e.repeat && this.isPlaying) {
                // Seeker Ability
                if (this.multiplayer.isSeeker() && this.gameMode === 'multiplayer') {
                    if (this.seekerAbility.use()) {
                        // Sende an Server dass Ability aktiviert wurde
                        console.log('Ability aktiviert!');
                        // TODO: Aura-Vision Effekt zeigen
                    }
                }
            }
            
            if (e.code === 'Escape') {
                e.preventDefault();
                if (this.core.minimap.isActive) {
                    this.core.minimap.hide();
                    this.core.isPaused = false;
                } else if (this.isPlaying && !this.gameOver) {
                    this.core.player.unlock();
                }
            }
        });
        
        window.addEventListener('resize', () => {
            this.core.onWindowResize();
            if (this.core.minimap) {
                this.core.minimap.updateRendererSize();
            }
        });
        
        this.core.canvas.addEventListener('click', () => {
            if (!this.core.player.isLocked() && !this.gameOver && 
                !this.core.minimap.isActive && this.isPlaying) {
                this.core.player.lock();
            }
        });
        
        this.core.player.getControls().addEventListener('lock', () => {
            if (this.isPlaying) {
                this.crosshairEl.style.display = 'block';
                if (this.gameMode === 'singleplayer' && !this.isPlaying) {
                    this.startSingleplayerGame();
                }
            }
        });
        
        this.core.player.getControls().addEventListener('unlock', () => {
            this.crosshairEl.style.display = 'none';
        });
    }
    
    async startSingleplayer() {
        this.gameMode = 'singleplayer';
        this.menuManager.showMenu(null);
        await new Promise(resolve => setTimeout(resolve, 100));
        this.core.player.lock();
    }
    
    startSingleplayerGame() {
        this.isPlaying = true;
        this.gameOver = false;
        this.timeRemaining = CONFIG.GAME.DURATION;
        this.core.isPaused = false;
        
        const playerSpawn = this.core.environment.getRandomEdgePosition();
        this.core.player.reset(playerSpawn);
        
        const seekerSpawns = [
            this.core.environment.getRandomEdgePosition(),
            this.core.environment.getRandomEdgePosition()
        ];
        
        seekerSpawns.forEach((spawn, i) => {
            while (playerSpawn.distanceTo(spawn) < 20) {
                seekerSpawns[i] = this.core.environment.getRandomEdgePosition();
                spawn = seekerSpawns[i];
            }
        });
        
        this.core.seekers.forEach((seeker, i) => {
            seeker.reset(seekerSpawns[i]);
            seeker.mesh.visible = true;
        });
        
        this.gameMessageEl.style.display = 'none';
    }
    
    async connectMultiplayer() {
        const nicknameInput = document.getElementById('nicknameInput');
        const nickname = nicknameInput.value.trim();
        
        if (!nickname) {
            alert('Bitte gib einen Nickname ein!');
            return;
        }
        
        try {
            await this.multiplayer.connect();
            this.multiplayer.setNickname(nickname);
            this.gameMode = 'multiplayer';
            this.menuManager.showMenu('lobby');
        } catch (error) {
            alert('Verbindung zum Server fehlgeschlagen!');
            console.error(error);
        }
    }
    
    endGame(won) {
        this.isPlaying = false;
        this.gameOver = true;
        this.core.player.unlock();
        
        if (won) {
            this.messageTextEl.textContent = 'ENTKOMMEN';
            this.gameMessageEl.className = 'win';
        } else {
            this.messageTextEl.textContent = 'GEFANGEN';
            this.gameMessageEl.className = 'lose';
        }
        
        this.gameMessageEl.style.display = 'block';
    }
    
    onGameRestart() {
        this.gameMessageEl.style.display = 'none';
        
        if (this.gameMode === 'singleplayer') {
            this.gameOver = false;
            this.core.player.lock();
        } else {
            this.menuManager.showMenu('roomWaiting');
            this.gameOver = false;
        }
    }
    
    update() {
        const deltaTime = this.core.clock.getDelta();
        
        this.core.update(deltaTime);
        
        if (!this.isPlaying || this.core.isPaused) {
            return;
        }
        
        if (this.gameMode === 'singleplayer') {
            this.updateSingleplayer(deltaTime);
        } else if (this.gameMode === 'multiplayer') {
            this.multiplayerHandler.update(deltaTime);
        }
        
        this.updateUI();
    }
    
    updateSingleplayer(deltaTime) {
        this.core.seekers.forEach(seeker => {
            seeker.update(
                deltaTime,
                this.core.player.position,
                this.core.environment.getWalls()
            );
            
            if (seeker.checkCaught(this.core.player.position, this.core.player.radius)) {
                this.endGame(false);
            }
        });
        
        this.timeRemaining -= deltaTime;
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.endGame(true);
        }
    }
    
    updateUI() {
        this.timerEl.textContent = Math.ceil(this.timeRemaining);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.core.render();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});

