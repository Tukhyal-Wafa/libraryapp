import React, { useState, useEffect, useCallback } from "react";
import "./Dashboard.css";
import BookCatalog from "./BookCatalog";
import MyBorrows from "./MyBorrows";
import AdminPanel from "./AdminPanel";
import Charts from "./Charts";

function Dashboard({ authData, onLogout }) {
  const { token, user } = authData;
  const [tab, setTab] = useState("catalog");
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    if (user.role !== "admin") return;
    try {
      const res = await fetch("/api/borrows/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch {}
  }, [token, user.role]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const tabs = [
    { id: "catalog", label: "📚 Catalog", show: true },
    { id: "borrows", label: "📋 My Borrows", show: true },
    { id: "charts",  label: "📈 Analytics", show: user.role === "admin" },
    { id: "admin",   label: "⚙️ Admin", show: user.role === "admin" },
  ].filter((t) => t.show);

  return (
    <div className="dashboard-root">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">📖</span>
          <span className="brand-name">LibraryMS</span>
        </div>

        <nav className="sidebar-nav">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`nav-item ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {user.role === "admin" && stats && (
          <div className="sidebar-stats">
            <div className="stat-item">
              <span className="stat-val">{stats.totalBooks}</span>
              <span className="stat-lbl">Books</span>
            </div>
            <div className="stat-item">
              <span className="stat-val">{stats.totalUsers}</span>
              <span className="stat-lbl">Members</span>
            </div>
            <div className="stat-item">
              <span className="stat-val">{stats.activeBorrows}</span>
              <span className="stat-lbl">Borrowed</span>
            </div>
            {stats.overdue > 0 && (
              <div className="stat-item overdue">
                <span className="stat-val">{stats.overdue}</span>
                <span className="stat-lbl">Overdue</span>
              </div>
            )}
          </div>
        )}

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user.name?.[0]?.toUpperCase() || "U"}</div>
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.role}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        {tab === "catalog" && <BookCatalog token={token} user={user} onBorrow={fetchStats} />}
        {tab === "borrows" && <MyBorrows token={token} onReturn={fetchStats} />}
        {tab === "charts"  && user.role === "admin" && <Charts token={token} stats={stats} />}
        {tab === "admin"   && user.role === "admin" && (
          <AdminPanel token={token} stats={stats} onRefresh={fetchStats} />
        )}
      </main>
    </div>
  );
}

export default Dashboard;
