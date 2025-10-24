// Monster Selection System
export const MONSTERS = {
    shadow: {
        id: 'shadow',
        name: 'Shadow Hunter',
        emoji: '👹',
        description: 'Ein schneller Jäger der Dunkelheit. Perfekt für aggressive Spieler die gerne jagen.',
        speed: 'Sehr Schnell',
        ability: 'Aura-Vision (40s CD)'
    },
    phantom: {
        id: 'phantom',
        name: 'Phantom',
        emoji: '👻',
        description: 'Ein geisterhafter Verfolger. Gleitet lautlos durch die Gänge.',
        speed: 'Sehr Schnell',
        ability: 'Aura-Vision (40s CD)'
    },
    demon: {
        id: 'demon',
        name: 'Demon Lord',
        emoji: '😈',
        description: 'Der Herrscher der Finsternis. Einschüchternd und mächtig.',
        speed: 'Sehr Schnell',
        ability: 'Aura-Vision (40s CD)'
    }
};

export class MonsterSelectionManager {
    constructor() {
        this.selectedMonster = null;
        this.selectionTimeRemaining = 0;
        this.selectionTimer = null;
        this.onComplete = null;
    }
    
    show(timeLimit, onComplete) {
        this.selectionTimeRemaining = timeLimit;
        this.onComplete = onComplete;
        this.selectedMonster = null;
        
        const menu = document.getElementById('monsterSelectionMenu');
        menu.classList.remove('hidden');
        
        // Reset all cards
        document.querySelectorAll('.monster-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        document.getElementById('monsterDetails').classList.add('hidden');
        
        this.setupEventListeners();
        this.startTimer();
    }
    
    hide() {
        const menu = document.getElementById('monsterSelectionMenu');
        menu.classList.add('hidden');
        this.stopTimer();
    }
    
    setupEventListeners() {
        // Monster cards
        document.querySelectorAll('.monster-card').forEach(card => {
            const monsterId = card.dataset.monster;
            card.onclick = () => this.selectMonster(monsterId);
        });
        
        // Buttons
        document.getElementById('confirmMonsterBtn').onclick = () => {
            if (this.selectedMonster) {
                this.confirm();
            }
        };
        
        document.getElementById('randomMonsterBtn').onclick = () => {
            const monsterIds = Object.keys(MONSTERS);
            const randomId = monsterIds[Math.floor(Math.random() * monsterIds.length)];
            this.selectMonster(randomId);
            this.confirm();
        };
    }
    
    selectMonster(monsterId) {
        this.selectedMonster = monsterId;
        const monster = MONSTERS[monsterId];
        
        // Update selected state
        document.querySelectorAll('.monster-card').forEach(card => {
            if (card.dataset.monster === monsterId) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
        
        // Show details
        document.getElementById('monsterNameDetail').textContent = monster.name;
        document.getElementById('monsterDescription').textContent = monster.description;
        document.getElementById('monsterSpeed').textContent = monster.speed;
        document.getElementById('monsterAbility').textContent = monster.ability;
        document.getElementById('monsterModel').textContent = monster.emoji;
        
        document.getElementById('monsterDetails').classList.remove('hidden');
    }
    
    confirm() {
        if (!this.selectedMonster) {
            // Random if none selected
            const monsterIds = Object.keys(MONSTERS);
            this.selectedMonster = monsterIds[Math.floor(Math.random() * monsterIds.length)];
        }
        
        this.hide();
        
        if (this.onComplete) {
            this.onComplete(this.selectedMonster);
        }
    }
    
    startTimer() {
        this.updateTimerDisplay();
        
        this.selectionTimer = setInterval(() => {
            this.selectionTimeRemaining--;
            this.updateTimerDisplay();
            
            if (this.selectionTimeRemaining <= 0) {
                this.stopTimer();
                this.confirm(); // Auto-confirm
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.selectionTimer) {
            clearInterval(this.selectionTimer);
            this.selectionTimer = null;
        }
    }
    
    updateTimerDisplay() {
        const timerEl = document.getElementById('selectionTimeRemaining');
        if (timerEl) {
            timerEl.textContent = `Zeit: ${this.selectionTimeRemaining}s`;
            
            if (this.selectionTimeRemaining <= 10) {
                timerEl.style.color = '#FF0000';
            } else {
                timerEl.style.color = '#FF6666';
            }
        }
    }
}

