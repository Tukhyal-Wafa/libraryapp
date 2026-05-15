const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sql } = require("@vercel/postgres");

const JWT_SECRET = process.env.JWT_SECRET || "library_secret_key_2024";

// ── Register ───────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ msg: "Name, email and password are required." });
    if (password.length < 6)
      return res.status(400).json({ msg: "Password must be at least 6 characters." });

    const existing = await sql`SELECT id FROM users WHERE email=${email}`;
    if (existing.rows.length > 0) 
      return res.status(409).json({ msg: "Email already registered." });

    const hash = bcrypt.hashSync(password, 10);
    await sql`INSERT INTO users (name, email, password) VALUES (${name}, ${email}, ${hash})`;
    res.json({ msg: "Registered successfully. Please login." });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ msg: "Registration failed." });
  }
});

// ── Login (sends OTP) ──────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ msg: "Email and password are required." });

    const result = await sql`SELECT * FROM users WHERE email=${email}`;
    if (result.rows.length === 0) 
      return res.status(401).json({ msg: "Invalid credentials." });

    const user = result.rows[0];
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ msg: "Invalid credentials." });

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await sql`DELETE FROM otps WHERE email=${email}`;
    await sql`INSERT INTO otps (email, code, expires_at) VALUES (${email}, ${code}, ${expires})`;

    // In production you'd email this; for dev we return it directly
    res.json({ msg: "OTP sent to your email.", otp: code });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ msg: "Login failed." });
  }
});

// ── Verify OTP ─────────────────────────────────────────────────────────────
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ msg: "Email and OTP are required." });

    const result = await sql`SELECT * FROM otps WHERE email=${email} ORDER BY id DESC LIMIT 1`;
    if (result.rows.length === 0) 
      return res.status(400).json({ msg: "No OTP found. Please login again." });

    const record = result.rows[0];
    if (Date.now() > record.expires_at) {
      await sql`DELETE FROM otps WHERE email=${email}`;
      return res.status(400).json({ msg: "OTP expired. Please login again." });
    }
    if (record.code !== String(otp))
      return res.status(400).json({ msg: "Invalid OTP." });

    await sql`DELETE FROM otps WHERE email=${email}`;

    const userResult = await sql`SELECT id, name, email, role FROM users WHERE email=${email}`;
    const user = userResult.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: "7d" }
    );

    res.json({ 
      token, 
      user: { id: user.id, name: user.name, email: user.email, role: user.role } 
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ msg: "Verification failed." });
  }
});

// ── Get current user ───────────────────────────────────────────────────────
const { authMiddleware } = require("../middleware/auth");
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const result = await sql`SELECT id, name, email, role, created_at FROM users WHERE id=${req.user.id}`;
    if (result.rows.length === 0) 
      return res.status(404).json({ msg: "User not found." });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ msg: "Failed to get user." });
  }
});

module.exports = router;
