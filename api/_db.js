const users = [
  {
    id: 1,
    name: "Admin",
    email: "admin@library.com",
    password: "admin123",
    role: "admin",
  },
];

const otps = [];

const books = [
  {
    id: 1,
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    genre: "Fiction",
    isbn: "978-0-7432-7356-5",
    cover: "",
    description: "A classic American novel set in the Jazz Age.",
    total_copies: 5,
    available_copies: 5,
    added_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    genre: "Fiction",
    isbn: "978-0-06-112008-4",
    cover: "",
    description: "A gripping tale of racial injustice and childhood innocence.",
    total_copies: 3,
    available_copies: 3,
    added_at: new Date().toISOString(),
  },
  {
    id: 3,
    title: "1984",
    author: "George Orwell",
    genre: "Dystopian",
    isbn: "978-0-452-28423-4",
    cover: "",
    description: "A dystopian social science fiction novel.",
    total_copies: 4,
    available_copies: 4,
    added_at: new Date().toISOString(),
  },
];

const borrows = [];

module.exports = { users, otps, books, borrows };
