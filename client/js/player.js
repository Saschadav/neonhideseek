import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CONFIG } from './config.js';

export class Player {
    constructor(camera, domElement) {
        this.camera = camera;
        this.camera.fov = 75; // Standard FOV
        this.camera.updateProjectionMatrix();
        this.height = CONFIG.PLAYER.HEIGHT;
        this.speed = CONFIG.PLAYER.SPEED;
        this.sprintMultiplier = CONFIG.PLAYER.SPRINT_MULTIPLIER;
        this.radius = CONFIG.PLAYER.RADIUS;
        
        this.position = new THREE.Vector3(0, this.height, 0);
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        
        // Movement state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.sprint = false;
        
        // Sprint system
        this.sprintEnergy = 100; // 0-100
        this.sprintDrainRate = 100 / CONFIG.PLAYER.SPRINT_DURATION; // Per second
        this.sprintRecoveryRate = 100 / CONFIG.PLAYER.SPRINT_RECOVERY; // Per second
        this.canSprint = true;
        
        // Jump state
        this.verticalVelocity = 0;
        this.isJumping = false;
        this.canJump = true;
        
        // Setup controls
        this.controls = new PointerLockControls(camera, domElement);
        this.camera.position.copy(this.position);
        
        // Visual representation - NICHT SICHTBAR in First-Person
        this.mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(this.radius, this.radius, this.height, 16),
            new THREE.MeshStandardMaterial({
                color: CONFIG.COLORS.PLAYER,
                emissive: CONFIG.COLORS.PLAYER,
                emissiveIntensity: 0.5,
                roughness: 0.3,
                metalness: 0.7
            })
        );
        this.mesh.position.copy(this.position);
        this.mesh.visible = false; // Verstecke Player-Mesh in First-Person
        
        // Spieler-Licht - SCHWACH
        const playerLight = new THREE.PointLight(0x00FFFF, 0.8, 8);
        this.mesh.add(playerLight);
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'KeyD':
                    this.moveRight = true;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.sprint = true;
                    break;
                case 'Space':
                    event.preventDefault();
                    if (this.canJump && !this.isJumping) {
                        this.verticalVelocity = CONFIG.PLAYER.JUMP_FORCE;
                        this.isJumping = true;
                        this.canJump = false;
                    }
                    break;
            }
        };
        
        const onKeyUp = (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'KeyD':
                    this.moveRight = false;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.sprint = false;
                    break;
            }
        };
        
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
    }
    
    lock() {
        this.controls.lock();
    }
    
    unlock() {
        this.controls.unlock();
    }
    
    isLocked() {
        return this.controls.isLocked;
    }
    
    update(deltaTime, obstacles) {
        if (!this.controls.isLocked) return;
        
        // Calculate movement direction
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();
        
        // Sprint energy management
        const isMoving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
        const wantsToSprint = this.sprint && isMoving;
        
        if (wantsToSprint && this.sprintEnergy > 0) {
            // Drain sprint energy
            this.sprintEnergy = Math.max(0, this.sprintEnergy - this.sprintDrainRate * deltaTime);
            if (this.sprintEnergy <= 0) {
                this.canSprint = false;
            }
        } else {
            // Recover sprint energy
            this.sprintEnergy = Math.min(100, this.sprintEnergy + this.sprintRecoveryRate * deltaTime);
            if (this.sprintEnergy >= 100) {
                this.canSprint = true;
            }
        }
        
        // Calculate speed
        const isSprinting = wantsToSprint && this.sprintEnergy > 0;
        const currentSpeed = isSprinting ? 
            this.speed * this.sprintMultiplier : 
            this.speed;
        
        // Update sprint bar UI
        this.updateSprintBar();
        
        // Apply velocity
        const actualSpeed = currentSpeed * deltaTime;
        
        if (this.moveForward || this.moveBackward) {
            this.velocity.z = this.direction.z * actualSpeed;
        } else {
            this.velocity.z = 0;
        }
        
        if (this.moveLeft || this.moveRight) {
            this.velocity.x = this.direction.x * actualSpeed;
        } else {
            this.velocity.x = 0;
        }
        
        // Store old position for collision rollback
        const oldPosition = this.position.clone();
        
        // Move with PointerLockControls (inverted Z for correct direction)
        this.controls.moveRight(this.velocity.x);
        this.controls.moveForward(this.velocity.z);
        
        // Get camera position (controlled by PointerLockControls)
        this.camera.getWorldPosition(this.position);
        
        // Collision detection (may adjust position)
        this.handleCollisions(obstacles);
        
        // Apply gravity and jumping
        this.verticalVelocity -= CONFIG.PLAYER.GRAVITY * deltaTime;
        this.position.y += this.verticalVelocity * deltaTime;
        
        // Ground check
        if (this.position.y <= this.height) {
            this.position.y = this.height;
            this.verticalVelocity = 0;
            this.isJumping = false;
            this.canJump = true;
        }
        
        // Smooth position to prevent jitter (only XZ)
        const smoothFactor = 0.3;
        this.position.x = oldPosition.x + (this.position.x - oldPosition.x) * smoothFactor;
        this.position.z = oldPosition.z + (this.position.z - oldPosition.z) * smoothFactor;
        
        // Keep in bounds
        const worldSize = CONFIG.MAZE_SIZE * CONFIG.MAZE_CELL_SIZE;
        const boundary = worldSize / 2 - 1;
        this.position.x = Math.max(-boundary, Math.min(boundary, this.position.x));
        this.position.z = Math.max(-boundary, Math.min(boundary, this.position.z));
        
        // Update camera position after collision
        this.camera.position.copy(this.position);
        
        // Update visual mesh
        this.mesh.position.set(
            this.position.x,
            this.height / 2,
            this.position.z
        );
    }
    
    handleCollisions(obstacles) {
        // SANFTE Kollision ohne Vibration
        const safeDistance = this.radius + 0.1;
        let hasCollision = false;
        
        for (const obstacle of obstacles) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            
            // Erweitere Box um Spieler-Radius
            const expandedBox = obstacleBox.clone();
            expandedBox.expandByScalar(safeDistance);
            
            const playerPoint = new THREE.Vector3(this.position.x, this.height / 2, this.position.z);
            
            if (expandedBox.containsPoint(playerPoint)) {
                hasCollision = true;
                
                // Finde nächsten Punkt außerhalb der Box
                const obstacleCenter = new THREE.Vector3();
                obstacleBox.getCenter(obstacleCenter);
                
                // Berechne Pushback-Richtung (nur XZ)
                const dx = this.position.x - obstacleCenter.x;
                const dz = this.position.z - obstacleCenter.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                
                if (dist > 0.001) {
                    // Normalisiere
                    const nx = dx / dist;
                    const nz = dz / dist;
                    
                    // Sanfter Pushback (kein Multiply, einfach Position setzen)
                    const obstacleSize = new THREE.Vector3();
                    obstacleBox.getSize(obstacleSize);
                    const halfSize = Math.max(obstacleSize.x, obstacleSize.z) / 2;
                    
                    this.position.x = obstacleCenter.x + nx * (halfSize + safeDistance + 0.2);
                    this.position.z = obstacleCenter.z + nz * (halfSize + safeDistance + 0.2);
                }
            }
        }
    }
    
    reset(spawnPosition) {
        if (spawnPosition) {
            this.position.set(spawnPosition.x, this.height, spawnPosition.z);
        } else {
            this.position.set(0, this.height, 0);
        }
        this.velocity.set(0, 0, 0);
        this.camera.position.copy(this.position);
        this.mesh.position.set(this.position.x, this.height / 2, this.position.z);
    }
    
    getMesh() {
        return this.mesh;
    }
    
    getControls() {
        return this.controls;
    }
    
    updateSprintBar() {
        const sprintBar = document.getElementById('sprintBar');
        const sprintFill = document.getElementById('sprintFill');
        
        if (sprintBar && sprintFill) {
            sprintFill.style.width = `${this.sprintEnergy}%`;
            
            // Color based on energy
            if (this.sprintEnergy < 20) {
                sprintFill.style.background = 'linear-gradient(90deg, #FF4444, #CC0000)';
            } else if (this.sprintEnergy < 50) {
                sprintFill.style.background = 'linear-gradient(90deg, #FFAA44, #FF8800)';
            } else {
                sprintFill.style.background = 'linear-gradient(90deg, #00FFFF, #00CCCC)';
            }
        }
    }
    
    getSprintEnergy() {
        return this.sprintEnergy;
    }
}

