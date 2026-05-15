const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware, adminOnly } = require("../middleware/auth");

// ── Borrow a book ──────────────────────────────────────────────────────────
router.post("/borrow/:bookId", authMiddleware, (req, res) => {
  const bookId = parseInt(req.params.bookId);
  const userId = req.user.id;

  const book = db.prepare("SELECT * FROM books WHERE id=?").get(bookId);
  if (!book) return res.status(404).json({ msg: "Book not found." });
  if (book.available_copies < 1) return res.status(400).json({ msg: "No copies available right now." });

  // Check if user already has this book borrowed
  const existing = db.prepare(
    "SELECT id FROM borrows WHERE user_id=? AND book_id=? AND status='active'"
  ).get(userId, bookId);
  if (existing) return res.status(400).json({ msg: "You already have this book borrowed." });

  // Due date = 14 days from now
  const due = new Date();
  due.setDate(due.getDate() + 14);
  const dueStr = due.toISOString().split("T")[0];

  const result = db.prepare(
    "INSERT INTO borrows (user_id, book_id, due_date) VALUES (?,?,?)"
  ).run(userId, bookId, dueStr);

  db.prepare("UPDATE books SET available_copies = available_copies - 1 WHERE id=?").run(bookId);

  const borrow = db.prepare(`
    SELECT b.*, bk.title, bk.author, bk.genre, bk.cover
    FROM borrows b JOIN books bk ON b.book_id = bk.id
    WHERE b.id=?
  `).get(result.lastInsertRowid);

  res.status(201).json({ msg: "Book borrowed successfully!", borrow });
});

// ── Return a book ──────────────────────────────────────────────────────────
router.post("/return/:borrowId", authMiddleware, (req, res) => {
  const borrowId = parseInt(req.params.borrowId);
  const userId = req.user.id;

  const borrow = db.prepare("SELECT * FROM borrows WHERE id=?").get(borrowId);
  if (!borrow) return res.status(404).json({ msg: "Borrow record not found." });
  if (borrow.status !== "active") return res.status(400).json({ msg: "This book has already been returned." });

  // Members can only return their own; admins can return any
  if (req.user.role !== "admin" && borrow.user_id !== userId) {
    return res.status(403).json({ msg: "Not authorized." });
  }

  db.prepare(
    "UPDATE borrows SET status='returned', returned_at=datetime('now') WHERE id=?"
  ).run(borrowId);
  db.prepare("UPDATE books SET available_copies = available_copies + 1 WHERE id=?").run(borrow.book_id);

  res.json({ msg: "Book returned successfully!" });
});

// ── My borrows ─────────────────────────────────────────────────────────────
router.get("/my", authMiddleware, (req, res) => {
  const borrows = db.prepare(`
    SELECT b.*, bk.title, bk.author, bk.genre, bk.cover
    FROM borrows b
    JOIN books bk ON b.book_id = bk.id
    WHERE b.user_id = ?
    ORDER BY b.borrowed_at DESC
  `).all(req.user.id);
  res.json(borrows);
});

// ── All borrows (admin) ────────────────────────────────────────────────────
router.get("/all", authMiddleware, adminOnly, (req, res) => {
  const borrows = db.prepare(`
    SELECT b.*, bk.title, bk.author, bk.genre,
           u.name as user_name, u.email as user_email
    FROM borrows b
    JOIN books bk ON b.book_id = bk.id
    JOIN users u ON b.user_id = u.id
    ORDER BY b.borrowed_at DESC
  `).all();
  res.json(borrows);
});

// ── Stats (admin) ──────────────────────────────────────────────────────────
router.get("/stats", authMiddleware, adminOnly, (req, res) => {
  const totalBooks = db.prepare("SELECT COUNT(*) as c FROM books").get().c;
  const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='member'").get().c;
  const activeBorrows = db.prepare("SELECT COUNT(*) as c FROM borrows WHERE status='active'").get().c;
  const overdue = db.prepare(
    "SELECT COUNT(*) as c FROM borrows WHERE status='active' AND due_date < date('now')"
  ).get().c;
  const totalBorrows = db.prepare("SELECT COUNT(*) as c FROM borrows").get().c;
  res.json({ totalBooks, totalUsers, activeBorrows, overdue, totalBorrows });
});

// ── All users (admin) ──────────────────────────────────────────────────────
router.get("/users", authMiddleware, adminOnly, (req, res) => {
  const users = db.prepare(
    "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
  ).all();
  res.json(users);
});

module.exports = router;
