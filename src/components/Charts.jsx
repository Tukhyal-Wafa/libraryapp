import React, { useState, useEffect, useCallback } from "react";
import "./Charts.css";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Pure-SVG chart primitives — zero dependencies                             */
/* ─────────────────────────────────────────────────────────────────────────── */

const PALETTE = [
  "#c8922a", "#4f8ef7", "#27ae60", "#9b59b6", "#e74c3c",
  "#16a085", "#e67e22", "#2980b9", "#e91e8c", "#f39c12",
  "#1abc9c", "#8e44ad",
];

/* ── Bar Chart ────────────────────────────────────────────────────────────── */
function BarChart({ data, title, valueKey = "value", labelKey = "label", color = "#c8922a" }) {
  if (!data || data.length === 0) return <div className="chart-empty">No data</div>;
  const max = Math.max(...data.map((d) => d[valueKey])) || 1;
  const W = 560, H = 220, PAD = 48, BAR_GAP = 8;
  const barW = Math.max(16, Math.floor((W - PAD * 2 - BAR_GAP * (data.length - 1)) / data.length));
  const totalW = data.length * barW + (data.length - 1) * BAR_GAP;
  const startX = (W - totalW) / 2;

  return (
    <div className="chart-wrap">
      <h3 className="chart-title">{title}</h3>
      <svg viewBox={`0 0 ${W} ${H + 60}`} className="chart-svg">
        {/* Y grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PAD + (1 - t) * (H - PAD);
          return (
            <g key={t}>
              <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#e0d5c5" strokeWidth="1" />
              <text x={PAD - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#a09080">
                {Math.round(t * max)}
              </text>
            </g>
          );
        })}
        {/* Bars */}
        {data.map((d, i) => {
          const barH = Math.max(2, ((d[valueKey] / max) * (H - PAD)));
          const x = startX + i * (barW + BAR_GAP);
          const y = PAD + (H - PAD) - barH;
          const c = Array.isArray(color) ? color[i % color.length] : color;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx="4" fill={c} opacity="0.88" />
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill={c}>
                {d[valueKey]}
              </text>
              <text
                x={x + barW / 2} y={H + 16}
                textAnchor="middle" fontSize="10" fill="#7a5c2e"
                transform={`rotate(-30, ${x + barW / 2}, ${H + 16})`}
              >
                {String(d[labelKey]).length > 10 ? String(d[labelKey]).slice(0, 10) + "…" : d[labelKey]}
              </text>
            </g>
          );
        })}
        {/* X axis */}
        <line x1={PAD} y1={H} x2={W - PAD} y2={H} stroke="#d4c4a8" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

/* ── Pie / Donut Chart ────────────────────────────────────────────────────── */
function PieChart({ data, title, valueKey = "value", labelKey = "label" }) {
  const [hovered, setHovered] = useState(null);
  if (!data || data.length === 0) return <div className="chart-empty">No data</div>;

  const total = data.reduce((s, d) => s + d[valueKey], 0) || 1;
  const R = 80, CX = 120, CY = 110, INNER = 44;

  let cumAngle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const angle = (d[valueKey] / total) * 2 * Math.PI;
    const start = cumAngle;
    cumAngle += angle;
    const end = cumAngle;
    const x1 = CX + R * Math.cos(start), y1 = CY + R * Math.sin(start);
    const x2 = CX + R * Math.cos(end),   y2 = CY + R * Math.sin(end);
    const xi1 = CX + INNER * Math.cos(start), yi1 = CY + INNER * Math.sin(start);
    const xi2 = CX + INNER * Math.cos(end),   yi2 = CY + INNER * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${xi1} ${yi1} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${INNER} ${INNER} 0 ${large} 0 ${xi1} ${yi1} Z`;
    const midAngle = start + angle / 2;
    return { path, color: PALETTE[i % PALETTE.length], midAngle, ...d, index: i };
  });

  return (
    <div className="chart-wrap">
      <h3 className="chart-title">{title}</h3>
      <div className="pie-layout">
        <svg viewBox="0 0 240 220" className="pie-svg">
          {slices.map((s) => (
            <path
              key={s.index}
              d={s.path}
              fill={s.color}
              opacity={hovered === s.index ? 1 : 0.82}
              stroke="#fff"
              strokeWidth="2"
              style={{ cursor: "pointer", transition: "opacity 0.15s" }}
              onMouseEnter={() => setHovered(s.index)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {/* Center label */}
          <text x={CX} y={CY - 6} textAnchor="middle" fontSize="18" fontWeight="800" fill="#1a0a00">
            {hovered !== null ? slices[hovered][valueKey] : total}
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize="10" fill="#7a5c2e">
            {hovered !== null ? String(slices[hovered][labelKey]).slice(0, 12) : "total"}
          </text>
        </svg>
        <div className="pie-legend">
          {slices.map((s) => (
            <div
              key={s.index}
              className={`legend-item ${hovered === s.index ? "hovered" : ""}`}
              onMouseEnter={() => setHovered(s.index)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="legend-dot" style={{ background: s.color }} />
              <span className="legend-label">{s[labelKey]}</span>
              <span className="legend-val">{s[valueKey]}</span>
              <span className="legend-pct">({((s[valueKey] / total) * 100).toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Line Chart ───────────────────────────────────────────────────────────── */
function LineChart({ data, title, valueKey = "value", labelKey = "label", color = "#c8922a" }) {
  if (!data || data.length === 0) return <div className="chart-empty">No data</div>;
  const W = 560, H = 200, PAD = 48;
  const max = Math.max(...data.map((d) => d[valueKey])) || 1;
  const pts = data.map((d, i) => {
    const x = PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
    const y = PAD + (1 - d[valueKey] / max) * (H - PAD);
    return { x, y, ...d };
  });
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `M ${pts[0].x} ${H} ` + pts.map((p) => `L ${p.x} ${p.y}`).join(" ") + ` L ${pts[pts.length - 1].x} ${H} Z`;

  return (
    <div className="chart-wrap">
      <h3 className="chart-title">{title}</h3>
      <svg viewBox={`0 0 ${W} ${H + 40}`} className="chart-svg">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PAD + (1 - t) * (H - PAD);
          return (
            <g key={t}>
              <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#e0d5c5" strokeWidth="1" strokeDasharray="4 3" />
              <text x={PAD - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#a09080">
                {Math.round(t * max)}
              </text>
            </g>
          );
        })}
        {/* Area fill */}
        <path d={area} fill={color} opacity="0.1" />
        {/* Line */}
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots + labels */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="#fff" strokeWidth="2" />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
              {p[valueKey]}
            </text>
            <text x={p.x} y={H + 16} textAnchor="middle" fontSize="10" fill="#7a5c2e"
              transform={`rotate(-30, ${p.x}, ${H + 16})`}>
              {String(p[labelKey]).length > 8 ? String(p[labelKey]).slice(0, 8) + "…" : p[labelKey]}
            </text>
          </g>
        ))}
        <line x1={PAD} y1={H} x2={W - PAD} y2={H} stroke="#d4c4a8" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Charts Tab — main component                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function Charts({ token, stats }) {
  const [books, setBooks]   = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [booksRes, borrowsRes] = await Promise.all([
        fetch("/api/books"),
        fetch("/api/borrows/all", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (booksRes.ok)   setBooks(await booksRes.json());
      if (borrowsRes.ok) setBorrows(await borrowsRes.json());
    } catch {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Derived data ── */

  // Books per genre
  const genreMap = {};
  books.forEach((b) => { genreMap[b.genre] = (genreMap[b.genre] || 0) + 1; });
  const genreData = Object.entries(genreMap)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Available vs borrowed per genre
  const availMap = {}, borrowedMap = {};
  books.forEach((b) => {
    availMap[b.genre]    = (availMap[b.genre]    || 0) + b.available_copies;
    borrowedMap[b.genre] = (borrowedMap[b.genre] || 0) + (b.total_copies - b.available_copies);
  });

  // Top 8 most borrowed books
  const borrowCountMap = {};
  borrows.forEach((b) => { borrowCountMap[b.title] = (borrowCountMap[b.title] || 0) + 1; });
  const topBooks = Object.entries(borrowCountMap)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Borrows by month (last 6 months)
  const now = new Date();
  const monthMap = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    monthMap[key] = 0;
  }
  borrows.forEach((b) => {
    const d = new Date(b.borrowed_at);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    if (key in monthMap) monthMap[key]++;
  });
  const monthData = Object.entries(monthMap).map(([label, value]) => ({ label, value }));

  // Borrow status breakdown
  const activeCount   = borrows.filter((b) => b.status === "active" && new Date(b.due_date) >= new Date()).length;
  const overdueCount  = borrows.filter((b) => b.status === "active" && new Date(b.due_date) < new Date()).length;
  const returnedCount = borrows.filter((b) => b.status === "returned").length;
  const statusData = [
    { label: "Active",   value: activeCount },
    { label: "Returned", value: returnedCount },
    { label: "Overdue",  value: overdueCount },
  ].filter((d) => d.value > 0);

  // Copies availability
  const totalCopies     = books.reduce((s, b) => s + b.total_copies, 0);
  const availableCopies = books.reduce((s, b) => s + b.available_copies, 0);
  const copiesData = [
    { label: "Available", value: availableCopies },
    { label: "Borrowed",  value: totalCopies - availableCopies },
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="charts-root">
        <div className="charts-header">
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Loading chart data…</p>
        </div>
        <div className="charts-skeleton">
          {[...Array(4)].map((_, i) => <div key={i} className="chart-skeleton-box" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="charts-root">
      <div className="charts-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Visual overview of library activity</p>
        </div>
        <button className="btn-refresh" onClick={fetchData}>↻ Refresh</button>
      </div>

      {/* Summary row */}
      <div className="summary-row">
        {[
          { icon: "📚", label: "Total Books",    val: stats?.totalBooks    ?? books.length },
          { icon: "👥", label: "Members",        val: stats?.totalUsers    ?? "—" },
          { icon: "📖", label: "Active Borrows", val: stats?.activeBorrows ?? activeCount },
          { icon: "⚠️", label: "Overdue",        val: stats?.overdue       ?? overdueCount },
          { icon: "📊", label: "All-time Borrows", val: borrows.length },
        ].map((s) => (
          <div key={s.label} className="summary-card">
            <span className="sum-icon">{s.icon}</span>
            <span className="sum-val">{s.val}</span>
            <span className="sum-lbl">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="charts-grid">
        <div className="chart-card wide">
          <LineChart
            data={monthData}
            title="Borrows Over Last 6 Months"
            color="#c8922a"
          />
        </div>

        <div className="chart-card wide">
          <BarChart
            data={genreData}
            title="Books by Genre"
            color={PALETTE}
          />
        </div>

        <div className="chart-card">
          <PieChart
            data={statusData}
            title="Borrow Status Breakdown"
          />
        </div>

        <div className="chart-card">
          <PieChart
            data={copiesData}
            title="Copy Availability"
          />
        </div>

        {topBooks.length > 0 && (
          <div className="chart-card wide">
            <BarChart
              data={topBooks}
              title="Most Borrowed Books"
              color="#4f8ef7"
            />
          </div>
        )}

        {genreData.length > 0 && (
          <div className="chart-card">
            <PieChart
              data={genreData}
              title="Genre Distribution"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Charts;
