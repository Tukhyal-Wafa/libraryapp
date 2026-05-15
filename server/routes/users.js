const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware, adminOnly } = require("../middleware/auth");

// ── Update user role (admin only) ──────────────────────────────────────────
router.patch("/:id/role", authMiddleware, adminOnly, (req, res) => {
  const { role } = req.body;
  if (!["admin", "member"].includes(role)) {
    return res.status(400).json({ msg: "Role must be 'admin' or 'member'." });
  }

  const user = db.prepare("SELECT id, role FROM users WHERE id=?").get(req.params.id);
  if (!user) return res.status(404).json({ msg: "User not found." });

  // Prevent demoting yourself
  if (parseInt(req.params.id) === req.user.id && role !== "admin") {
    return res.status(400).json({ msg: "You cannot demote yourself." });
  }

  db.prepare("UPDATE users SET role=? WHERE id=?").run(role, req.params.id);
  const updated = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE id=?").get(req.params.id);
  res.json(updated);
});

// ── Delete user (admin only) ───────────────────────────────────────────────
router.delete("/:id", authMiddleware, adminOnly, (req, res) => {
  const userId = parseInt(req.params.id);

  // Prevent deleting yourself
  if (userId === req.user.id) {
    return res.status(400).json({ msg: "You cannot delete your own account." });
  }

  const user = db.prepare("SELECT id, name FROM users WHERE id=?").get(userId);
  if (!user) return res.status(404).json({ msg: "User not found." });

  // Check for active borrows
  const activeBorrows = db.prepare(
    "SELECT COUNT(*) as c FROM borrows WHERE user_id=? AND status='active'"
  ).get(userId).c;
  if (activeBorrows > 0) {
    return res.status(400).json({ msg: "Cannot delete user with active borrows." });
  }

  db.prepare("DELETE FROM borrows WHERE user_id=?").run(userId);
  db.prepare("DELETE FROM otps WHERE email=(SELECT email FROM users WHERE id=?)").run(userId);
  db.prepare("DELETE FROM users WHERE id=?").run(userId);

  res.json({ msg: `User "${user.name}" deleted.` });
});

module.exports = router;
