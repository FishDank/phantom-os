// Audio Permission Manager
// Handles browser audio permission requirements for all Phantom OS sites

class AudioPermissionManager {
    constructor() {
        this.isEnabled = false;
        this.overlay = null;
        this.onPermissionGranted = null;
        
        this.init();
    }
    
    init() {
        // Always attempt to enable audio immediately
        this.isEnabled = true;
        this.savePermissionState();
        
        // Set up audio context unlock on any user interaction
        this.setupUniversalAudioUnlock();
        
        console.log('[AUDIO MANAGER] Audio permission manager initialized');
    }
    
    setupUniversalAudioUnlock() {
        const unlockHandler = async () => {
            try {
                // Create and resume audio context
                if (window.AudioContext || window.webkitAudioContext) {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    if (audioContext.state === 'suspended') {
                        await audioContext.resume();
                        console.log('[AUDIO MANAGER] Audio context unlocked');
                    }
                    audioContext.close();
                }
                
                // Test audio playback capability
                const testAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
                testAudio.volume = 0;
                await testAudio.play();
                
                this.isEnabled = true;
                this.savePermissionState();
                
                if (this.onPermissionGranted) {
                    this.onPermissionGranted();
                }
                
                console.log('[AUDIO MANAGER] Audio fully unlocked and tested');
                
            } catch (error) {
                console.warn('[AUDIO MANAGER] Audio unlock failed:', error);
            }
        };
        
        // Listen for any user interaction
        ['click', 'keydown', 'touchstart', 'mousedown'].forEach(eventType => {
            document.addEventListener(eventType, unlockHandler, { once: true });
        });
    }
    
    needsUserInteraction() {
        try {
            // Test if AudioContext is suspended (requires user interaction)
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const needsInteraction = audioContext.state === 'suspended';
            audioContext.close();
            return needsInteraction;
        } catch (e) {
            // If AudioContext fails, assume we need interaction
            return true;
        }
    }
    
    showPermissionOverlay() {
        // Auto-enable audio without showing overlay - use a tiny delay to ensure page is ready
        setTimeout(() => {
            this.handlePermissionClick();
        }, 100);
    }
    
    async handlePermissionClick(e) {
        if (!this.isEnabled) {
            try {
                // Try to create and start an audio context
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
                audioContext.close();
                
                this.isEnabled = true;
                this.savePermissionState();
                this.hidePermissionOverlay();
                
                // Call permission granted callback if set
                if (this.onPermissionGranted) {
                    this.onPermissionGranted();
                }
                
            } catch (error) {
                console.warn('Audio permission setup failed:', error);
                // Still hide overlay and continue
                this.hidePermissionOverlay();
            }
        }
    }
    
    hidePermissionOverlay() {
        if (this.overlay) {
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                    this.overlay = null;
                }
            }, 300);
        }
    }
    
    applyStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .audio-permission-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(10, 14, 18, 0.95);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: opacity 0.3s ease;
                backdrop-filter: blur(2px);
            }
            
            .audio-permission-modal {
                background: linear-gradient(135deg, #0a0e12 0%, #1a1f25 100%);
                border: 2px solid #00ff41;
                border-radius: 8px;
                padding: 30px;
                text-align: center;
                max-width: 500px;
                width: 90%;
                box-shadow: 
                    0 0 20px rgba(0, 255, 65, 0.3),
                    inset 0 0 20px rgba(0, 255, 65, 0.1);
                animation: modalGlow 2s ease-in-out infinite alternate;
            }
            
            @keyframes modalGlow {
                from {
                    box-shadow: 
                        0 0 20px rgba(0, 255, 65, 0.3),
                        inset 0 0 20px rgba(0, 255, 65, 0.1);
                }
                to {
                    box-shadow: 
                        0 0 30px rgba(0, 255, 65, 0.5),
                        inset 0 0 30px rgba(0, 255, 65, 0.2);
                }
            }
            
            .permission-header {
                margin-bottom: 25px;
            }
            
            .phantom-logo {
                font-family: monospace;
                font-size: 24px;
                font-weight: bold;
                color: #00ff41;
                margin-bottom: 10px;
                text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
            }
            
            .permission-title {
                font-family: monospace;
                font-size: 18px;
                color: #00ff41;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            
            .permission-content {
                margin: 25px 0;
                color: #cccccc;
                font-family: monospace;
            }
            
            .permission-message {
                font-size: 16px;
                margin-bottom: 15px;
                line-height: 1.5;
            }
            
            .permission-instruction {
                font-size: 14px;
                color: #888888;
                font-style: italic;
            }
            
            .permission-footer {
                margin-top: 25px;
            }
            
            .click-indicator {
                font-family: monospace;
                font-size: 14px;
                color: #00ff41;
                animation: blink 1s step-start infinite;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0.3; }
            }
            
            /* Responsive design */
            @media (max-width: 600px) {
                .audio-permission-modal {
                    padding: 20px;
                    margin: 20px;
                }
                
                .phantom-logo {
                    font-size: 20px;
                }
                
                .permission-title {
                    font-size: 16px;
                }
                
                .permission-message {
                    font-size: 14px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Public method to check if audio is enabled
    isAudioEnabled() {
        return this.isEnabled;
    }
    
    // Public method to set callback for when permission is granted
    setPermissionGrantedCallback(callback) {
        this.onPermissionGranted = callback;
    }
    
    // Save permission state to localStorage
    savePermissionState() {
        localStorage.setItem('phantom-audio-enabled', 'true');
    }
}

// Export for use in other scripts
window.AudioPermissionManager = AudioPermissionManager;