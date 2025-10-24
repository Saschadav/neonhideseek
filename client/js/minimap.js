import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Minimap {
    constructor(scene, player, seekers, environment) {
        this.scene = scene;
        this.player = player;
        this.seekers = seekers; // Array von Seekern
        this.environment = environment;
        this.isActive = false;
        
        this.mapScene = new THREE.Scene();
        this.mapScene.background = new THREE.Color(0x000000);
        this.createMapObjects();
        
        this.mapCamera = new THREE.OrthographicCamera(-40, 40, 40, -40, 0.1, 100);
        this.mapCamera.position.set(0, 50, 0);
        this.mapCamera.lookAt(0, 0, 0);
        
        this.zoom = 1;
        this.panX = 0;
        this.panZ = 0;
        
        this.setupUI();
        this.setupControls();
    }
    
    createMapObjects() {
        // Boden
        const worldSize = CONFIG.MAZE_SIZE * CONFIG.MAZE_CELL_SIZE;
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(worldSize, worldSize),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        floor.rotation.x = -Math.PI / 2;
        this.mapScene.add(floor);
        
        // Grid
        const grid = new THREE.GridHelper(worldSize, CONFIG.MAZE_SIZE, 0x003333, 0x002222);
        this.mapScene.add(grid);
        
        // Wände - kopiere vom Hauptspiel
        this.wallMarkers = [];
        this.playerMarker = null;
        this.seekerMarkers = [];
        this.pillarMarkers = [];
    }
    
    setupUI() {
        // Minimap Overlay - FULLSCREEN
        this.overlay = document.createElement('div');
        this.overlay.id = 'minimapOverlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: none;
            z-index: 1000;
            overflow: hidden;
        `;
        
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        `;
        this.overlay.appendChild(this.canvas);
        
        // Instructions
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: #00FFFF;
            font-family: 'Courier New';
            font-size: 20px;
            text-align: center;
            text-shadow: 0 0 10px #00FFFF;
            pointer-events: none;
        `;
        instructions.innerHTML = 'MINIMAP<br>WASD: Bewegen | Scroll: Zoom | M/ESC: Schließen';
        this.overlay.appendChild(instructions);
        
        document.body.appendChild(this.overlay);
        
        // Renderer für Minimap - FULLSCREEN
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            alpha: false,
            antialias: true 
        });
        this.renderer.setClearColor(0x000000, 1);
        this.updateRendererSize();
    }
    
    updateRendererSize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    setupControls() {
        this.keys = {};
        
        const handleKeyDown = (e) => {
            if (!this.isActive) return;
            this.keys[e.code] = true;
        };
        
        const handleKeyUp = (e) => {
            if (!this.isActive) return;
            this.keys[e.code] = false;
        };
        
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        
        this.canvas.addEventListener('wheel', (e) => {
            if (!this.isActive) return;
            e.preventDefault();
            
            const zoomSpeed = 0.1;
            this.zoom *= (1 + (e.deltaY > 0 ? zoomSpeed : -zoomSpeed));
            this.zoom = Math.max(0.5, Math.min(3, this.zoom));
            this.updateCamera();
        });
    }
    
    show() {
        this.isActive = true;
        this.overlay.style.display = 'block';
        this.updateRendererSize();
        this.panX = this.player.position.x;
        this.panZ = this.player.position.z;
        this.zoom = 1;
        this.updateCamera();
        this.updateMapObjects();
    }
    
    hide() {
        this.isActive = false;
        this.overlay.style.display = 'none';
    }
    
    
    update(deltaTime) {
        if (!this.isActive) return;
        
        // WASD zum Bewegen
        const panSpeed = 20 * deltaTime / this.zoom;
        if (this.keys['KeyW']) this.panZ -= panSpeed;
        if (this.keys['KeyS']) this.panZ += panSpeed;
        if (this.keys['KeyA']) this.panX -= panSpeed;
        if (this.keys['KeyD']) this.panX += panSpeed;
        
        this.updateCamera();
        this.updateMapObjects();
    }
    
    updateMapObjects() {
        // Clear old objects
        this.wallMarkers.forEach(m => this.mapScene.remove(m));
        this.seekerMarkers.forEach(m => this.mapScene.remove(m));
        this.pillarMarkers.forEach(m => this.mapScene.remove(m));
        if (this.playerMarker) this.mapScene.remove(this.playerMarker);
        
        this.wallMarkers = [];
        this.seekerMarkers = [];
        this.pillarMarkers = [];
        
        // Wände - als dünne Cyan-Linien
        const walls = this.environment.getWalls();
        walls.forEach(wall => {
            const box = new THREE.Box3().setFromObject(wall);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);
            
            const wallMesh = new THREE.Mesh(
                new THREE.BoxGeometry(size.x, 0.3, size.z),
                new THREE.MeshBasicMaterial({ 
                    color: 0x00AACC,
                    transparent: true,
                    opacity: 0.8
                })
            );
            wallMesh.position.set(center.x, 0.15, center.z);
            this.mapScene.add(wallMesh);
            this.wallMarkers.push(wallMesh);
        });
        
        // Spieler - DREIECK (zeigt Blickrichtung)
        const playerShape = new THREE.Shape();
        playerShape.moveTo(0, 1.2);
        playerShape.lineTo(-0.7, -0.8);
        playerShape.lineTo(0.7, -0.8);
        playerShape.lineTo(0, 1.2);
        
        const playerGeo = new THREE.ExtrudeGeometry(playerShape, { depth: 0.4, bevelEnabled: false });
        this.playerMarker = new THREE.Mesh(
            playerGeo,
            new THREE.MeshBasicMaterial({ color: 0x00FFFF })
        );
        this.playerMarker.rotation.x = -Math.PI / 2;
        
        // Rotiere basierend auf Kamera-Rotation
        const cameraDirection = new THREE.Vector3();
        this.player.camera.getWorldDirection(cameraDirection);
        const angle = Math.atan2(cameraDirection.x, cameraDirection.z);
        this.playerMarker.rotation.z = -angle;
        
        this.playerMarker.position.set(this.player.position.x, 0.3, this.player.position.z);
        this.mapScene.add(this.playerMarker);
        
        // Seekers - RAUTEN (Diamant-Form)
        this.seekers.forEach(seeker => {
            const seekerGeo = new THREE.OctahedronGeometry(0.8, 0);
            const seekerMarker = new THREE.Mesh(
                seekerGeo,
                new THREE.MeshBasicMaterial({ color: 0xFF0000 })
            );
            seekerMarker.position.set(seeker.position.x, 0.5, seeker.position.z);
            this.mapScene.add(seekerMarker);
            this.seekerMarkers.push(seekerMarker);
        });
        
        // Säulen - STERNE
        const pillarPositions = [{ x: -3, z: 0 }, { x: 3, z: 0 }];
        pillarPositions.forEach(pos => {
            const starGeo = new THREE.SphereGeometry(0.5, 5, 5);
            const pillarMarker = new THREE.Mesh(
                starGeo,
                new THREE.MeshBasicMaterial({ color: 0xFFFF00 })
            );
            pillarMarker.position.set(pos.x, 0.5, pos.z);
            this.mapScene.add(pillarMarker);
            this.pillarMarkers.push(pillarMarker);
        });
    }
    
    updateCamera() {
        const size = 40 / this.zoom;
        this.mapCamera.left = -size;
        this.mapCamera.right = size;
        this.mapCamera.top = size;
        this.mapCamera.bottom = -size;
        this.mapCamera.position.set(this.panX, 50, this.panZ);
        this.mapCamera.updateProjectionMatrix();
    }
    
    render() {
        if (!this.isActive) return;
        this.renderer.render(this.mapScene, this.mapCamera);
    }
}

