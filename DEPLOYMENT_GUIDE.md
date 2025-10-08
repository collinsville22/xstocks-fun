# Free Deployment Guide for xStocksFun Platform

This guide shows you how to deploy your entire platform for **free** using industry-standard hosting providers.

## Overview

Your platform has 3 components:
1. **Frontend** (React/Vite) → Deploy to **Vercel** (Free)
2. **Backend** (Node.js/Express) → Deploy to **Render** (Free)
3. **Intel Service** (Python/FastAPI) → Deploy to **Render** (Free)

All three services have generous free tiers that are perfect for your platform.

---

## Part 1: Deploy Frontend to Vercel (FREE)

Vercel is the best choice for React/Vite apps. It's made by the creators of Next.js and offers unlimited free deployments.

### Step 1: Prepare Frontend for Deployment

1. **Create `vercel.json` in the frontend folder**:

```bash
cd xstocksfun-platform/frontend
```

Create `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

2. **Update API endpoints** in `frontend/src/lib/config.ts` (create if doesn't exist):

```typescript
// frontend/src/lib/config.ts
export const API_CONFIG = {
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
  INTEL_URL: import.meta.env.VITE_INTEL_URL || 'http://localhost:8002',
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
};
```

3. **Create `.env.production` in frontend**:
```env
VITE_BACKEND_URL=https://your-backend.onrender.com
VITE_INTEL_URL=https://your-intel.onrender.com
VITE_WS_URL=wss://your-backend.onrender.com
```

### Step 2: Deploy to Vercel

**Option A: Using Vercel CLI (Recommended)**

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel (creates account if needed)
vercel login

# Deploy from frontend directory
cd xstocksfun-platform/frontend
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? xstocksfun-frontend
# - Directory? ./
# - Override settings? No

# Deploy to production
vercel --prod
```

**Option B: Using Vercel Dashboard**

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add environment variables (from `.env.production`)
7. Click "Deploy"

**Your frontend will be live at**: `https://your-project.vercel.app`

---

## Part 2: Deploy Backend to Render (FREE)

Render offers free hosting for web services with automatic deployments from GitHub.

### Step 1: Prepare Backend

1. **Create `render.yaml` in backend folder**:

```yaml
# backend/render.yaml
services:
  - type: web
    name: xstocksfun-backend
    env: node
    region: oregon
    plan: free
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: HELIUS_RPC_URL
        sync: false  # You'll add this manually in dashboard
```

2. **Update CORS in `backend/server.js`**:

```javascript
// backend/server.js - Update CORS configuration
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://your-project.vercel.app', // Add your Vercel URL
    /\.vercel\.app$/ // Allow all Vercel preview deployments
  ],
  credentials: true
}));
```

3. **Ensure package.json has start script**:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### Step 2: Deploy to Render

1. **Push your code to GitHub** (if not already):
```bash
cd xstocksfun-platform
git add .
git commit -m "Prepare for deployment"
git push origin main
```

2. **Go to [render.com](https://render.com)**
3. Sign up with GitHub
4. Click "New +" → "Web Service"
5. Connect your GitHub repository
6. Configure:
   - **Name**: `xstocksfun-backend`
   - **Region**: Oregon (closest free region)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`

7. **Add Environment Variables**:
   - Click "Environment" tab
   - Add:
     - `HELIUS_RPC_URL` = your Helius RPC URL
     - `PORT` = `10000` (Render's default)
     - `NODE_ENV` = `production`

8. Click "Create Web Service"

**Your backend will be live at**: `https://xstocksfun-backend.onrender.com`

**Important**: Free tier sleeps after 15 minutes of inactivity. First request takes ~30 seconds to wake up.

---

## Part 3: Deploy Intel Service to Render (FREE)

### Step 1: Prepare Intel Service

1. **Create `requirements.txt`** in `intel-microservice/python-yfinance-service/`:

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
yfinance==0.2.32
pandas==2.1.3
numpy==1.26.2
scipy==1.11.4
python-dotenv==1.0.0
requests==2.31.0
```

2. **Create `render.yaml`** in `intel-microservice/python-yfinance-service/`:

```yaml
services:
  - type: web
    name: xstocksfun-intel
    env: python
    region: oregon
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
```

3. **Update CORS in `main.py`**:

```python
# intel-microservice/python-yfinance-service/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://your-project.vercel.app",  # Add your Vercel URL
        "https://*.vercel.app",  # Allow all Vercel deployments
        "https://xstocksfun-backend.onrender.com"  # Your backend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Step 2: Deploy to Render

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Select your GitHub repository
4. Configure:
   - **Name**: `xstocksfun-intel`
   - **Region**: Oregon
   - **Branch**: `main`
   - **Root Directory**: `intel-microservice/python-yfinance-service`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`

5. Click "Create Web Service"

**Your Intel service will be live at**: `https://xstocksfun-intel.onrender.com`

---

## Part 4: Connect Everything Together

### Update Frontend Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update:
```
VITE_BACKEND_URL=https://xstocksfun-backend.onrender.com
VITE_INTEL_URL=https://xstocksfun-intel.onrender.com
VITE_WS_URL=wss://xstocksfun-backend.onrender.com
```
3. Redeploy frontend for changes to take effect

### Update Backend CORS

In `backend/server.js`, add your Vercel URL:
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://xstocksfun-frontend.vercel.app', // Your actual Vercel URL
    /\.vercel\.app$/
  ],
  credentials: true
}));
```

Commit and push to trigger automatic redeployment.

---

## Free Tier Limitations & Solutions

### Render Free Tier Limitations

**Problem**: Services sleep after 15 minutes of inactivity
**Solution**: First request takes ~30-60 seconds to wake up (acceptable for most users)

**Problem**: 750 hours/month limit per service
**Solution**: More than enough for a portfolio project (31 days × 24 hours = 744 hours)

**Alternative Solution** (if you need 24/7 uptime):
- Use [Cron-job.org](https://cron-job.org) to ping your services every 14 minutes
- Create free account, add jobs:
  - `https://xstocksfun-backend.onrender.com/health` (every 14 min)
  - `https://xstocksfun-intel.onrender.com/health` (every 14 min)

### Vercel Free Tier

- 100GB bandwidth/month
- Unlimited deployments
- No sleep issues
- Perfect for frontend

---

## Alternative Free Hosting Options

If you want alternatives:

### Frontend Alternatives
- **Netlify**: Similar to Vercel, 100GB bandwidth
- **Cloudflare Pages**: Unlimited bandwidth, faster global CDN
- **GitHub Pages**: Good for static sites, requires some config

### Backend Alternatives
- **Railway**: $5 free credit/month (~500 hours)
- **Fly.io**: Free tier for small apps
- **Cyclic**: Unlimited free deployments
- **Glitch**: Always-on for upgraded free accounts

### Intel Service Alternatives
- **PythonAnywhere**: Free tier with 100k API calls/day
- **Railway**: Can host Python FastAPI apps
- **Heroku**: No longer has free tier (paid only)

---

## Step-by-Step Deployment Checklist

- [ ] **Prepare Code**
  - [ ] Create `vercel.json` in frontend
  - [ ] Create `render.yaml` in backend and intel-service
  - [ ] Update CORS in backend and intel-service
  - [ ] Commit all changes to GitHub

- [ ] **Deploy Frontend (Vercel)**
  - [ ] Sign up at vercel.com
  - [ ] Connect GitHub repository
  - [ ] Configure build settings
  - [ ] Add environment variables
  - [ ] Deploy

- [ ] **Deploy Backend (Render)**
  - [ ] Sign up at render.com
  - [ ] Create new web service
  - [ ] Connect GitHub repository
  - [ ] Configure build and start commands
  - [ ] Add environment variables
  - [ ] Deploy

- [ ] **Deploy Intel Service (Render)**
  - [ ] Create new web service
  - [ ] Connect GitHub repository
  - [ ] Configure Python environment
  - [ ] Deploy

- [ ] **Connect Services**
  - [ ] Update frontend env vars with backend/intel URLs
  - [ ] Update backend CORS with frontend URL
  - [ ] Update intel CORS with frontend/backend URLs
  - [ ] Test all connections

- [ ] **Test Production**
  - [ ] Visit frontend URL
  - [ ] Connect wallet
  - [ ] Test swap functionality
  - [ ] Test Intel dashboard
  - [ ] Test bridge functionality

---

## Monitoring Your Deployment

### Vercel
- Dashboard shows deployment status, logs, analytics
- Automatic deployments on every git push
- Preview deployments for pull requests

### Render
- Dashboard shows service status, logs, metrics
- Automatic deployments on every git push
- View logs for debugging

### Useful Commands

```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Rollback deployment
vercel rollback
```

---

## Domain Setup (Optional)

### Free Custom Domain Options

1. **Freenom** (.tk, .ml, .ga, .cf, .gq) - Free domains
2. **Vercel Subdomain** - `your-project.vercel.app` (included)
3. **Render Subdomain** - `your-service.onrender.com` (included)

### Connect Custom Domain to Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain
3. Update DNS records at your domain registrar:
   - Type: `A` Record
   - Name: `@`
   - Value: `76.76.21.21`
4. Wait for DNS propagation (5-30 minutes)

---

## Troubleshooting

### Frontend not connecting to backend

**Check**:
1. Verify CORS settings in backend include your Vercel URL
2. Verify environment variables in Vercel dashboard
3. Check browser console for CORS errors
4. Ensure you're using HTTPS for all API calls

### Backend/Intel service sleeping

**Solution**:
- First request takes 30-60 seconds (normal for free tier)
- Use cron-job.org to keep services awake
- Display loading message to users

### Build failures

**Check**:
1. Ensure all dependencies are in package.json/requirements.txt
2. Check build logs in Render/Vercel dashboard
3. Verify build commands are correct
4. Test build locally first

### WebSocket connection failing

**Check**:
1. Use `wss://` (not `ws://`) for production
2. Verify WebSocket support in hosting provider
3. Check firewall/proxy settings

---

## Cost Summary

| Service | Platform | Cost |
|---------|----------|------|
| Frontend | Vercel | **$0/month** |
| Backend | Render | **$0/month** |
| Intel Service | Render | **$0/month** |
| **Total** | | **$0/month** |

**Limitations**:
- Backend/Intel sleep after 15min inactivity (30s wake time)
- 750 hours/month per Render service (basically 24/7)
- 100GB bandwidth on Vercel (more than enough)

---

## Production Upgrade Path

When you're ready to scale:

### Vercel Pro ($20/month)
- Unlimited bandwidth
- Advanced analytics
- Password protection
- Team collaboration

### Render Starter ($7/month per service)
- No sleeping
- Always-on
- More compute resources
- Better performance

**Estimated cost for full production**: ~$35/month ($20 Vercel + $7 backend + $7 intel)

---

## Next Steps After Deployment

1. **Monitor Performance**
   - Set up error tracking (Sentry - free tier available)
   - Monitor API response times
   - Check user analytics

2. **Add Features**
   - Set up continuous deployment
   - Add staging environment
   - Implement feature flags

3. **Optimize**
   - Enable caching
   - Optimize bundle size
   - Add service worker for offline support

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **Deployment Issues**: Check service status pages
- **Community**: Vercel Discord, Render Community

---

**You're ready to deploy! Start with Vercel for the frontend, then Render for backend/intel. Everything will be live in under 30 minutes.**
