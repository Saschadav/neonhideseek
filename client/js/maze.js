import * as THREE from 'three';
import { CONFIG } from './config.js';

// Maze generation using Recursive Backtracking
export function generateMaze() {
    const size = CONFIG.MAZE_SIZE;
    const mazeGrid = Array(size).fill(null).map(() => 
        Array(size).fill(null).map(() => ({
            visited: false,
            walls: { north: true, south: true, east: true, west: true }
        }))
    );
    
    const centerStart = Math.floor((size - CONFIG.CENTER_EMPTY_SIZE) / 2);
    const centerEnd = centerStart + CONFIG.CENTER_EMPTY_SIZE;
    
    // Recursive backtracking maze generation
    const stack = [];
    let current = { x: 0, y: 0 };
    mazeGrid[0][0].visited = true;
    
    const getUnvisitedNeighbors = (x, y) => {
        const neighbors = [];
        if (y > 0 && !mazeGrid[y-1][x].visited) neighbors.push({ x, y: y-1, dir: 'north' });
        if (y < size-1 && !mazeGrid[y+1][x].visited) neighbors.push({ x, y: y+1, dir: 'south' });
        if (x > 0 && !mazeGrid[y][x-1].visited) neighbors.push({ x: x-1, y, dir: 'west' });
        if (x < size-1 && !mazeGrid[y][x+1].visited) neighbors.push({ x: x+1, y, dir: 'east' });
        return neighbors;
    };
    
    while (true) {
        const neighbors = getUnvisitedNeighbors(current.x, current.y);
        
        if (neighbors.length > 0) {
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            stack.push(current);
            
            const curr = mazeGrid[current.y][current.x];
            const nextCell = mazeGrid[next.y][next.x];
            
            if (next.dir === 'north') {
                curr.walls.north = false;
                nextCell.walls.south = false;
            } else if (next.dir === 'south') {
                curr.walls.south = false;
                nextCell.walls.north = false;
            } else if (next.dir === 'east') {
                curr.walls.east = false;
                nextCell.walls.west = false;
            } else if (next.dir === 'west') {
                curr.walls.west = false;
                nextCell.walls.east = false;
            }
            
            nextCell.visited = true;
            current = { x: next.x, y: next.y };
        } else if (stack.length > 0) {
            current = stack.pop();
        } else {
            break;
        }
    }
    
    // Clear center area
    for (let y = centerStart; y < centerEnd; y++) {
        for (let x = centerStart; x < centerEnd; x++) {
            if (y >= 0 && y < size && x >= 0 && x < size) {
                mazeGrid[y][x].walls = { north: false, south: false, east: false, west: false };
            }
        }
    }
    
    // Open edges
    mazeGrid[0][Math.floor(size/4)].walls.west = false;
    mazeGrid[size-1][Math.floor(3*size/4)].walls.east = false;
    
    // Erstelle VIELE GROßE RÄUME
    const roomCount = 12; // Mehr Räume
    for (let i = 0; i < roomCount; i++) {
        const roomSize = 4 + Math.floor(Math.random() * 4); // 4x4 bis 7x7
        const rx = Math.floor(Math.random() * (size - roomSize - 2)) + 1;
        const ry = Math.floor(Math.random() * (size - roomSize - 2)) + 1;
        
        // Überspringe Center-Area
        if (rx >= centerStart - 2 && rx < centerEnd + 2 && 
            ry >= centerStart - 2 && ry < centerEnd + 2) continue;
        
        // Erstelle Raum
        for (let dy = 0; dy < roomSize; dy++) {
            for (let dx = 0; dx < roomSize; dx++) {
                const cx = rx + dx;
                const cy = ry + dy;
                if (cx >= 0 && cx < size && cy >= 0 && cy < size) {
                    mazeGrid[cy][cx].walls = { north: false, south: false, east: false, west: false };
                }
            }
        }
    }
    
    // SEHR OFFENE DURCHGÄNGE - entferne 60% der Wände
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (x >= centerStart && x < centerEnd && y >= centerStart && y < centerEnd) continue;
            
            const cell = mazeGrid[y][x];
            if (Math.random() < 0.6) { // ERHÖHT auf 60%
                if (Math.random() < 0.5 && cell.walls.north) {
                    cell.walls.north = false;
                    if (y > 0) mazeGrid[y-1][x].walls.south = false;
                } else if (cell.walls.east) {
                    cell.walls.east = false;
                    if (x < size-1) mazeGrid[y][x+1].walls.west = false;
                }
            }
        }
    }
    
    return mazeGrid;
}

export function getRandomEdgePosition() {
    const size = CONFIG.MAZE_SIZE;
    const cellSize = CONFIG.MAZE_CELL_SIZE;
    const offset = -(size * cellSize) / 2;
    
    const edges = [
        { x: 2, y: 2 },
        { x: size - 3, y: size - 3 },
        { x: 2, y: size - 3 },
        { x: size - 3, y: 2 }
    ];
    
    const pos = edges[Math.floor(Math.random() * edges.length)];
    
    return new THREE.Vector3(
        offset + pos.x * cellSize + cellSize / 2,
        1,
        offset + pos.y * cellSize + cellSize / 2
    );
}

