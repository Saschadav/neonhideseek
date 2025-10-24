// Server-Konfiguration für verschiedene Umgebungen
export const SERVER_CONFIG = {
    // Automatische Erkennung der Umgebung
    getMultiplayerServerUrl() {
        // Wenn deployed (Netlify oder Render)
        if (window.location.hostname.includes('netlify.app') || 
            window.location.hostname.includes('onrender.com')) {
            // Verwende deinen Render Server
            return 'https://neonhideseek.onrender.com';
        }
        
        // Lokal
        return 'http://localhost:8080';
    },
    
    // Für Custom Domain
    CUSTOM_SERVER_URL: null, // Setze dies wenn du eine eigene Domain hast
};

// Export der aktuellen Server URL
export const MULTIPLAYER_SERVER_URL = SERVER_CONFIG.CUSTOM_SERVER_URL || SERVER_CONFIG.getMultiplayerServerUrl();

