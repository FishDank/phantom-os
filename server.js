const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const { missionDialogue, matchVoiceCommand } = require('./mission-dialogue.js');
const { MissionSystem } = require('./mission-system.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve audio files
app.use('/audio', express.static(path.join(__dirname, 'audio')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Game state management - Reset to initial state on server startup
let gameState = {
  currentStep: 0,
  missionStarted: false,
  missionActivated: false,
  connectedUsers: {},
  roles: {
    bryon: { taken: false, socketId: null },
    ryan: { taken: false, socketId: null },
    board: { taken: false, socketIds: [] } // Multiple board operators allowed
  },
  lastCommand: '',
  mapVisible: false,
  systemResources: { cpu: 25, gpu: 30 },
  lockdownActive: false
};

// Ensure clean state on server restart
function resetMissionState() {
  gameState.currentStep = 0;
  gameState.missionStarted = false;
  gameState.missionActivated = false;
  gameState.connectedUsers = {};
  gameState.roles.bryon.taken = false;
  gameState.roles.bryon.socketId = null;
  gameState.roles.ryan.taken = false;
  gameState.roles.ryan.socketId = null;
  gameState.roles.board.socketIds = [];
  gameState.lastCommand = '';
  gameState.mapVisible = false;
  gameState.systemResources = { cpu: 25, gpu: 30 };
  gameState.lockdownActive = false;
  console.log('[GAME STATE] Reset to initial state');
}

// Pending auto step that must wait for a specific audio file to finish
let pendingAutoWait = null;

// Initialize Mission System
let missionSystem = null;

// Complete Mission sequence following the exact detailed script
const missionSequence = [
  // Step 0: Wait for "bash mission" to start mission across all sites, then play 1.mp3
  { 
    trigger: 'command', 
    expected: 'bash mission', 
    role: 'bryon',
    action: 'startMission',
    description: 'Mission initiated across all sites'
  },
  
  // Step 1: Auto play 1.mp3
  { 
    trigger: 'auto', 
    delay: 500,
    audio: '1.mp3',
    description: 'Dispatch: Be advised, potential possession of high caliber firearms in settlement-37. Requesting BG check in the perimeter, over.'
  },
  
  // Step 2: Enable Bryon's mic and wait for Bryon to say this line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: '10-4, Preforming BG check of area 37. Acknowledgement of the Autarch is necessary; until then, 10-20 on the suspected location of the contraband?', 
    description: 'Bryon acknowledges dispatch'
  },
  
  // Step 3: Enable Bryon's mic and wait for Bryon to say this line too
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: 'Razor, Subtitles.', 
    description: 'Bryon requests subtitles'
  },
  
  // Step 4: Auto play 4.mp3 (Razor responds)
  { 
    trigger: 'auto', 
    audio: '4.mp3', 
    delay: 100,
    description: 'Razor: Understood.'
  },
  
  // Step 5: Auto play 5.mp3 after 1.3 seconds
  { 
    trigger: 'auto', 
    audio: '5.mp3', 
    delay: 1300,
    description: 'Dispatch: 10-4 on the 10-20, Location is between housing block 9 through housing block 18 on a 3 by 3 grid.'
  },
  
  // Step 6: Enable Bryon's mic and wait for Bryon to say this line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: 'Thanks for the details dispatch. Acknowledging now.', 
    description: 'Bryon acknowledges location information'
  },
  
  // Step 5: Enable Bryon's mic and wait for Bryon to say this line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: 'Phantom 4, Autarch 10-8 yet?', 
    audio: '8.mp3',
    description: 'Phantom 4: Affirmative Autarch is in service, want to be transferred?'
  },
  
  // Step 6: Enable Bryon's mic and wait for Bryon to say this line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: 'Yes.', 
    audio: null 
  },
  
  // Step 7: Enable Bryon's mic and wait for Bryon to say this line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: '2 alpha 1-1?', 
    audio: null 
  },
  
  // Step 8: Now Enable Ryan's mic and wait for Ryan to say this line
  { 
    trigger: 'voice', 
    role: 'ryan', 
    expected: '1-1, go ahead.', 
    audio: null 
  },
  
  // Step 9: Wait for Bryon to type "sudo ./info.tor" and press enter, show map.png on board and play open.mp3
  { 
    trigger: 'command', 
    expected: 'sudo ./info.tor', 
    role: 'bryon',
    action: 'showMap', 
    audio: 'open.mp3',
    mapFile: 'map.png'
  },
  
  // Step 10: Enable Bryon's mic and wait for Bryon to say this line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: 'Sir, There has been activity of Illegal contraband dealing with heavy firearms between housing 9 through 18, clearance to scan the grid?', 
    audio: null 
  },
  
  // Step 11: Enable Ryan's mic and wait for Ryan to say this line
  { 
    trigger: 'voice', 
    role: 'ryan', 
    expected: 'Roger, command acknowledges possible arms deal within settlement 37 boundaries,', 
    audio: '15.mp3',
    description: '24 Gamma 1-5: 2 gamma 1, are we authorized yet? Dispatch is getting impatient.'
  },
  
  // Step 12: Enable Bryon's mic and wait for Bryon to say this line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: 'Yes authorized, start the C.C.T.V:O scan on 9 through 13 on the 3 by 3 grid.', 
    audio: '17.mp3',
    description: '24 Gamma 1-5: Alright Scanning.'
  },
  
  // Step 13: After 17.mp3 finishes, wait 2s, then play failed.mp3 and swap map.png with failed.png
  { 
    trigger: 'auto', 
    audio: 'failed.mp3', 
    waitForAudioEndOf: '17.mp3',
    delayAfterAudioEnd: 2000, 
    action: 'showFailedScan',
    mapFile: 'failed.png'
  },
  
  // Step 14: After failed.mp3 plays, wait 0.7s then play 18.mp3
  { 
    trigger: 'auto', 
    audio: '18.mp3', 
    waitForAudioEndOf: 'failed.mp3',
    delayAfterAudioEnd: 700,
    description: '24 Gamma 1-5: I scanned the grid and nothing!'
  },
  
  // Step 15: After 18.mp3 plays, wait 0.5s then play 19.mp3
  { 
    trigger: 'auto', 
    audio: '19.mp3', 
    waitForAudioEndOf: '18.mp3',
    delayAfterAudioEnd: 500,
    description: '24 Gamma 2-4 and 24 Gamma 5-1: That cant be correct.'
  },
  
  // Step 16: Enable Bryon's mic and wait for Bryon to say this line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: 'Let me try, Razor', 
    audio: '21.mp3',
    description: 'Razor: Yes T.O.D Captain, What is it?'
  },
  
  // Step 17: Enable Bryon's mic and wait for Bryon to say this line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: 'Scan the entirety of settlement 37.', 
    audio: '23.mp3',
    description: 'Razor: That will take up 68% the CPU load and 37% of the GPU Load, Are you okay with that?'
  },
  
  // Step 18: Show CPU/GPU bars growing from 25%/30% to 93%/67% when Bryon says next line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: 'I\'m aware of the cost.', 
    audio: '25.mp3', 
    action: 'increaseResources',
    resources: { cpu: 93, gpu: 67 },
    description: 'Razor: 10-4 T.O.D Captain, I am scanning now.'
  },
  
  // Step 19: Enable Ryan's mic and wait for Ryan to say this line
  { 
    trigger: 'voice', 
    role: 'ryan', 
    expected: 'Status on perimeter scan?', 
    audio: '27.mp3',
    description: '24 Gamma 5-1: First scan failed. The Captain is scanning with the AI.'
  },
  
  // Step 20: After 27.mp3 finishes, wait 0.5s then play 28.mp3
  { 
    trigger: 'auto', 
    audio: '28.mp3', 
    waitForAudioEndOf: '27.mp3',
    delayAfterAudioEnd: 500,
    description: 'Dispatch: We need our directives!'
  },
  
  // Step 21: After 28.mp3 finishes, wait 1s then play success.mp3 and swap to success.png after 1.9s
  { 
    trigger: 'auto', 
    audio: 'success.mp3', 
    waitForAudioEndOf: '28.mp3',
    delayAfterAudioEnd: 1000,
    action: 'showSuccessScan',
    mapFile: 'success.png'
  },
  
  // Step 22: After success.mp3 finishes, wait 1s then play 29.mp3
  { 
    trigger: 'auto', 
    audio: '29.mp3', 
    waitForAudioEndOf: 'success.mp3',
    delayAfterAudioEnd: 1000,
    description: 'Razor: 2 firearms detected in block 21, What are your directives, sir?'
  },

  // Step 22.5: Reset resources back to baseline (CPU 25%, GPU 30%) after detection callout
  { 
    trigger: 'auto',
    action: 'resetResources',
    delay: 0
  },
  
  // Step 23: Enable Bryon's mic and wait for Bryon to say this line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: 'What is the current householder name?', 
    audio: '31.mp3',
    description: 'Razor: House holder name is William Morse Age 32. Anything else?'
  },
  
  // Step 24: Enable Bryon's mic and wait for Bryon to say this line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: 'Run a BG check on William Morse.', 
    audio: '33.mp3',
    description: 'Razor: William Morse has been arrested for 2 counts of murder and was released from San Quentin State Prison on a 750,000 dollar bond in 2027, Anything else?'
  },
  
  // Step 25: Enable Bryon's mic and wait for Bryon to say this line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: 'Razor, put settlement 37 on lockdown.', 
    audio: '35.mp3',
    description: 'Razor: Affirmative.'
  },
  
  // Step 26: Wait 1 second play lockdown.mp3 sound
  { 
    trigger: 'auto', 
    audio: 'lockdown.mp3', 
    delay: 1000, 
    action: 'lockdown'
  },
  
  // Step 27: After lockdown.mp3 finishes, wait 1 second and play announcement.mp3
  { 
    trigger: 'auto', 
    audio: 'announcement.mp3', 
    waitForAudioEndOf: 'lockdown.mp3',
    delayAfterAudioEnd: 1000
  },
  
  // Step 28: Wait for Bryon to type "bash meet" - close out success.png from all websites
  { 
    trigger: 'command', 
    expected: 'bash meet',
    role: 'bryon',
    action: 'hideAllMaps'
  },
  
  // Step 29: Enable Bryon's mic and wait for Bryon to say this line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: 'Autarch, waiting for directives, send a team out. Note the weapons he has are a Remington 887 and a HK417, I\'m not sure how he got those through.', 
    audio: null 
  },
  
  // Step 30: Enable Ryan's mic and wait for Ryan to say this line
  { 
    trigger: 'voice', 
    role: 'ryan', 
    expected: '10-4, just as confused as you are, task forces epsilon 12, and eta 9 of the 24th regiment is en-route to settlement 37. We\'ll also send in delta 4 to keep the operation smooth and within guidelines. Officer 107 will be leading the effort on the rooftops. All responding law enforcement units hold for reinforcement. Directive: 185-164-172-176-166. Codes 225, 307, 308, over.', 
    audio: null,
    delay: 0
  },
  
  // Step 31: Wait 5 seconds before playing 38.mp3
  { 
    trigger: 'auto', 
    audio: '38.mp3', 
    delay: 5000,
    description: 'OFFICER-107: 24-alpha 1-1 sending live feed. Date: August 21st, 2030. Directive: raid and apprehension of subject, William Morse. Status: resident. Recording position: rooftop 49. View: southwest to settlement 37 block 21 house 5. Address: 409 East Beginnings st. Units involved: 2407, 2404, 2405. Light exposure 37%. sounds on. Visual augmentation set to capture interface and agent position markers. Ground unit feed is also available. Mission directive may now be executed, standby for audible changes to directive as situation evolves, over.'
  },
  
  // Step 32: Wait 5 seconds after 38.mp3 finishes then play riot.mp3 and show subtitles *GunShots*
  { 
    trigger: 'auto', 
    audio: 'riot.mp3', 
    waitForAudioEndOf: '38.mp3',
    delayAfterAudioEnd: 5000, 
    action: 'showRiot',
    subtitle: '*GunShots*'
  },
  
  // Step 33: Enable Bryon's mic and wait for Bryon to say this line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: '107, what the hell is going on over there, report!', 
    audio: '40.mp3',
    description: 'OFFICER-107: 10-4, 10-27, multiple agents from multiple units are down, subject is 10-28. Requesting CASEVAC, over.'
  },
  
  // Step 34: (Removed blackout here per new instructions)
  { 
    trigger: 'auto', 
    audio: null, 
    delay: 0
  },
  
  // Step 35: Enable Bryon's mic and wait for Bryon to say this line
  { 
    trigger: 'voice', 
    role: 'bryon', 
    expected: '10-4.', 
    audio: null
  },
  
  // Step 36: After Bryon says "10-4" immediately play end.mp4 on board and terminal with Black.mp3 and full blackout
  { 
    trigger: 'auto', 
    audio: null, 
    delay: 0,
    action: 'playEndVideo'
  }
];

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Send initial game state and role availability
  socket.emit('gameState', gameState);
  socket.emit('roleUpdate', gameState.roles);
  socket.emit('connectedUsers', Object.values(gameState.connectedUsers));

  // Send current expected action (voice/command) on connect so hints show immediately
  console.log(`[DEBUG] Sending expected line for currentStep: ${gameState.currentStep}`);
  sendCurrentExpectedLine();

  // Handle role update requests
  socket.on('requestRoleUpdate', () => {
    console.log('Client requesting role update');
    socket.emit('roleUpdate', gameState.roles);
  });

  // Handle role selection
  socket.on('selectRole', (role) => {
    console.log(`User ${socket.id} attempting to select role: ${role}`);
    
    if (role === 'board') {
      // Multiple board operators allowed
      gameState.roles.board.socketIds.push(socket.id);
      gameState.connectedUsers[socket.id] = {
        role: role,
        socketId: socket.id,
        username: role.toUpperCase()
      };
    } else if (!gameState.roles[role].taken) {
      gameState.roles[role].taken = true;
      gameState.roles[role].socketId = socket.id;
      gameState.connectedUsers[socket.id] = {
        role: role,
        socketId: socket.id,
        username: role.toUpperCase()
      };
    } else {
      socket.emit('roleUnavailable', role);
      return;
    }

    socket.emit('roleSelected', role);
    
    // Emit role updates to all clients
    console.log('Broadcasting role update:', gameState.roles);
    io.emit('roleUpdate', gameState.roles);
    io.emit('connectedUsers', Object.values(gameState.connectedUsers));
    
    // Redirect to appropriate page after a small delay to ensure role updates propagate
    setTimeout(() => {
      if (role === 'board') {
        socket.emit('redirect', '/board.html');
      } else {
        socket.emit('redirect', '/terminal.html');
      }
    }, 100);
  });

  // Handle terminal commands
  socket.on('terminalCommand', (command) => {
    console.log(`Command received from ${socket.id}: ${command}`);
    
    const userRole = gameState.connectedUsers[socket.id]?.role;
    if (!userRole || (userRole !== 'bryon' && userRole !== 'ryan')) return;

    gameState.lastCommand = command;
    io.emit('terminalOutput', { user: userRole, command: command });

    // Process command for mission progress
    checkMissionProgress('command', command, userRole);
  });

  // Handle voice recognition
  socket.on('voiceCommand', (data) => {
    console.log(`Voice command from ${socket.id}:`, data);
    
    const userRole = gameState.connectedUsers[socket.id]?.role;
    if (!userRole) return;

    // Get current expected line to restrict matching
    const currentStep = missionSequence[gameState.currentStep];
    const expectedLine = (currentStep && currentStep.trigger === 'voice' && currentStep.role === userRole) 
      ? currentStep.expected : null;

    // Try to match the voice command ONLY to the current expected line
    const fullLine = matchVoiceCommand(data.text, expectedLine);
    
    if (fullLine && expectedLine) {
      // Only accept the match if it matches the current expected line
      if (fullLine.toLowerCase().includes(expectedLine.toLowerCase()) || 
          expectedLine.toLowerCase().includes(fullLine.toLowerCase())) {
        
        console.log(`[VOICE ACCEPTED] User ${userRole} said current expected line: "${expectedLine}"`);
        io.emit('voiceCommandReceived', { user: userRole, text: fullLine, originalInput: data.text });
        
        // Process voice command for mission progress
        checkMissionProgress('voice', fullLine, userRole);
      } else {
        console.log(`[VOICE REJECTED] User ${userRole} said wrong line. Expected: "${expectedLine}", Got: "${fullLine}"`);
        // Don't emit anything - ignore the command completely
      }
    } else if (!expectedLine) {
      // Fallback behavior when no specific line is expected (shouldn't happen during mission)
      console.log(`[VOICE FALLBACK] No expected line for ${userRole}, processing as-is: "${data.text}"`);
      io.emit('voiceCommandReceived', { user: userRole, text: data.text });
      checkMissionProgress('voice', data.text, userRole);
    } else {
      // No match found - ignore the command completely
      console.log(`[VOICE IGNORED] User ${userRole} said unrecognized command: "${data.text}" (Expected: "${expectedLine}")`);
      // Don't emit anything - voice command is completely ignored
    }
  });

  // Handle exclusive microphone activation
  socket.on('exclusiveMicActivation', (data) => {
    console.log(`Exclusive mic activation for role: ${data.role}`);
    // Disable microphones for all other users
    socket.broadcast.emit('disableYourMicrophone');
  });

  // Board reports when an audio file has finished playing (used for precise timing)
  socket.on('audioEnded', (fileName) => {
    console.log(`[AUDIO ENDED] ${fileName}`);
    
    // Broadcast audio ended to ALL clients for synchronization
    io.emit('audioEnded', fileName);
    
    // Let the mission system handle audio ended events for timing callbacks
    if (missionSystem) {
      missionSystem.processAudioEnded(fileName);
    }

    // Legacy handling removed - timing now controlled by mission system

    if (pendingAutoWait && pendingAutoWait.waitFor.toLowerCase() === String(fileName).toLowerCase()) {
      const { delayAfterEnd } = pendingAutoWait;
      pendingAutoWait = null;
      const step = missionSequence[gameState.currentStep];
      if (step && step.trigger === 'auto') {
        setTimeout(() => {
          executeStepAction(step);
          advanceMissionStep();
        }, delayAfterEnd || 0);
      }
    }
  });

  // Handle mission advancement (for testing)
  socket.on('advanceMission', () => {
    const userRole = gameState.connectedUsers[socket.id]?.role;
    if (userRole !== 'bryon' && userRole !== 'ryan') return; // Only Bryon and Ryan can advance for testing
    
    advanceMissionStep();
  });

  // Handle role reclaim for page transitions
  socket.on('reclaimRole', (role) => {
    console.log(`Socket ${socket.id} reclaiming role: ${role}`);
    console.log('Current game state before reclaim:', JSON.stringify(gameState.roles, null, 2));
    
    if (role === 'board') {
      // Multiple board operators allowed
      if (!gameState.roles.board.socketIds.includes(socket.id)) {
        gameState.roles.board.socketIds.push(socket.id);
      }
    } else if (gameState.roles[role]) {
      // Ensure role is marked as taken and update socket ID
      gameState.roles[role].taken = true;
      gameState.roles[role].socketId = socket.id;
    }
    
    gameState.connectedUsers[socket.id] = {
      role: role,
      socketId: socket.id,
      username: role.toUpperCase()
    };
    
    console.log('Game state after reclaim:', JSON.stringify(gameState.roles, null, 2));
    
    socket.emit('roleReclaimed', role);
    io.emit('roleUpdate', gameState.roles);
    io.emit('connectedUsers', Object.values(gameState.connectedUsers));
    
    console.log('Broadcasting role update after reclaim');
  });

  // Handle disconnection - DO NOT RESTART MISSION
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    const user = gameState.connectedUsers[socket.id];
    if (user) {
      const role = user.role;
      
      if (role === 'board') {
        const index = gameState.roles.board.socketIds.indexOf(socket.id);
        if (index > -1) {
          gameState.roles.board.socketIds.splice(index, 1);
        }
      } else if (gameState.roles[role]) {
        // Keep role taken but mark socket as null - allow reconnection
        gameState.roles[role].socketId = null;
      }
      
      delete gameState.connectedUsers[socket.id];
    }

    // Only emit role updates, do NOT reset mission progress
    io.emit('roleUpdate', gameState.roles);
    io.emit('connectedUsers', Object.values(gameState.connectedUsers));
  });
});

// Mission progress checking function
function checkMissionProgress(trigger, input, userRole) {
  const currentStep = missionSequence[gameState.currentStep];
  if (!currentStep) {
    console.log(`No current step found for step ${gameState.currentStep}`);
    return;
  }

  // Validate input is a string
  if (typeof input !== 'string') {
    console.log(`Invalid input type: expected string, got ${typeof input}`);
    return;
  }

  console.log(`Checking step ${gameState.currentStep}, trigger: ${trigger}, expected trigger: ${currentStep.trigger}`);

  if (currentStep.trigger !== trigger) {
    console.log(`Trigger mismatch: expected ${currentStep.trigger}, got ${trigger}`);
    return;
  }
  
  // Check role-specific requirements
  if (currentStep.role && currentStep.role !== userRole) {
    console.log(`Role mismatch: expected ${currentStep.role}, got ${userRole}`);
    return;
  }

  // Improved fuzzy matching for voice commands (50% similarity - faster recognition)
  if (trigger === 'voice' && currentStep.expected) {
    const similarity = calculateSimilarity(input.toLowerCase(), currentStep.expected.toLowerCase());
    console.log(`Voice similarity: ${similarity}% for "${input}" vs "${currentStep.expected}"`);
    if (similarity < 50) {
      console.log(`Voice command rejected: similarity ${similarity}% below threshold 50%`);
      return;
    }
  } else if (trigger === 'command' && currentStep.expected) {
    if (input.toLowerCase().trim() !== currentStep.expected.toLowerCase()) {
      console.log(`Command mismatch: expected "${currentStep.expected}", got "${input}"`);
      return;
    }
  }

  console.log(`Mission step ${gameState.currentStep} completed!`);
  
  // Execute step actions FIRST
  executeStepAction(currentStep);
  
  // Then advance to next step
  advanceMissionStep();
  
}

function executeStepAction(step) {
  if (step.action) {
    switch (step.action) {
      case 'startMission':
        gameState.missionActivated = true;
        gameState.missionStarted = true;
        console.log('Mission started across all sites');
        break;
        
      case 'showMap':
        gameState.mapVisible = true;
        const mapFile = step.mapFile || 'map.png';
        io.emit('showMap', mapFile);
        console.log(`Showing map: ${mapFile}`);
        break;
        
      case 'showFailedScan':
        io.emit('showMap', step.mapFile || 'failed.png');
        console.log(`Scan failed, showing: ${step.mapFile || 'failed.png'}`);
        break;
        
      case 'showSuccessScan':
        // Schedule the image swap to happen 1.9 seconds after this step executes
        // (which happens when success.mp3 starts playing)
        setTimeout(() => {
          io.emit('showMap', step.mapFile || 'success.png');
          console.log(`Scan successful, showing: ${step.mapFile || 'success.png'} (1.9s after success.mp3 started)`);
        }, 1900);
        break;
        
      case 'increaseResources':
        if (step.resources) {
          gameState.systemResources.cpu = step.resources.cpu;
          gameState.systemResources.gpu = step.resources.gpu;
        } else {
          gameState.systemResources.cpu = 93;
          gameState.systemResources.gpu = 67;
        }
        io.emit('updateResources', gameState.systemResources);
        console.log('Resource usage increased:', gameState.systemResources);
        break;
        
      case 'resetResources':
        gameState.systemResources.cpu = 25;
        gameState.systemResources.gpu = 30;
        io.emit('updateResources', gameState.systemResources);
        console.log('Resource usage reset to baseline:', gameState.systemResources);
        break;
        
      case 'lockdown':
        gameState.lockdownActive = true;
        io.emit('lockdownActive');
        console.log('Settlement 37 lockdown initiated');
        break;
        
      case 'hideAllMaps':
        gameState.mapVisible = false;
        io.emit('hideMap');
        console.log('All maps hidden from websites');
        break;
        
      case 'showRiot':
        if (step.subtitle) {
          io.emit('showSubtitle', step.subtitle);
        }
        console.log('Riot sequence initiated');
        break;
        
      case 'blackScreen':
        io.emit('blackScreen');
        console.log('Board screen blacked out');
        break;
        
      case 'playEndVideo':
        // Ensure both sites black out and play end video; also play Black.mp3 per instructions
        io.emit('playEndVideo');
        io.emit('playAudio', { audioFile: 'Black.mp3', dialogue: missionDialogue['Black.mp3'] || '' });
        console.log('Playing end sequence video with Black.mp3');
        break;
        
      case 'initiateAudioSequence':
        // Handle multiple audio files with delays
        if (step.audioFiles && step.delays) {
          let totalDelay = 0;
          step.audioFiles.forEach((audioFile, index) => {
            const delay = step.delays[index] || 0;
            totalDelay += delay;
            setTimeout(() => {
              const dialogueText = missionDialogue[audioFile] || step.description || `Audio: ${audioFile}`;
              io.emit('playAudio', { audioFile: audioFile, dialogue: dialogueText });
            }, totalDelay);
          });
        }
        break;
        
      default:
        console.log(`Unknown action: ${step.action}`);
        break;
    }
  }

  // Handle audio playback (single audio file)
  if (step.audio && step.action !== 'initiateAudioSequence') {
    const delay = step.delay || 0;
    setTimeout(() => {
      const dialogueText = missionDialogue[step.audio] || step.description || `Audio: ${step.audio}`;
      io.emit('playAudio', { audioFile: step.audio, dialogue: dialogueText });
      // If this step requires a map swap during the audio, schedule it relative to audio start
      if (typeof step.swapDuringAudioAfterMs === 'number' && step.swapMapFile) {
        setTimeout(() => {
          io.emit('showMap', step.swapMapFile);
          console.log(`Swapped image to ${step.swapMapFile} ${step.swapDuringAudioAfterMs}ms into ${step.audio}`);
        }, step.swapDuringAudioAfterMs);
      }
    }, delay);
  }
}

function advanceMissionStep() {
  gameState.currentStep++;
  console.log(`Advanced to mission step: ${gameState.currentStep}`);
  
  // Emit mission step update to all clients with full game state
  io.emit('missionStepUpdate', gameState.currentStep);
  io.emit('gameStateSync', {
    currentStep: gameState.currentStep,
    mapVisible: gameState.mapVisible,
    systemResources: gameState.systemResources,
    missionActive: gameState.currentStep > 0,
    totalSteps: missionSequence.length
  });
  
  // Send current expected line after step advancement
  sendCurrentExpectedLine();
  
  // Check if next step is auto-triggered
  const nextStep = missionSequence[gameState.currentStep];
  if (nextStep && nextStep.trigger === 'auto') {
    // If this auto step must wait for a prior audio to FINISH, set pending wait instead of scheduling immediately
    if (nextStep.waitForAudioEndOf) {
      pendingAutoWait = {
        stepIndex: gameState.currentStep,
        waitFor: nextStep.waitForAudioEndOf,
        delayAfterEnd: nextStep.delayAfterAudioEnd || 0
      };
      console.log(`[AUTO WAIT] Waiting for end of ${nextStep.waitForAudioEndOf} before executing step ${gameState.currentStep}`);
    } else {
      setTimeout(() => {
        executeStepAction(nextStep);
        advanceMissionStep();
      }, nextStep.delay || 0);
    }
  }
  
  // Check if mission is complete
  if (gameState.currentStep >= missionSequence.length) {
    console.log('Mission sequence complete - triggering final actions');
    io.emit('missionComplete');
  }
}

// Function to send current expected line/command to all terminals
function sendCurrentExpectedLine() {
  const currentStep = missionSequence[gameState.currentStep];
  console.log(`[DEBUG] sendCurrentExpectedLine - currentStep: ${gameState.currentStep}, stepDefined: ${!!currentStep}`);
  
  if (currentStep) {
    console.log(`[DEBUG] Step details - trigger: ${currentStep.trigger}, role: ${currentStep.role}, expected: ${currentStep.expected || 'N/A'}`);
  }
  
  if (currentStep && currentStep.trigger === 'voice') {
    const expectedLine = currentStep.expected;
    const role = currentStep.role;
    
    console.log(`Sending expected line to ${role}: "${expectedLine}"`);
    
    io.emit('currentExpectedLine', { 
      role: role, 
      line: expectedLine,
      step: gameState.currentStep 
    });
  } else {
    io.emit('currentExpectedLine', null);
  }

  if (currentStep && currentStep.trigger === 'command') {
    const role = currentStep.role;
    const expectedCmd = currentStep.expected;
    console.log(`Sending expected command to ${role}: "${expectedCmd}"`);
    io.emit('currentExpectedCommand', {
      role: role,
      command: expectedCmd,
      step: gameState.currentStep
    });
  } else {
    io.emit('currentExpectedCommand', null);
  }
}

// Enhanced fuzzy string matching function with better tolerance
function calculateSimilarity(str1, str2) {
  const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const words1 = normalize(str1).split(/\s+/);
  const words2 = normalize(str2).split(/\s+/);
  
  let matches = 0;
  const totalWords = Math.max(words1.length, words2.length);
  
  // Check for exact word matches
  words1.forEach(word1 => {
    if (words2.some(word2 => word1 === word2)) {
      matches += 1;
    } else if (words2.some(word2 => word1.includes(word2) || word2.includes(word1))) {
      matches += 0.7; // Partial credit for substring matches
    }
  });
  
  // Check for key phrases that indicate intent
  const keyPhrases = ['10-4', 'autarch', 'bryon', 'ryan', 'settlement', 'lockdown', 'scan', 'phantom'];
  const str1Lower = normalize(str1);
  const str2Lower = normalize(str2);
  
  keyPhrases.forEach(rawPhrase => {
    const phrase = normalize(rawPhrase); // Normalize phrases to match normalized strings
    if (str1Lower.includes(phrase) && str2Lower.includes(phrase)) {
      matches += 0.5; // Bonus for key phrase matches
    }
  });
  
  return Math.round(Math.min(matches / totalWords, 1.0) * 100); // Cap at 100%
}

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Phantom OS Terminal Server running on port ${PORT}`);
  console.log(`Access the application at: http://localhost:${PORT}`);
  
  // Reset mission state to ensure clean startup
  resetMissionState();
  
  // Initialize Mission System
  missionSystem = new MissionSystem(io);
  console.log('[MISSION SYSTEM] Initialized successfully');
});

module.exports = { app, io, gameState };