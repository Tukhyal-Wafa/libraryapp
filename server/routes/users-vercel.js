const express = require("express");
const router = express.Router();
const { sql } = require("@vercel/postgres");
const { authMiddleware, adminOnly } = require("../middleware/auth");

// ── Update user role (admin only) ──────────────────────────────────────────
router.patch("/:id/role", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ msg: "Role must be 'admin' or 'member'." });
    }

    const userResult = await sql`SELECT id, role FROM users WHERE id=${req.params.id}`;
    if (userResult.rows.length === 0) 
      return res.status(404).json({ msg: "User not found." });

    if (parseInt(req.params.id) === req.user.id && role !== "admin") {
      return res.status(400).json({ msg: "You cannot demote yourself." });
    }

    await sql`UPDATE users SET role=${role} WHERE id=${req.params.id}`;
    const updated = await sql`
      SELECT id, name, email, role, created_at FROM users WHERE id=${req.params.id}
    `;
    res.json(updated.rows[0]);
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ msg: "Failed to update role." });
  }
});

// ── Delete user (admin only) ───────────────────────────────────────────────
router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (userId === req.user.id) {
      return res.status(400).json({ msg: "You cannot delete your own account." });
    }

    const userResult = await sql`SELECT id, name, email FROM users WHERE id=${userId}`;
    if (userResult.rows.length === 0) 
      return res.status(404).json({ msg: "User not found." });
    
    const user = userResult.rows[0];

    const activeBorrows = await sql`
      SELECT COUNT(*) as count FROM borrows WHERE user_id=${userId} AND status='active'
    `;
    if (parseInt(activeBorrows.rows[0].count) > 0) {
      return res.status(400).json({ msg: "Cannot delete user with active borrows." });
    }

    await sql`DELETE FROM borrows WHERE user_id=${userId}`;
    await sql`DELETE FROM otps WHERE email=${user.email}`;
    await sql`DELETE FROM users WHERE id=${userId}`;

    res.json({ msg: `User "${user.name}" deleted.` });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ msg: "Failed to delete user." });
  }
});

module.exports = router;
