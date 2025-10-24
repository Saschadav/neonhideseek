// Seeker Ability System
import { CONFIG } from './config.js';

export class SeekerAbility {
    constructor() {
        this.cooldownRemaining = 0;
        this.isActive = false;
        this.activeDuration = 0;
        this.canUse = true;
    }
    
    update(deltaTime) {
        // Update cooldown
        if (this.cooldownRemaining > 0) {
            this.cooldownRemaining -= deltaTime;
            if (this.cooldownRemaining <= 0) {
                this.cooldownRemaining = 0;
                this.canUse = true;
            }
        }
        
        // Update active duration
        if (this.isActive) {
            this.activeDuration -= deltaTime;
            if (this.activeDuration <= 0) {
                this.deactivate();
            }
        }
        
        this.updateUI();
    }
    
    use() {
        if (!this.canUse || this.isActive) return false;
        
        this.isActive = true;
        this.activeDuration = CONFIG.SEEKER.AURA_DURATION;
        this.cooldownRemaining = CONFIG.SEEKER.AURA_COOLDOWN;
        this.canUse = false;
        
        console.log('Seeker Ability aktiviert!');
        return true;
    }
    
    deactivate() {
        this.isActive = false;
        this.activeDuration = 0;
    }
    
    updateUI() {
        const abilityUI = document.getElementById('seekerAbility');
        const cooldownText = document.getElementById('abilityCooldown');
        const abilityIcon = document.getElementById('abilityIcon');
        
        if (!abilityUI) return;
        
        if (this.isActive) {
            abilityUI.classList.add('active');
            cooldownText.textContent = `${this.activeDuration.toFixed(1)}s`;
            if (abilityIcon) abilityIcon.style.filter = 'brightness(1.5)';
        } else if (this.cooldownRemaining > 0) {
            abilityUI.classList.remove('active');
            cooldownText.textContent = `${Math.ceil(this.cooldownRemaining)}s`;
            if (abilityIcon) abilityIcon.style.filter = 'brightness(0.5)';
        } else {
            abilityUI.classList.remove('active');
            cooldownText.textContent = 'BEREIT';
            if (abilityIcon) abilityIcon.style.filter = 'brightness(1)';
        }
    }
    
    reset() {
        this.cooldownRemaining = 0;
        this.isActive = false;
        this.activeDuration = 0;
        this.canUse = true;
    }
}

