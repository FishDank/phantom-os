const fs = require('fs');
const path = require('path');

// Create dist directory
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir);

// Copy public directory
function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy public directory contents
copyDir(path.join(__dirname, 'public'), distDir);

// Copy audio and images directories
if (fs.existsSync(path.join(__dirname, 'audio'))) {
  copyDir(path.join(__dirname, 'audio'), path.join(distDir, 'audio'));
}
if (fs.existsSync(path.join(__dirname, 'images'))) {
  copyDir(path.join(__dirname, 'images'), path.join(distDir, 'images'));
}

// Create a static version of the main files by disabling WebSocket features
const terminalAppPath = path.join(distDir, 'terminal-app.js');
if (fs.existsSync(terminalAppPath)) {
  let content = fs.readFileSync(terminalAppPath, 'utf8');
  
  // Add a comment explaining static mode
  const staticModeComment = `
// STATIC MODE: WebSocket features are disabled for GitHub Pages deployment
// For full functionality, deploy to a Node.js hosting service
console.warn('Static mode: Real-time features are disabled. Deploy to Node.js hosting for full functionality.');

`;
  
  content = staticModeComment + content;
  
  // Disable socket.io connections
  content = content.replace(/const socket = io\(\);?/g, '// Socket.io disabled in static mode // const socket = io();');
  content = content.replace(/socket\./g, '// socket.');
  
  fs.writeFileSync(terminalAppPath, content);
}

// Create a deployment info file
const deployInfo = {
  buildTime: new Date().toISOString(),
  mode: 'static',
  note: 'This is a static build for GitHub Pages. WebSocket features are disabled.'
};

fs.writeFileSync(path.join(distDir, 'deploy-info.json'), JSON.stringify(deployInfo, null, 2));

console.log('Static build created in dist/ directory');
console.log('Note: WebSocket features are disabled in static mode');
console.log('For full functionality, deploy to a Node.js hosting service');