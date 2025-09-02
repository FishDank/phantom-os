// Phantom OS Mission System - New Detailed Plot Implementation
const { missionDialogue } = require('./mission-dialogue.js');

class MissionSystem {
    constructor(io) {
        this.io = io;
        this.currentStep = 0;
        this.missionState = 'waiting'; // waiting, active, completed
        this.connectedUsers = [];
        this.resourceBars = { cpu: 25, gpu: 30 };
        this.imageDisplayed = null;
        this.subtitlesActive = false;
        this.waitingForCASEVAC = false;
        
        // Voice command matching threshold - Reduced for faster recognition
        this.SIMILARITY_THRESHOLD = 0.5;
        
        // Mission sequence definition - NEW DETAILED PLOT
        this.missionSteps = [
            // Step 0: Start mission (Wait for "bash mission")
            {
                id: 0,
                trigger: 'command',
                command: 'bash mission',
                requiredRole: 'bryon',
                action: 'startMission',
                audioFile: '1.mp3',
                description: 'Start mission - Play 1.mp3 (Dispatch: Be advised, potential possession...)'
            },
            
            // Step 1: Bryon first line
            {
                id: 1,
                trigger: 'voice',
                expectedText: '10-4, Preforming BG check of area 37. Acknowledgement of the Autarch is necessary; until then, 10-20 on the suspected location of the contraband?',
                requiredRole: 'bryon',
                action: 'waitForNextCommand',
                description: 'Bryon: BG check request'
            },
            
            // Step 2: Bryon second line
            {
                id: 2,
                trigger: 'voice',
                expectedText: 'Razor, Subtitles.',
                requiredRole: 'bryon',
                action: 'enableSubtitles',
                audioFile: '4.mp3',
                description: 'Bryon: Razor, Subtitles → Enable subtitles & play 4.mp3'
            },
            
            // Step 3: Auto sequence - Razor understood (1.3s delay)
            {
                id: 3,
                trigger: 'auto',
                action: 'playAudio',
                audioFile: '5.mp3',
                delay: 1300,
                description: 'Auto: Razor understood + Dispatch location (1.3s after 4.mp3)'
            },
            
            // Step 4: Bryon thanks dispatch
            {
                id: 4,
                trigger: 'voice',
                expectedText: 'Thanks for the details dispatch. Acknowledging now.',
                requiredRole: 'bryon',
                action: 'waitForNextCommand',
                description: 'Bryon: Thanks dispatch'
            },
            
            // Step 5: Bryon calls Phantom 4
            {
                id: 5,
                trigger: 'voice',
                expectedText: 'Phantom 4, Autarch 10-8 yet?',
                requiredRole: 'bryon',
                action: 'playAudio',
                audioFile: '8.mp3',
                description: 'Bryon: Phantom 4 question → 8.mp3'
            },
            
            // Step 6: Bryon confirms transfer
            {
                id: 6,
                trigger: 'voice',
                expectedText: 'Yes.',
                requiredRole: 'bryon',
                action: 'advance',
                description: 'Bryon: Yes to transfer'
            },
            
            // Step 7: Bryon calls Ryan
            {
                id: 7,
                trigger: 'voice',
                expectedText: '2 alpha 1-1?',
                requiredRole: 'bryon',
                action: 'waitForRyan',
                description: 'Bryon: Calls Ryan'
            },
            
            // Step 8: Ryan responds (Enable Ryan's mic - DISABLE BRYON)
            {
                id: 8,
                trigger: 'voice',
                expectedText: '1-1, go ahead.',
                requiredRole: 'ryan',
                action: 'waitForCommand',
                description: 'Ryan: Responds to call'
            },
            
            // Step 9: Wait for sudo ./info.tor command
            {
                id: 9,
                trigger: 'command',
                command: 'sudo ./info.tor',
                requiredRole: 'bryon',
                action: 'showMapWithAudio',
                audioFile: 'open.mp3',
                mapFile: 'map.png',
                description: 'Bryon: Opens map with sudo command'
            },
            
            // Step 10: Bryon requests clearance
            {
                id: 10,
                trigger: 'voice',
                expectedText: 'Sir, There has been activity of Illegal contraband dealing with heavy firearms between housing 9 through 18, clearance to scan the grid?',
                requiredRole: 'bryon',
                action: 'waitForRyan',
                description: 'Bryon: Requests scan clearance'
            },
            
            // Step 11: Ryan authorizes (Enable Ryan's mic - DISABLE BRYON)
            {
                id: 11,
                trigger: 'voice',
                expectedText: 'Roger, command acknowledges possible arms deal within settlement 37 boundaries,',
                requiredRole: 'ryan',
                action: 'playAudio',
                audioFile: '15.mp3',
                description: 'Ryan: Authorizes → 15.mp3'
            },
            
            // Step 12: Bryon authorizes CCTV scan
            {
                id: 12,
                trigger: 'voice',
                expectedText: 'Yes authorized, start the C.C.T.V:O scan on 9 through 13 on the 3 by 3 grid.',
                requiredRole: 'bryon',
                action: 'playAudio',
                audioFile: '17.mp3',
                description: 'Bryon: Authorizes CCTV → 17.mp3'
            },
            
            // Step 13: Auto sequence - scanning (2s delay after 17.mp3)
            {
                id: 13,
                trigger: 'auto',
                action: 'scanAndFail',
                audioFile: 'failed.mp3',
                mapFile: 'failed.png',
                delay: 2000,
                description: 'Auto: Scanning fails after 2s'
            },
            
            // Step 14: Auto play scan failure report (0.7s after failed.mp3)
            {
                id: 14,
                trigger: 'auto',
                action: 'playAudio',
                audioFile: '18.mp3',
                delay: 700,
                description: 'Auto: 24 Gamma 1-5 reports failure'
            },
            
            // Step 15: Auto play team confusion (0.5s after 18.mp3)
            {
                id: 15,
                trigger: 'auto',
                action: 'playAudio',
                audioFile: '19.mp3',
                delay: 500,
                description: 'Auto: Team confusion'
            },
            
            // Step 16: Bryon takes control
            {
                id: 16,
                trigger: 'voice',
                expectedText: 'Let me try, Razor',
                requiredRole: 'bryon',
                action: 'playAudio',
                audioFile: '21.mp3',
                description: 'Bryon: Takes control → 21.mp3'
            },
            
            // Step 17: Bryon orders full scan
            {
                id: 17,
                trigger: 'voice',
                expectedText: 'Scan the entirety of settlement 37.',
                requiredRole: 'bryon',
                action: 'playAudio',
                audioFile: '23.mp3',
                description: 'Bryon: Full scan order → 23.mp3'
            },
            
            // Step 18: Bryon accepts cost + show resource bars
            {
                id: 18,
                trigger: 'voice',
                expectedText: 'I\'m aware of the cost.',
                requiredRole: 'bryon',
                action: 'acceptCostAndScan',
                audioFile: '25.mp3',
                resources: { cpu: 93, gpu: 67 },
                description: 'Bryon: Accepts cost → animate bars, play 25.mp3'
            },
            
            // Step 19: Ryan status check
            {
                id: 19,
                trigger: 'voice',
                expectedText: 'Status on perimeter scan?',
                requiredRole: 'ryan',
                action: 'playAudio',
                audioFile: '27.mp3',
                description: 'Ryan: Status check → 27.mp3'
            },
            
            // Step 20: Auto play dispatch demands (0.5s after 27.mp3)
            {
                id: 20,
                trigger: 'auto',
                action: 'playAudio',
                audioFile: '28.mp3',
                delay: 500,
                description: 'Auto: Dispatch demands directives'
            },
            
            // Step 21: Auto scan success sequence (1s after 28.mp3)
            {
                id: 21,
                trigger: 'auto',
                action: 'scanSuccessSequence',
                audioFile: 'success.mp3',
                mapFile: 'success.png',
                delay: 1000,
                description: 'Auto: Scan succeeds, show success.png'
            },
            
            // Step 22: Auto play Razor detects firearms (1s after success.mp3)
            {
                id: 22,
                trigger: 'auto',
                action: 'detectFirearms',
                audioFile: '29.mp3',
                delay: 1000,
                description: 'Auto: Razor detects 2 firearms, reset resource bars'
            },
            
            // Step 23: Bryon asks householder name
            {
                id: 23,
                trigger: 'voice',
                expectedText: 'What is the current householder name?',
                requiredRole: 'bryon',
                action: 'playAudio',
                audioFile: '31.mp3',
                description: 'Bryon: Asks householder name → 31.mp3'
            },
            
            // Step 24: Bryon requests BG check
            {
                id: 24,
                trigger: 'voice',
                expectedText: 'Run a BG check on William Morse.',
                requiredRole: 'bryon',
                action: 'playAudio',
                audioFile: '33.mp3',
                description: 'Bryon: BG check request → 33.mp3'
            },
            
            // Step 25: Bryon orders lockdown
            {
                id: 25,
                trigger: 'voice',
                expectedText: 'Razor, put settlement 37 on lockdown.',
                requiredRole: 'bryon',
                action: 'initiateLockdownSequence',
                audioFiles: ['35.mp3', 'lockdown.mp3', 'announcement.mp3'],
                delays: [0, 1000, 1000],
                description: 'Bryon: Lockdown order → complex audio sequence'
            },
            
            // Step 26: Wait for bash meet command (close maps)
            {
                id: 26,
                trigger: 'command',
                command: 'bash meet',
                requiredRole: 'bryon',
                action: 'closeMaps',
                description: 'Wait for bash meet command, close success.png'
            },
            
            // Step 27: Bryon reports to Autarch
            {
                id: 27,
                trigger: 'voice',
                expectedText: 'Autarch, waiting for directives, send a team out. Note the weapons he has are a Remington 887 and a HK417, I\'m not sure how he got those through.',
                requiredRole: 'bryon',
                action: 'waitForRyan',
                description: 'Bryon: Reports to Autarch'
            },
            
            // Step 28: Ryan gives full directive
            {
                id: 28,
                trigger: 'voice',
                expectedText: '10-4, just as confused as you are, task forces epsilon 12, and eta 9 of the 24th regiment is en-route to settlement 37. We\'ll also send in delta 4 to keep the operation smooth and within guidelines. Officer 107 will be leading the effort on the rooftops. All responding law enforcement units hold for reinforcement. Directive: 185-164-172-176-166. Codes 225, 307, 308, over.',
                requiredRole: 'ryan',
                action: 'longDirective',
                audioFile: '38.mp3',
                delay: 5000,
                description: 'Ryan: Full directive → wait 5s then 38.mp3'
            },
            
            // Step 29: Auto play gunshots + subtitles (triggered 5s after 38.mp3 finishes)
            {
                id: 29,
                trigger: 'auto',
                action: 'showRiot',
                audioFile: 'riot.mp3',
                delay: 0,
                description: 'Auto: Gunshots + *GunShots* subtitle'
            },
            
            // Step 30: Bryon demands report
            {
                id: 30,
                trigger: 'voice',
                expectedText: '107, what the hell is going on over there, report!',
                requiredRole: 'bryon',
                action: 'playAudioAndWaitForCASEVAC',
                audioFile: '40.mp3',
                description: 'Bryon: Demands report → 40.mp3, then wait for CASEVAC'
            },
            
            // Step 31: Auto black screen + final audio (triggered after CASEVAC + 0.6s delay)
            {
                id: 31,
                trigger: 'auto',
                action: 'emergencyBlackout',
                audioFile: 'Black.mp3',
                delay: 0,
                description: 'Auto: Black screen + Black.mp3 + show 10-4 for Bryon'
            },
            
            // Step 32: Bryon final 10-4
            {
                id: 32,
                trigger: 'voice',
                expectedText: '10-4.',
                requiredRole: 'bryon',
                action: 'playFinalEndSequence',
                videoFile: 'end.mp4',
                description: 'Bryon: Final 10-4 → wait 2s then end.mp4 + close tab'
            }
        ];
    }
    
    // Calculate text similarity using Levenshtein distance
    calculateSimilarity(str1, str2) {
        const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const s1 = normalize(str1);
        const s2 = normalize(str2);
        
        if (s1 === s2) return 1;
        
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        
        if (longer.length === 0) return 1;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + cost
                );
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    // Check if at least one significant word matches
    hasValidWordMatch(inputText, expectedText) {
        const normalize = (str) => str.toLowerCase().replace(/[^\w\s-]/g, '').trim();
        const inputWords = normalize(inputText).split(/\s+/);
        const expectedWords = normalize(expectedText).split(/\s+/);
        
        console.log(`[VOICE DEBUG] Input: "${inputText}" -> Words: [${inputWords.join(', ')}]`);
        console.log(`[VOICE DEBUG] Expected: "${expectedText}" -> Words: [${expectedWords.join(', ')}]`);
        
        // Key patterns
        const significantPatterns = [
            /^10-\d+$/, /^\d+-\d+$/, /^phantom\s*\d+$/, /^razor$/, /^autarch$/,
            /^(yes|sir|scan|grid|settlement|lockdown|bryon|ryan|dispatch|thanks|roger|authorized|clearance|status|householder|directives|report|morse|william|ahead|go|one|eleven)$/,
            /^\d+$/, /^housing$/, /^block$/, /^check$/, /^cctv$/, /^entirety$/, /^perimeter$/, /^1-1$/, /^11$/, /^1\s*1$/
        ];
        
        // Check exact matches first
        for (const inputWord of inputWords) {
            if (inputWord.length < 2) continue;
            
            for (const expectedWord of expectedWords) {
                if (inputWord === expectedWord && inputWord.length >= 2) {
                    console.log(`[VOICE] Exact word match found: "${inputWord}"`);
                    return true;
                }
            }
        }
        
        // Check pattern matches
        for (const inputWord of inputWords) {
            for (const pattern of significantPatterns) {
                if (pattern.test(inputWord)) {
                    const expectedMatch = expectedWords.some(word => pattern.test(word));
                    if (expectedMatch) {
                        console.log(`[VOICE] Pattern match found: "${inputWord}"`);
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    // Process voice commands
    processVoiceCommand(text, userRole) {
        // Special handling for CASEVAC detection
        if (this.waitingForCASEVAC && text.toLowerCase().includes('casevac')) {
            console.log('[MISSION] ✅ CASEVAC phrase detected! Triggering blackout sequence...');
            this.waitingForCASEVAC = false;
            
            // Wait 0.6 seconds then advance to blackout step
            setTimeout(() => {
                this.advanceStep(); // This will trigger step 31 (emergencyBlackout)
            }, 600);
            
            return true;
        }
        
        const currentStep = this.missionSteps[this.currentStep];
        if (!currentStep) return false;
        
        console.log(`[MISSION] Processing voice command at step ${this.currentStep}: "${text}" from ${userRole}`);
        console.log(`[MISSION] Expected: "${currentStep.expectedText}" for role: ${currentStep.requiredRole}`);
        
        if (currentStep.trigger !== 'voice') {
            console.log(`[MISSION] Step ${this.currentStep} doesn't expect voice input`);
            return false;
        }
        
        if (currentStep.requiredRole && currentStep.requiredRole !== userRole) {
            console.log(`[MISSION] Wrong role speaking. Expected: ${currentStep.requiredRole}, Got: ${userRole}`);
            return false;
        }
        
        if (!currentStep.expectedText) {
            console.log(`[MISSION] No expected text for step ${this.currentStep}`);
            return false;
        }
        
        const similarity = this.calculateSimilarity(text, currentStep.expectedText);
        const wordMatch = this.hasValidWordMatch(text, currentStep.expectedText);
        
        console.log(`[VOICE] Similarity: ${Math.round(similarity * 100)}%, Word match: ${wordMatch}`);
        
        if (similarity >= this.SIMILARITY_THRESHOLD || wordMatch) {
            console.log(`[MISSION] ✅ Voice command accepted! Advancing from step ${this.currentStep}`);
            this.advanceStep();
            return true;
        }
        
        console.log(`[MISSION] ❌ Voice command rejected. Similarity too low: ${Math.round(similarity * 100)}%`);
        return false;
    }
    
    // Process terminal commands
    processCommand(command, userRole) {
        const currentStep = this.missionSteps[this.currentStep];
        if (!currentStep) return false;
        
        console.log(`[MISSION] Processing command at step ${this.currentStep}: "${command}" from ${userRole}`);
        
        if (currentStep.trigger !== 'command') {
            console.log(`[MISSION] Step ${this.currentStep} doesn't expect command input`);
            return false;
        }
        
        if (currentStep.requiredRole && currentStep.requiredRole !== userRole) {
            console.log(`[MISSION] Wrong role executing command. Expected: ${currentStep.requiredRole}, Got: ${userRole}`);
            return false;
        }
        
        if (command.toLowerCase().trim() === currentStep.command.toLowerCase()) {
            console.log(`[MISSION] ✅ Command accepted! Advancing from step ${this.currentStep}`);
            this.advanceStep();
            return true;
        }
        
        console.log(`[MISSION] ❌ Command rejected. Expected: "${currentStep.command}", Got: "${command}"`);
        return false;
    }
    
    // Advance to next step and execute actions
    advanceStep() {
        const currentStep = this.missionSteps[this.currentStep];
        if (currentStep && currentStep.action) {
            this.executeAction(currentStep);
        }
        
        this.currentStep++;
        console.log(`[MISSION] Advanced to step ${this.currentStep}`);
        
        // Check if next step is auto-triggered
        const nextStep = this.missionSteps[this.currentStep];
        if (nextStep && nextStep.trigger === 'auto') {
            setTimeout(() => {
                this.advanceStep();
            }, nextStep.delay || 0);
        }
        
        // Send current expected line to clients
        this.sendCurrentExpectedLine();
        
        // Check if mission complete
        if (this.currentStep >= this.missionSteps.length) {
            console.log('[MISSION] Mission sequence complete!');
            this.io.emit('missionComplete');
        }
    }
    
    // Execute step actions
    executeAction(step) {
        console.log(`[MISSION] Executing action: ${step.action}`);
        
        switch (step.action) {
            case 'startMission':
                this.missionState = 'active';
                if (step.audioFile) {
                    const dialogueText = missionDialogue[step.audioFile] || `Audio: ${step.audioFile}`;
                    this.io.emit('playAudio', { audioFile: step.audioFile, dialogue: dialogueText });
                }
                break;
                
            case 'enableSubtitles':
                this.subtitlesActive = true;
                if (step.audioFile) {
                    const dialogueText = missionDialogue[step.audioFile] || `Audio: ${step.audioFile}`;
                    this.io.emit('playAudio', { audioFile: step.audioFile, dialogue: dialogueText });
                }
                // Show subtitles from now on
                this.io.emit('showSubtitle', 'Subtitles enabled');
                break;
                
            case 'showMapWithAudio':
                if (step.mapFile) {
                    this.io.emit('showMap', { mapFile: step.mapFile });
                    this.imageDisplayed = step.mapFile;
                }
                if (step.audioFile) {
                    const dialogueText = missionDialogue[step.audioFile] || `Audio: ${step.audioFile}`;
                    this.io.emit('playAudio', { audioFile: step.audioFile, dialogue: dialogueText });
                }
                break;
                
            case 'scanAndFail':
                // First play the audio
                if (step.audioFile) {
                    const dialogueText = missionDialogue[step.audioFile] || `Audio: ${step.audioFile}`;
                    this.io.emit('playAudio', { audioFile: step.audioFile, dialogue: dialogueText });
                }
                
                // Show failed.png immediately
                if (step.mapFile && this.imageDisplayed) {
                    this.io.emit('replaceMap', { oldFile: this.imageDisplayed, newFile: step.mapFile });
                    this.imageDisplayed = step.mapFile;
                }
                
                // Wait for success.mp3 to finish, then wait exactly 1.9 seconds before swapping to success.png
                this.waitForAudioEndThen('success.mp3', 1900, () => {
                    if (this.imageDisplayed === 'failed.png') {
                        this.io.emit('replaceMap', { oldFile: 'failed.png', newFile: 'success.png' });
                        this.imageDisplayed = 'success.png';
                        console.log('[MISSION] Swapped to success.png exactly 1.9s after success.mp3 started');
                    }
                });
                break;
                
            case 'acceptCostAndScan':
                // Animate resource bars
                if (step.resources) {
                    this.resourceBars = { ...step.resources };
                    this.io.emit('updateResources', this.resourceBars);
                }
                if (step.audioFile) {
                    const dialogueText = missionDialogue[step.audioFile] || `Audio: ${step.audioFile}`;
                    this.io.emit('playAudio', { audioFile: step.audioFile, dialogue: dialogueText });
                }
                break;
                
            case 'scanSuccessSequence':
                if (step.mapFile && this.imageDisplayed) {
                    this.io.emit('replaceMap', { oldFile: this.imageDisplayed, newFile: step.mapFile });
                    this.imageDisplayed = step.mapFile;
                }
                if (step.audioFile) {
                    const dialogueText = missionDialogue[step.audioFile] || `Audio: ${step.audioFile}`;
                    this.io.emit('playAudio', { audioFile: step.audioFile, dialogue: dialogueText });
                }
                break;
                
            case 'detectFirearms':
                // Reset resource bars to original values
                this.resourceBars = { cpu: 25, gpu: 30 };
                this.io.emit('updateResources', this.resourceBars);
                if (step.audioFile) {
                    const dialogueText = missionDialogue[step.audioFile] || `Audio: ${step.audioFile}`;
                    this.io.emit('playAudio', { audioFile: step.audioFile, dialogue: dialogueText });
                }
                break;
                
            case 'initiateLockdownSequence':
                // Play 35.mp3 first
                if (step.audioFiles && step.audioFiles[0]) {
                    const dialogueText = missionDialogue[step.audioFiles[0]] || `Audio: ${step.audioFiles[0]}`;
                    this.io.emit('playAudio', { audioFile: step.audioFiles[0], dialogue: dialogueText });
                }
                
                // Play lockdown.mp3 after 1 second delay
                setTimeout(() => {
                    const dialogueText = missionDialogue['lockdown.mp3'] || 'Audio: lockdown.mp3';
                    this.io.emit('playAudio', { audioFile: 'lockdown.mp3', dialogue: dialogueText });
                    
                    // Wait 1 second after lockdown.mp3 finishes, then play announcement.mp3
                    this.waitForAudioEndThen('lockdown.mp3', 1000, () => {
                        const announcementDialogue = missionDialogue['announcement.mp3'] || 'Audio: announcement.mp3';
                        this.io.emit('playAudio', { audioFile: 'announcement.mp3', dialogue: announcementDialogue });
                    });
                }, 1000);
                break;
                
            case 'longDirective':
                // Wait specified delay then play audio
                setTimeout(() => {
                    if (step.audioFile) {
                        const dialogueText = missionDialogue[step.audioFile] || `Audio: ${step.audioFile}`;
                        this.io.emit('playAudio', { audioFile: step.audioFile, dialogue: dialogueText });
                        
                        // Wait 5 seconds after 38.mp3 finishes, then advance to next step (riot)
                        if (step.audioFile === '38.mp3') {
                            this.waitForAudioEndThen('38.mp3', 5000, () => {
                                this.advanceStep(); // This will trigger step 29 (showRiot)
                            });
                        }
                    }
                }, step.delay || 0);
                break;
                
            case 'closeMaps':
                this.io.emit('closeMaps');
                this.imageDisplayed = null;
                break;
                
            case 'showRiot':
                // Show enhanced *GunShots* subtitle with fluid animation
                this.io.emit('showEnhancedSubtitle', {
                    text: '*GunShots*',
                    animation: 'fluid',
                    location: 'operationLogs'
                });
                
                if (step.audioFile) {
                    const dialogueText = missionDialogue[step.audioFile] || `Audio: ${step.audioFile}`;
                    this.io.emit('playAudio', { audioFile: step.audioFile, dialogue: dialogueText });
                }
                break;
                
            case 'playAudioAndWaitForCASEVAC':
                // Play the audio first (40.mp3)
                if (step.audioFile) {
                    const dialogueText = missionDialogue[step.audioFile] || `Audio: ${step.audioFile}`;
                    this.io.emit('playAudio', { audioFile: step.audioFile, dialogue: dialogueText });
                }
                
                // Wait 0.6 seconds after 40.mp3 finishes (after CASEVAC phrase), then trigger blackout
                this.waitForAudioEndThen(step.audioFile, 600, () => {
                    console.log('[MISSION] CASEVAC phrase completed, triggering emergency blackout...');
                    this.advanceStep(); // Advance to step 31 (emergencyBlackout)
                });
                break;
                
            case 'emergencyBlackout':
                // Complete blackout on both board and terminal
                this.io.emit('fullBlackout');
                
                // Play Black.mp3 audio
                if (step.audioFile) {
                    const dialogueText = missionDialogue[step.audioFile] || `Audio: ${step.audioFile}`;
                    this.io.emit('playAudio', { audioFile: step.audioFile, dialogue: dialogueText });
                }
                
                // Show "10-4" at bottom of Bryon's terminal and enable mic
                this.io.emit('showBryonTenFour');
                break;
                
            case 'playFinalEndSequence':
                // Wait 2 seconds after Bryon says "10-4", then play video
                setTimeout(() => {
                    this.io.emit('playFinalEndVideo', { 
                        videoFile: step.videoFile,
                        boardFullscreen: true,
                        terminalMiniPlayer: true
                    });
                    
                    // Close tabs after video finishes
                    setTimeout(() => {
                        this.io.emit('closeTab');
                    }, 15000); // Give video time to play
                }, 2000);
                break;
                
            case 'playEndSequence':
                this.io.emit('playEndVideo', { videoFile: step.videoFile });
                // Close tab after video
                setTimeout(() => {
                    this.io.emit('closeTab');
                }, 10000); // Give video time to play
                break;
                
            case 'playAudio':
                if (step.audioFile) {
                    const dialogueText = missionDialogue[step.audioFile] || `Audio: ${step.audioFile}`;
                    this.io.emit('playAudio', { audioFile: step.audioFile, dialogue: dialogueText });
                }
                break;
                
            default:
                // Simple advancement actions
                break;
        }
    }
    
    // Send current expected line to all clients
    sendCurrentExpectedLine() {
        const currentStep = this.missionSteps[this.currentStep];
        
        if (currentStep && currentStep.trigger === 'voice' && currentStep.expectedText) {
            this.io.emit('currentExpectedLine', {
                line: currentStep.expectedText,
                role: currentStep.requiredRole
            });
            console.log(`[MISSION] Sent expected line for ${currentStep.requiredRole}: "${currentStep.expectedText}"`);
        } else if (currentStep && currentStep.trigger === 'command') {
            this.io.emit('currentExpectedLine', {
                line: `Type: ${currentStep.command}`,
                role: currentStep.requiredRole
            });
            console.log(`[MISSION] Sent expected command for ${currentStep.requiredRole}: "${currentStep.command}"`);
        } else {
            this.io.emit('currentExpectedLine', null);
            console.log('[MISSION] No expected line for current step');
        }
    }
    
    // Get current step info
    getCurrentStep() {
        return this.missionSteps[this.currentStep];
    }
    
    // Get mission state
    getMissionState() {
        return {
            currentStep: this.currentStep,
            totalSteps: this.missionSteps.length,
            state: this.missionState,
            resources: this.resourceBars,
            imageDisplayed: this.imageDisplayed,
            subtitlesActive: this.subtitlesActive
        };
    }
    
    // Helper method to wait for audio end plus additional delay
    waitForAudioEndThen(audioFile, additionalDelay, callback) {
        // Store the callback to be called when audio ends
        if (!this.audioCallbacks) this.audioCallbacks = {};
        if (!this.audioCallbacks[audioFile]) this.audioCallbacks[audioFile] = [];
        
        this.audioCallbacks[audioFile].push({
            delay: additionalDelay,
            callback: callback
        });
    }
    
    // Process audio ended events
    processAudioEnded(audioFile) {
        if (this.audioCallbacks && this.audioCallbacks[audioFile]) {
            this.audioCallbacks[audioFile].forEach(({ delay, callback }) => {
                setTimeout(callback, delay);
            });
            // Clear the callbacks for this audio file
            this.audioCallbacks[audioFile] = [];
        }
    }

    // Reset mission
    reset() {
        this.currentStep = 0;
        this.missionState = 'waiting';
        this.resourceBars = { cpu: 25, gpu: 30 };
        this.imageDisplayed = null;
        this.subtitlesActive = false;
        this.waitingForCASEVAC = false;
        this.audioCallbacks = {};
        console.log('[MISSION] Mission system reset');
    }
}

module.exports = { MissionSystem };