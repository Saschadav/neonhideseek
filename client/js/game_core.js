import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CONFIG } from './config.js';
import { Environment } from './environment.js';
import { Player } from './player.js';
import { Seeker } from './seeker.js';
import { Minimap } from './minimap.js';

export class GameCore {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.canvas = null;
        
        this.environment = null;
        this.player = null;
        this.seekers = [];
        this.minimap = null;
        
        this.isPaused = false;
        this.clock = new THREE.Clock();
    }
    
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.COLORS.BACKGROUND);
        this.scene.fog = new THREE.FogExp2(CONFIG.COLORS.FOG, CONFIG.FOG.DENSITY);
    }
    
    initRenderer() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
    }
    
    initPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);
        
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            CONFIG.BLOOM.STRENGTH,
            CONFIG.BLOOM.RADIUS,
            CONFIG.BLOOM.THRESHOLD
        );
        this.composer.addPass(bloomPass);
        
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }
    
    initEnvironment() {
        this.environment = new Environment(this.scene);
    }
    
    initPlayer() {
        this.player = new Player(this.camera, this.canvas);
        this.scene.add(this.player.getMesh());
    }
    
    initSeeker() {
        this.seekers = [
            new Seeker(this.scene),
            new Seeker(this.scene)
        ];
        this.seekers.forEach(s => s.mesh.visible = false);
    }
    
    initMinimap() {
        this.minimap = new Minimap(
            this.scene,
            this.player,
            this.seekers,
            this.environment
        );
    }
    
    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }
    
    update(deltaTime) {
        this.environment.update(deltaTime);
        
        if (this.minimap) {
            this.minimap.update(deltaTime);
        }
        
        this.player.update(deltaTime, this.environment.getWalls());
    }
    
    render() {
        if (this.minimap && this.minimap.isActive) {
            this.minimap.render();
        } else {
            this.composer.render();
        }
    }
}

