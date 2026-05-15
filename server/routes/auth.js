const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "library_secret_key_2024";

// ── Register ───────────────────────────────────────────────────────────────
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ msg: "Name, email and password are required." });
  if (password.length < 6)
    return res.status(400).json({ msg: "Password must be at least 6 characters." });

  const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email);
  if (existing) return res.status(409).json({ msg: "Email already registered." });

  const hash = bcrypt.hashSync(password, 10);
  db.prepare("INSERT INTO users (name, email, password) VALUES (?,?,?)").run(name, email, hash);
  res.json({ msg: "Registered successfully. Please login." });
});

// ── Login (sends OTP) ──────────────────────────────────────────────────────
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ msg: "Email and password are required." });

  const user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  if (!user) return res.status(401).json({ msg: "Invalid credentials." });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ msg: "Invalid credentials." });

  // Generate 6-digit OTP
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

  db.prepare("DELETE FROM otps WHERE email=?").run(email);
  db.prepare("INSERT INTO otps (email, code, expires_at) VALUES (?,?,?)").run(email, code, expires);

  // In production you'd email this; for dev we return it directly
  res.json({ msg: "OTP sent to your email.", otp: code });
});

// ── Verify OTP ─────────────────────────────────────────────────────────────
router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ msg: "Email and OTP are required." });

  const record = db.prepare("SELECT * FROM otps WHERE email=? ORDER BY id DESC LIMIT 1").get(email);
  if (!record) return res.status(400).json({ msg: "No OTP found. Please login again." });
  if (Date.now() > record.expires_at) {
    db.prepare("DELETE FROM otps WHERE email=?").run(email);
    return res.status(400).json({ msg: "OTP expired. Please login again." });
  }
  if (record.code !== String(otp))
    return res.status(400).json({ msg: "Invalid OTP." });

  db.prepare("DELETE FROM otps WHERE email=?").run(email);

  const user = db.prepare("SELECT id, name, email, role FROM users WHERE email=?").get(email);
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// ── Get current user ───────────────────────────────────────────────────────
const { authMiddleware } = require("../middleware/auth");
router.get("/me", authMiddleware, (req, res) => {
  const user = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE id=?").get(req.user.id);
  if (!user) return res.status(404).json({ msg: "User not found." });
  res.json(user);
});

module.exports = router;
