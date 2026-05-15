require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === "production" 
    ? process.env.FRONTEND_URL || "*" 
    : ["http://localhost:3000", "http://localhost:5000"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/books", require("./routes/books"));
app.use("/api/borrows", require("./routes/borrows"));
app.use("/api/users", require("./routes/users"));

// ── Health check ───────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ── Serve React build in production ───────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../build")));
  app.get("*", (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(__dirname, "../build/index.html"));
    }
  });
}

// ── 404 handler for API routes ────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ msg: "API endpoint not found" });
  }
  next();
});

// ── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({ 
    msg: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
});

module.exports = app;
