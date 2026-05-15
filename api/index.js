// Vercel Serverless Function Entry Point
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Routes
app.use("/api/auth", require("../server/routes/auth"));
app.use("/api/books", require("../server/routes/books"));
app.use("/api/borrows", require("../server/routes/borrows"));
app.use("/api/users", require("../server/routes/users"));

// 404 handler for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ msg: "API endpoint not found" });
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({ 
    msg: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
});

// Export for Vercel
module.exports = app;
