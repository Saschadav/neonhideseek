import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Seeker {
    constructor(scene) {
        this.scene = scene;
        this.position = new THREE.Vector3(20, 1, 20);
        this.velocity = new THREE.Vector3();
        this.speed = CONFIG.SEEKER.SPEED;
        this.chaseSpeed = CONFIG.SEEKER.CHASE_SPEED;
        this.radius = CONFIG.SEEKER.RADIUS;
        this.visionRange = CONFIG.SEEKER.VISION_RANGE;
        this.visionAngle = CONFIG.SEEKER.VISION_ANGLE;
        
        this.state = 'patrol'; // 'patrol' or 'chase'
        this.waypoint = null;
        this.waypointTimer = 0;
        this.pauseTimer = 0;
        
        this.raycaster = new THREE.Raycaster();
        
        this.createMesh();
    }
    
    createMesh() {
        // ROTER LEUCHTENDER SEEKER
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(this.radius, 32, 32),
            new THREE.MeshStandardMaterial({
                color: 0xFF0000, // ROT
                emissive: 0xFF0000, // ROT
                emissiveIntensity: 1.5,
                roughness: 0.1,
                metalness: 0.9
            })
        );
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
        
        // STARKES ROTES LICHT
        this.light = new THREE.PointLight(0xFF0000, 5, 15);
        this.mesh.add(this.light);
    }
    
    update(deltaTime, playerPosition, obstacles) {
        // SCHLAUER SEEKER
        const canSeePlayer = this.checkLineOfSight(playerPosition, obstacles);
        const distanceToPlayer = this.position.distanceTo(playerPosition);
        
        if (canSeePlayer) {
            this.state = 'chase';
            this.pauseTimer = 0;
            this.lastKnownPlayerPos = playerPosition.clone();
        } else if (this.state === 'chase') {
            // SCHLAUER: Gehe zum letzten bekannten Ort
            this.pauseTimer += deltaTime * 1000;
            if (this.pauseTimer > 2000) {
                this.state = 'patrol';
                if (this.lastKnownPlayerPos) {
                    this.waypoint = this.lastKnownPlayerPos.clone();
                }
                this.pauseTimer = 0;
            }
        } else if (distanceToPlayer < 10 && Math.random() < 0.1 * deltaTime * 100) {
            // SCHLAUER: Höre den Spieler wenn nah
            this.waypoint = playerPosition.clone();
            this.waypointTimer = 3000;
        }
        
        // Update behavior based on state
        if (this.state === 'chase') {
            this.chasePlayer(playerPosition, deltaTime);
        } else {
            this.patrol(deltaTime);
        }
        
        // Apply movement with collision avoidance
        this.applyMovement(deltaTime, obstacles);
        
        // Update mesh
        this.mesh.position.copy(this.position);
        
        // Rotate to face movement direction
        if (this.velocity.length() > 0.01) {
            const angle = Math.atan2(this.velocity.x, this.velocity.z);
            this.mesh.rotation.y = angle;
        }
        
        // Pulsierendes ROTES Licht
        if (this.light) {
            this.light.intensity = 4 + Math.sin(Date.now() * 0.005) * 1.5;
        }
    }
    
    chasePlayer(playerPosition, deltaTime) {
        const direction = new THREE.Vector3()
            .subVectors(playerPosition, this.position)
            .normalize();
        
        const speed = this.chaseSpeed * deltaTime;
        this.velocity.copy(direction.multiplyScalar(speed));
    }
    
    patrol(deltaTime) {
        // Generate new waypoint if needed
        if (!this.waypoint || this.waypointTimer <= 0) {
            const worldSize = CONFIG.MAZE_SIZE * CONFIG.MAZE_CELL_SIZE;
            const boundary = worldSize / 2 - 3;
            this.waypoint = new THREE.Vector3(
                (Math.random() - 0.5) * boundary * 2,
                1,
                (Math.random() - 0.5) * boundary * 2
            );
            this.waypointTimer = CONFIG.SEEKER.WAYPOINT_DURATION;
        }
        
        this.waypointTimer -= deltaTime * 1000;
        
        // Move towards waypoint
        const direction = new THREE.Vector3()
            .subVectors(this.waypoint, this.position);
        
        const distance = direction.length();
        
        if (distance < 2) {
            // Reached waypoint
            this.waypoint = null;
            this.velocity.set(0, 0, 0);
        } else {
            direction.normalize();
            const speed = this.speed * deltaTime;
            this.velocity.copy(direction.multiplyScalar(speed));
        }
    }
    
    applyMovement(deltaTime, obstacles) {
        const newPosition = this.position.clone().add(this.velocity);
        
        // Check collisions
        const seekerBox = new THREE.Box3().setFromCenterAndSize(
            newPosition,
            new THREE.Vector3(this.radius * 2, this.radius * 2, this.radius * 2)
        );
        
        let collided = false;
        for (const obstacle of obstacles) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            if (seekerBox.intersectsBox(obstacleBox)) {
                collided = true;
                
                // Bounce/slide response
                const obstacleCenter = new THREE.Vector3();
                obstacleBox.getCenter(obstacleCenter);
                
                const avoidDirection = new THREE.Vector3()
                    .subVectors(this.position, obstacleCenter)
                    .normalize();
                
                this.velocity.add(avoidDirection.multiplyScalar(0.1));
                break;
            }
        }
        
        if (!collided) {
            this.position.copy(newPosition);
        }
        
        // Keep in bounds
        const worldSize = CONFIG.MAZE_SIZE * CONFIG.MAZE_CELL_SIZE;
        const boundary = worldSize / 2 - 1;
        this.position.x = Math.max(-boundary, Math.min(boundary, this.position.x));
        this.position.z = Math.max(-boundary, Math.min(boundary, this.position.z));
    }
    
    checkLineOfSight(playerPosition, obstacles) {
        const direction = new THREE.Vector3()
            .subVectors(playerPosition, this.position);
        const distance = direction.length();
        
        // Check distance
        if (distance > this.visionRange) return false;
        
        // Check angle (FOV)
        const seekerForward = new THREE.Vector3(0, 0, 1)
            .applyEuler(this.mesh.rotation);
        const angle = seekerForward.angleTo(direction);
        
        if (angle > this.visionAngle) return false;
        
        // Raycast for obstacles
        direction.normalize();
        this.raycaster.set(this.position, direction);
        this.raycaster.far = distance;
        
        const intersects = this.raycaster.intersectObjects(obstacles, false);
        
        // Check if any obstacle blocks the view
        for (const intersect of intersects) {
            if (intersect.object.userData.isObstacle || intersect.object.userData.isWall) {
                if (intersect.distance < distance - 0.5) {
                    return false; // Blocked
                }
            }
        }
        
        return true; // Can see player
    }
    
    checkCaught(playerPosition, playerRadius) {
        return this.position.distanceTo(playerPosition) < (this.radius + playerRadius);
    }
    
    reset(spawnPosition) {
        if (spawnPosition) {
            this.position.copy(spawnPosition);
        } else {
            this.position.set(20, 1, 20);
        }
        this.velocity.set(0, 0, 0);
        this.state = 'patrol';
        this.waypoint = null;
        this.waypointTimer = 0;
        this.pauseTimer = 0;
        this.mesh.position.copy(this.position);
    }
    
    getState() {
        return this.state;
    }
}

