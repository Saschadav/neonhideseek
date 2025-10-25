export class MenuManager {
    constructor(game) {
        this.game = game;
        this.initMenuElements();
        this.initEventListeners();
    }
    
    initMenuElements() {
        this.menus = {
            main: document.getElementById('mainMenu'),
            nickname: document.getElementById('nicknameMenu'),
            lobby: document.getElementById('lobbyMenu'),
            createRoom: document.getElementById('createRoomMenu'),
            joinRoom: document.getElementById('joinRoomMenu'),
            roomWaiting: document.getElementById('roomWaitingMenu'),
            settings: document.getElementById('settingsMenu')
        };
    }
    
    initEventListeners() {
        // Hauptmenü
        document.getElementById('singleplayerBtn').addEventListener('click', () => {
            this.game.startSingleplayer();
        });
        
        document.getElementById('multiplayerBtn').addEventListener('click', () => {
            this.showMenu('nickname');
        });
        
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettings();
        });
        
        // Settings Menü
        document.getElementById('applySettingsBtn').addEventListener('click', () => {
            this.applySettings();
        });
        
        document.getElementById('backToMainFromSettingsBtn').addEventListener('click', () => {
            this.showMenu('main');
        });
        
        // Nickname Menü
        document.getElementById('confirmNicknameBtn').addEventListener('click', () => {
            this.game.connectMultiplayer();
        });
        
        document.getElementById('backToMainBtn').addEventListener('click', () => {
            this.showMenu('main');
        });
        
        document.getElementById('nicknameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.game.connectMultiplayer();
            }
        });
        
        // Lobby Menü
        document.getElementById('createRoomBtn').addEventListener('click', () => {
            this.showMenu('createRoom');
        });
        
        document.getElementById('joinRoomBtn').addEventListener('click', () => {
            this.showMenu('joinRoom');
            this.game.multiplayer.getRooms();
        });
        
        document.getElementById('backToNicknameBtn').addEventListener('click', () => {
            this.showMenu('nickname');
        });
        
        // Raum erstellen Menü
        document.getElementById('maxPlayersSlider').addEventListener('input', (e) => {
            document.getElementById('maxPlayersValue').textContent = e.target.value;
        });
        
        document.getElementById('gameTimeSlider').addEventListener('input', (e) => {
            document.getElementById('gameTimeValue').textContent = e.target.value;
        });
        
        document.getElementById('monsterSelectTimeSlider').addEventListener('input', (e) => {
            document.getElementById('monsterSelectTimeValue').textContent = e.target.value;
        });
        
        document.getElementById('confirmCreateRoomBtn').addEventListener('click', () => {
            this.createRoom();
        });
        
        document.getElementById('backToLobbyBtn').addEventListener('click', () => {
            this.showMenu('lobby');
        });
        
        // Raum beitreten Menü
        document.getElementById('refreshRoomsBtn').addEventListener('click', () => {
            this.game.multiplayer.getRooms();
        });
        
        document.getElementById('backToLobbyBtn2').addEventListener('click', () => {
            this.showMenu('lobby');
        });
        
        // Raum Wartebereich
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.game.multiplayer.startGame();
        });
        
        document.getElementById('leaveRoomBtn').addEventListener('click', () => {
            this.game.multiplayer.leaveRoom();
            this.showMenu('lobby');
        });
    }
    
    showMenu(menuName) {
        Object.values(this.menus).forEach(menu => {
            if (menu) menu.classList.add('hidden');
        });
        
        if (menuName && this.menus[menuName]) {
            this.menus[menuName].classList.remove('hidden');
        }
    }
    
    createRoom() {
        let roomName = document.getElementById('roomNameInput').value.trim();
        
        // Generate default room name if empty
        if (!roomName) {
            roomName = `Server${Math.floor(Math.random() * 100) + 1}`;
        }
        
        const maxPlayers = parseInt(document.getElementById('maxPlayersSlider').value);
        const mapType = document.getElementById('mapTypeSelect').value;
        const gameTime = parseInt(document.getElementById('gameTimeSlider').value);
        const monsterSelectTime = parseInt(document.getElementById('monsterSelectTimeSlider').value);
        
        this.game.multiplayer.createRoom({
            name: roomName,
            max_players: maxPlayers,
            map_type: mapType,
            game_time: gameTime,
            monster_select_time: monsterSelectTime
        });
    }
    
    displayRoomsList(rooms) {
        const roomsList = document.getElementById('roomsList');
        roomsList.innerHTML = '';
        
        if (rooms.length === 0) {
            roomsList.innerHTML = `<p style="color: #888; text-align: center; padding: 20px;">${this.game.language.get('noRooms')}</p>`;
            return;
        }
        
        rooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.className = 'room-item';
            roomItem.innerHTML = `
                <div class="room-item-header">
                    <span class="room-name">${room.name}</span>
                    <span class="room-players">${room.current_players}/${room.max_players}</span>
                </div>
                <div class="room-map">${room.map_type}</div>
            `;
            roomItem.addEventListener('click', () => {
                this.game.multiplayer.joinRoom(room.room_id);
            });
            roomsList.appendChild(roomItem);
        });
    }
    
    updateRoomTitle(roomName) {
        document.getElementById('roomTitle').textContent = roomName;
    }
    
    updatePlayersList(players) {
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = '';
        
        players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            
            let roleClass = 'survivor';
            let roleText = this.game.language.get('survivor');
            
            if (player.role === 'seeker') {
                roleClass = 'seeker';
                roleText = this.game.language.get('seeker');
            } else if (player.wants_seeker) {
                roleClass = 'wants-seeker';
                roleText = this.game.language.get('wantsSeeker');
            }
            
            playerItem.innerHTML = `
                <span class="player-nickname">${player.nickname}</span>
                <span class="player-role ${roleClass}">${roleText}</span>
            `;
            playersList.appendChild(playerItem);
        });
        
        const startBtn = document.getElementById('startGameBtn');
        if (this.game.multiplayer.isHost) {
            startBtn.style.display = 'block';
        } else {
            startBtn.style.display = 'none';
        }
    }
    
    showSettings() {
        const languageSelect = document.getElementById('languageSelect');
        languageSelect.value = this.game.language.getCurrentLanguage();
        this.showMenu('settings');
    }
    
    applySettings() {
        const languageSelect = document.getElementById('languageSelect');
        const selectedLanguage = languageSelect.value;
        this.game.language.setLanguage(selectedLanguage);
        this.showMenu('main');
    }
}

