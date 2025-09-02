# Phantom OS Terminal - Dystopian Police Terminal Roleplay System

A real-time voice roleplay system featuring a cyberpunk police terminal interface with WebSocket communication and dynamic audio/visual elements.

## Features

- Real-time voice communication between players
- Interactive police terminal interface
- Mission system with synchronized audio playback
- Dynamic visual elements (maps, resource monitors)
- Role-based access (Bryon, Ryan, Board operators)

## Technology Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Real-time Communication**: WebSockets
- **Audio**: Web Audio API

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/phantom-os.git
   cd phantom-os
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Production Deployment

### Option 1: Node.js Hosting (Recommended)
Deploy to platforms that support Node.js applications:

- **Render** (Recommended): Free tier with full WebSocket support
- **Vercel**: Use the provided `vercel.json` configuration
- **Railway**: Direct deployment support
- **Heroku**: Use the provided `Procfile`
- **DigitalOcean App Platform**: Node.js support
- **AWS Elastic Beanstalk**: Node.js environment

### Option 2: Static Version (Limited Functionality)
A static version is available for GitHub Pages, but WebSocket features will be disabled:

```bash
npm run build:static
```

## Environment Variables

For production deployment, set these environment variables:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Set to 'production' for production builds

## Project Structure

```
phantom-os/
├── public/              # Static assets (HTML, CSS, JS, images)
├── audio/              # Audio files for mission system
├── images/             # Image assets
├── server.js           # Main server file
├── mission-dialogue.js # Voice command matching
├── mission-system.js   # Mission state management
└── package.json        # Project configuration
```

## Roles and Access

- **Bryon**: Terminal operator with command access
- **Ryan**: Supervisor with authorization privileges  
- **Board**: Multiple board operators can monitor operations

## Commands

- `bash mission`: Start the mission sequence
- `sudo ./info.tor`: Display tactical grid map
- `bash meet`: Close operational displays

## Audio System

The application includes a comprehensive audio system with:
- Synchronized mission dialogue
- Environmental sounds
- Radio communications
- System notifications

## Browser Support

- Chrome/Chromium 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

MIT License - see LICENSE file for details.

## Development

For development with hot reloading:
```bash
npm run dev
```

For production server:
```bash
npm start
```

## Deployment Status

[![Deploy to GitHub Pages](https://github.com/YOUR_USERNAME/phantom-os/actions/workflows/pages.yml/badge.svg)](https://github.com/YOUR_USERNAME/phantom-os/actions/workflows/pages.yml)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request