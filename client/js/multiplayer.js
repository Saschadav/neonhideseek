// Multiplayer Client Manager
import { MULTIPLAYER_SERVER_URL } from './config_server.js';

export class MultiplayerManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.nickname = '';
        this.currentRoom = null;
        this.isHost = false;
        this.myRole = 'survivor';
        this.players = new Map(); // sid -> player data
        
        this.onRoomJoined = null;
        this.onRoomLeft = null;
        this.onRoomUpdate = null;
        this.onGameStarted = null;
        this.onGameEnded = null;
        this.onPlayerMoved = null;
        this.onPlayerDied = null;
        this.onGameTime = null;
    }
    
    connect(serverUrl = MULTIPLAYER_SERVER_URL) {
        return new Promise((resolve, reject) => {
            this.socket = io(serverUrl, {
                transports: ['websocket'],
                reconnection: true
            });
            
            this.socket.on('connect', () => {
                console.log('Mit Server verbunden');
                this.isConnected = true;
                this.setupEventHandlers();
                resolve();
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('Verbindungsfehler:', error);
                reject(error);
            });
            
            this.socket.on('disconnect', () => {
                console.log('Vom Server getrennt');
                this.isConnected = false;
            });
        });
    }
    
    setupEventHandlers() {
        this.socket.on('nickname_set', (data) => {
            this.nickname = data.nickname;
            console.log('Nickname gesetzt:', this.nickname);
        });
        
        this.socket.on('room_joined', (data) => {
            console.log('Raum beigetreten:', data);
            this.currentRoom = data.room;
            this.isHost = data.room.host_sid === this.socket.id;
            this.updatePlayers(data.players);
            
            if (this.onRoomJoined) {
                this.onRoomJoined(data);
            }
        });
        
        this.socket.on('room_left', (data) => {
            console.log('Raum verlassen');
            this.currentRoom = null;
            this.isHost = false;
            this.players.clear();
            
            if (this.onRoomLeft) {
                this.onRoomLeft();
            }
        });
        
        this.socket.on('room_update', (data) => {
            console.log('Raum Update:', data);
            this.updatePlayers(data.players);
            
            // Update my role
            const myPlayer = data.players.find(p => p.sid === this.socket.id);
            if (myPlayer) {
                this.myRole = myPlayer.role;
            }
            
            if (this.onRoomUpdate) {
                this.onRoomUpdate(data.players);
            }
        });
        
        this.socket.on('player_joined', (data) => {
            console.log('Spieler beigetreten:', data.nickname);
        });
        
        this.socket.on('player_left', (data) => {
            console.log('Spieler gegangen:', data.nickname);
            this.players.delete(data.sid);
        });
        
        this.socket.on('rooms_list', (data) => {
            console.log('Verfügbare Räume:', data.rooms);
            if (this.onRoomsList) {
                this.onRoomsList(data.rooms);
            }
        });
        
        this.socket.on('game_started', (data) => {
            console.log('Spiel gestartet!', data);
            this.updatePlayers(data.players);
            
            // Update my role
            const myPlayer = data.players.find(p => p.sid === this.socket.id);
            if (myPlayer) {
                this.myRole = myPlayer.role;
            }
            
            if (this.onGameStarted) {
                this.onGameStarted(data);
            }
        });
        
        this.socket.on('game_ended', (data) => {
            console.log('Spiel beendet:', data.winner);
            if (this.onGameEnded) {
                this.onGameEnded(data);
            }
        });
        
        this.socket.on('game_time', (data) => {
            if (this.onGameTime) {
                this.onGameTime(data.time);
            }
        });
        
        this.socket.on('player_moved', (data) => {
            // Update player position
            if (this.players.has(data.sid)) {
                const player = this.players.get(data.sid);
                player.position = data.position;
                player.rotation = data.rotation;
            }
            
            if (this.onPlayerMoved) {
                this.onPlayerMoved(data);
            }
        });
        
        this.socket.on('player_died', (data) => {
            console.log('Spieler gefangen:', data.nickname);
            if (this.onPlayerDied) {
                this.onPlayerDied(data);
            }
        });
        
        this.socket.on('error', (data) => {
            console.error('Server Fehler:', data.message);
            alert(data.message);
        });
    }
    
    updatePlayers(playersArray) {
        this.players.clear();
        playersArray.forEach(p => {
            this.players.set(p.sid, p);
        });
    }
    
    setNickname(nickname) {
        if (!this.socket) return;
        this.nickname = nickname;
        this.socket.emit('set_nickname', { nickname });
    }
    
    getRooms() {
        if (!this.socket) return;
        this.socket.emit('get_rooms', {});
    }
    
    createRoom(roomData) {
        if (!this.socket) return;
        this.socket.emit('create_room', roomData);
    }
    
    joinRoom(roomId) {
        if (!this.socket) return;
        this.socket.emit('join_room', { room_id: roomId });
    }
    
    leaveRoom() {
        if (!this.socket) return;
        this.socket.emit('leave_room', {});
    }
    
    toggleRole() {
        if (!this.socket) return;
        this.socket.emit('toggle_role', {});
    }
    
    startGame() {
        if (!this.socket || !this.isHost) return;
        this.socket.emit('start_game', {});
    }
    
    sendPosition(position, rotation) {
        if (!this.socket || !this.currentRoom) return;
        this.socket.emit('player_position', {
            position: { x: position.x, y: position.y, z: position.z },
            rotation: { x: rotation.x, y: rotation.y, z: rotation.z }
        });
    }
    
    playerCaught(caughtSid) {
        if (!this.socket || this.myRole !== 'seeker') return;
        this.socket.emit('player_caught', { caught_sid: caughtSid });
    }
    
    isSeeker() {
        return this.myRole === 'seeker';
    }
    
    isSurvivor() {
        return this.myRole === 'survivor';
    }
    
    getMyPlayer() {
        if (!this.socket) return null;
        return this.players.get(this.socket.id);
    }
    
    getOtherPlayers() {
        if (!this.socket) return [];
        return Array.from(this.players.values()).filter(p => p.sid !== this.socket.id);
    }
}

