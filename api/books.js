export default async function (req, res) {
  const db = require("./_db");

  if (req.method === "GET") {
    res.json(db.books);
  } else if (req.method === "POST") {
    const { title, author, genre, isbn, cover, description, total_copies } =
      req.body;
    if (!title || !author || !genre) {
      return res
        .status(400)
        .json({ msg: "Title, author, and genre are required." });
    }

    const newBook = {
      id: db.books.length + 1,
      title,
      author,
      genre,
      isbn: isbn || "",
      cover: cover || "",
      description: description || "",
      total_copies: total_copies || 1,
      available_copies: total_copies || 1,
      added_at: new Date().toISOString(),
    };
    db.books.push(newBook);
    res.json(newBook);
  } else if (req.method === "PUT") {
    const id = req.url.slice(1);
    const book = db.books.find((b) => b.id == id);
    if (!book) {
      return res.status(404).json({ msg: "Book not found" });
    }
    const updates = req.body;
    Object.assign(book, updates);
    res.json(book);
  } else if (req.method === "DELETE") {
    const id = req.url.slice(1);
    const index = db.books.findIndex((b) => b.id == id);
    if (index === -1) {
      return res.status(404).json({ msg: "Book not found" });
    }
    db.books.splice(index, 1);
    res.json({ msg: "Book deleted" });
  } else {
    res.status(405).json({ msg: "Method not allowed" });
  }
}
