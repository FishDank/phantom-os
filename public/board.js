// Phantom OS Board Operator Panel
class PhantomBoard {
    constructor() {
        this.socket = null;
        this.missionStep = 0;
        this.operationLogsArray = [];
        this.maxLogs = 6;
        this.isSubtitlesVisible = false;
        this.subtitlesEnabled = false; // Initially disabled until 4.mp3 finishes
        this.init();
    }

    init() {
        // Initialize Socket.IO connection
        this.socket = io();
        
        // DOM elements
        this.operationLogs = document.getElementById('operationLogs');
        this.mapDisplay = document.getElementById('mapDisplay');
        this.subtitleDisplay = document.getElementById('subtitleDisplay');
        this.systemStatus = document.getElementById('systemStatus');
        this.missionStepDisplay = document.getElementById('missionStep');
        this.endOverlay = document.getElementById('endOverlay');
        this.endVideo = document.getElementById('endVideo');
        
        // Check user role
        const urlParams = new URLSearchParams(window.location.search);
        this.userRole = urlParams.get('role') || localStorage.getItem('userRole');
        
        if (this.userRole !== 'board') {
            window.location.href = '/login.html';
            return;
        }
        
        this.setupSocketEvents();
        this.setupAudioSystem();
        this.startTimestamp();
        this.initializeBoard();
        
        console.log('Board operator panel initialized');
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Board operator connected to server');
            this.addOperationLog('BOARD OPERATOR ONLINE - MONITORING MISSION');
            this.updateSystemStatus('ONLINE', 'success');
            
            // Reclaim board role after connection (for page transitions)
            if (this.userRole) {
                console.log(`Reclaiming board role: ${this.userRole}`);
                this.socket.emit('reclaimRole', this.userRole);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Board operator disconnected');
            this.addOperationLog('CONNECTION LOST - ATTEMPTING RECONNECT');
            this.updateSystemStatus('OFFLINE', 'error');
        });

        this.socket.on('terminalOutput', (data) => {
            this.addOperationLog(`[${data.user.toUpperCase()}] COMMAND: ${data.command}`);
        });

        this.socket.on('voiceCommandReceived', (data) => {
            // Show voice subtitles on the board when subtitles are enabled
            if (this.subtitlesEnabled && data && data.text) {
                const who = data.user === 'bryon' ? 'Bryon' : (data.user === 'ryan' ? 'Ryan' : '');
                const line = who ? `${who}: ${data.text}` : data.text;
                this.addSubtitleLog(line);
            }
        });

        this.socket.on('playAudio', (data) => {
            if (typeof data === 'string') {
                // Legacy format - just audio file
                this.playAudio(data);
            } else {
                // New format with dialogue
                this.playAudio(data.audioFile);
                
                // Log dialogue when subtitles are enabled (4.mp3 will enable on 'ended')
                if (this.subtitlesEnabled && data.dialogue) {
                    this.addSubtitleLog(data.dialogue);
                }
            }
        });

        this.socket.on('missionStepUpdate', (step) => {
            this.missionStep = step;
            this.updateMissionStep(step);
            // Remove excessive logging - don't show mission step advancement
        });

        this.socket.on('showMap', (imageFile) => {
            this.showMap(imageFile);
            // Reduce excessive logging
        });

        this.socket.on('hideMap', () => {
            this.hideMap();
            // Reduce excessive logging
        });

        this.socket.on('updateResources', (resources) => {
            this.updateResources(resources.cpu, resources.gpu);
            this.addOperationLog(`SYSTEM RESOURCES: CPU ${resources.cpu}% | GPU ${resources.gpu}%`);
        });

        this.socket.on('lockdownActive', () => {
            this.addOperationLog('LOCKDOWN INITIATED - SETTLEMENT 37', 'alert');
            this.showAlert('LOCKDOWN ACTIVE');
        });

        this.socket.on('missionDialogue', (dialogueText) => {
            // Add dialogue to subtitle log when enabled
            if (this.subtitlesEnabled) this.addSubtitleLog(dialogueText);
        });

        this.socket.on('showSubtitle', (text) => {
            this.addSubtitleLog(text);
        });

        this.socket.on('blackScreen', () => {
            this.blackScreen();
            this.addOperationLog('VISUAL FEED LOST', 'error');
        });

        this.socket.on('playEndVideo', () => {
            this.playEndSequence();
            this.addOperationLog('MISSION COMPLETE - END SEQUENCE', 'success');
        });

        // Enhanced blackout sequence events
        this.socket.on('fullBlackout', () => {
            this.fullBlackout();
            this.addOperationLog('EMERGENCY BLACKOUT - ALL SYSTEMS DOWN', 'error');
        });

        this.socket.on('showEnhancedSubtitle', (data) => {
            this.showEnhancedSubtitle(data.text, data.animation, data.location);
        });

        this.socket.on('playFinalEndVideo', (data) => {
            this.playFinalEndVideo(data.videoFile, data.boardFullscreen);
            this.addOperationLog('FINAL VIDEO SEQUENCE INITIATED', 'alert');
        });

        this.socket.on('closeTab', () => {
            setTimeout(() => {
                window.close();
            }, 1000);
        });

        this.socket.on('connectedUsers', (users) => {
            this.updateConnectedUsers(users);
        });

        this.socket.on('gameState', (state) => {
            this.missionStep = state.currentStep;
            this.updateMissionStep(state.currentStep);
        });
    }

    setupAudioSystem() {
        // Initialize audio context for better browser compatibility
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('[BOARD] Audio context initialized');
            
            // Handle audio context state changes
            if (this.audioContext.state === 'suspended') {
                console.log('[BOARD] Audio context suspended, will resume on user interaction');
                this.setupAudioContextUnlock();
            }
            
        } catch (e) {
            console.warn('[BOARD] Audio context not supported:', e);
            this.audioContext = null;
        }
        
        // Set up global audio unlock on first user interaction
        this.audioUnlocked = false;
        this.currentAudio = null;
        this.audioQueue = [];
        this.setupGlobalAudioUnlock();
        
        // Use the existing boardAudio element from HTML for better reliability
        this.boardAudioElement = document.getElementById('boardAudio');
        if (this.boardAudioElement) {
            this.boardAudioElement.volume = 0.8;
            this.boardAudioElement.preload = 'auto';
            
            // Set up event listeners for the main audio element
            this.boardAudioElement.addEventListener('ended', () => {
                const fileName = this.boardAudioElement.src.split('/').pop();
                console.log(`[BOARD] Audio ended: ${fileName}`);
                this.socket.emit('audioEnded', fileName);
                this.currentAudio = null;
                this.processAudioQueue();
            });
            
            this.boardAudioElement.addEventListener('error', (e) => {
                const fileName = this.boardAudioElement.src.split('/').pop();
                console.error(`[BOARD] Audio error for ${fileName}:`, e.target.error);
                this.addOperationLog(`AUDIO ERROR: ${fileName}`, 'error');
                this.currentAudio = null;
                this.processAudioQueue();
            });
            
            this.boardAudioElement.addEventListener('canplaythrough', () => {
                const fileName = this.boardAudioElement.src.split('/').pop();
                console.log(`[BOARD] ${fileName} ready to play`);
            });
        }
    }
    
    setupAudioContextUnlock() {
        const unlockAudioContext = () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('[BOARD] Audio context resumed');
                    this.addOperationLog('AUDIO SYSTEM ENABLED');
                });
            }
        };
        
        document.addEventListener('click', unlockAudioContext, { once: true });
        document.addEventListener('keydown', unlockAudioContext, { once: true });
    }
    
    setupGlobalAudioUnlock() {
        const globalUnlock = () => {
            if (!this.audioUnlocked) {
                this.audioUnlocked = true;
                console.log('[BOARD] Global audio unlock triggered');
                this.addOperationLog('AUDIO PERMISSIONS GRANTED');
            }
        };
        
        document.addEventListener('click', globalUnlock, { once: true });
        document.addEventListener('keydown', globalUnlock, { once: true });
    }

    initializeBoard() {
        this.addOperationLog('PHANTOM OS BOARD OPERATOR PANEL INITIALIZED');
        this.addOperationLog('MONITORING ALL COMMUNICATIONS AND MISSION STATUS');
        this.updateSystemStatus('STANDBY', 'warning');
        this.updateMissionStep(0);
    }

    addOperationLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-message">${message}</span>
        `;
        
        this.operationLogs.appendChild(logEntry);
        this.operationLogs.scrollTop = this.operationLogs.scrollHeight;
    }

    showMap(imageFile) {
        this.mapDisplay.innerHTML = `
            <div class="map-container">
                <div class="map-header">TACTICAL OVERVIEW</div>
                <img src="images/${imageFile}" alt="Mission Map" class="map-image">
                <div class="map-status">LIVE FEED - ${imageFile.toUpperCase()}</div>
            </div>
        `;
    }

    hideMap() {
        this.mapDisplay.innerHTML = `
            <div class="map-standby">
                <div class="standby-text">NO ACTIVE FEED</div>
                <div class="standby-icon">◯</div>
            </div>
        `;
    }

    blackScreen() {
        this.mapDisplay.innerHTML = `
            <div class="map-error">
                <div class="error-text">CONNECTION LOST</div>
                <div class="error-icon">⚠</div>
            </div>
        `;
        this.mapDisplay.style.backgroundColor = '#000';
    }

    addSubtitleLog(text) {
        // Only show subtitle logs if enabled
        if (!this.subtitlesEnabled) return;
        
        const logEntry = {
            text: text,
            timestamp: new Date(),
            id: Date.now()
        };
        this.operationLogsArray.push(logEntry);
        while (this.operationLogsArray.length > this.maxLogs) {
            this.operationLogsArray.shift();
        }
        this.updateSubtitleDisplay();
    }
    updateSubtitleDisplay() {
        const logsContainer = this.operationLogs;
        logsContainer.innerHTML = '';
        
        this.operationLogsArray.forEach((log, index) => {
            const logElement = document.createElement('div');
            logElement.className = 'operation-log';
            if (log.text && log.text.includes('*GunShots*')) {
                logElement.classList.add('gunshots');
            }
            logElement.style.opacity = '0';
            logElement.style.transform = 'translateY(-20px)';
            logElement.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            logElement.innerHTML = `<div class="log-text">${log.text}</div>`;
            
            logsContainer.appendChild(logElement);
            
            // Animate in with staggered delay
            setTimeout(() => {
                logElement.style.opacity = '1';
                logElement.style.transform = 'translateY(0)';
            }, index * 150);
            
            // Fade older logs
            const age = this.operationLogsArray.length - index;
            if (age > 3) {
                setTimeout(() => {
                    logElement.style.opacity = '0.6';
                }, 100);
            }
            if (age > 4) {
                setTimeout(() => {
                    logElement.style.opacity = '0.3';
                }, 200);
            }
            if (age > 5) {
                setTimeout(() => {
                    logElement.style.opacity = '0.1';
                }, 300);
            }
        });
    }

    hideOperationLogs() {
        this.operationLogs.innerHTML = '';
        this.operationLogsArray = [];
    }

    showAlert(message) {
        const alert = document.createElement('div');
        alert.className = 'board-alert';
        alert.textContent = message;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 3000);
    }

    updateSystemStatus(status, type) {
        this.systemStatus.textContent = status;
        this.systemStatus.className = `status-${type}`;
    }

    updateMissionStep(step) {
        this.missionStepDisplay.textContent = `STEP ${step}`;
    }

    updateConnectedUsers(users) {
        const usersList = document.getElementById('connectedUsersList');
        if (usersList) {
            usersList.innerHTML = users.map(user => 
                `<div class="user-item ${user.role}">${user.username}</div>`
            ).join('');
        }
    }

    updateResources(cpu, gpu) {
        // Show the resource bars when resources are being monitored
        const resourceBars = document.getElementById('resourceBars');
        const cpuBar = document.getElementById('cpuBar');
        const gpuBar = document.getElementById('gpuBar');
        const cpuPercent = document.getElementById('cpuPercent');
        const gpuPercent = document.getElementById('gpuPercent');
        
        if (resourceBars) {
            resourceBars.style.display = 'block';
        }
        
        if (cpuBar) {
            cpuBar.style.width = `${cpu}%`;
            cpuBar.style.transition = 'width 2s ease-in-out'; // Smooth animation
        }
        
        if (gpuBar) {
            gpuBar.style.width = `${gpu}%`;
            gpuBar.style.transition = 'width 2s ease-in-out'; // Smooth animation
        }
        
        if (cpuPercent) {
            cpuPercent.textContent = `${cpu}%`;
        }
        
        if (gpuPercent) {
            gpuPercent.textContent = `${gpu}%`;
        }
        
        console.log(`Resources updated: CPU ${cpu}%, GPU ${gpu}%`);
    }

    playAudio(audioFile) {
        console.log(`[BOARD] Attempting to play audio: ${audioFile}`);
        
        // Use the main board audio element instead of creating new ones
        if (!this.boardAudioElement) {
            console.error('[BOARD] Board audio element not found!');
            this.addOperationLog(`AUDIO SYSTEM ERROR: No audio element`, 'error');
            return;
        }
        
        // Stop current audio if playing
        if (this.currentAudio) {
            this.boardAudioElement.pause();
            this.boardAudioElement.currentTime = 0;
        }
        
        // Set the new audio source
        this.currentAudio = audioFile;
        this.boardAudioElement.src = `audio/${audioFile}`;
        
        // Enhanced error and success handling
        const onError = (e) => {
            const errorMsg = e.target.error ? `${e.target.error.code}: ${e.target.error.message}` : 'Unknown audio error';
            console.error(`[BOARD] Audio error for ${audioFile}:`, errorMsg);
            this.addOperationLog(`AUDIO ERROR: ${audioFile} - ${errorMsg}`, 'error');
            this.currentAudio = null;
        };
        
        const onCanPlay = () => {
            console.log(`[BOARD] ${audioFile} ready to play`);
        };
        
        const onLoadStart = () => {
            console.log(`[BOARD] Loading ${audioFile}...`);
        };
        
        // Remove old event listeners to prevent duplication
        this.boardAudioElement.removeEventListener('error', onError);
        this.boardAudioElement.removeEventListener('canplaythrough', onCanPlay);
        this.boardAudioElement.removeEventListener('loadstart', onLoadStart);
        
        // Add new event listeners
        this.boardAudioElement.addEventListener('error', onError, { once: true });
        this.boardAudioElement.addEventListener('canplaythrough', onCanPlay, { once: true });
        this.boardAudioElement.addEventListener('loadstart', onLoadStart, { once: true });
        
        // Enhanced special handling for 4.mp3 subtitles
        if (audioFile === '4.mp3' && !this.subtitlesEnabled) {
            const enableSubtitles = () => {
                this.subtitlesEnabled = true;
                this.addOperationLog('BOARD SUBTITLES ONLINE - MONITORING SESSION');
                console.log('[BOARD] Subtitles enabled after 4.mp3');
            };
            this.boardAudioElement.addEventListener('ended', enableSubtitles, { once: true });
        }
        
        // Load and attempt to play
        this.boardAudioElement.load(); // Force reload the audio
        
        const playPromise = this.boardAudioElement.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log(`[BOARD] Successfully playing: ${audioFile}`);
                    // Audio text output removed - only console logging
                })
                .catch(error => {
                    console.error(`[BOARD] Audio playback failed for ${audioFile}:`, error);
                    
                    if (error.name === 'NotAllowedError') {
                        // Autoplay blocked - request user interaction
                        this.addOperationLog(`CLICK ANYWHERE TO ENABLE AUDIO: ${audioFile}`, 'warning');
                        this.setupAudioUnlock(audioFile);
                    } else if (error.name === 'NotSupportedError') {
                        this.addOperationLog(`UNSUPPORTED AUDIO FORMAT: ${audioFile}`, 'error');
                    } else {
                        this.addOperationLog(`AUDIO PLAYBACK FAILED: ${audioFile} - ${error.message}`, 'error');
                    }
                });
        }
    }
    
    // Process queued audio files
    processAudioQueue() {
        if (this.audioQueue.length > 0 && !this.currentAudio) {
            const nextAudio = this.audioQueue.shift();
            this.playAudio(nextAudio);
        }
    }
    
    // Queue audio if another is playing
    queueAudio(audioFile) {
        if (this.currentAudio) {
            this.audioQueue.push(audioFile);
            console.log(`[BOARD] Audio ${audioFile} queued`);
        } else {
            this.playAudio(audioFile);
        }
    }
    
    // Helper method to handle audio unlock after user interaction
    setupAudioUnlock(audioFile) {
        const unlockHandler = () => {
            // Resume audio context if needed
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Try to play the audio again
            this.boardAudioElement.play()
                .then(() => {
                    console.log(`[BOARD] Audio unlocked and playing: ${audioFile}`);
                    this.addOperationLog(`AUDIO ENABLED: ${audioFile}`);
                    this.audioUnlocked = true;
                })
                .catch(e => {
                    console.error(`[BOARD] Audio unlock failed for ${audioFile}:`, e);
                    this.addOperationLog(`AUDIO UNLOCK FAILED: ${audioFile}`, 'error');
                });
        };
        
        // Listen for any user interaction
        document.addEventListener('click', unlockHandler, { once: true });
        document.addEventListener('keydown', unlockHandler, { once: true });
    }

    playEndSequence() {
        console.log('Playing end sequence on BOARD...');
        
        // Show the overlay using CSS class - makes entire screen black and visible
        this.endOverlay.classList.add('active');
        this.endOverlay.style.display = 'flex';
        
        // Ensure video source is set to end.mp4
        this.endVideo.src = 'audio/end.mp4';
        
        // Configure video for fullscreen autoplay with AUDIO enabled for board
        this.endVideo.muted = false; // Board operators hear the audio
        this.endVideo.loop = false; // Don't loop the end video
        this.endVideo.autoplay = true;
        
        // Force fullscreen behavior
        this.endVideo.style.width = '100vw';
        this.endVideo.style.height = '100vh';
        this.endVideo.style.objectFit = 'cover';
        
        console.log('End video audio ENABLED for BOARD role');
        
        // Attempt to close the tab after video ends
        this.endVideo.addEventListener('ended', () => {
            console.log('[BOARD] End video finished, closing tab...');
            setTimeout(() => {
                try { 
                    window.close(); 
                } catch (e) { 
                    console.warn('Window close may be blocked by browser.');
                    // Fallback: just reload the page
                    window.location.reload();
                }
            }, 500);
        });
        
        // Play the video immediately
        this.endVideo.play()
            .then(() => {
                console.log('End video started playing successfully - Mission Complete (BOARD - audio enabled)');
            })
            .catch(error => {
                console.error('Error playing end video on board:', error);
                this.addOperationLog('MISSION COMPLETE - END VIDEO ERROR', 'error');
                // Still try to close tab after a delay if video fails
                setTimeout(() => {
                    try { window.close(); } catch (e) { window.location.reload(); }
                }, 5000);
            });
    }

    startTimestamp() {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { hour12: false });
            const timestampElement = document.getElementById('timestamp');
            if (timestampElement) {
                timestampElement.textContent = timeString;
            }
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }

    // Full blackout method - makes entire board completely black (non-destructive overlay)
    fullBlackout() {
        let blackout = document.getElementById('fullBlackoutOverlay');
        if (!blackout) {
            blackout = document.createElement('div');
            blackout.id = 'fullBlackoutOverlay';
            blackout.className = 'full-blackout-overlay';
            document.body.appendChild(blackout);
        }
        blackout.style.display = 'block';
    }

    // Enhanced subtitle with fluid animation
    showEnhancedSubtitle(text, animation, location) {
        if (location === 'operationLogs') {
            const enhancedEntry = document.createElement('div');
            enhancedEntry.className = `log-entry log-enhanced ${animation}`;
            enhancedEntry.innerHTML = `
                <span class="log-timestamp">[${new Date().toLocaleTimeString()}]</span>
                <span class="log-message enhanced-subtitle">${text}</span>
            `;
            
            this.operationLogs.appendChild(enhancedEntry);
            this.operationLogs.scrollTop = this.operationLogs.scrollHeight;
            
            // Apply fluid animation
            if (animation === 'fluid') {
                enhancedEntry.style.animation = 'fluidPulse 2s ease-in-out infinite';
            }
        } else {
            this.addSubtitleLog(text);
        }
    }

    // Play final end video (full-screen on board)
    playFinalEndVideo(videoFile, fullscreen) {
        if (fullscreen) {
            const videoOverlay = document.createElement('div');
            videoOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #000;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            const video = document.createElement('video');
            video.src = `/audio/${videoFile}`;
            video.controls = false;
            video.autoplay = true;
            video.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
            `;
            
            video.onended = () => {
                document.body.removeChild(videoOverlay);
            };
            
            videoOverlay.appendChild(video);
            document.body.appendChild(videoOverlay);
        }
    }
}

// Initialize board when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.phantomBoard = new PhantomBoard();
});

// Add CSS for dynamic elements
const dynamicStyles = `
.log-entry {
    padding: 5px 10px;
    margin: 2px 0;
    border-left: 3px solid #00ff41;
    background: rgba(0, 255, 65, 0.1);
    font-family: monospace;
    font-size: 14px;
    line-height: 1.4;
}

.log-entry.log-error {
    border-left-color: #ff4444;
    background: rgba(255, 68, 68, 0.1);
    color: #ff6666;
}

.log-entry.log-warning {
    border-left-color: #ffaa00;
    background: rgba(255, 170, 0, 0.1);
    color: #ffcc44;
}

.log-entry.log-alert {
    border-left-color: #ff0000;
    background: rgba(255, 0, 0, 0.2);
    color: #ff0000;
    font-weight: bold;
    animation: blink 1s step-start infinite;
}

.log-entry.log-success {
    border-left-color: #00ff88;
    background: rgba(0, 255, 136, 0.1);
    color: #00ff88;
}

.log-timestamp {
    color: #888;
    margin-right: 10px;
}

.log-message {
    color: #00ff41;
}

.map-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.map-header {
    background: #00ff41;
    color: #000;
    padding: 5px 15px;
    font-weight: bold;
    margin-bottom: 10px;
}

.map-image {
    max-width: 100%;
    max-height: 80%;
    border: 2px solid #00ff41;
    box-shadow: 0 0 20px #00ff41;
}

.map-status {
    margin-top: 10px;
    color: #00ff41;
    font-size: 12px;
    text-align: center;
}

.map-standby, .map-error {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #666;
}

.map-error {
    color: #ff4444;
}

.standby-icon, .error-icon {
    font-size: 48px;
    margin-top: 20px;
    animation: pulse 2s ease-in-out infinite;
}

.subtitle-text {
    background: rgba(0, 0, 0, 0.8);
    color: #ffff00;
    padding: 10px 20px;
    border: 2px solid #ffff00;
    font-family: monospace;
    font-weight: bold;
    text-align: center;
    box-shadow: 0 0 20px #ffff00;
}

.board-alert {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #ff0000;
    color: #fff;
    padding: 20px 40px;
    font-size: 24px;
    font-weight: bold;
    border: 3px solid #fff;
    box-shadow: 0 0 30px #ff0000;
    z-index: 10000;
    animation: alert-flash 0.5s step-start infinite;
}

/* GunShots special animation */
.operation-log.gunshots {
    color: #ffcc00;
    font-weight: bold;
    text-shadow: 0 0 8px rgba(255, 204, 0, 0.7);
    animation: gunshots-pulse 0.8s ease-in-out infinite alternate;
}
@keyframes gunshots-pulse {
    0% { transform: scale(1); opacity: 0.85; }
    100% { transform: scale(1.05); opacity: 1; }
}

@keyframes alert-flash {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.5; }
}

@keyframes fluidPulse {
    0%, 100% { 
        transform: scale(1) translateX(0);
        opacity: 0.9;
        color: #ffcc00;
        text-shadow: 0 0 10px rgba(255, 204, 0, 0.8);
    }
    25% {
        transform: scale(1.02) translateX(2px);
        opacity: 1;
        color: #ff6600;
        text-shadow: 0 0 15px rgba(255, 102, 0, 0.9);
    }
    50% {
        transform: scale(1.05) translateX(0);
        opacity: 0.95;
        color: #ff0000;
        text-shadow: 0 0 20px rgba(255, 0, 0, 1);
    }
    75% {
        transform: scale(1.02) translateX(-2px);
        opacity: 1;
        color: #ff6600;
        text-shadow: 0 0 15px rgba(255, 102, 0, 0.9);
    }
}

.enhanced-subtitle {
    font-weight: bold;
    font-size: 16px;
}

.status-success {
    color: #00ff41;
}

.status-warning {
    color: #ffaa00;
}

.status-error {
    color: #ff4444;
}

.user-item {
    display: inline-block;
    margin: 5px;
    padding: 5px 10px;
    border: 1px solid #00ff41;
    background: rgba(0, 255, 65, 0.1);
    border-radius: 3px;
    font-size: 12px;
}

.user-item.bryon {
    border-color: #00aaff;
    background: rgba(0, 170, 255, 0.1);
}

.user-item.ryan {
    border-color: #ff6600;
    background: rgba(255, 102, 0, 0.1);
}

.user-item.board {
    border-color: #aa00ff;
    background: rgba(170, 0, 255, 0.1);
}

/* Audio permission overlay */
.audio-permission-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(10, 14, 18, 0.95);
    z-index: 15000;
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

/* Full blackout overlay - identical to terminals */
.full-blackout-overlay {
    position: fixed;
    inset: 0;
    background: #000;
    z-index: 9000;
    display: none;
}
`;

// Inject dynamic styles
const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);
