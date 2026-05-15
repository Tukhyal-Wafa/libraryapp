// Vercel-compatible database using @vercel/postgres
const { sql } = require('@vercel/postgres');

// Initialize tables
async function initDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // Create OTP table
    await sql`
      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at BIGINT NOT NULL
      )
    `;

    // Create books table
    await sql`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        genre TEXT NOT NULL DEFAULT 'General',
        isbn TEXT UNIQUE,
        cover TEXT DEFAULT '',
        description TEXT DEFAULT '',
        total_copies INTEGER NOT NULL DEFAULT 1,
        available_copies INTEGER NOT NULL DEFAULT 1,
        added_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // Create borrows table
    await sql`
      CREATE TABLE IF NOT EXISTS borrows (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        book_id INTEGER NOT NULL REFERENCES books(id),
        borrowed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        due_date DATE NOT NULL,
        returned_at TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'active'
      )
    `;

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Seed admin user if not exists
async function seedAdmin() {
  try {
    const bcrypt = require('bcryptjs');
    const result = await sql`SELECT id FROM users WHERE role='admin' LIMIT 1`;
    
    if (result.rows.length === 0) {
      const hash = bcrypt.hashSync('admin123', 10);
      await sql`
        INSERT INTO users (name, email, password, role)
        VALUES ('Admin', 'admin@library.com', ${hash}, 'admin')
      `;
      console.log('✅ Admin user created');
    }
  } catch (error) {
    console.error('Admin seed error:', error);
  }
}

// Seed sample books if empty
async function seedBooks() {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM books`;
    
    if (result.rows[0].count === '0') {
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

      for (const book of books) {
        await sql`
          INSERT INTO books (title, author, genre, isbn, description, total_copies, available_copies)
          VALUES (${book[0]}, ${book[1]}, ${book[2]}, ${book[3]}, ${book[4]}, ${book[5]}, ${book[6]})
        `;
      }
      console.log('✅ Sample books seeded');
    }
  } catch (error) {
    console.error('Books seed error:', error);
  }
}

// Initialize everything
async function initialize() {
  await initDatabase();
  await seedAdmin();
  await seedBooks();
}

module.exports = { sql, initialize };
