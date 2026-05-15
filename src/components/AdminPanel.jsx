import React, { useState, useEffect, useCallback } from "react";
import "./AdminPanel.css";
import Charts from "./Charts";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
const GENRE_OPTIONS = [
  "Fiction", "Dystopian", "Romance", "Fantasy", "Adventure",
  "Non-Fiction", "Self-Help", "Thriller", "Mystery", "Biography",
  "Science", "History", "General",
];

const EMPTY_BOOK = {
  title: "", author: "", genre: "General",
  isbn: "", description: "", total_copies: 1, cover: "",
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Sub-components                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

/** Stat card used in the overview */
function StatCard({ icon, label, value, accent }) {
  return (
    <div className="stat-card" style={{ borderTopColor: accent }}>
      <div className="sc-icon" style={{ color: accent }}>{icon}</div>
      <div className="sc-body">
        <span className="sc-val">{value ?? "—"}</span>
        <span className="sc-lbl">{label}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Book Form Modal                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */
function BookFormModal({ book, onClose, onSave, token }) {
  const isEdit = !!book?.id;
  const [form, setForm] = useState(book || EMPTY_BOOK);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.author.trim()) {
      setErr("Title and author are required.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const url = isEdit ? `/api/books/${book.id}` : "/api/books";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, total_copies: parseInt(form.total_copies) || 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Failed to save book.");
      onSave(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2>{isEdit ? "Edit Book" : "Add New Book"}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {err && <div className="form-error">{err}</div>}

        <div className="form-grid">
          <label className="form-label">
            Title *
            <input className="form-input" value={form.title}
              onChange={(e) => set("title", e.target.value)} placeholder="Book title" />
          </label>
          <label className="form-label">
            Author *
            <input className="form-input" value={form.author}
              onChange={(e) => set("author", e.target.value)} placeholder="Author name" />
          </label>
          <label className="form-label">
            Genre
            <select className="form-input" value={form.genre}
              onChange={(e) => set("genre", e.target.value)}>
              {GENRE_OPTIONS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </label>
          <label className="form-label">
            ISBN
            <input className="form-input" value={form.isbn}
              onChange={(e) => set("isbn", e.target.value)} placeholder="978-..." />
          </label>
          <label className="form-label">
            Total Copies
            <input className="form-input" type="number" min={1} value={form.total_copies}
              onChange={(e) => set("total_copies", e.target.value)} />
          </label>
          <label className="form-label">
            Cover URL
            <input className="form-input" value={form.cover}
              onChange={(e) => set("cover", e.target.value)} placeholder="https://..." />
          </label>
          <label className="form-label full-width">
            Description
            <textarea className="form-input form-textarea" value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Short description…" rows={3} />
          </label>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Book"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Confirm Dialog                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-box confirm-box">
        <div className="confirm-icon">⚠️</div>
        <p className="confirm-msg">{message}</p>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Books Tab                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
function BooksTab({ token, showToast }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editBook, setEditBook] = useState(null);   // null = closed, {} = new, book = edit
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?q=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/books${params}`);
      if (res.ok) setBooks(await res.json());
    } catch {
      showToast("Failed to load books.", "error");
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    const t = setTimeout(fetchBooks, 300);
    return () => clearTimeout(t);
  }, [fetchBooks]);

  const handleSave = (saved) => {
    setEditBook(null);
    showToast(saved.title + " saved successfully!");
    fetchBooks();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/books/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`"${deleteTarget.title}" deleted.`);
        fetchBooks();
      } else {
        showToast(data.msg || "Failed to delete.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="tab-content">
      {editBook !== null && (
        <BookFormModal
          book={editBook.id ? editBook : null}
          token={token}
          onClose={() => setEditBook(null)}
          onSave={handleSave}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.title}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="tab-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search books…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="clear-btn" onClick={() => setSearch("")}>✕</button>}
        </div>
        <button className="btn-primary" onClick={() => setEditBook({})}>
          + Add Book
        </button>
      </div>

      {loading ? (
        <div className="table-skeleton">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton-row" />)}
        </div>
      ) : books.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No books found</h3>
          <p>Try a different search or add a new book.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Genre</th>
                <th>ISBN</th>
                <th>Copies</th>
                <th>Available</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.id}>
                  <td className="td-title">{b.title}</td>
                  <td>{b.author}</td>
                  <td><span className="genre-pill">{b.genre}</span></td>
                  <td className="td-mono">{b.isbn || "—"}</td>
                  <td className="td-center">{b.total_copies}</td>
                  <td className="td-center">
                    <span className={`copies-badge ${b.available_copies > 0 ? "avail" : "unavail"}`}>
                      {b.available_copies}
                    </span>
                  </td>
                  <td className="td-actions">
                    <button className="action-btn edit" onClick={() => setEditBook(b)}>✏️ Edit</button>
                    <button
                      className="action-btn delete"
                      onClick={() => setDeleteTarget(b)}
                      disabled={deleting === b.id}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Users Tab                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
function UsersTab({ token, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [promoting, setPromoting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/borrows/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setUsers(await res.json());
    } catch {
      showToast("Failed to load users.", "error");
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handlePromote = async (user) => {
    const newRole = user.role === "admin" ? "member" : "admin";
    setPromoting(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`${user.name} is now ${newRole}.`);
        fetchUsers();
      } else {
        showToast(data.msg || "Failed to update role.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setPromoting(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`${deleteTarget.name} removed.`);
        fetchUsers();
      } else {
        showToast(data.msg || "Failed to delete user.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="tab-content">
      {deleteTarget && (
        <ConfirmDialog
          message={`Remove user "${deleteTarget.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="tab-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="clear-btn" onClick={() => setSearch("")}>✕</button>}
        </div>
        <span className="toolbar-count">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="table-skeleton">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton-row" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No users found</h3>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar-sm">{u.name?.[0]?.toUpperCase()}</div>
                      {u.name}
                    </div>
                  </td>
                  <td className="td-mono">{u.email}</td>
                  <td>
                    <span className={`role-pill ${u.role}`}>{u.role}</span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="td-actions">
                    <button
                      className={`action-btn ${u.role === "admin" ? "demote" : "promote"}`}
                      onClick={() => handlePromote(u)}
                      disabled={promoting === u.id}
                    >
                      {promoting === u.id
                        ? "…"
                        : u.role === "admin"
                        ? "↓ Demote"
                        : "↑ Promote"}
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => setDeleteTarget(u)}
                      disabled={deleting === u.id}
                    >
                      🗑️ Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Borrows Tab                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */
function BorrowsTab({ token, showToast }) {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [returning, setReturning] = useState(null);

  const fetchBorrows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/borrows/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setBorrows(await res.json());
    } catch {
      showToast("Failed to load borrows.", "error");
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => { fetchBorrows(); }, [fetchBorrows]);

  const handleReturn = async (borrow) => {
    setReturning(borrow.id);
    try {
      const res = await fetch(`/api/borrows/return/${borrow.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`"${borrow.title}" marked as returned.`);
        fetchBorrows();
      } else {
        showToast(data.msg || "Failed to return.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setReturning(null);
    }
  };

  const isOverdue = (b) => b.status === "active" && new Date(b.due_date) < new Date();

  const filtered = borrows.filter((b) => {
    const matchFilter =
      filter === "all" ? true :
      filter === "overdue" ? isOverdue(b) :
      b.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      b.title?.toLowerCase().includes(q) ||
      b.user_name?.toLowerCase().includes(q) ||
      b.user_email?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const counts = {
    all: borrows.length,
    active: borrows.filter((b) => b.status === "active").length,
    returned: borrows.filter((b) => b.status === "returned").length,
    overdue: borrows.filter(isOverdue).length,
  };

  return (
    <div className="tab-content">
      <div className="tab-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search by book or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="clear-btn" onClick={() => setSearch("")}>✕</button>}
        </div>
      </div>

      <div className="filter-tabs">
        {["all", "active", "returned", "overdue"].map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="tab-count">{counts[f]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="table-skeleton">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton-row" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No borrows found</h3>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Book</th>
                <th>User</th>
                <th>Borrowed</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const overdue = isOverdue(b);
                return (
                  <tr key={b.id} className={overdue ? "row-overdue" : ""}>
                    <td className="td-title">{b.title}</td>
                    <td>
                      <div className="user-cell-sm">
                        <span>{b.user_name}</span>
                        <span className="td-email">{b.user_email}</span>
                      </div>
                    </td>
                    <td>{new Date(b.borrowed_at).toLocaleDateString()}</td>
                    <td className={overdue ? "text-red" : ""}>
                      {new Date(b.due_date).toLocaleDateString()}
                      {overdue && " ⚠️"}
                    </td>
                    <td>
                      <span className={`status-pill ${overdue ? "overdue-pill" : b.status}`}>
                        {overdue ? "Overdue" : b.status === "active" ? "Active" : "Returned"}
                      </span>
                    </td>
                    <td className="td-actions">
                      {b.status === "active" && (
                        <button
                          className="action-btn edit"
                          onClick={() => handleReturn(b)}
                          disabled={returning === b.id}
                        >
                          {returning === b.id ? "…" : "↩ Return"}
                        </button>
                      )}
                      {b.returned_at && (
                        <span className="td-returned">
                          {new Date(b.returned_at).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Overview Tab                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function OverviewTab({ stats, token, showToast }) {
  const [recentBorrows, setRecentBorrows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/borrows/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const all = await res.json();
          setRecentBorrows(all.slice(0, 8));
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, [token]);

  return (
    <div className="tab-content">
      <div className="stats-grid">
        <StatCard icon="📚" label="Total Books" value={stats?.totalBooks} accent="#c8922a" />
        <StatCard icon="👥" label="Members" value={stats?.totalUsers} accent="#4f8ef7" />
        <StatCard icon="📖" label="Active Borrows" value={stats?.activeBorrows} accent="#27ae60" />
        <StatCard icon="⚠️" label="Overdue" value={stats?.overdue} accent="#e74c3c" />
        <StatCard icon="📊" label="Total Borrows" value={stats?.totalBorrows} accent="#9b59b6" />
      </div>

      <h3 className="section-title">Recent Activity</h3>
      {loading ? (
        <div className="table-skeleton">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton-row" />)}
        </div>
      ) : recentBorrows.length === 0 ? (
        <p className="muted">No borrow activity yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Book</th>
                <th>User</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBorrows.map((b) => {
                const overdue = b.status === "active" && new Date(b.due_date) < new Date();
                return (
                  <tr key={b.id}>
                    <td className="td-title">{b.title}</td>
                    <td>{b.user_name}</td>
                    <td>{new Date(b.borrowed_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-pill ${overdue ? "overdue-pill" : b.status}`}>
                        {overdue ? "Overdue" : b.status === "active" ? "Active" : "Returned"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main AdminPanel                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */
function AdminPanel({ token, stats, onRefresh }) {
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
    if (type === "success") onRefresh?.();
  }, [onRefresh]);

  const tabs = [
    { id: "overview", label: "📊 Overview" },
    { id: "charts",   label: "📈 Charts" },
    { id: "books",    label: "📚 Books" },
    { id: "users",    label: "👥 Users" },
    { id: "borrows",  label: "📋 Borrows" },
  ];

  return (
    <div className="admin-root">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="admin-header">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-sub">Manage books, users, and borrowing activity</p>
        </div>
      </div>

      <div className="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`admin-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab stats={stats} token={token} showToast={showToast} />}
      {tab === "charts"   && <Charts token={token} stats={stats} />}
      {tab === "books"    && <BooksTab token={token} showToast={showToast} />}
      {tab === "users"    && <UsersTab token={token} showToast={showToast} />}
      {tab === "borrows"  && <BorrowsTab token={token} showToast={showToast} />}
    </div>
  );
}

export default AdminPanel;
