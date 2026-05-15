const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "library.db"));

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// ── Users ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    email     TEXT    NOT NULL UNIQUE,
    password  TEXT    NOT NULL,
    role      TEXT    NOT NULL DEFAULT 'member',
    created_at TEXT   NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── OTP store ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS otps (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    NOT NULL,
    code       TEXT    NOT NULL,
    expires_at INTEGER NOT NULL
  );
`);

// ── Books ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    author      TEXT    NOT NULL,
    genre       TEXT    NOT NULL DEFAULT 'General',
    isbn        TEXT    UNIQUE,
    cover       TEXT    DEFAULT '',
    description TEXT    DEFAULT '',
    total_copies INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    added_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Borrows ────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS borrows (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    book_id     INTEGER NOT NULL REFERENCES books(id),
    borrowed_at TEXT    NOT NULL DEFAULT (datetime('now')),
    due_date    TEXT    NOT NULL,
    returned_at TEXT,
    status      TEXT    NOT NULL DEFAULT 'active'
  );
`);

// ── Seed admin if not exists ───────────────────────────────────────────────
const bcrypt = require("bcryptjs");
const adminExists = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
if (!adminExists) {
  const hash = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)").run(
    "Admin",
    "admin@library.com",
    hash,
    "admin"
  );
}

// ── Seed sample books if empty ─────────────────────────────────────────────
const bookCount = db.prepare("SELECT COUNT(*) as c FROM books").get();
if (bookCount.c === 0) {
  const insert = db.prepare(
    "INSERT INTO books (title, author, genre, isbn, description, total_copies, available_copies) VALUES (?,?,?,?,?,?,?)"
  );
  const books = [
    ["The Great Gatsby", "F. Scott Fitzgerald", "Fiction", "978-0743273565", "A story of the fabulously wealthy Jay Gatsby and his love for Daisy Buchanan.", 3, 3],
    ["To Kill a Mockingbird", "Harper Lee", "Fiction", "978-0061935466", "The unforgettable novel of a childhood in a sleepy Southern town.", 2, 2],
    ["1984", "George Orwell", "Dystopian", "978-0451524935", "A dystopian social science fiction novel and cautionary tale.", 4, 4],
    ["Pride and Prejudice", "Jane Austen", "Romance", "978-0141439518", "A romantic novel of manners written by Jane Austen.", 2, 2],
    ["The Hobbit", "J.R.R. Tolkien", "Fantasy", "978-0547928227", "A fantasy novel about the adventures of hobbit Bilbo Baggins.", 3, 3],
    ["Harry Potter and the Sorcerer's Stone", "J.K. Rowling", "Fantasy", "978-0439708180", "The first novel in the Harry Potter series.", 5, 5],
    ["The Alchemist", "Paulo Coelho", "Adventure", "978-0062315007", "A philosophical novel about a young Andalusian shepherd.", 3, 3],
    ["Brave New World", "Aldous Huxley", "Dystopian", "978-0060850524", "A dystopian novel set in a futuristic World State.", 2, 2],
    ["The Catcher in the Rye", "J.D. Salinger", "Fiction", "978-0316769174", "A story about teenage alienation and loss of innocence.", 2, 2],
    ["Sapiens", "Yuval Noah Harari", "Non-Fiction", "978-0062316097", "A brief history of humankind.", 4, 4],
    ["Atomic Habits", "James Clear", "Self-Help", "978-0735211292", "An easy and proven way to build good habits and break bad ones.", 3, 3],
    ["The Da Vinci Code", "Dan Brown", "Thriller", "978-0307474278", "A mystery thriller novel following symbologist Robert Langdon.", 3, 3],
  ];
  books.forEach((b) => insert.run(...b));
}

module.exports = db;
