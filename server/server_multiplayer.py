#!/usr/bin/env python3
"""WebSocket Server für Multiplayer Hide & Seek"""
import asyncio
import json
import uuid
import random
from datetime import datetime
from aiohttp import web
import aiohttp_cors
import socketio

# Socket.IO Server
sio = socketio.AsyncServer(
    async_mode='aiohttp',
    cors_allowed_origins='*',
    ping_timeout=60,
    ping_interval=25
)
app = web.Application()
sio.attach(app)

# Globale Datenstrukturen
rooms = {}  # room_id: Room
players = {}  # session_id: Player

class Player:
    def __init__(self, sid, nickname):
        self.sid = sid
        self.nickname = nickname
        self.room_id = None
        self.role = 'survivor'  # 'survivor' oder 'seeker'
        self.wants_seeker = False
        self.position = {'x': 0, 'y': 0, 'z': 0}
        self.rotation = {'x': 0, 'y': 0, 'z': 0}
        self.is_alive = True
        self.is_ready = False

class Room:
    def __init__(self, room_id, host_sid, name, max_players=4, map_type='classic'):
        self.room_id = room_id
        self.name = name
        self.host_sid = host_sid
        self.max_players = max_players
        self.map_type = map_type
        self.players = {}  # sid: Player
        self.game_started = False
        self.game_time = 90
        self.game_timer = None
        self.caught_players = []
        
    def add_player(self, player):
        if len(self.players) < self.max_players:
            self.players[player.sid] = player
            player.room_id = self.room_id
            return True
        return False
    
    def remove_player(self, sid):
        if sid in self.players:
            del self.players[sid]
            if self.host_sid == sid and self.players:
                # Neuer Host
                self.host_sid = next(iter(self.players.keys()))
            return True
        return False
    
    def get_players_data(self):
        return [{
            'sid': p.sid,
            'nickname': p.nickname,
            'role': p.role,
            'wants_seeker': p.wants_seeker,
            'is_alive': p.is_alive,
            'is_ready': p.is_ready
        } for p in self.players.values()]
    
    def assign_roles(self):
        """Weise Rollen zu basierend auf Präferenzen"""
        # Spieler die Seeker sein wollen
        seeker_candidates = [p for p in self.players.values() if p.wants_seeker]
        
        if not seeker_candidates:
            # Niemand will Seeker sein - wähle zufällig
            seeker_candidates = list(self.players.values())
        
        # Wähle einen Seeker
        seeker = random.choice(seeker_candidates)
        
        for p in self.players.values():
            if p.sid == seeker.sid:
                p.role = 'seeker'
            else:
                p.role = 'survivor'
                p.is_alive = True
    
    def to_dict(self):
        return {
            'room_id': self.room_id,
            'name': self.name,
            'host_sid': self.host_sid,
            'max_players': self.max_players,
            'current_players': len(self.players),
            'map_type': self.map_type,
            'game_started': self.game_started
        }

# Socket.IO Events

@sio.event
async def connect(sid, environ):
    print(f'Client verbunden: {sid}')

@sio.event
async def disconnect(sid):
    print(f'Client getrennt: {sid}')
    
    if sid in players:
        player = players[sid]
        if player.room_id and player.room_id in rooms:
            room = rooms[player.room_id]
            room.remove_player(sid)
            
            # Benachrichtige andere Spieler
            await sio.emit('player_left', {
                'sid': sid,
                'nickname': player.nickname
            }, room=player.room_id)
            
            await sio.emit('room_update', {
                'players': room.get_players_data()
            }, room=player.room_id)
            
            # Lösche Raum wenn leer
            if not room.players:
                del rooms[player.room_id]
        
        del players[sid]

@sio.event
async def set_nickname(sid, data):
    nickname = data.get('nickname', f'Player_{sid[:4]}')
    players[sid] = Player(sid, nickname)
    await sio.emit('nickname_set', {'nickname': nickname}, room=sid)

@sio.event
async def get_rooms(sid, data):
    """Sende Liste verfügbarer Räume"""
    available_rooms = [
        room.to_dict() for room in rooms.values() 
        if not room.game_started and len(room.players) < room.max_players
    ]
    await sio.emit('rooms_list', {'rooms': available_rooms}, room=sid)

@sio.event
async def create_room(sid, data):
    """Erstelle einen neuen Raum"""
    if sid not in players:
        return
    
    player = players[sid]
    
    room_id = str(uuid.uuid4())[:8]
    room_name = data.get('name', f'Room {room_id}')
    max_players = data.get('max_players', 4)
    map_type = data.get('map_type', 'classic')
    
    room = Room(room_id, sid, room_name, max_players, map_type)
    room.add_player(player)
    rooms[room_id] = room
    
    await sio.enter_room(sid, room_id)
    await sio.emit('room_joined', {
        'room': room.to_dict(),
        'players': room.get_players_data()
    }, room=sid)

@sio.event
async def join_room(sid, data):
    """Trete einem Raum bei"""
    if sid not in players:
        return
    
    room_id = data.get('room_id')
    if room_id not in rooms:
        await sio.emit('error', {'message': 'Raum existiert nicht'}, room=sid)
        return
    
    room = rooms[room_id]
    player = players[sid]
    
    if room.game_started:
        await sio.emit('error', {'message': 'Spiel bereits gestartet'}, room=sid)
        return
    
    if len(room.players) >= room.max_players:
        await sio.emit('error', {'message': 'Raum ist voll'}, room=sid)
        return
    
    room.add_player(player)
    await sio.enter_room(sid, room_id)
    
    # Benachrichtige alle im Raum
    await sio.emit('player_joined', {
        'sid': sid,
        'nickname': player.nickname
    }, room=room_id)
    
    await sio.emit('room_joined', {
        'room': room.to_dict(),
        'players': room.get_players_data()
    }, room=sid)
    
    await sio.emit('room_update', {
        'players': room.get_players_data()
    }, room=room_id)

@sio.event
async def leave_room(sid, data):
    """Verlasse einen Raum"""
    if sid not in players:
        return
    
    player = players[sid]
    if not player.room_id or player.room_id not in rooms:
        return
    
    room = rooms[player.room_id]
    room.remove_player(sid)
    
    await sio.leave_room(sid, player.room_id)
    await sio.emit('room_left', {}, room=sid)
    
    # Benachrichtige andere
    await sio.emit('player_left', {
        'sid': sid,
        'nickname': player.nickname
    }, room=player.room_id)
    
    if room.players:
        await sio.emit('room_update', {
            'players': room.get_players_data()
        }, room=player.room_id)
    else:
        del rooms[player.room_id]
    
    player.room_id = None

@sio.event
async def toggle_role(sid, data):
    """Wechsle Rolle (Seeker wollen oder nicht)"""
    if sid not in players:
        return
    
    player = players[sid]
    if not player.room_id or player.room_id not in rooms:
        return
    
    room = rooms[player.room_id]
    
    # Toggle wants_seeker
    player.wants_seeker = not player.wants_seeker
    
    await sio.emit('room_update', {
        'players': room.get_players_data()
    }, room=room.room_id)

@sio.event
async def start_game(sid, data):
    """Starte das Spiel (nur Host)"""
    if sid not in players:
        return
    
    player = players[sid]
    if not player.room_id or player.room_id not in rooms:
        return
    
    room = rooms[player.room_id]
    
    if room.host_sid != sid:
        await sio.emit('error', {'message': 'Nur Host kann starten'}, room=sid)
        return
    
    if len(room.players) < 2:
        await sio.emit('error', {'message': 'Mindestens 2 Spieler benötigt'}, room=sid)
        return
    
    # Rollen zuweisen
    room.assign_roles()
    room.game_started = True
    room.game_time = 90
    room.caught_players = []
    
    # Starte Game Timer
    asyncio.create_task(game_timer_loop(room.room_id))
    
    await sio.emit('game_started', {
        'players': room.get_players_data(),
        'game_time': room.game_time
    }, room=room.room_id)

@sio.event
async def player_position(sid, data):
    """Aktualisiere Spielerposition"""
    if sid not in players:
        return
    
    player = players[sid]
    if not player.room_id or player.room_id not in rooms:
        return
    
    player.position = data.get('position', player.position)
    player.rotation = data.get('rotation', player.rotation)
    
    # Broadcastе an alle anderen im Raum
    await sio.emit('player_moved', {
        'sid': sid,
        'position': player.position,
        'rotation': player.rotation
    }, room=player.room_id, skip_sid=sid)

@sio.event
async def player_caught(sid, data):
    """Spieler wurde gefangen (vom Seeker gesendet)"""
    if sid not in players:
        return
    
    player = players[sid]
    if not player.room_id or player.room_id not in rooms:
        return
    
    room = rooms[player.room_id]
    
    # Nur Seeker kann fangen
    if player.role != 'seeker':
        return
    
    caught_sid = data.get('caught_sid')
    if caught_sid in room.players:
        caught_player = room.players[caught_sid]
        caught_player.is_alive = False
        room.caught_players.append(caught_sid)
        
        await sio.emit('player_died', {
            'sid': caught_sid,
            'nickname': caught_player.nickname
        }, room=room.room_id)
        
        # Prüfe ob alle gefangen
        survivors = [p for p in room.players.values() if p.role == 'survivor']
        alive_survivors = [p for p in survivors if p.is_alive]
        
        if not alive_survivors:
            await end_game(room.room_id, winner='seeker')

async def game_timer_loop(room_id):
    """Game Timer Loop"""
    while room_id in rooms:
        await asyncio.sleep(1)
        
        room = rooms[room_id]
        if not room.game_started:
            break
        
        room.game_time -= 1
        
        await sio.emit('game_time', {
            'time': room.game_time
        }, room=room_id)
        
        if room.game_time <= 0:
            await end_game(room_id, winner='survivors')
            break

async def end_game(room_id, winner):
    """Beende das Spiel"""
    if room_id not in rooms:
        return
    
    room = rooms[room_id]
    room.game_started = False
    
    await sio.emit('game_ended', {
        'winner': winner,
        'caught_players': room.caught_players
    }, room=room_id)
    
    # Reset nach 5 Sekunden
    await asyncio.sleep(5)
    
    if room_id in rooms:
        # Reset alle Spieler
        for p in room.players.values():
            p.is_alive = True
            p.role = 'survivor'
            p.wants_seeker = False
        
        await sio.emit('room_update', {
            'players': room.get_players_data()
        }, room=room_id)

# HTTP Endpoints für statische Dateien
import os
CLIENT_DIR = os.path.join(os.path.dirname(__file__), '..', 'client')

async def index(request):
    return web.FileResponse(os.path.join(CLIENT_DIR, 'index.html'))

# Statische Dateien
app.router.add_static('/css', os.path.join(CLIENT_DIR, 'css'))
app.router.add_static('/js', os.path.join(CLIENT_DIR, 'js'))
app.router.add_get('/favicon.ico', lambda r: web.FileResponse(os.path.join(CLIENT_DIR, 'favicon.ico')))
app.router.add_get('/', index)

# CORS für alle Routes (außer Socket.IO)
cors = aiohttp_cors.setup(app, defaults={
    "*": aiohttp_cors.ResourceOptions(
        allow_credentials=True,
        expose_headers="*",
        allow_headers="*",
        allow_methods="*"
    )
})

for route in list(app.router.routes()):
    # Skip Socket.IO routes und Static Resources
    if not isinstance(route.resource, web.StaticResource):
        if hasattr(route.resource, '_path'):
            if not route.resource._path.startswith('/socket.io'):
                try:
                    cors.add(route)
                except ValueError:
                    # Route hat bereits CORS, skip
                    pass

if __name__ == '__main__':
    import os
    PORT = int(os.environ.get('PORT', 8080))
    print(f"Multiplayer Server läuft auf Port {PORT}")
    web.run_app(app, host='0.0.0.0', port=PORT)

