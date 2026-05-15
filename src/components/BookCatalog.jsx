import React, { useState, useEffect, useCallback } from "react";
import "./BookCatalog.css";

const GENRE_COLORS = {
  Fiction: "#4f8ef7",
  Dystopian: "#9b59b6",
  Romance: "#e91e8c",
  Fantasy: "#27ae60",
  Adventure: "#e67e22",
  "Non-Fiction": "#16a085",
  "Self-Help": "#2980b9",
  Thriller: "#c0392b",
  Mystery: "#8e44ad",
  Biography: "#f39c12",
  Science: "#1abc9c",
  History: "#d35400",
  General: "#7f8c8d",
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Open Library — resolve the best direct read link                          */
/*                                                                             */
/*  Priority:                                                                  */
/*   1. OL ebooks[].read_url  (direct borrow/read on archive.org)             */
/*   2. OL ebooks[].preview_url                                               */
/*   3. Internet Archive full-text search by ISBN                             */
/*   4. Internet Archive full-text search by title+author                     */
/*   5. Open Library book page (always exists)                                */
/* ─────────────────────────────────────────────────────────────────────────── */
async function resolveReadLink(book) {
  const cleanIsbn = book.isbn ? book.isbn.replace(/-/g, "") : null;

  // ── 1 & 2: OL Books API ──────────────────────────────────────────────────
  if (cleanIsbn) {
    try {
      const res = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (res.ok) {
        const data = await res.json();
        const entry = data[`ISBN:${cleanIsbn}`];
        if (entry?.ebooks?.length) {
          if (entry.ebooks[0].read_url)
            return { url: entry.ebooks[0].read_url, type: "read" };
          if (entry.ebooks[0].preview_url)
            return { url: entry.ebooks[0].preview_url, type: "preview" };
        }
      }
    } catch {}
  }

  // ── 3: Internet Archive by ISBN ───────────────────────────────────────────
  if (cleanIsbn) {
    try {
      const iaRes = await fetch(
        `https://archive.org/advancedsearch.php?q=isbn:${cleanIsbn}+AND+mediatype:texts&fl[]=identifier&rows=1&output=json`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (iaRes.ok) {
        const iaData = await iaRes.json();
        const id = iaData?.response?.docs?.[0]?.identifier;
        if (id)
          return { url: `https://archive.org/details/${id}`, type: "archive" };
      }
    } catch {}
  }

  // ── 4: Internet Archive by title + author ─────────────────────────────────
  try {
    const q = encodeURIComponent(`"${book.title}" "${book.author}"`);
    const iaRes = await fetch(
      `https://archive.org/advancedsearch.php?q=${q}+AND+mediatype:texts&fl[]=identifier&rows=1&output=json`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (iaRes.ok) {
      const iaData = await iaRes.json();
      const id = iaData?.response?.docs?.[0]?.identifier;
      if (id)
        return { url: `https://archive.org/details/${id}`, type: "archive" };
    }
  } catch {}

  // ── 5: OL book page fallback ──────────────────────────────────────────────
  if (cleanIsbn) {
    return { url: `https://openlibrary.org/isbn/${cleanIsbn}`, type: "ol" };
  }
  const q = encodeURIComponent(`${book.title} ${book.author}`);
  return { url: `https://openlibrary.org/search?q=${q}`, type: "search" };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Fetch OL metadata (cover + description + subjects)                        */
/* ─────────────────────────────────────────────────────────────────────────── */
async function fetchOLMeta(book) {
  if (!book.isbn) return null;
  const cleanIsbn = book.isbn.replace(/-/g, "");
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (res.ok) {
      const data = await res.json();
      return data[`ISBN:${cleanIsbn}`] || null;
    }
  } catch {}
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Book Detail Modal                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */
function BookDetailModal({ book, onClose, onBorrow, borrowing }) {
  const [readInfo, setReadInfo] = useState(null); // { url, type }
  const [olData, setOlData] = useState(null);
  const [loading, setLoading] = useState(true);
  const color = GENRE_COLORS[book.genre] || "#7f8c8d";
  const available = book.available_copies > 0;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([fetchOLMeta(book), resolveReadLink(book)]).then(
      ([meta, link]) => {
        if (!cancelled) {
          setOlData(meta);
          setReadInfo(link);
          setLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [book]);

  // Best cover: OL large → OL medium → OL cover CDN by ISBN → placeholder
  const cleanIsbn = book.isbn ? book.isbn.replace(/-/g, "") : null;
  const coverUrl =
    olData?.cover?.large ||
    olData?.cover?.medium ||
    (cleanIsbn
      ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`
      : null) ||
    (book.cover?.startsWith("http") ? book.cover : null);

  const description = olData?.description
    ? typeof olData.description === "string"
      ? olData.description
      : olData.description?.value || book.description
    : book.description || "No description available.";

  const readLabel =
    {
      read: "📖 Read Now on Archive.org",
      preview: "👁️ Preview on Open Library",
      archive: "📚 Read on Internet Archive",
      ol: "🌐 View on Open Library",
      search: "🔍 Find on Open Library",
    }[readInfo?.type] || "🌐 Read / Find Online";

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="book-modal">
        <button
          className="book-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="book-modal-top">
          {/* ── Cover panel ── */}
          <div
            className="book-modal-cover-wrap"
            style={{
              background: `linear-gradient(160deg, ${color}18, ${color}38)`,
            }}
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={book.title}
                className="book-modal-cover-img"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="book-modal-cover-fallback"
              style={{ color, display: coverUrl ? "none" : "flex" }}
            >
              <span className="cover-fallback-icon">📚</span>
              <span className="cover-fallback-title">{book.title}</span>
              <span className="cover-fallback-author">{book.author}</span>
            </div>
            <span
              className="book-modal-genre-badge"
              style={{ background: color }}
            >
              {book.genre}
            </span>
          </div>

          {/* ── Info panel ── */}
          <div className="book-modal-info">
            <h2 className="book-modal-title">{book.title}</h2>
            <p className="book-modal-author">by {book.author}</p>

            {book.isbn && <p className="book-modal-isbn">ISBN: {book.isbn}</p>}

            <span className={`copies-badge ${available ? "avail" : "unavail"}`}>
              {available
                ? `${book.available_copies} of ${book.total_copies} copies available`
                : "All copies currently borrowed"}
            </span>

            <p className="book-modal-desc">{description}</p>

            {olData?.subjects?.length > 0 && (
              <div className="book-modal-subjects">
                {olData.subjects.slice(0, 6).map((s) => (
                  <span key={s.name || s} className="subject-tag">
                    {s.name || s}
                  </span>
                ))}
              </div>
            )}

            <div className="book-modal-actions">
              <button
                className={`borrow-btn modal-borrow ${!available ? "disabled" : ""}`}
                onClick={() => {
                  if (available) {
                    onBorrow(book);
                    onClose();
                  }
                }}
                disabled={!available || borrowing === book.id}
              >
                {borrowing === book.id
                  ? "Borrowing…"
                  : available
                    ? "📖 Borrow Book"
                    : "Not Available"}
              </button>

              {loading ? (
                <button className="read-btn loading" disabled>
                  Resolving link…
                </button>
              ) : (
                <a
                  href={readInfo?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`read-btn ${readInfo?.type === "read" || readInfo?.type === "archive" ? "direct" : ""}`}
                >
                  {readLabel}
                </a>
              )}
            </div>

            <p className="ol-attribution">
              Metadata &amp; links via{" "}
              <a
                href="https://openlibrary.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Library
              </a>{" "}
              &amp;{" "}
              <a
                href="https://archive.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                Internet Archive
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Book Card                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
function BookCard({ book, onBorrow, borrowing, onDetails }) {
  const color = GENRE_COLORS[book.genre] || "#7f8c8d";
  const available = book.available_copies > 0;
  const cleanIsbn = book.isbn ? book.isbn.replace(/-/g, "") : null;

  // Use OL cover CDN — portrait image, shown full
  const coverSrc = cleanIsbn
    ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`
    : null;

  const [coverLoaded, setCoverLoaded] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  return (
    <div className="book-card" onClick={() => onDetails(book)}>
      {/* ── Cover area — full portrait image ── */}
      <div
        className="book-cover-area"
        style={{
          background: `linear-gradient(160deg, ${color}18, ${color}40)`,
        }}
      >
        {coverSrc && !coverFailed ? (
          <>
            {!coverLoaded && (
              <div className="cover-placeholder" style={{ color }}>
                <span className="cover-ph-icon">📚</span>
              </div>
            )}
            <img
              src={coverSrc}
              alt={book.title}
              className={`book-cover-full ${coverLoaded ? "loaded" : ""}`}
              onLoad={() => setCoverLoaded(true)}
              onError={() => setCoverFailed(true)}
            />
          </>
        ) : (
          <div className="cover-placeholder" style={{ color }}>
            <span className="cover-ph-icon">📚</span>
            <span className="cover-ph-title">{book.title}</span>
          </div>
        )}
        <span className="book-genre-badge" style={{ background: color }}>
          {book.genre}
        </span>
      </div>

      {/* ── Info ── */}
      <div className="book-info">
        <h3 className="book-title" title={book.title}>
          {book.title}
        </h3>
        <p className="book-author">by {book.author}</p>
        {book.description && <p className="book-desc">{book.description}</p>}

        <div className="book-meta">
          <span className={`copies-badge ${available ? "avail" : "unavail"}`}>
            {available ? `${book.available_copies} available` : "Unavailable"}
          </span>
        </div>

        <div className="book-card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className={`borrow-btn ${!available ? "disabled" : ""}`}
            onClick={() => available && onBorrow(book)}
            disabled={!available || borrowing === book.id}
          >
            {borrowing === book.id
              ? "Borrowing…"
              : available
                ? "Borrow"
                : "Unavailable"}
          </button>
          <button className="read-online-btn" onClick={() => onDetails(book)}>
            🌐 Read
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  BookCatalog                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */
function BookCatalog({ token, user, onBorrow }) {
  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All");
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(null);
  const [toast, setToast] = useState(null);
  const [detailBook, setDetailBook] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (genre !== "All") params.set("genre", genre);
      const res = await fetch(`/api/books?${params}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          setBooks(await res.json());
        } else {
          showToast("Server returned invalid response.", "error");
        }
      } else {
        showToast("Failed to load books.", "error");
      }
    } catch (err) {
      showToast("Cannot connect to server. Please check your connection.", "error");
    } finally {
      setLoading(false);
    }
  }, [search, genre]);

  const fetchGenres = useCallback(async () => {
    try {
      const res = await fetch("/api/books/meta/genres");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          setGenres(await res.json());
        }
      }
    } catch (err) {
      console.error("Failed to fetch genres:", err);
    }
  }, []);

  useEffect(() => {
    fetchGenres();
  }, [fetchGenres]);
  useEffect(() => {
    const t = setTimeout(fetchBooks, 300);
    return () => clearTimeout(t);
  }, [fetchBooks]);

  const handleBorrow = async (book) => {
    setBorrowing(book.id);
    try {
      const res = await fetch(`/api/borrows/borrow/${book.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        showToast("Server error. Please try again.", "error");
        return;
      }
      
      const data = await res.json();
      if (res.ok) {
        showToast(`"${book.title}" borrowed! Due: ${data.borrow?.due_date}`);
        fetchBooks();
        onBorrow?.();
      } else {
        showToast(data.msg || "Failed to borrow.", "error");
      }
    } catch (err) {
      showToast("Cannot connect to server.", "error");
    } finally {
      setBorrowing(null);
    }
  };

  return (
    <div className="catalog-root">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      {detailBook && (
        <BookDetailModal
          book={detailBook}
          onClose={() => setDetailBook(null)}
          onBorrow={handleBorrow}
          borrowing={borrowing}
        />
      )}

      <div className="catalog-header">
        <div>
          <h1 className="page-title">Book Catalog</h1>
          <p className="page-sub">
            {books.length} book{books.length !== 1 ? "s" : ""} — click any card
            to read online
          </p>
        </div>
      </div>

      <div className="catalog-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by title, author, or ISBN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <button className="clear-btn" onClick={() => setSearch("")}>
              ✕
            </button>
          )}
        </div>

        <div className="genre-filters">
          <button
            className={`genre-chip ${genre === "All" ? "active" : ""}`}
            onClick={() => setGenre("All")}
          >
            All
          </button>
          {genres.map((g) => (
            <button
              key={g}
              className={`genre-chip ${genre === g ? "active" : ""}`}
              style={
                genre === g
                  ? {
                      background: GENRE_COLORS[g] || "#555",
                      borderColor: GENRE_COLORS[g] || "#555",
                      color: "#fff",
                    }
                  : {}
              }
              onClick={() => setGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="book-card skeleton" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No books found</h3>
          <p>Try a different search or genre filter.</p>
        </div>
      ) : (
        <div className="books-grid">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onBorrow={handleBorrow}
              borrowing={borrowing}
              onDetails={setDetailBook}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default BookCatalog;
