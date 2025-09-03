// Phantom OS Terminal Application with Real-time Mission System
class PhantomTerminal {
    constructor() {
        this.socket = null;
        this.userRole = null;
        this.missionStep = 0;
        this.recognition = null;
        this.isListening = false;
        this.shouldKeepListening = false; // Initialize microphone as disabled
        this.audioPlayer = null;
        this.commandHistory = [];
        this.historyIndex = -1;
        this.f2MessageShown = false;
        this.audioIsPlaying = false; // Track if audio is currently playing
        this.currentExpectedData = null; // Store current expected line data
        
        this.init();
    }

    init() {
        // Initialize Socket.IO connection
        this.socket = io();
        
        // Initialize DOM elements
        this.terminalOutput = document.getElementById('terminalOutput');
        this.commandInput = document.getElementById('commandInput');
        this.missionDisplay = document.getElementById('missionDisplay');
        this.displayContent = document.getElementById('displayContent');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.endOverlay = document.getElementById('endOverlay');
        this.endVideo = document.getElementById('endVideo');
        
        // Resource bars
        this.cpuBar = document.getElementById('cpuBar');
        this.gpuBar = document.getElementById('gpuBar');
        this.cpuValue = document.getElementById('cpuValue');
        this.gpuValue = document.getElementById('gpuValue');
        
        // Get user role from URL params or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        this.userRole = urlParams.get('role') || localStorage.getItem('userRole');
        
        if (!this.userRole) {
            window.location.href = '/login.html';
            return;
        }
        
        this.setupEventListeners();
        this.setupSocketEvents();
        this.setupVoiceRecognition();
        this.setupAudioPermissions();
        this.startTimestamp();
        
        // Add initial welcome message
        this.addTerminalLine(`Welcome, ${this.userRole.toUpperCase()}. System initialized.`);
        this.addTerminalLine('Type "bash mission" to begin mission sequence.');
        
        console.log(`Terminal initialized for role: ${this.userRole}`);
    }

    setupEventListeners() {
        // Command input handling
        this.commandInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleCommand();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory(1);
            }
        });

        // Focus management
        document.addEventListener('click', () => {
            this.commandInput.focus();
        });

        this.commandInput.focus();

        // Voice recognition is fully automatic - no manual controls

        // Test mission advancement (CTRL + ALT + D key for testing)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'd' && e.ctrlKey && e.altKey && (this.userRole === 'bryon' || this.userRole === 'ryan')) {
                e.preventDefault();
                this.socket.emit('advanceMission');
                this.addTerminalLine('[TEST] Mission step advanced manually');
            }
            // F4 key to simulate voice command for testing
            if (e.key === 'F4' && this.currentExpectedData) {
                e.preventDefault();
                const expectedText = this.currentExpectedData.line;
                this.addTerminalLine(`[TEST] Simulating voice: "${expectedText}"`, 'system');
                this.socket.emit('voiceCommand', { text: expectedText });
            }
        });
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.addTerminalLine('Connection established with Phantom OS Server.');
            
            // Reclaim role after connection (for page transitions)
            if (this.userRole) {
                console.log(`Reclaiming role: ${this.userRole}`);
                this.socket.emit('reclaimRole', this.userRole);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.addTerminalLine('WARNING: Connection lost. Attempting to reconnect...');
        });

        this.socket.on('roleReclaimed', (role) => {
            console.log(`Role reclaimed: ${role}`);
            this.addTerminalLine(`Role ${role.toUpperCase()} reclaimed successfully.`, 'system');
        });

        this.socket.on('terminalOutput', (data) => {
            if (data.user !== this.userRole) {
                this.addTerminalLine(`[${data.user.toUpperCase()}] ${data.command}`, 'other-user');
            }
        });

        this.socket.on('voiceCommandReceived', (data) => {
            if (data.user !== this.userRole) {
                this.addTerminalLine(data.text, 'voice-command');
            } else {
                // Show the full line for own voice commands
                this.addTerminalLine(data.text, 'voice-input');
            }
        });

        this.socket.on('playAudio', (data) => {
            // Track when audio starts playing and immediately disable ALL microphones
            this.audioIsPlaying = true;
            this.forceDisableMicrophone();
            console.log(`[TERMINAL] Audio playback started: ${data.audioFile || data}`);
            
            const audioFile = data.audioFile || data;
            
            // Display dialogue content if available
            if (data.dialogue && data.dialogue.trim() !== '') {
                this.addTerminalLine(`📡 ${data.dialogue}`, 'dialogue');
            }
            
            // Don't create audio elements in terminals - rely on board for audio end reporting
            // Just set a reasonable fallback timeout based on common audio lengths
            const estimatedDurations = {
                '1.mp3': 8000,
                '4.mp3': 2000,
                '5.mp3': 7000,
                '8.mp3': 4000,
                '15.mp3': 4000,
                '17.mp3': 2000,
                '18.mp3': 3000,
                '19.mp3': 3000,
                '21.mp3': 3000,
                '23.mp3': 6000,
                '25.mp3': 4000,
                '27.mp3': 4000,
                '28.mp3': 3000,
                '29.mp3': 5000,
                '31.mp3': 4000,
                '33.mp3': 8000,
                '35.mp3': 2000,
                '38.mp3': 20000,
                '40.mp3': 6000,
                'failed.mp3': 2000,
                'success.mp3': 2000,
                'lockdown.mp3': 3000,
                'announcement.mp3': 5000,
                'riot.mp3': 8000,
                'open.mp3': 2000,
                'Black.mp3': 3000
            };
            
            const estimatedDuration = estimatedDurations[audioFile] || 5000;
            
            console.log(`[TERMINAL] Using estimated duration for ${audioFile}: ${estimatedDuration}ms`);
            
            // Set fallback timeout with estimated duration
            this.audioEndTimeout = setTimeout(() => {
                if (this.audioIsPlaying) {
                    console.log(`[TERMINAL] Fallback timeout triggered for ${audioFile}`);
                    this.handleAudioEnd(audioFile);
                }
            }, estimatedDuration + 1000); // Add 1 second buffer
        });

        this.socket.on('missionDialogue', (dialogueText) => {
            // Display the actual dialogue instead of audio filename
            this.addTerminalLine(dialogueText, 'dialogue');
        });

        this.socket.on('missionStepUpdate', (step) => {
            this.missionStep = step;
            // Remove excessive logging - don't show mission step advancement
        });

        this.socket.on('showMap', (imageFile) => {
            this.showMissionImage(imageFile);
        });

        this.socket.on('hideMap', () => {
            this.hideMissionDisplay();
        });

        this.socket.on('updateResources', (resources) => {
            this.updateSystemResources(resources.cpu, resources.gpu);
        });

        this.socket.on('lockdownActive', () => {
            this.addTerminalLine('LOCKDOWN INITIATED - SETTLEMENT 37 SECURED', 'alert');
        });


        this.socket.on('blackScreen', () => {
            // Create a full blackout overlay across the entire terminal
            let blackout = document.getElementById('fullBlackoutOverlay');
            if (!blackout) {
                blackout = document.createElement('div');
                blackout.id = 'fullBlackoutOverlay';
                blackout.className = 'full-blackout-overlay';
                document.body.appendChild(blackout);
            }
            blackout.style.display = 'block';

            // Show "10-4" at the very bottom for Bryon only
            if (this.userRole === 'bryon') {
                let bottomText = document.getElementById('tenFourBottom');
                if (!bottomText) {
                    bottomText = document.createElement('div');
                    bottomText.id = 'tenFourBottom';
                    bottomText.className = 'tenfour-bottom';
                    document.body.appendChild(bottomText);
                }
                bottomText.textContent = '10-4';
                bottomText.style.display = 'block';
            }
        });

        this.socket.on('playEndVideo', () => {
            this.playEndSequence();
        });

        // Enhanced blackout sequence events
        this.socket.on('fullBlackout', () => {
            this.fullBlackout();
        });

        this.socket.on('showBryonTenFour', () => {
            this.showBryonTenFour();
        });

        this.socket.on('playFinalEndVideo', (data) => {
            this.playFinalEndVideo(data.videoFile, data.terminalMiniPlayer);
        });

        this.socket.on('closeTab', () => {
            setTimeout(() => {
                window.close();
            }, 1000);
        });

        this.socket.on('gameState', (state) => {
            this.missionStep = state.currentStep;
            if (state.systemResources) {
                this.updateSystemResources(state.systemResources.cpu, state.systemResources.gpu);
            }
        });

        this.socket.on('gameStateSync', (state) => {
            this.missionStep = state.currentStep;
            // Reduce noisy sync logs; keep silent
            if (state.systemResources) {
                this.updateSystemResources(state.systemResources.cpu, state.systemResources.gpu);
            }
        });

        this.socket.on('missionComplete', () => {
            this.addTerminalLine('MISSION SEQUENCE COMPLETED', 'alert');
            setTimeout(() => {
                this.playEndSequence();
            }, 1000);
        });

        this.socket.on('currentExpectedLine', (data) => {
            this.currentExpectedData = data; // Store for later use
            
            // CRITICAL: Always disable ALL microphones first to prevent dual activation
            this.forceDisableMicrophone();
            
            if (data && data.role === this.userRole) {
                // Show what line this user should say next
                this.addTerminalLine(`🎤 NEXT LINE: ${data.line}`, 'expected-line');
                
                // Tell server this user's mic should be exclusively activated
                this.socket.emit('exclusiveMicActivation', { role: this.userRole });
                
                // Check immediately if we should activate mic (after potential audio)
                setTimeout(() => {
                    this.checkAndActivateMicrophone();
                }, 100); // Reduced from 1000ms to 100ms for faster response
            } else if (data && data.role !== this.userRole) {
                // Show what the other user should say
                this.addTerminalLine(`⏳ WAITING FOR: ${data.line}`, 'waiting-line');
            } else {
                // If data is null, clear any expected line prompts and disable mic
                this.addTerminalLine('🔇 Microphone on standby - No active voice commands', 'standby');
            }
        });

        // Handle exclusive mic activation (disable this user's mic when another activates)
        this.socket.on('disableYourMicrophone', () => {
            this.forceDisableMicrophone();
            this.addTerminalLine('🔇 Microphone disabled - Another user is speaking', 'other-speaking');
        });
        
        // Handle subtitle display
        this.socket.on('showSubtitle', (text) => {
            this.addTerminalLine(`💬 ${text}`, 'subtitle');
        });
        
        // Expected command guidance
        this.socket.on('currentExpectedCommand', (data) => {
            this.currentExpectedCommandData = data;
            if (data && data.role === this.userRole) {
                this.addTerminalLine(`⌨️ NEXT COMMAND: ${data.command}`, 'expected-line');
            } else if (data && data.role !== this.userRole) {
                this.addTerminalLine(`⏳ Waiting for ${data.role.toUpperCase()} to enter: ${data.command}`, 'waiting-line');
            }
        });
        
        // Listen for audio ended events from board to sync microphone timing
        this.socket.on('audioEnded', (audioFile) => {
            console.log(`[TERMINAL] Received audio ended signal: ${audioFile}`);
            this.handleAudioEnd(audioFile);
        });
    }

    setupVoiceRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.addTerminalLine('Voice recognition not supported in this browser.', 'warning');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            if (!this.f2MessageShown) {
                this.addTerminalLine('Voice recognition system initialized. Microphone starts DISABLED and will auto-activate on your turn.', 'system');
                this.f2MessageShown = true;
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (this.shouldKeepListening) {
                setTimeout(() => this.recognition.start(), 100);
            }
        };

        this.recognition.onresult = (event) => {
            const last = event.results.length - 1;
            const text = event.results[last][0].transcript;
            
            if (event.results[last].isFinal) {
                // Clear any existing voice command timeout
                if (this.voiceCommandTimeout) {
                    clearTimeout(this.voiceCommandTimeout);
                }
                
                // Wait 0.2 seconds before processing to allow for sentence completion
                this.voiceCommandTimeout = setTimeout(() => {
                    // Don't show what user actually said - server will show the full expected line
                    this.socket.emit('voiceCommand', { text: text.trim() });
                    this.voiceCommandTimeout = null;
                }, 200); // 0.2 second tolerance for pauses in speech
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Voice recognition error:', event.error);
            if (event.error === 'not-allowed') {
                this.addTerminalLine('Microphone access denied. Please allow microphone access.', 'error');
            }
        };

        // Note: Voice recognition will auto-start after audio permissions are granted
    }

    async setupAudioPermissions() {
        // Request audio permissions automatically
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                // Request microphone permissions for voice recognition
                await navigator.mediaDevices.getUserMedia({ audio: true });
                this.addTerminalLine('Audio permissions granted. Voice recognition enabled.', 'system');
                
                // Don't auto-start voice recognition - it will be activated when it's user's turn
                this.addTerminalLine('🎤 Microphone ready - Will activate automatically on your turn.', 'system');
                
                return true;
            } catch (err) {
                this.addTerminalLine('Microphone access denied. Voice commands disabled.', 'warning');
                if (!this.f2MessageShown) {
                    this.addTerminalLine('Please allow microphone access and refresh the page to enable voice commands.', 'info');
                    this.f2MessageShown = true;
                }
                return false;
            }
        } else {
            this.addTerminalLine('Audio API not supported in this browser.', 'warning');
            return false;
        }
    }

    handleCommand() {
        const command = this.commandInput.value.trim();
        if (!command) return;

        // Add to history
        this.commandHistory.unshift(command);
        this.historyIndex = -1;

        // Display command
        this.addTerminalLine(`phantom@edex:~$ ${command}`, 'user-command');

        // Clear input
        this.commandInput.value = '';

        // Process command
        this.processCommand(command);

        // Send to server
        this.socket.emit('terminalCommand', command);
    }

    processCommand(command) {
        const cmd = command.toLowerCase();

        switch (cmd) {
            case 'bash mission':
                if (this.currentExpectedCommandData && this.currentExpectedCommandData.role === this.userRole && this.currentExpectedCommandData.command.toLowerCase() === cmd) {
                    this.addTerminalLine('Mission sequence initiated...', 'system');
                } else {
                    this.addTerminalLine('Command entered, but not expected yet. It will be ignored.', 'warning');
                }
                break;
            case 'sudo ./info.tor':
                if (this.currentExpectedCommandData && this.currentExpectedCommandData.role === this.userRole && this.currentExpectedCommandData.command.toLowerCase() === cmd) {
                    this.addTerminalLine('Accessing TOR information system...', 'system');
                    this.addTerminalLine('Loading tactical overview...', 'system');
                } else {
                    this.addTerminalLine('Command entered, but not expected yet. It will be ignored.', 'warning');
                }
                break;
            case 'bash meet':
                if (this.currentExpectedCommandData && this.currentExpectedCommandData.role === this.userRole && this.currentExpectedCommandData.command.toLowerCase() === cmd) {
                    this.addTerminalLine('Meeting protocol activated...', 'system');
                } else {
                    this.addTerminalLine('Command entered, but not expected yet. It will be ignored.', 'warning');
                }
                break;
            case 'help':
                this.showHelp();
                break;
            case 'clear':
                this.terminalOutput.innerHTML = '';
                break;
            case 'status':
                this.showStatus();
                break;
            default:
                this.addTerminalLine(`Command not recognized: ${command}`, 'error');
        }
    }

    showHelp() {
        const helpText = [
            'Available Commands:',
            '  bash mission    - Start mission sequence',
            '  sudo ./info.tor - Access tactical information',
            '  bash meet       - Activate meeting protocol',
            '  status          - Show system status',
            '  clear           - Clear terminal',
            '  help            - Show this help',
            '',
            'Voice Commands:',
            '  Microphone auto-activates on your turn',
            '  CTRL+ALT+D to advance mission (BRYON only - testing)'
        ];
        
        helpText.forEach(line => this.addTerminalLine(line, 'help'));
    }

    showStatus() {
        this.addTerminalLine(`Role: ${this.userRole.toUpperCase()}`, 'status');
        this.addTerminalLine(`Mission Step: ${this.missionStep}`, 'status');
        this.addTerminalLine(`Voice Recognition: ${this.isListening ? 'ACTIVE' : 'INACTIVE'}`, 'status');
        this.addTerminalLine(`Connection: ${this.socket.connected ? 'CONNECTED' : 'DISCONNECTED'}`, 'status');
    }

    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;

        this.historyIndex += direction;
        
        if (this.historyIndex < -1) {
            this.historyIndex = -1;
            this.commandInput.value = '';
        } else if (this.historyIndex >= this.commandHistory.length) {
            this.historyIndex = this.commandHistory.length - 1;
        }

        if (this.historyIndex >= 0) {
            this.commandInput.value = this.commandHistory[this.historyIndex];
        }
    }

    addTerminalLine(text, className = '') {
        const line = document.createElement('div');
        line.className = `terminal-line ${className}`;
        
        if (className === 'user-command') {
            line.innerHTML = text;
        } else {
            const timestamp = new Date().toLocaleTimeString();
            line.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${text}`;
        }
        
        this.terminalOutput.appendChild(line);
        this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
    }

    playAudio(audioFile, dialogue = null) {
        // Audio should only play on board, not on terminals
        // Only show the dialogue text
        if (dialogue) {
            this.addTerminalLine(dialogue, 'dialogue');
        }
        // Don't show "Playing audio" messages anymore
    }

    showMissionImage(imageFile) {
        const tweenClass = imageFile === 'map.png' ? ' map-tween' : '';
        this.displayContent.innerHTML = `
            <div class="mission-image-container${tweenClass}">
                <img src="/images/${imageFile}" alt="Mission Data" class="mission-image">
                <div class="image-overlay">
                    <div class="overlay-text">TACTICAL OVERVIEW</div>
                </div>
            </div>
        `;
        this.addTerminalLine(`Mission display updated: ${imageFile}`, 'system');
    }

    hideMissionDisplay() {
        this.displayContent.innerHTML = '<div class="standby-message">STANDBY</div>';
        this.addTerminalLine('Mission display cleared', 'system');
    }

    updateSystemResources(cpu, gpu) {
        this.cpuBar.style.transition = 'width 2s ease-in-out';
        this.gpuBar.style.transition = 'width 2s ease-in-out';
        this.cpuBar.style.width = `${cpu}%`;
        this.gpuBar.style.width = `${gpu}%`;
        this.cpuValue.textContent = `${cpu}%`;
        this.gpuValue.textContent = `${gpu}%`;
        
        // Add warning colors for high usage
        this.cpuBar.className = cpu > 80 ? 'progress-fill warning' : 'progress-fill';
        this.gpuBar.className = gpu > 80 ? 'progress-fill warning' : 'progress-fill';
    }

    toggleVoiceRecognition() {
        if (this.isListening) {
            this.stopVoiceRecognition();
        } else {
            this.startVoiceRecognition();
        }
    }

    startVoiceRecognition() {
        if (this.recognition && !this.isListening) {
            try {
                this.shouldKeepListening = true;
                this.recognition.start();
            } catch (e) {
                console.error('Failed to start voice recognition:', e);
            }
        }
    }

    stopVoiceRecognition() {
        if (this.recognition && this.isListening) {
            this.shouldKeepListening = false;
            this.recognition.stop();
            // Don't show "deactivated" message - mic is just temporarily disabled
        }
    }

    // Check if microphone should be activated (only after audio finishes and for user turns)
    checkAndActivateMicrophone() {
        // Only activate if:
        // 1. There's an expected line for this user
        // 2. Audio is not currently playing
        if (this.currentExpectedData && 
            this.currentExpectedData.role === this.userRole && 
            !this.audioIsPlaying) {
            // Audio is done and it's our turn - activate microphone
            this.enableMicrophoneForTurn();
            // Emit signal to server to disable other users' mics
            this.socket.emit('exclusiveMicActivation', { role: this.userRole });
        } else if (this.audioIsPlaying) {
            // Audio is still playing, keep mic disabled
            this.addTerminalLine('🔇 Audio still playing - Microphone remains disabled', 'audio-waiting');
        }
    }

    // Auto-enable microphone when it's this user's turn
    enableMicrophoneForTurn() {
        if (this.recognition && !this.isListening) {
            this.startVoiceRecognition();
            this.addTerminalLine('🎤 MICROPHONE ACTIVATED - Your turn to speak', 'mic-active');
        }
    }

    // Auto-disable microphone when it's not this user's turn  
    disableMicrophoneForTurn() {
        if (this.recognition && this.isListening) {
            this.stopVoiceRecognition();
            this.addTerminalLine('🔇 Microphone on standby - Waiting for your turn', 'mic-standby');
        }
    }

    // Force disable microphone (used during audio playback, no user message)
    forceDisableMicrophone() {
        if (this.recognition && this.isListening) {
            this.shouldKeepListening = false;
            this.recognition.stop();
            // No user message during forced disable (audio is playing)
        }
    }

    playEndSequence() {
        console.log('Playing end sequence...');
        
        // Show the overlay using CSS class (darkens background)
        this.endOverlay.classList.add('active');
        
        // Ensure video source is set to end.mp4
        this.endVideo.src = 'audio/end.mp4';
        
        // Terminals (BRYON/RYAN) are muted, Board operators have audio
        const isTerminalRole = this.userRole === 'bryon' || this.userRole === 'ryan';
        this.endVideo.muted = isTerminalRole; // Mute for terminals, unmuted for board
        this.endVideo.loop = false; // Don't loop the end video
        this.endVideo.autoplay = true;
        
        // Size: mini player on terminals, fullscreen on board overlay (handled by board)
        if (isTerminalRole) {
            this.endVideo.style.width = '60vw';
            this.endVideo.style.height = 'auto';
        } else {
            this.endVideo.style.width = '100vw';
            this.endVideo.style.height = '100vh';
        }
        this.endVideo.style.objectFit = isTerminalRole ? 'contain' : 'cover';
        
        // Full blackout and bottom "10-4" for Bryon
        // Show full blackout overlay on terminals
        let blackout = document.getElementById('fullBlackoutOverlay');
        if (!blackout) {
            blackout = document.createElement('div');
            blackout.id = 'fullBlackoutOverlay';
            blackout.className = 'full-blackout-overlay';
            document.body.appendChild(blackout);
        }
        blackout.style.display = 'block';

        if (isTerminalRole) {
            // Show bottom "10-4" for Bryon
            if (this.userRole === 'bryon') {
                let bottomText = document.getElementById('tenFourBottom');
                if (!bottomText) {
                    bottomText = document.createElement('div');
                    bottomText.id = 'tenFourBottom';
                    bottomText.className = 'tenfour-bottom';
                    document.body.appendChild(bottomText);
                }
                bottomText.textContent = '10-4';
                bottomText.style.display = 'block';
            }
        }
        
        console.log(`End video audio ${isTerminalRole ? 'MUTED' : 'ENABLED'} for role: ${this.userRole}`);
        
        // Attempt to close the tab after video ends
        this.endVideo.addEventListener('ended', () => {
            console.log(`[${this.userRole.toUpperCase()}] End video finished, closing tab...`);
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
                console.log(`End video started playing successfully - Mission Complete (${this.userRole} - audio ${isTerminalRole ? 'muted' : 'enabled'})`);
            })
            .catch(error => {
                console.error('Error playing end video:', error);
                // Fallback: show black screen even if video fails and still close tab
                this.addTerminalLine('MISSION COMPLETE', 'alert');
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

    // Full blackout method - makes entire terminal completely black
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

    // Show "10-4" at bottom for Bryon and enable his microphone
    showBryonTenFour() {
        if (this.userRole === 'bryon') {
            let bottomText = document.getElementById('tenFourBottom');
            if (!bottomText) {
                bottomText = document.createElement('div');
                bottomText.id = 'tenFourBottom';
                bottomText.className = 'tenfour-bottom';
                document.body.appendChild(bottomText);
            }
            bottomText.textContent = '10-4';
            bottomText.style.display = 'block';
            
            // Enable Bryon's microphone for final line
            this.shouldKeepListening = true;
            this.startVoiceRecognition();
            this.addTerminalLine('🎤 MICROPHONE ACTIVATED - Awaiting final confirmation (say: 10-4)', 'mic-active');
        }
    }

    // Play final end video (mini-player center screen on terminal, no audio)
    playFinalEndVideo(videoFile, miniPlayer) {
        if (miniPlayer) {
            const videoOverlay = document.createElement('div');
            videoOverlay.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10000;
                background: rgba(0, 0, 0, 0.9);
                padding: 20px;
                border: 2px solid #00ff41;
                border-radius: 10px;
            `;
            
            const video = document.createElement('video');
            video.src = `/audio/${videoFile}`;
            video.controls = false;
            video.autoplay = true;
            video.muted = true; // No audio on terminal
            video.style.cssText = `
                width: 400px;
                height: 300px;
                object-fit: cover;
            `;
            
            video.onended = () => {
                document.body.removeChild(videoOverlay);
            };
            
            videoOverlay.appendChild(video);
            document.body.appendChild(videoOverlay);
        }
    }
    
    // Helper methods for audio timing management
    scheduleAudioEnd(audioFile, duration) {
        // Clear any existing timeout for this audio file
        if (this.audioEndTimeout) {
            clearTimeout(this.audioEndTimeout);
        }
        
        this.audioEndTimeout = setTimeout(() => {
            this.handleAudioEnd(audioFile);
        }, duration);
    }
    
    handleAudioEnd(audioFile) {
        this.audioIsPlaying = false;
        console.log(`[TERMINAL] Audio ${audioFile} finished, enabling microphone INSTANTLY`);
        
        // Clear the timeout reference
        if (this.audioEndTimeout) {
            clearTimeout(this.audioEndTimeout);
            this.audioEndTimeout = null;
        }
        
        // INSTANTLY activate microphone after audio completes - NO DELAYS
        if (this.currentExpectedData && 
            this.currentExpectedData.role === this.userRole) {
            // Audio is done and it's our turn - activate microphone IMMEDIATELY
            this.enableMicrophoneForTurn();
            // Emit signal to server to disable other users' mics
            this.socket.emit('exclusiveMicActivation', { role: this.userRole });
        }
    }
}

// Initialize terminal when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.phantomTerminal = new PhantomTerminal();
});

// Add CSS for dynamic classes
const dynamicStyles = `
.terminal-line.other-user {
    color: #ffaa00;
}

.terminal-line.voice-command {
    color: #00aaff;
    font-style: italic;
}

.terminal-line.voice-input {
    color: #00ff88;
    font-weight: bold;
}

.terminal-line.system {
    color: #888;
}

.terminal-line.warning {
    color: #ffaa00;
}

.terminal-line.error {
    color: #ff4444;
}

.terminal-line.alert {
    color: #ff0000;
    font-weight: bold;
    animation: blink 1s step-start infinite;
}

.terminal-line.help {
    color: #aaaaaa;
}

.terminal-line.status {
    color: #00ffff;
}

.terminal-line.audio {
    color: #ff00ff;
}

.terminal-line.subtitle {
    color: #ffff00;
    font-weight: bold;
}

.terminal-line.dialogue {
    color: #00ff41;
    font-weight: bold;
    border-left: 3px solid #00ff41;
    padding-left: 10px;
    background: rgba(0, 255, 65, 0.05);
}

.terminal-line.expected-line {
    color: #ffff00;
    font-weight: bold;
    border-left: 3px solid #ffff00;
    padding-left: 10px;
    background: rgba(255, 255, 0, 0.1);
    animation: pulse 2s ease-in-out infinite;
}

.terminal-line.waiting-line {
    color: #888;
    font-style: italic;
    border-left: 3px solid #444;
    padding-left: 10px;
    background: rgba(68, 68, 68, 0.1);
}

.terminal-line.audio-status {
    color: #ff8800;
    font-weight: bold;
    border-left: 3px solid #ff8800;
    padding-left: 10px;
    background: rgba(255, 136, 0, 0.1);
}

.terminal-line.audio-waiting {
    color: #ffaa00;
    font-style: italic;
    border-left: 3px solid #ffaa00;
    padding-left: 10px;
    background: rgba(255, 170, 0, 0.05);
    animation: pulse 1s ease-in-out infinite;
}

.mission-image-container {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mission-image {
    max-width: 100%;
    max-height: 100%;
    border: 2px solid #00ff41;
}

.image-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: rgba(0, 255, 65, 0.2);
    padding: 5px;
    text-align: center;
}

.overlay-text {
    color: #00ff41;
    font-weight: bold;
    text-shadow: 0 0 10px #00ff41;
}

.progress-fill.warning {
    background: linear-gradient(90deg, #ff4444, #ff6666);
    box-shadow: 0 0 10px #ff4444;
}

.black-screen {
    color: #ff0000;
    font-size: 24px;
    text-align: center;
    padding: 50px;
    font-weight: bold;
    animation: blink 0.5s step-start infinite;
}

.timestamp {
    color: #666;
    font-size: 0.9em;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.6; }
    100% { opacity: 1; }
}

/* End overlay styling for mini player */
.end-overlay.active {
    position: fixed;
    inset: 0;
    background: #000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

/* Map tween only for initial map.png reveal */
.mission-image-container.map-tween {
    animation: slideInRight 0.6s ease-out;
}
@keyframes slideInRight {
    0% { transform: translateX(40px); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
}

/* Full blackout overlay */
.full-blackout-overlay {
    position: fixed;
    inset: 0;
    background: #000;
    z-index: 9000;
    display: none;
}

/* Caption under mini end video */
.end-video-caption {
    margin-top: 12px;
    color: #00ff41;
    font-family: monospace;
    font-weight: bold;
}

/* Bottom "10-4" for Bryon during blackout */
.tenfour-bottom {
    position: fixed;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    color: #00ff41;
    font-family: monospace;
    font-weight: bold;
    z-index: 9500;
    display: none;
}
`

// Inject dynamic styles
const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);
