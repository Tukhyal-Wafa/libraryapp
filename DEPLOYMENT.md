# Library Management System - Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Copy `.env.example` to `.env` and configure:
  ```bash
  cp .env.example .env
  ```
- [ ] Set a strong `JWT_SECRET` (use a random 32+ character string)
- [ ] Set `NODE_ENV=production`
- [ ] Configure `FRONTEND_URL` for CORS

### 2. Database Considerations
⚠️ **IMPORTANT**: This app uses SQLite with `better-sqlite3`, which requires native bindings.

**For Vercel/Serverless Deployment:**
- SQLite is **NOT recommended** for serverless environments (Vercel, Netlify, AWS Lambda)
- Each serverless function instance has its own filesystem
- Database changes won't persist between deployments
- **Recommended alternatives:**
  - PostgreSQL (Vercel Postgres, Supabase, Railway)
  - MySQL (PlanetScale, Railway)
  - MongoDB (MongoDB Atlas)

**For Traditional Server Deployment (Recommended):**
- VPS (DigitalOcean, Linode, AWS EC2)
- Platform-as-a-Service (Railway, Render, Fly.io)
- SQLite works perfectly in these environments

### 3. Build the Application
```bash
npm install
npm run build
```

## Deployment Options

### Option A: Railway (Recommended - Easy & Free Tier)

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login and Initialize:**
   ```bash
   railway login
   railway init
   ```

3. **Add Environment Variables:**
   ```bash
   railway variables set JWT_SECRET=your_secret_key_here
   railway variables set NODE_ENV=production
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Set Start Command** (in Railway dashboard):
   ```
   npm run server
   ```

### Option B: Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run server`
   - **Environment Variables:**
     - `JWT_SECRET`: your_secret_key
     - `NODE_ENV`: production

### Option C: DigitalOcean/VPS

1. **SSH into your server:**
   ```bash
   ssh user@your-server-ip
   ```

2. **Install Node.js (v18+):**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone and setup:**
   ```bash
   git clone your-repo-url
   cd librayapp
   npm install
   npm run build
   ```

4. **Setup PM2 (Process Manager):**
   ```bash
   sudo npm install -g pm2
   pm2 start server/index.js --name library-app
   pm2 startup
   pm2 save
   ```

5. **Setup Nginx (Reverse Proxy):**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option D: Vercel (Static Frontend Only)

⚠️ **Note:** Vercel deployment requires migrating from SQLite to a cloud database.

1. **Update `vercel.json`** (already configured)
2. **Migrate to PostgreSQL/MySQL:**
   - Update `server/db.js` to use your chosen database
   - Update all SQL queries to be compatible
3. **Deploy:**
   ```bash
   npm install -g vercel
   vercel
   ```

## Post-Deployment

### 1. Verify Deployment
- [ ] Visit your deployed URL
- [ ] Test login with: `admin@library.com` / `admin123`
- [ ] Test book browsing
- [ ] Test borrowing functionality
- [ ] Check admin panel

### 2. Security Checklist
- [ ] Change default admin password
- [ ] Verify JWT_SECRET is set and strong
- [ ] Enable HTTPS (use Let's Encrypt for free SSL)
- [ ] Configure CORS to only allow your domain
- [ ] Set up rate limiting (optional but recommended)

### 3. Monitoring
- [ ] Set up error logging (Sentry, LogRocket)
- [ ] Monitor server resources
- [ ] Set up database backups (if using SQLite, backup `server/library.db`)

## Troubleshooting

### "Proxy error" or JSON parse errors
- **Cause:** Backend server not running or not accessible
- **Fix:** Ensure backend is running and accessible at the correct URL
- **Check:** Server logs for errors

### Database errors on serverless platforms
- **Cause:** SQLite doesn't work well with serverless
- **Fix:** Migrate to PostgreSQL, MySQL, or MongoDB

### CORS errors
- **Cause:** Frontend and backend on different domains
- **Fix:** Update `FRONTEND_URL` in `.env` and restart server

### Build fails
- **Cause:** Missing dependencies or Node version mismatch
- **Fix:** Use Node.js v18+ and run `npm install` again

## Database Backup (SQLite)

```bash
# Backup
cp server/library.db server/library.db.backup

# Restore
cp server/library.db.backup server/library.db
```

## Scaling Considerations

For production with many users:
1. Migrate to PostgreSQL/MySQL
2. Add Redis for session management
3. Implement rate limiting
4. Add CDN for static assets
5. Set up load balancing
6. Implement proper logging and monitoring

## Support

For issues or questions:
- Check server logs: `pm2 logs library-app` (if using PM2)
- Check browser console for frontend errors
- Verify environment variables are set correctly
