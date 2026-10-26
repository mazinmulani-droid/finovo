import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { getApiBase } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Link, useNavigate } from "react-router-dom";

export default function PortfolioPage() {
  const { token, authHeaders } = useAuth();
  const nav = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [sym, setSym] = useState("TCS.NS");
  const [qty, setQty] = useState("10");
  const [avg, setAvg] = useState("3200");
  const [err, setErr] = useState("");
  const base = getApiBase();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await axios.get(`${base}/portfolio/summary`, { headers: authHeaders });
      setSummary(r.data);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [base, token, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!sym.trim() || Number(qty) <= 0 || Number(avg) <= 0) return;
    setAdding(true);
    setErr("");
    try {
      await axios.post(
        `${base}/portfolio/holdings`,
        {
          symbol: sym.trim().toUpperCase(),
          quantity: Number(qty),
          avg_buy_price: Number(avg),
        },
        { headers: authHeaders }
      );
      setSym("");
      await load();
    } catch (e) {
      setErr(String(e.response?.data?.detail || e.message));
    } finally {
      setAdding(false);
    }
  }

  async function removeHolding(id) {
    if (!id) return;
    try {
      await axios.delete(`${base}/portfolio/holdings/${id}`, { headers: authHeaders });
      load();
    } catch (e) {
      setErr(String(e.response?.data?.detail || e.message));
    }
  }

  if (!token) {
    return (
      <div className="page-pad">
        <div className="panel error-box">
          <p>Please <Link to="/login" style={{ color: "var(--accent)" }}>log in</Link> to view and manage your portfolio.</p>
        </div>
      </div>
    );
  }

  const isProfitable = (summary?.total_pnl ?? 0) >= 0;

  return (
    <div className="portfolio-dashboard page-pad">
      <header className="today-hero">
        <div className="today-hero-left">
          <div className="today-badge">
            <span className="live-pulse"></span>
            EQUITY ASSETS
          </div>
          <h1 className="today-title">Portfolio Manager</h1>
          <p className="today-subtitle">
            Holdings breakdown, real-time unrealized returns &amp; quantitative AI health diagnostics.
          </p>
        </div>
        <div className="today-hero-right">
          <button type="button" className="btn-refresh" onClick={load} disabled={loading}>
            <span className="refresh-icon">🔄</span>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {err && <div className="error-box" style={{ marginBottom: "1.25rem" }}>{err}</div>}

      {/* KPI Cards */}
      {loading && !summary ? (
        <div className="skeleton-cards-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="skeleton-box h-120" />
          <div className="skeleton-box h-120" />
          <div className="skeleton-box h-120" />
        </div>
      ) : summary ? (
        <div className="grid-cards" style={{ marginBottom: "1.5rem" }}>
          <div className="card kpi-card">
            <div className="kpi-header">
              <span className="kpi-tag">TOTAL INVESTED</span>
              <span className="kpi-icon">💰</span>
            </div>
            <div className="kpi-main">
              <span className="opp-symbol">₹{Number(summary.total_invested || 0).toLocaleString()}</span>
            </div>
            <p className="kpi-desc">Initial capital cost basis</p>
          </div>

          <div className="card kpi-card">
            <div className="kpi-header">
              <span className="kpi-tag">CURRENT VALUE</span>
              <span className="kpi-icon">📈</span>
            </div>
            <div className="kpi-main">
              <span className="opp-symbol">₹{Number(summary.total_value || 0).toLocaleString()}</span>
            </div>
            <p className="kpi-desc">Live marked-to-market valuation</p>
          </div>

          <div className={`card kpi-card ${isProfitable ? "mood-bullish" : "mood-bearish"}`}>
            <div className="kpi-header">
              <span className="kpi-tag">NET UNREALIZED P&amp;L</span>
              <span className="kpi-icon">{isProfitable ? "🚀" : "🛡️"}</span>
            </div>
            <div className="kpi-main">
              <span className={`mood-text ${isProfitable ? "text-green" : "text-red"}`}>
                {isProfitable ? "+" : ""}₹{Number(summary.total_pnl || 0).toLocaleString()} ({summary.total_pnl_pct}%)
              </span>
            </div>
            <p className="kpi-desc">Total accumulated return across all positions</p>
          </div>
        </div>
      ) : null}

      {/* AI Health Snapshot */}
      {summary?.ai_summary && (
        <section className="card ai-brief-card" style={{ marginBottom: "1.5rem" }}>
          <div className="ai-brief-header">
            <span className="ai-spark">✨</span>
            <h3>Portfolio AI Diagnostics &amp; Risk Check</h3>
          </div>
          <div className="ai-brief-content prose">
            {summary.ai_summary}
          </div>
        </section>
      )}

      {/* Add Position Form */}
      <div className="card portfolio-add-card" style={{ marginBottom: "1.5rem" }}>
        <h3 className="section-title">Record New Holding</h3>
        <div className="form-row portfolio-inputs">
          <input
            className="search-input"
            value={sym}
            onChange={(e) => setSym(e.target.value)}
            placeholder="Symbol (e.g. TCS.NS)"
          />
          <input
            className="search-input"
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Quantity"
          />
          <input
            className="search-input"
            type="number"
            value={avg}
            onChange={(e) => setAvg(e.target.value)}
            placeholder="Avg Buy Price (₹)"
          />
          <button type="button" className="btn-add-stock" onClick={add} disabled={adding}>
            {adding ? "Saving..." : "+ Add Position"}
          </button>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="card holdings-card">
        <h3 className="section-title">Open Holdings ({summary?.positions?.length || 0})</h3>
        {(summary?.positions || []).length === 0 ? (
          <p className="muted empty-text" style={{ padding: "2rem 1rem", textAlign: "center" }}>
            No open holdings recorded. Add your first stock position above.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Quantity</th>
                  <th>Avg Buy (₹)</th>
                  <th>Market Value (₹)</th>
                  <th>Unrealized P&amp;L</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.positions || []).map((p) => {
                  const pnl = Number(p.pnl || 0);
                  const isPos = pnl >= 0;
                  return (
                    <tr key={p.id}>
                      <td>
                        <button
                          type="button"
                          className="table-sym-btn"
                          onClick={() => nav(`/analyze?stock=${p.symbol}`)}
                          title={`Analyze ${p.symbol}`}
                        >
                          <strong>{p.symbol}</strong>
                        </button>
                      </td>
                      <td>{p.quantity}</td>
                      <td>₹{Number(p.avg_buy_price).toLocaleString()}</td>
                      <td>₹{Number(p.market_value).toLocaleString()}</td>
                      <td>
                        <span className={`ticker-badge ${isPos ? "badge-green" : "badge-red"}`}>
                          {isPos ? "+" : ""}₹{pnl.toLocaleString()} ({p.pnl_pct}%)
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn-delete-row"
                          onClick={() => removeHolding(p.id)}
                          title="Remove holding"
                        >
                          &times; Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
