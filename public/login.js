// Phantom OS Login System with Socket.IO Integration
class PhantomLogin {
    constructor() {
        this.socket = null;
        this.selectedRole = null;
        this.init();
    }

    init() {
        // Initialize Socket.IO connection
        this.socket = io();
        
        // DOM elements
        this.statusElement = document.getElementById('loginStatus');
        this.usersList = document.getElementById('usersList');
        this.roleButtons = document.querySelectorAll('.role-btn');
        
        this.setupEventListeners();
        this.setupSocketEvents();
        this.startTimestamp();
        this.playLoginAudio();
    }

    setupEventListeners() {
        // Role button clicks
        this.roleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const role = button.dataset.role;
                this.selectRole(role);
            });

            // Hover effects with audio
            button.addEventListener('mouseenter', () => {
                this.playSelectAudio();
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case '1':
                    e.preventDefault();
                    this.selectRole('bryon');
                    break;
                case '2':
                    e.preventDefault();
                    this.selectRole('ryan');
                    break;
                case '3':
                    e.preventDefault();
                    this.selectRole('board');
                    break;
            }
        });
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to authentication server');
            this.updateStatus('CONNECTION ESTABLISHED - AWAITING ROLE SELECTION');
            
            // Request initial role state
            setTimeout(() => {
                this.socket.emit('requestRoleUpdate');
            }, 500);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateStatus('CONNECTION LOST - ATTEMPTING RECONNECT...');
        });

        this.socket.on('roleUpdate', (roles) => {
            console.log('Received role update:', roles);
            this.updateRoleAvailability(roles);
        });

        this.socket.on('connectedUsers', (users) => {
            this.updateConnectedUsers(users);
        });

        this.socket.on('roleSelected', (role) => {
            this.updateStatus(`ROLE AUTHENTICATED: ${role.toUpperCase()}`);
            localStorage.setItem('userRole', role);
        });

        this.socket.on('roleUnavailable', (role) => {
            this.updateStatus(`ROLE ${role.toUpperCase()} UNAVAILABLE - SELECT DIFFERENT ROLE`);
            this.flashButton(role, 'error');
        });

        this.socket.on('redirect', (url) => {
            this.updateStatus('AUTHENTICATION SUCCESSFUL - REDIRECTING...');
            setTimeout(() => {
                window.location.href = url + `?role=${this.selectedRole}`;
            }, 1500);
        });
    }

    selectRole(role) {
        if (!this.socket.connected) {
            this.updateStatus('CONNECTION REQUIRED - PLEASE WAIT');
            return;
        }

        // Play Login.mp3 when button is clicked
        this.playLoginClickAudio();

        this.selectedRole = role;
        this.updateStatus(`AUTHENTICATING AS ${role.toUpperCase()}...`);
        this.flashButton(role, 'selected');
        
        // Request audio permissions before proceeding
        this.requestAudioPermissions().then(() => {
            this.socket.emit('selectRole', role);
        }).catch(() => {
            // Proceed anyway, audio is not critical for login
            this.socket.emit('selectRole', role);
        });
    }

    updateRoleAvailability(roles) {
        console.log('Updating role availability with:', roles);
        
        // Update BRYON button
        const bryonBtn = document.getElementById('bryonBtn');
        const bryonStatus = document.getElementById('bryonStatus');
        if (roles.bryon.taken) {
            bryonBtn.disabled = true;
            bryonBtn.classList.add('unavailable');
            bryonStatus.textContent = '● OCCUPIED';
            bryonStatus.style.color = '#ff4444';
        } else {
            bryonBtn.disabled = false;
            bryonBtn.classList.remove('unavailable');
            bryonStatus.textContent = '● AVAILABLE';
            bryonStatus.style.color = '#00ff41';
        }

        // Update RYAN button - only available after BRYON connects
        const ryanBtn = document.getElementById('ryanBtn');
        const ryanStatus = document.getElementById('ryanStatus');
        if (roles.ryan.taken) {
            ryanBtn.disabled = true;
            ryanBtn.classList.add('unavailable');
            ryanStatus.textContent = '● OCCUPIED';
            ryanStatus.style.color = '#ff4444';
        } else if (!roles.bryon.taken) {
            // RYAN is disabled when BRYON is not connected
            ryanBtn.disabled = true;
            ryanBtn.classList.add('unavailable');
            ryanStatus.textContent = '● WAITING FOR BRYON';
            ryanStatus.style.color = '#ffaa00';
        } else {
            // RYAN is available when BRYON is connected and RYAN is not taken
            ryanBtn.disabled = false;
            ryanBtn.classList.remove('unavailable');
            ryanStatus.textContent = '● AVAILABLE';
            ryanStatus.style.color = '#00ff41';
        }

        // BOARD operator is always available (multiple allowed)
        const boardBtn = document.getElementById('boardBtn');
        boardBtn.disabled = false;
        boardBtn.classList.remove('unavailable');
    }

    updateConnectedUsers(users) {
        if (users.length === 0) {
            this.usersList.textContent = 'None';
        } else {
            const userNames = users.map(user => user.username).join(', ');
            this.usersList.textContent = userNames;
        }
    }

    updateStatus(message) {
        this.statusElement.textContent = message;
        console.log('Login Status:', message);
    }

    flashButton(role, type) {
        const button = document.querySelector(`[data-role="${role}"]`);
        if (button) {
            button.classList.add(type === 'error' ? 'flash-error' : 'flash-success');
            setTimeout(() => {
                button.classList.remove('flash-error', 'flash-success');
            }, 1000);
        }
    }

    async requestAudioPermissions() {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('Audio permissions granted');
            }
        } catch (err) {
            console.warn('Audio permissions denied:', err);
            throw err;
        }
    }

    playLoginAudio() {
        const audio = new Audio('Login.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => {
            console.log('Login audio failed to play:', e);
        });
    }

    playSelectAudio() {
        const audio = new Audio('Select.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => {
            // Ignore audio failures on hover
        });
    }

    playLoginClickAudio() {
        const audio = new Audio('Login.mp3');
        audio.volume = 0.7;
        audio.play().catch(e => {
            console.log('Login click audio failed to play:', e);
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
}

// Initialize login when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Clear any previous role selection
    localStorage.removeItem('userRole');
    
    // Initialize login system
    window.phantomLogin = new PhantomLogin();
});

// Add CSS for dynamic effects
const dynamicStyles = `
.role-btn.flash-error {
    border: 2px solid #ff4444 !important;
    box-shadow: 0 0 20px #ff4444 !important;
    animation: flash-red 1s ease-in-out;
}

.role-btn.flash-success {
    border: 2px solid #00ff41 !important;
    box-shadow: 0 0 20px #00ff41 !important;
    animation: flash-green 1s ease-in-out;
}

.role-btn.unavailable {
    opacity: 0.5;
    pointer-events: none;
}

@keyframes flash-red {
    0%, 100% { box-shadow: 0 0 20px #ff4444; }
    50% { box-shadow: 0 0 40px #ff4444; }
}

@keyframes flash-green {
    0%, 100% { box-shadow: 0 0 20px #00ff41; }
    50% { box-shadow: 0 0 40px #00ff41; }
}

.status {
    animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}
`;

// Inject dynamic styles
const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);