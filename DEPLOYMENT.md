# Deployment Guide - Phantom OS Terminal

This guide covers multiple deployment options for the Phantom OS Terminal application.

## 🚨 Important Note

This application uses **WebSockets** for real-time communication. Static hosting platforms like GitHub Pages **cannot** support the full functionality. For complete feature support, use a Node.js hosting service.

## Deployment Options

### 1. GitHub Pages (Static - Limited Features)

**Status**: ✅ Ready  
**Limitations**: No real-time communication, no WebSocket features  
**Best for**: Demo/preview purposes

#### Setup:
1. Push your code to GitHub
2. Go to Repository Settings → Pages
3. Select "GitHub Actions" as source
4. The workflow will automatically deploy on push to `main`

#### URL:
`https://YOUR_USERNAME.github.io/phantom-os/`

---

### 2. Vercel (Recommended for Full Features)

**Status**: ✅ Ready  
**Features**: Full Node.js support, WebSockets, Real-time communication  
**Best for**: Production deployment

#### Setup:
1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the Node.js configuration
3. Set environment variables if needed
4. Deploy automatically on push

#### Configuration:
- Uses `vercel.json` configuration
- Supports serverless functions
- Automatic HTTPS

---

### 3. Render (Excellent Free Option)

**Status**: ✅ Ready  
**Features**: Full Node.js support, WebSockets, Real-time communication  
**Best for**: Production deployment with free tier

#### Setup:
1. Connect your GitHub repository to Render
2. Render will automatically detect the Node.js configuration
3. Uses `render.yaml` configuration for automatic setup
4. Free tier includes 750 hours/month

#### Configuration:
- Uses `render.yaml` configuration
- Automatic builds and deployments
- Built-in SSL certificates
- Environment variable support

---

### 4. Railway

**Status**: ✅ Ready  
**Features**: Full Node.js support, persistent connections  
**Best for**: Production deployment with database needs

#### Setup:
1. Connect GitHub repository to Railway
2. Railway will detect Node.js automatically
3. Uses `railway.json` configuration
4. Set PORT environment variable if needed

#### Secrets Required (for GitHub Actions):
- `RAILWAY_TOKEN`: Your Railway API token
- `RAILWAY_SERVICE`: Your service ID

---

### 4. Heroku

**Status**: ✅ Ready  
**Features**: Full Node.js support, easy scaling  
**Best for**: Traditional deployment

#### Setup:
1. Create Heroku app: `heroku create your-app-name`
2. Push to Heroku: `git push heroku main`
3. Uses `Procfile` for process definition

#### Commands:
```bash
heroku create phantom-os-terminal
heroku config:set NODE_ENV=production
git push heroku main
heroku open
```

---

## 🎯 Quick Deploy to Render (Recommended)

### Step-by-Step Render Deployment:

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Add Render configuration"
   git push origin main
   ```

2. **Sign up/Login to Render**:
   - Go to [render.com](https://render.com)
   - Sign up with GitHub (recommended for easier integration)

3. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub account
   - Select your `phantom-os` repository
   - Click "Connect"

4. **Configure Deployment Settings**:
   - **Name**: `phantom-os-terminal` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (750 hours/month)

5. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically build and deploy
   - Wait 3-5 minutes for first deployment

6. **Access Your App**:
   - Your app will be available at: `https://YOUR-SERVICE-NAME.onrender.com`
   - Full WebSocket functionality will work!

### ✅ Benefits of Render:
- **FREE** tier with 750 hours/month
- **Full WebSocket support** (all features work!)
- **Automatic HTTPS/SSL**
- **Auto-deploy** on GitHub commits
- **Built-in monitoring**
- **No credit card required** for free tier

---

### 5. DigitalOcean App Platform

**Status**: ✅ Ready  
**Features**: Full Node.js support, managed infrastructure  

#### Setup:
1. Connect GitHub repository
2. Select Node.js runtime
3. Configure build and run commands:
   - Build: `npm install`
   - Run: `npm start`

---

### 6. AWS Elastic Beanstalk

**Status**: ✅ Ready  
**Features**: Full AWS integration, auto-scaling  

#### Setup:
1. Install EB CLI: `pip install awsebcli`
2. Initialize: `eb init`
3. Deploy: `eb create production`

---

## Environment Variables

Set these for production deployments:

```bash
NODE_ENV=production
PORT=3000  # Usually auto-set by hosting platforms
```

## Build Commands

For platforms requiring build steps:

- **Install**: `npm install`
- **Build**: `npm run build` (for static version)
- **Start**: `npm start`
- **Dev**: `npm run dev`

## Port Configuration

The application automatically uses the PORT environment variable or defaults to 3000:

```javascript
const PORT = process.env.PORT || 3000;
```

## Static Assets

All static assets are served from:
- `/public/` - HTML, CSS, JS files
- `/audio/` - Audio files for missions
- `/images/` - Image assets

## WebSocket Configuration

WebSocket connections are configured for cross-origin requests:

```javascript
cors: {
  origin: "*",
  methods: ["GET", "POST"]
}
```

## Monitoring and Logs

### Heroku:
```bash
heroku logs --tail
```

### Vercel:
- View function logs in Vercel dashboard
- Real-time logs in deployment section

### Railway:
- View logs in Railway dashboard
- Real-time monitoring available

## Troubleshooting

### Common Issues:

1. **WebSockets not working**: Ensure your hosting platform supports WebSocket connections
2. **Audio files not loading**: Check that audio files are properly deployed and accessible
3. **CORS errors**: Verify CORS configuration for your domain
4. **Build failures**: Ensure all dependencies are listed in `package.json`

### Debug Steps:

1. Check server logs for errors
2. Verify environment variables
3. Test locally with `npm run dev`
4. Check browser console for client-side errors

## Performance Optimization

- Audio files are served statically for better performance
- WebSocket connections are optimized for low latency
- Static assets are served with appropriate caching headers

## Security Considerations

- CORS is configured for development (origin: "*")
- For production, configure specific allowed origins
- Consider rate limiting for production deployments

## Support

For deployment issues:
1. Check the platform-specific documentation
2. Review server logs
3. Test the static version on GitHub Pages first
4. Ensure all files are committed to git

---

**Remember**: Choose the deployment platform based on your needs:
- **Demo/Testing**: GitHub Pages (static)
- **Full Features**: Vercel, Railway, or Heroku
- **Enterprise**: AWS or DigitalOcean