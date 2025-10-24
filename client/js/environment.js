import * as THREE from 'three';
import { CONFIG } from './config.js';
import { generateMaze, getRandomEdgePosition } from './maze.js';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.walls = [];
        this.pillars = [];
        this.time = 0;
        
        this.mazeGrid = generateMaze();
        this.createFloor();
        this.createMazeWalls();
        this.createCenterPillars();
        this.createLighting();
    }
    
    createFloor() {
        const worldSize = CONFIG.MAZE_SIZE * CONFIG.MAZE_CELL_SIZE;
        const floorGeometry = new THREE.PlaneGeometry(worldSize, worldSize);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // GROßES DACH hoch oben
        const ceilingHeight = 25;
        const ceiling = new THREE.Mesh(
            floorGeometry.clone(),
            new THREE.MeshStandardMaterial({
                color: 0x000000,
                roughness: 0.9,
                metalness: 0.1,
                side: THREE.DoubleSide
            })
        );
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = ceilingHeight;
        ceiling.receiveShadow = true;
        this.scene.add(ceiling);
        
        // SICHTBARES Grid am Boden
        const gridHelper = new THREE.GridHelper(worldSize, CONFIG.MAZE_SIZE * 2, 0x003344, 0x001122);
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
        
        // Dach-Grid (anderes Muster - Hexagon-ähnlich)
        const ceilingGrid = new THREE.GridHelper(worldSize, CONFIG.MAZE_SIZE, 0x220033, 0x110022);
        ceilingGrid.material.opacity = 0.2;
        ceilingGrid.material.transparent = true;
        ceilingGrid.position.y = ceilingHeight;
        ceilingGrid.rotation.y = Math.PI / 6; // 30° gedreht für anderes Muster
        this.scene.add(ceilingGrid);
    }
    
    createMazeWalls() {
        const cellSize = CONFIG.MAZE_CELL_SIZE;
        const size = CONFIG.MAZE_SIZE;
        const wallHeight = CONFIG.WALL_HEIGHT;
        const offset = -(size * cellSize) / 2;
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const cell = this.mazeGrid[y][x];
                const worldX = offset + x * cellSize + cellSize / 2;
                const worldZ = offset + y * cellSize + cellSize / 2;
                const color = (x + y) % 2 === 0 ? CONFIG.COLORS.WALL_CYAN : CONFIG.COLORS.WALL_MAGENTA;
                
                if (cell.walls.north) {
                    this.createWall(worldX, worldZ - cellSize / 2, cellSize, wallHeight, 'horizontal', color);
                }
                
                if (cell.walls.south && y === size - 1) {
                    this.createWall(worldX, worldZ + cellSize / 2, cellSize, wallHeight, 'horizontal', color);
                }
                
                if (cell.walls.west) {
                    this.createWall(worldX - cellSize / 2, worldZ, cellSize, wallHeight, 'vertical', color);
                }
                
                if (cell.walls.east && x === size - 1) {
                    this.createWall(worldX + cellSize / 2, worldZ, cellSize, wallHeight, 'vertical', color);
                }
            }
        }
    }
    
    createWall(x, z, length, height, orientation, color) {
        const width = orientation === 'horizontal' ? length : CONFIG.WALL_THICKNESS;
        const depth = orientation === 'horizontal' ? CONFIG.WALL_THICKNESS : length;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        
        // Collision mesh (invisible)
        const collisionMesh = new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({ visible: false })
        );
        collisionMesh.position.set(x, height / 2, z);
        collisionMesh.userData.isWall = true;
        this.scene.add(collisionMesh);
        this.walls.push(collisionMesh);
        
        // DICKE durchgehende Neon-Linien als Meshes
        const lineThickness = 0.05;
        const lineMaterial = new THREE.MeshBasicMaterial({ color: color });
        
        // Erstelle 12 Linien für Box-Kanten (4 oben, 4 unten, 4 vertikal)
        const createLine = (start, end) => {
            const direction = new THREE.Vector3().subVectors(end, start);
            const length = direction.length();
            const lineGeo = new THREE.CylinderGeometry(lineThickness, lineThickness, length, 4);
            const line = new THREE.Mesh(lineGeo, lineMaterial);
            
            line.position.copy(start).add(direction.multiplyScalar(0.5));
            line.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                direction.normalize()
            );
            return line;
        };
        
        const hw = width / 2, hh = height / 2, hd = depth / 2;
        const corners = [
            // Bottom corners
            new THREE.Vector3(x - hw, height / 2 - hh, z - hd),
            new THREE.Vector3(x + hw, height / 2 - hh, z - hd),
            new THREE.Vector3(x + hw, height / 2 - hh, z + hd),
            new THREE.Vector3(x - hw, height / 2 - hh, z + hd),
            // Top corners
            new THREE.Vector3(x - hw, height / 2 + hh, z - hd),
            new THREE.Vector3(x + hw, height / 2 + hh, z - hd),
            new THREE.Vector3(x + hw, height / 2 + hh, z + hd),
            new THREE.Vector3(x - hw, height / 2 + hh, z + hd)
        ];
        
        // Bottom edges
        this.scene.add(createLine(corners[0], corners[1]));
        this.scene.add(createLine(corners[1], corners[2]));
        this.scene.add(createLine(corners[2], corners[3]));
        this.scene.add(createLine(corners[3], corners[0]));
        // Top edges
        this.scene.add(createLine(corners[4], corners[5]));
        this.scene.add(createLine(corners[5], corners[6]));
        this.scene.add(createLine(corners[6], corners[7]));
        this.scene.add(createLine(corners[7], corners[4]));
        // Vertical edges
        this.scene.add(createLine(corners[0], corners[4]));
        this.scene.add(createLine(corners[1], corners[5]));
        this.scene.add(createLine(corners[2], corners[6]));
        this.scene.add(createLine(corners[3], corners[7]));
        
        // SOLIDE Wand - reagiert auf Licht
        const fillMesh = new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({
                color: 0x050505, // Fast schwarz
                emissive: color,
                emissiveIntensity: 0.05, // SEHR WENIG
                roughness: 0.8,
                metalness: 0.3,
                transparent: false
            })
        );
        fillMesh.position.set(x, height / 2, z);
        fillMesh.receiveShadow = true;
        this.scene.add(fillMesh);
    }
    
    createCenterPillars() {
        const geometry = new THREE.CylinderGeometry(
            CONFIG.PILLAR.RADIUS,
            CONFIG.PILLAR.RADIUS,
            CONFIG.PILLAR.HEIGHT,
            16
        );
        
        [-3, 3].forEach(xPos => {
            const material = new THREE.MeshStandardMaterial({
                color: CONFIG.COLORS.PILLAR,
                emissive: CONFIG.COLORS.PILLAR,
                emissiveIntensity: 0.9,
                roughness: 0.2,
                metalness: 0.8
            });
            
            const pillar = new THREE.Mesh(geometry, material);
            pillar.position.set(xPos, CONFIG.PILLAR.HEIGHT / 2, 0);
            pillar.castShadow = true;
            this.scene.add(pillar);
            
            // STARKE Lichter die Objekte beleuchten
            const light = new THREE.PointLight(CONFIG.COLORS.PILLAR, 4, 20);
            light.position.set(xPos, CONFIG.PILLAR.HEIGHT / 2, 0);
            light.castShadow = true;
            this.scene.add(light);
            
            // Speichere Pillar und Light separat für Update
            this.pillars.push({ mesh: pillar, material, light });
        });
    }
    
    createLighting() {
        // MINIMAL - nur damit Linien sichtbar
        const ambientLight = new THREE.AmbientLight(0x050508, 0.15);
        this.scene.add(ambientLight);
        
        const worldSize = CONFIG.MAZE_SIZE * CONFIG.MAZE_CELL_SIZE;
        const lights = [
            // Nur Zentrum
            { pos: [0, 15, 0], color: 0x003366, intensity: 1, distance: 25 }
        ];
        
        lights.forEach(config => {
            const light = new THREE.PointLight(config.color, config.intensity, config.distance);
            light.position.set(...config.pos);
            this.scene.add(light);
        });
    }
    
    update(deltaTime) {
        this.time += deltaTime * CONFIG.PILLAR.PULSE_SPEED;
        const intensity = 0.8 + (Math.sin(this.time) * 0.2);
        const lightIntensity = 3.5 + (Math.sin(this.time) * 1.0);
        
        // Update Pillar materials und lights
        this.pillars.forEach(pillarObj => {
            if (pillarObj.material) {
                pillarObj.material.emissiveIntensity = intensity;
            }
            if (pillarObj.light) {
                pillarObj.light.intensity = lightIntensity;
            }
        });
    }
    
    getWalls() {
        return this.walls;
    }
    
    getRandomEdgePosition() {
        return getRandomEdgePosition();
    }
}
