import React, { useState, useEffect, useCallback } from "react";
import "./MyBorrows.css";

function MyBorrows({ token, onReturn }) {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("active");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchBorrows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/borrows/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          setBorrows(await res.json());
        } else {
          showToast("Server returned invalid response.", "error");
        }
      } else {
        showToast("Failed to load borrows.", "error");
      }
    } catch (err) {
      showToast("Cannot connect to server.", "error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBorrows();
  }, [fetchBorrows]);

  const handleReturn = async (borrow) => {
    setReturning(borrow.id);
    try {
      const res = await fetch(`/api/borrows/return/${borrow.id}`, {
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
        showToast(`"${borrow.title}" returned successfully!`);
        fetchBorrows();
        onReturn?.();
      } else {
        showToast(data.msg || "Failed to return.", "error");
      }
    } catch (err) {
      showToast("Cannot connect to server.", "error");
    } finally {
      setReturning(null);
    }
  };

  const isOverdue = (dueDate, status) =>
    status === "active" && new Date(dueDate) < new Date();

  const filtered = borrows.filter((b) => {
    if (filter === "active") return b.status === "active";
    if (filter === "returned") return b.status === "returned";
    return true;
  });

  const activeCnt = borrows.filter((b) => b.status === "active").length;
  const overdueCnt = borrows.filter(
    (b) => b.status === "active" && isOverdue(b.due_date, b.status)
  ).length;

  return (
    <div className="borrows-root">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="borrows-header">
        <div>
          <h1 className="page-title">My Borrows</h1>
          <p className="page-sub">
            {activeCnt} active
            {overdueCnt > 0 && (
              <span className="overdue-badge"> · {overdueCnt} overdue</span>
            )}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        {["all", "active", "returned"].map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="tab-count">
              {f === "all"
                ? borrows.length
                : borrows.filter((b) => b.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="borrows-list">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="borrow-card skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No {filter === "all" ? "" : filter} borrows</h3>
          <p>
            {filter === "active"
              ? "You have no active borrows. Head to the catalog to borrow a book!"
              : "Nothing here yet."}
          </p>
        </div>
      ) : (
        <div className="borrows-list">
          {filtered.map((b) => {
            const overdue = isOverdue(b.due_date, b.status);
            return (
              <div
                key={b.id}
                className={`borrow-card ${overdue ? "overdue" : ""} ${b.status === "returned" ? "returned" : ""}`}
              >
                <div className="borrow-book-icon">📚</div>
                <div className="borrow-details">
                  <h3 className="borrow-title">{b.title}</h3>
                  <p className="borrow-author">by {b.author}</p>
                  <div className="borrow-meta">
                    <span className="meta-item">
                      📅 Borrowed: {new Date(b.borrowed_at).toLocaleDateString()}
                    </span>
                    <span className={`meta-item ${overdue ? "text-red" : ""}`}>
                      ⏰ Due: {new Date(b.due_date).toLocaleDateString()}
                      {overdue && " (OVERDUE)"}
                    </span>
                    {b.returned_at && (
                      <span className="meta-item text-green">
                        ✅ Returned: {new Date(b.returned_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="borrow-actions">
                  <span className={`status-pill ${b.status} ${overdue ? "overdue-pill" : ""}`}>
                    {overdue ? "Overdue" : b.status === "active" ? "Active" : "Returned"}
                  </span>
                  {b.status === "active" && (
                    <button
                      className="return-btn"
                      onClick={() => handleReturn(b)}
                      disabled={returning === b.id}
                    >
                      {returning === b.id ? "Returning…" : "Return"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyBorrows;
