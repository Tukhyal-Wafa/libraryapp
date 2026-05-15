const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware, adminOnly } = require("../middleware/auth");

// ── GET all books (public search) ──────────────────────────────────────────
router.get("/", (req, res) => {
  const { q, genre } = req.query;
  let sql = "SELECT * FROM books WHERE 1=1";
  const params = [];

  if (q) {
    sql += " AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)";
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (genre && genre !== "All") {
    sql += " AND genre = ?";
    params.push(genre);
  }
  sql += " ORDER BY title ASC";

  const books = db.prepare(sql).all(...params);
  res.json(books);
});

// ── GET single book ────────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const book = db.prepare("SELECT * FROM books WHERE id=?").get(req.params.id);
  if (!book) return res.status(404).json({ msg: "Book not found." });
  res.json(book);
});

// ── GET genres list ────────────────────────────────────────────────────────
router.get("/meta/genres", (req, res) => {
  const rows = db.prepare("SELECT DISTINCT genre FROM books ORDER BY genre").all();
  res.json(rows.map((r) => r.genre));
});

// ── ADD book (admin) ───────────────────────────────────────────────────────
router.post("/", authMiddleware, adminOnly, (req, res) => {
  const { title, author, genre, isbn, description, total_copies, cover } = req.body;
  if (!title || !author) return res.status(400).json({ msg: "Title and author are required." });

  const copies = parseInt(total_copies) || 1;
  try {
    const result = db.prepare(
      "INSERT INTO books (title, author, genre, isbn, description, total_copies, available_copies, cover) VALUES (?,?,?,?,?,?,?,?)"
    ).run(title, author, genre || "General", isbn || null, description || "", copies, copies, cover || "");
    const book = db.prepare("SELECT * FROM books WHERE id=?").get(result.lastInsertRowid);
    res.status(201).json(book);
  } catch (e) {
    if (e.message.includes("UNIQUE")) return res.status(409).json({ msg: "ISBN already exists." });
    res.status(500).json({ msg: "Failed to add book." });
  }
});

// ── UPDATE book (admin) ────────────────────────────────────────────────────
router.put("/:id", authMiddleware, adminOnly, (req, res) => {
  const { title, author, genre, isbn, description, total_copies, cover } = req.body;
  const book = db.prepare("SELECT * FROM books WHERE id=?").get(req.params.id);
  if (!book) return res.status(404).json({ msg: "Book not found." });

  const newTotal = parseInt(total_copies) || book.total_copies;
  const diff = newTotal - book.total_copies;
  const newAvailable = Math.max(0, book.available_copies + diff);

  db.prepare(
    "UPDATE books SET title=?, author=?, genre=?, isbn=?, description=?, total_copies=?, available_copies=?, cover=? WHERE id=?"
  ).run(
    title || book.title,
    author || book.author,
    genre || book.genre,
    isbn || book.isbn,
    description !== undefined ? description : book.description,
    newTotal,
    newAvailable,
    cover !== undefined ? cover : book.cover,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM books WHERE id=?").get(req.params.id));
});

// ── DELETE book (admin) ────────────────────────────────────────────────────
router.delete("/:id", authMiddleware, adminOnly, (req, res) => {
  const book = db.prepare("SELECT * FROM books WHERE id=?").get(req.params.id);
  if (!book) return res.status(404).json({ msg: "Book not found." });

  const activeBorrow = db.prepare("SELECT id FROM borrows WHERE book_id=? AND status='active' LIMIT 1").get(req.params.id);
  if (activeBorrow) return res.status(400).json({ msg: "Cannot delete a book that is currently borrowed." });

  db.prepare("DELETE FROM books WHERE id=?").run(req.params.id);
  res.json({ msg: "Book deleted." });
});

module.exports = router;
