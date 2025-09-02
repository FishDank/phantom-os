# Phantom OS Terminal Repository Rules

## Project Information
- **Type**: Node.js Web Application with Real-time WebSocket Communication
- **Framework**: Express.js + Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Target Framework**: Playwright

## Development Guidelines

### Code Style
- Use consistent indentation (2 spaces)
- Follow existing naming conventions
- Comment complex audio/mission logic
- Maintain cyberpunk/terminal aesthetic

### File Structure
- `server.js` - Main server and WebSocket logic
- `public/` - Static frontend assets
- `audio/` - Mission audio files
- `images/` - Visual assets
- `mission-*.js` - Game logic modules

### Testing Strategy
- E2E tests with Playwright
- Test critical user flows: login, mission sequences, role assignments
- Focus on WebSocket communication and audio synchronization
- Test both static and dynamic content

### Deployment Targets
1. **Primary**: Node.js hosting (Vercel, Railway, Heroku)
2. **Fallback**: Static hosting (GitHub Pages - limited features)

### Key Features to Test
- User role assignment (Bryon, Ryan, Board)
- Mission sequence progression
- Command execution in terminal
- Audio playback synchronization
- Visual element updates (maps, resources)