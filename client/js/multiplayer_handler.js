import * as THREE from 'three';
import { CONFIG } from './config.js';
import { MONSTERS } from './monster_selection.js';

export class MultiplayerHandler {
    constructor(game) {
        this.game = game;
        this.otherPlayerMeshes = new Map();
        this.positionUpdateTimer = 0;
    }
    
    setupCallbacks() {
        this.game.multiplayer.onRoomJoined = (data) => {
            this.game.menuManager.showMenu('roomWaiting');
            this.game.menuManager.updateRoomTitle(data.room.name);
            this.game.menuManager.updatePlayersList(data.players);
        };
        
        this.game.multiplayer.onRoomLeft = () => {
            this.game.menuManager.showMenu('lobby');
        };
        
        this.game.multiplayer.onRoomUpdate = (players) => {
            this.game.menuManager.updatePlayersList(players);
        };
        
        this.game.multiplayer.onRoomsList = (rooms) => {
            this.game.menuManager.displayRoomsList(rooms);
        };
        
        this.game.multiplayer.onGameStarted = (data) => {
            this.startGame(data);
        };
        
        this.game.multiplayer.onGameEnded = (data) => {
            this.endGame(data);
        };
        
        this.game.multiplayer.onGameTime = (time) => {
            this.game.timeRemaining = time;
        };
        
        this.game.multiplayer.onPlayerMoved = (data) => {
            this.updateOtherPlayerPosition(data);
        };
        
        this.game.multiplayer.onPlayerDied = (data) => {
            if (data.sid === this.game.multiplayer.socket.id) {
                this.onCaught();
            }
        };
    }
    
    startGame(data) {
        this.game.menuManager.showMenu(null);
        this.game.isPlaying = true;
        this.game.gameOver = false;
        this.game.timeRemaining = data.game_time;
        this.game.core.isPaused = false;
        
        const playerSpawn = this.game.core.environment.getRandomEdgePosition();
        this.game.core.player.reset(playerSpawn);
        
        this.game.core.seekers.forEach(s => s.mesh.visible = false);
        
        this.createOtherPlayerMeshes(data.players);
        
        // Zeige Role Display
        this.showRoleDisplay();
        
        // UI basierend auf Rolle anzeigen
        setTimeout(() => {
            if (this.game.multiplayer.isSeeker()) {
                // Seeker: Ability anzeigen, Sprint verstecken
                document.getElementById('seekerAbility').classList.remove('hidden');
                document.getElementById('sprintBar').classList.add('hidden');
                
                // KEINE Monster Selection mehr - direkt Countdown
                const countdownTime = CONFIG.GAME.SEEKER_SPAWN_DELAY;
                this.startSeekerCountdown(countdownTime);
            } else {
                // Survivor: Sprint anzeigen, Ability verstecken
                document.getElementById('seekerAbility').classList.add('hidden');
                document.getElementById('sprintBar').classList.remove('hidden');
                
                // Survivors können sofort spielen
                setTimeout(() => {
                    this.game.core.player.lock();
                }, 2000);
            }
        }, 3000); // Nach Role Display
        
        console.log('Multiplayer Spiel gestartet! Rolle:', this.game.multiplayer.myRole);
    }
    
    showRoleDisplay() {
        const roleDisplay = document.getElementById('roleDisplay');
        const roleText = document.getElementById('roleText');
        
        roleDisplay.classList.remove('hidden');
        
        if (this.game.multiplayer.isSeeker()) {
            roleDisplay.classList.add('seeker');
            roleDisplay.classList.remove('survivor');
            roleText.textContent = 'SEEKER';
        } else {
            roleDisplay.classList.add('survivor');
            roleDisplay.classList.remove('seeker');
            roleText.textContent = 'SURVIVOR';
        }
        
        // Ausblenden nach 3 Sekunden
        setTimeout(() => {
            roleDisplay.classList.add('hidden');
        }, 3000);
    }
    
    startSeekerCountdown(time = CONFIG.GAME.SEEKER_SPAWN_DELAY) {
        this.game.countdownRemaining = time;
        this.game.isCountingDown = true;
        
        const countdownDisplay = document.getElementById('countdownDisplay');
        const countdownText = document.getElementById('countdownText');
        const countdownNumber = document.getElementById('countdownNumber');
        
        countdownDisplay.classList.remove('hidden');
        countdownText.textContent = 'Monster spawnt in...';
        
        const countdownInterval = setInterval(() => {
            countdownNumber.textContent = this.game.countdownRemaining;
            
            this.game.countdownRemaining--;
            
            if (this.game.countdownRemaining < 0) {
                clearInterval(countdownInterval);
                countdownDisplay.classList.add('hidden');
                this.game.isCountingDown = false;
                
                // Jetzt kann Seeker spielen
                this.game.core.player.lock();
            }
        }, 1000);
    }
    
    createOtherPlayerMeshes(players) {
        this.otherPlayerMeshes.forEach(mesh => {
            this.game.core.scene.remove(mesh);
        });
        this.otherPlayerMeshes.clear();
        
        players.forEach(player => {
            if (player.sid === this.game.multiplayer.socket.id) return;
            
            const isSeeker = player.role === 'seeker';
            const color = isSeeker ? 0xFF0000 : 0x00FF00;
            
            const mesh = new THREE.Mesh(
                new THREE.CylinderGeometry(0.35, 0.35, 1.8, 16),
                new THREE.MeshStandardMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 0.5,
                    roughness: 0.3,
                    metalness: 0.7
                })
            );
            
            mesh.position.set(0, 0.9, 0);
            this.game.core.scene.add(mesh);
            this.otherPlayerMeshes.set(player.sid, mesh);
        });
    }
    
    updateOtherPlayerPosition(data) {
        const mesh = this.otherPlayerMeshes.get(data.sid);
        if (mesh && data.position) {
            mesh.position.set(data.position.x, data.position.y, data.position.z);
            if (data.rotation) {
                mesh.rotation.y = data.rotation.y;
            }
        }
    }
    
    update(deltaTime) {
        if (!this.game.multiplayer.isConnected || !this.game.isPlaying) return;
        
        this.positionUpdateTimer += deltaTime;
        if (this.positionUpdateTimer >= 0.05) {
            this.game.multiplayer.sendPosition(
                this.game.core.player.position,
                this.game.core.player.camera.rotation
            );
            this.positionUpdateTimer = 0;
        }
        
        if (this.game.multiplayer.isSeeker()) {
            this.otherPlayerMeshes.forEach((mesh, sid) => {
                const distance = this.game.core.player.position.distanceTo(mesh.position);
                if (distance < CONFIG.SEEKER.CATCH_DISTANCE) {
                    this.game.multiplayer.playerCaught(sid);
                }
            });
        }
    }
    
    endGame(data) {
        this.game.isPlaying = false;
        this.game.gameOver = true;
        this.game.core.player.unlock();
        
        const won = (data.winner === 'survivors' && this.game.multiplayer.isSurvivor()) ||
                     (data.winner === 'seeker' && this.game.multiplayer.isSeeker());
        
        if (won) {
            this.game.messageTextEl.textContent = 'GEWONNEN!';
            this.game.gameMessageEl.className = 'win';
        } else {
            this.game.messageTextEl.textContent = 'VERLOREN';
            this.game.gameMessageEl.className = 'lose';
        }
        
        this.game.gameMessageEl.style.display = 'block';
    }
    
    onCaught() {
        this.game.core.player.unlock();
        this.game.messageTextEl.textContent = 'GEFANGEN!';
        this.game.gameMessageEl.className = 'lose';
        this.game.gameMessageEl.style.display = 'block';
    }
}

