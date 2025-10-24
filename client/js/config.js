// Game Configuration - VERSION 2.0 - NEUE WERTE
export const CONFIG = {
    // Maze - KLEINER & OFFENER
    MAZE_SIZE: 25, // Grid units (war 40)
    MAZE_CELL_SIZE: 3, // Size of each cell (größer für offenere Räume)
    WALL_HEIGHT: 4,
    WALL_THICKNESS: 0.25,
    CENTER_EMPTY_SIZE: 7, // 7x7 center area kept empty
    
    // Player
    PLAYER: {
        HEIGHT: 1.8,
        SPEED: 12, // Schneller als vorher
        SPRINT_MULTIPLIER: 1.3, // Nur leicht schneller beim Sprint
        SPRINT_DURATION: 5, // Sekunden Sprint
        SPRINT_RECOVERY: 8, // Sekunden bis volle Regeneration
        RADIUS: 0.35,
        MOUSE_SENSITIVITY: 0.002,
        JUMP_FORCE: 8, // Jump velocity
        GRAVITY: 25 // Gravity acceleration
    },
    
    // Seeker
    SEEKER: {
        RADIUS: 0.7,
        SPEED: 15.6, // = Spieler Sprint-Geschwindigkeit (12 * 1.3)
        CHASE_SPEED: 15.6, // Gleiche Geschwindigkeit
        VISION_RANGE: 20,
        VISION_ANGLE: Math.PI / 3,
        WAYPOINT_DURATION: 5000,
        PATROL_PAUSE: 500,
        CATCH_DISTANCE: 1.5, // Fangreichweite
        AURA_COOLDOWN: 40, // Sekunden
        AURA_DURATION: 2 // Sekunden
    },
    
    // Game
    GAME: {
        DURATION: 120, // 2 Minuten default
        SEEKER_SPAWN_DELAY: 10, // Sekunden bis Seeker spawnt
        MONSTER_SELECTION_TIME: 30 // Sekunden für Monster-Auswahl
    },
    
    // Visual - SICHTBARE NEON LINIEN
    COLORS: {
        BACKGROUND: 0x000000, // SCHWARZ
        FOG: 0x000000,
        PLAYER: 0x00FFFF,
        SEEKER: 0xFF4400,
        WALL_CYAN: 0x00FFFF, // HELL für sichtbare Linien
        WALL_MAGENTA: 0xFF00FF, // HELL für sichtbare Linien
        PILLAR: 0x00FFFF,
        FLOOR: 0x000000
    },
    
    // Post Processing - MINIMAL
    BLOOM: {
        STRENGTH: 0.2,
        RADIUS: 0.3,
        THRESHOLD: 0.6
    },
    
    // Fog
    FOG: {
        DENSITY: 0.005 // SEHR WENIG NEBEL
    },
    
    // Pillars - SUBTIL
    PILLAR: {
        HEIGHT: 8,
        RADIUS: 0.3,
        PULSE_SPEED: 1.5,
        MIN_INTENSITY: 0.4,
        MAX_INTENSITY: 0.7
    }
};
