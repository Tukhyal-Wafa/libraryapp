# 🚀 Quick Deployment Reference

## Before You Deploy

```bash
# 1. Create .env file
cp .env.example .env

# 2. Edit .env and set:
JWT_SECRET=your_random_32_character_secret_key_here
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# 3. Test locally
npm run dev
```

## Option 1: Railway (Easiest - Recommended)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway variables set JWT_SECRET=your_secret_key
railway variables set NODE_ENV=production
railway up

# Set start command in Railway dashboard:
# npm run server
```

**Time to deploy:** ~5 minutes  
**Free tier:** Yes  
**Database:** SQLite works ✅

---

## Option 2: Render

1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repo
4. Set:
   - **Build:** `npm install && npm run build`
   - **Start:** `npm run server`
   - **Environment Variables:**
     - `JWT_SECRET`: your_secret_key
     - `NODE_ENV`: production

**Time to deploy:** ~10 minutes  
**Free tier:** Yes  
**Database:** SQLite works ✅

---

## Option 3: VPS (DigitalOcean, Linode, etc.)

```bash
# SSH into server
ssh user@your-server-ip

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone your-repo-url
cd librayapp
npm install
npm run build

# Install PM2
sudo npm install -g pm2
pm2 start server/index.js --name library-app
pm2 startup
pm2 save

# Setup Nginx reverse proxy (optional but recommended)
# See DEPLOYMENT.md for Nginx config
```

**Time to deploy:** ~30 minutes  
**Free tier:** No (starts ~$5/month)  
**Database:** SQLite works ✅

---

## Option 4: Vercel

⚠️ **Requires database migration from SQLite to PostgreSQL/MySQL**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

**Time to deploy:** ~15 minutes (+ database migration time)  
**Free tier:** Yes  
**Database:** Must use PostgreSQL/MySQL ❌ SQLite won't work

---

## Post-Deployment Checklist

- [ ] Visit your deployed URL
- [ ] Login with: `admin@library.com` / `admin123`
- [ ] **Change admin password immediately**
- [ ] Test book browsing
- [ ] Test borrowing a book
- [ ] Test admin panel
- [ ] Enable HTTPS (most platforms do this automatically)
- [ ] Set up monitoring (optional)

---

## Common Issues & Quick Fixes

### "Cannot connect to server"
- **Cause:** Backend not running or wrong URL
- **Fix:** Check server logs, verify PORT environment variable

### "Proxy error" / JSON parse errors
- **Cause:** Backend not accessible from frontend
- **Fix:** Ensure backend is running and CORS is configured

### Database errors on Vercel
- **Cause:** SQLite doesn't work on serverless
- **Fix:** Migrate to PostgreSQL (see DEPLOYMENT.md)

### Build fails
- **Cause:** Missing dependencies or wrong Node version
- **Fix:** Use Node.js 18+, run `npm install` again

---

## Environment Variables Quick Reference

```bash
# Required
JWT_SECRET=your_random_secret_key_min_32_chars
NODE_ENV=production

# Optional
PORT=5000
FRONTEND_URL=https://your-domain.com
```

---

## Database Backup (SQLite)

```bash
# Backup
cp server/library.db server/library.db.backup

# Restore
cp server/library.db.backup server/library.db
```

---

## Monitoring & Logs

### Railway
```bash
railway logs
```

### Render
Check logs in Render dashboard

### VPS with PM2
```bash
pm2 logs library-app
pm2 status
```

---

## Need More Help?

- 📖 **Quick Start:** See `README_QUICKSTART.md`
- 🚀 **Detailed Deployment:** See `DEPLOYMENT.md`
- 🐛 **Issues Fixed:** See `FIXES_APPLIED.md`

---

## Recommended: Railway

For the easiest deployment experience:
1. ✅ Free tier available
2. ✅ SQLite works out of the box
3. ✅ Automatic HTTPS
4. ✅ Simple CLI deployment
5. ✅ Easy environment variable management

**Deploy in 3 commands:**
```bash
railway login
railway init
railway up
```

Done! 🎉
