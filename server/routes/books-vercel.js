const express = require("express");
const router = express.Router();
const { sql } = require("@vercel/postgres");
const { authMiddleware, adminOnly } = require("../middleware/auth");

// ── GET all books (public search) ──────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { q, genre } = req.query;
    let query = sql`SELECT * FROM books WHERE 1=1`;
    
    if (q) {
      query = sql`SELECT * FROM books WHERE 
        title ILIKE ${'%' + q + '%'} OR 
        author ILIKE ${'%' + q + '%'} OR 
        isbn ILIKE ${'%' + q + '%'}`;
    }
    
    if (genre && genre !== "All") {
      if (q) {
        query = sql`SELECT * FROM books WHERE 
          (title ILIKE ${'%' + q + '%'} OR author ILIKE ${'%' + q + '%'} OR isbn ILIKE ${'%' + q + '%'})
          AND genre = ${genre}`;
      } else {
        query = sql`SELECT * FROM books WHERE genre = ${genre}`;
      }
    }
    
    const result = await query;
    res.json(result.rows);
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ msg: "Failed to fetch books." });
  }
});

// ── GET single book ────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const result = await sql`SELECT * FROM books WHERE id=${req.params.id}`;
    if (result.rows.length === 0) 
      return res.status(404).json({ msg: "Book not found." });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ msg: "Failed to fetch book." });
  }
});

// ── GET genres list ────────────────────────────────────────────────────────
router.get("/meta/genres", async (req, res) => {
  try {
    const result = await sql`SELECT DISTINCT genre FROM books ORDER BY genre`;
    res.json(result.rows.map((r) => r.genre));
  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({ msg: "Failed to fetch genres." });
  }
});

// ── ADD book (admin) ───────────────────────────────────────────────────────
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, author, genre, isbn, description, total_copies, cover } = req.body;
    if (!title || !author) 
      return res.status(400).json({ msg: "Title and author are required." });

    const copies = parseInt(total_copies) || 1;
    const result = await sql`
      INSERT INTO books (title, author, genre, isbn, description, total_copies, available_copies, cover)
      VALUES (${title}, ${author}, ${genre || 'General'}, ${isbn || null}, ${description || ''}, ${copies}, ${copies}, ${cover || ''})
      RETURNING *
    `;
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add book error:', error);
    if (error.message.includes('unique')) 
      return res.status(409).json({ msg: "ISBN already exists." });
    res.status(500).json({ msg: "Failed to add book." });
  }
});

// ── UPDATE book (admin) ────────────────────────────────────────────────────
router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, author, genre, isbn, description, total_copies, cover } = req.body;
    const bookResult = await sql`SELECT * FROM books WHERE id=${req.params.id}`;
    
    if (bookResult.rows.length === 0) 
      return res.status(404).json({ msg: "Book not found." });
    
    const book = bookResult.rows[0];
    const newTotal = parseInt(total_copies) || book.total_copies;
    const diff = newTotal - book.total_copies;
    const newAvailable = Math.max(0, book.available_copies + diff);

    const result = await sql`
      UPDATE books SET 
        title=${title || book.title},
        author=${author || book.author},
        genre=${genre || book.genre},
        isbn=${isbn || book.isbn},
        description=${description !== undefined ? description : book.description},
        total_copies=${newTotal},
        available_copies=${newAvailable},
        cover=${cover !== undefined ? cover : book.cover}
      WHERE id=${req.params.id}
      RETURNING *
    `;
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ msg: "Failed to update book." });
  }
});

// ── DELETE book (admin) ────────────────────────────────────────────────────
router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const bookResult = await sql`SELECT * FROM books WHERE id=${req.params.id}`;
    if (bookResult.rows.length === 0) 
      return res.status(404).json({ msg: "Book not found." });

    const activeBorrow = await sql`
      SELECT id FROM borrows WHERE book_id=${req.params.id} AND status='active' LIMIT 1
    `;
    if (activeBorrow.rows.length > 0) 
      return res.status(400).json({ msg: "Cannot delete a book that is currently borrowed." });

    await sql`DELETE FROM books WHERE id=${req.params.id}`;
    res.json({ msg: "Book deleted." });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ msg: "Failed to delete book." });
  }
});

module.exports = router;
