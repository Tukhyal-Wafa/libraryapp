const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "library_secret_key_2024";

export default async function (req, res) {
  const path = req.url;

  if (req.method !== "POST") {
    return res.status(405).json({ msg: "Method not allowed" });
  }

  const db = require("./_db");

  if (path === "/register") {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ msg: "Name, email and password are required." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ msg: "Password must be at least 6 characters." });
    }

    const existing = db.users.find((u) => u.email === email);
    if (existing) {
      return res.status(409).json({ msg: "Email already registered." });
    }

    const hash = bcrypt.hashSync(password, 10);
    const newUser = {
      id: db.users.length + 1,
      name,
      email,
      password: hash,
      role: "member",
    };
    db.users.push(newUser);
    res.json({ msg: "Registered successfully. Please login." });
  } else if (path === "/login") {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required." });
    }

    const user = db.users.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ msg: "Invalid credentials." });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ msg: "Invalid credentials." });
    }

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    db.otps.push({ email, code, expires_at: expires });

    // In production you'd email this; for dev we return it directly
    res.json({ msg: "OTP sent to your email.", otp: code });
  } else if (path === "/verify-otp") {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ msg: "Email and OTP are required." });
    }

    const otpEntry = db.otps.find(
      (o) => o.email === email && o.code === otp && o.expires_at > Date.now(),
    );
    if (!otpEntry) {
      return res.status(401).json({ msg: "Invalid or expired OTP." });
    }

    // Remove OTP
    db.otps.splice(db.otps.indexOf(otpEntry), 1);

    const user = db.users.find((u) => u.email === email);
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } else {
    res.status(404).json({ msg: "Not found" });
  }
}
