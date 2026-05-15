const express = require("express");
const router = express.Router();
const { sql } = require("@vercel/postgres");
const { authMiddleware, adminOnly } = require("../middleware/auth");

// ── Borrow a book ──────────────────────────────────────────────────────────
router.post("/borrow/:bookId", authMiddleware, async (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId);
    const userId = req.user.id;

    const bookResult = await sql`SELECT * FROM books WHERE id=${bookId}`;
    if (bookResult.rows.length === 0) 
      return res.status(404).json({ msg: "Book not found." });
    
    const book = bookResult.rows[0];
    if (book.available_copies < 1) 
      return res.status(400).json({ msg: "No copies available right now." });

    const existing = await sql`
      SELECT id FROM borrows WHERE user_id=${userId} AND book_id=${bookId} AND status='active'
    `;
    if (existing.rows.length > 0) 
      return res.status(400).json({ msg: "You already have this book borrowed." });

    const due = new Date();
    due.setDate(due.getDate() + 14);
    const dueStr = due.toISOString().split("T")[0];

    const result = await sql`
      INSERT INTO borrows (user_id, book_id, due_date)
      VALUES (${userId}, ${bookId}, ${dueStr})
      RETURNING *
    `;

    await sql`UPDATE books SET available_copies = available_copies - 1 WHERE id=${bookId}`;

    const borrow = await sql`
      SELECT b.*, bk.title, bk.author, bk.genre, bk.cover
      FROM borrows b JOIN books bk ON b.book_id = bk.id
      WHERE b.id=${result.rows[0].id}
    `;

    res.status(201).json({ msg: "Book borrowed successfully!", borrow: borrow.rows[0] });
  } catch (error) {
    console.error('Borrow error:', error);
    res.status(500).json({ msg: "Failed to borrow book." });
  }
});

// ── Return a book ──────────────────────────────────────────────────────────
router.post("/return/:borrowId", authMiddleware, async (req, res) => {
  try {
    const borrowId = parseInt(req.params.borrowId);
    const userId = req.user.id;

    const borrowResult = await sql`SELECT * FROM borrows WHERE id=${borrowId}`;
    if (borrowResult.rows.length === 0) 
      return res.status(404).json({ msg: "Borrow record not found." });
    
    const borrow = borrowResult.rows[0];
    if (borrow.status !== "active") 
      return res.status(400).json({ msg: "This book has already been returned." });

    if (req.user.role !== "admin" && borrow.user_id !== userId) {
      return res.status(403).json({ msg: "Not authorized." });
    }

    await sql`
      UPDATE borrows SET status='returned', returned_at=NOW() WHERE id=${borrowId}
    `;
    await sql`UPDATE books SET available_copies = available_copies + 1 WHERE id=${borrow.book_id}`;

    res.json({ msg: "Book returned successfully!" });
  } catch (error) {
    console.error('Return error:', error);
    res.status(500).json({ msg: "Failed to return book." });
  }
});

// ── My borrows ─────────────────────────────────────────────────────────────
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const result = await sql`
      SELECT b.*, bk.title, bk.author, bk.genre, bk.cover
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      WHERE b.user_id = ${req.user.id}
      ORDER BY b.borrowed_at DESC
    `;
    res.json(result.rows);
  } catch (error) {
    console.error('Get my borrows error:', error);
    res.status(500).json({ msg: "Failed to fetch borrows." });
  }
});

// ── All borrows (admin) ────────────────────────────────────────────────────
router.get("/all", authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await sql`
      SELECT b.*, bk.title, bk.author, bk.genre,
             u.name as user_name, u.email as user_email
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      JOIN users u ON b.user_id = u.id
      ORDER BY b.borrowed_at DESC
    `;
    res.json(result.rows);
  } catch (error) {
    console.error('Get all borrows error:', error);
    res.status(500).json({ msg: "Failed to fetch borrows." });
  }
});

// ── Stats (admin) ──────────────────────────────────────────────────────────
router.get("/stats", authMiddleware, adminOnly, async (req, res) => {
  try {
    const totalBooks = await sql`SELECT COUNT(*) as count FROM books`;
    const totalUsers = await sql`SELECT COUNT(*) as count FROM users WHERE role='member'`;
    const activeBorrows = await sql`SELECT COUNT(*) as count FROM borrows WHERE status='active'`;
    const overdue = await sql`
      SELECT COUNT(*) as count FROM borrows WHERE status='active' AND due_date < CURRENT_DATE
    `;
    const totalBorrows = await sql`SELECT COUNT(*) as count FROM borrows`;
    
    res.json({
      totalBooks: parseInt(totalBooks.rows[0].count),
      totalUsers: parseInt(totalUsers.rows[0].count),
      activeBorrows: parseInt(activeBorrows.rows[0].count),
      overdue: parseInt(overdue.rows[0].count),
      totalBorrows: parseInt(totalBorrows.rows[0].count),
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ msg: "Failed to fetch stats." });
  }
});

// ── All users (admin) ──────────────────────────────────────────────────────
router.get("/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await sql`
      SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC
    `;
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ msg: "Failed to fetch users." });
  }
});

module.exports = router;
