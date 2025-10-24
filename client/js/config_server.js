// Server-Konfiguration für verschiedene Umgebungen
export const SERVER_CONFIG = {
    // Automatische Erkennung der Umgebung
    getMultiplayerServerUrl() {
        // Wenn auf Netlify deployed
        if (window.location.hostname.includes('netlify.app')) {
            // Verwende deinen Render/Railway Server
            return 'https://your-server-name.onrender.com'; // ÄNDERN!
        }
        
        // Lokal
        return 'http://localhost:8080';
    },
    
    // Für Custom Domain
    CUSTOM_SERVER_URL: null, // Setze dies wenn du eine eigene Domain hast
};

// Export der aktuellen Server URL
export const MULTIPLAYER_SERVER_URL = SERVER_CONFIG.CUSTOM_SERVER_URL || SERVER_CONFIG.getMultiplayerServerUrl();

