# Library Management System - Quick Start Guide

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation & Running

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start both frontend and backend:**
   ```bash
   npm run dev
   ```
   This will start:
   - Backend server on `http://localhost:5000`
   - React frontend on `http://localhost:3000`

3. **Open your browser:**
   Navigate to `http://localhost:3000`

4. **Login with default admin account:**
   - Email: `admin@library.com`
   - Password: `admin123`

## 📝 Available Scripts

- `npm run dev` - Start both frontend and backend concurrently
- `npm start` - Start frontend only (React dev server)
- `npm run server` - Start backend only (Express API)
- `npm run build` - Build for production

## 🔧 Troubleshooting

### "Proxy error" or "Cannot connect to server"

**Problem:** The frontend can't reach the backend server.

**Solutions:**
1. Make sure both servers are running (`npm run dev`)
2. Check that backend is running on port 5000
3. Check console for any backend errors
4. Try restarting both servers

### Port Already in Use

**Problem:** Port 3000 or 5000 is already in use.

**Solutions:**
```bash
# Windows - Kill process on port
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change the port in package.json proxy setting
```

### Database Errors

**Problem:** SQLite database issues.

**Solutions:**
1. Delete `server/library.db*` files and restart
2. The database will be recreated automatically with sample data

### Module Not Found

**Problem:** Missing dependencies.

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

## 🎯 Features

- **User Authentication** with OTP verification
- **Book Catalog** with search and filtering
- **Borrow Management** with due dates
- **Admin Panel** for managing books, users, and borrows
- **Analytics Dashboard** with charts and statistics
- **Online Reading** integration with Open Library & Internet Archive

## 📚 Default Accounts

### Admin Account
- Email: `admin@library.com`
- Password: `admin123`
- Role: Administrator (full access)

### Creating New Accounts
1. Click "Create account" on login page
2. Fill in name, email, and password
3. Login with your credentials
4. Enter the OTP code (displayed on screen in development)

## 🔐 Security Notes

⚠️ **Before deploying to production:**
1. Change the default admin password
2. Set a strong `JWT_SECRET` in `.env`
3. Configure proper CORS settings
4. Enable HTTPS
5. Review the `DEPLOYMENT.md` file

## 📖 Project Structure

```
librayapp/
├── server/              # Backend (Express + SQLite)
│   ├── routes/         # API routes
│   ├── middleware/     # Auth middleware
│   ├── db.js          # Database setup
│   └── index.js       # Server entry point
├── src/                # Frontend (React)
│   ├── components/    # React components
│   ├── App.js         # Main app component
│   └── index.js       # React entry point
├── public/            # Static assets
└── package.json       # Dependencies & scripts
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login (sends OTP)
- `POST /api/auth/verify-otp` - Verify OTP and get token
- `GET /api/auth/me` - Get current user

### Books
- `GET /api/books` - Get all books (with search/filter)
- `GET /api/books/:id` - Get single book
- `POST /api/books` - Add book (admin only)
- `PUT /api/books/:id` - Update book (admin only)
- `DELETE /api/books/:id` - Delete book (admin only)

### Borrows
- `POST /api/borrows/borrow/:bookId` - Borrow a book
- `POST /api/borrows/return/:borrowId` - Return a book
- `GET /api/borrows/my` - Get my borrows
- `GET /api/borrows/all` - Get all borrows (admin only)
- `GET /api/borrows/stats` - Get statistics (admin only)

### Users
- `PATCH /api/users/:id/role` - Update user role (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

## 💡 Tips

1. **Sample Data:** The app comes with 12 sample books pre-loaded
2. **OTP in Development:** OTP codes are displayed on screen (no email needed)
3. **Book Covers:** Uses Open Library API for book covers and metadata
4. **Reading Online:** Click any book card to find online reading options

## 🚀 Ready for Production?

See `DEPLOYMENT.md` for detailed deployment instructions for:
- Railway (recommended)
- Render
- DigitalOcean/VPS
- Vercel (requires database migration)

## 📞 Need Help?

- Check `DEPLOYMENT.md` for deployment issues
- Review server logs in the terminal
- Check browser console for frontend errors
- Ensure all environment variables are set correctly
