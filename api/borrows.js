const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "library_secret_key_2024";

export default async function (req, res) {
  const db = require("./_db");

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  let user;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    user = db.users.find((u) => u.id === decoded.id);
    if (!user) {
      return res.status(401).json({ msg: "Invalid token" });
    }
  } catch (err) {
    return res.status(401).json({ msg: "Invalid token" });
  }

  if (req.method === "GET" && req.url === "/my") {
    const userBorrows = db.borrows
      .filter((b) => b.user_id === user.id)
      .map((borrow) => {
        const book = db.books.find((bk) => bk.id === borrow.book_id);
        return { ...borrow, book: { title: book.title, author: book.author } };
      });
    res.json(userBorrows);
  } else if (req.method === "POST" && req.url.startsWith("/return/")) {
    const id = req.url.split("/return/")[1];
    const borrow = db.borrows.find((b) => b.id == id && b.user_id === user.id);
    if (!borrow) {
      return res.status(404).json({ msg: "Borrow not found" });
    }
    if (borrow.returned_at) {
      return res.status(400).json({ msg: "Already returned" });
    }

    borrow.returned_at = new Date().toISOString();
    const book = db.books.find((b) => b.id === borrow.book_id);
    book.available_copies++;
    res.json({ msg: "Returned successfully" });
  } else if (req.method === "GET" && req.url === "/users") {
    if (user.role !== "admin") {
      return res.status(403).json({ msg: "Admin required" });
    }
    const usersWithBorrows = db.users.map((u) => {
      const activeBorrows = db.borrows.filter(
        (b) => b.user_id === u.id && !b.returned_at,
      ).length;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active_borrows: activeBorrows,
      };
    });
    res.json(usersWithBorrows);
  } else if (req.method === "GET" && req.url === "/all") {
    if (user.role !== "admin") {
      return res.status(403).json({ msg: "Admin required" });
    }
    const allBorrows = db.borrows.map((borrow) => {
      const book = db.books.find((bk) => bk.id === borrow.book_id);
      const borrower = db.users.find((u) => u.id === borrow.user_id);
      return {
        ...borrow,
        book: { title: book.title, author: book.author },
        user: { name: borrower.name, email: borrower.email },
      };
    });
    res.json(allBorrows);
  } else if (req.method === "POST") {
    const { book_id } = req.body;
    if (!book_id) {
      return res.status(400).json({ msg: "Book ID is required." });
    }

    const book = db.books.find((b) => b.id == book_id);
    if (!book) {
      return res.status(404).json({ msg: "Book not found" });
    }
    if (book.available_copies <= 0) {
      return res.status(400).json({ msg: "Book not available" });
    }

    book.available_copies--;
    const newBorrow = {
      id: db.borrows.length + 1,
      user_id: user.id,
      book_id,
      borrowed_at: new Date().toISOString(),
      due_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
      returned_at: null,
    };
    db.borrows.push(newBorrow);
    res.json({ ...newBorrow, book });
  } else {
    res.status(405).json({ msg: "Method not allowed" });
  }
}
