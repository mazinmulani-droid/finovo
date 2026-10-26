import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { getApiBase } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Link, useNavigate } from "react-router-dom";

const ALERT_TYPE_LABELS = {
  price_above: "Price crosses above (₹)",
  price_below: "Price crosses below (₹)",
  rsi_above: "RSI crosses above",
  rsi_below: "RSI crosses below (Oversold)",
  verdict_changed: "Quantitative Verdict Changes",
  sentiment_changed: "News Sentiment Shifts",
};

export default function AlertsPage() {
  const { token, authHeaders } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState(null);
  const [sym, setSym] = useState("TCS.NS");
  const [atype, setAtype] = useState("rsi_below");
  const [thresh, setThresh] = useState("30");
  const base = getApiBase();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await axios.get(`${base}/alerts`, { headers: authHeaders });
      setRows(r.data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [base, token, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!sym.trim()) return;
    const threshold =
      atype.startsWith("rsi") || atype.startsWith("price")
        ? atype.includes("rsi")
          ? { rsi: Number(thresh) }
          : { price: Number(thresh) }
        : {};
    try {
      await axios.post(
        `${base}/alerts`,
        { symbol: sym.trim().toUpperCase(), alert_type: atype, threshold, active: true },
        { headers: authHeaders }
      );
      setNotice({ type: "success", text: `Alert registered for ${sym.toUpperCase()}!` });
      load();
    } catch (e) {
      setNotice({ type: "error", text: e.response?.data?.detail || e.message });
    }
  }

  async function toggleActive(r) {
    try {
      await axios.patch(
        `${base}/alerts/${r.id}`,
        { active: !r.active },
        { headers: authHeaders }
      );
      load();
    } catch (e) {
      setNotice({ type: "error", text: e.response?.data?.detail || e.message });
    }
  }

  async function deleteAlert(id) {
    try {
      await axios.delete(`${base}/alerts/${id}`, { headers: authHeaders });
      load();
    } catch (e) {
      setNotice({ type: "error", text: e.response?.data?.detail || e.message });
    }
  }

  async function checkNow() {
    setChecking(true);
    setNotice(null);
    try {
      const res = await axios.post(`${base}/alerts/check-now`, {}, { headers: authHeaders });
      const count = res.data.count || 0;
      setNotice({
        type: count > 0 ? "success" : "info",
        text: count > 0 ? `Triggered ${count} active alert condition(s)!` : "All monitored rules evaluated — no triggers.",
      });
      load();
    } catch (e) {
      setNotice({ type: "error", text: e.response?.data?.detail || e.message });
    } finally {
      setChecking(false);
    }
  }

  if (!token) {
    return (
      <div className="page-pad">
        <div className="panel error-box">
          <p>Please <Link to="/login" style={{ color: "var(--accent)" }}>log in</Link> to configure price &amp; technical alerts.</p>
        </div>
      </div>
    );
  }

  const needsThreshold = atype.startsWith("rsi") || atype.startsWith("price");

  return (
    <div className="alerts-dashboard page-pad">
      <header className="today-hero">
        <div className="today-hero-left">
          <div className="today-badge">
            <span className="live-pulse"></span>
            CONDITION MONITORS
          </div>
          <h1 className="today-title">Price &amp; Indicator Alerts</h1>
          <p className="today-subtitle">
            Configure automated technical condition triggers, RSI threshold monitors &amp; sentiment shifts.
          </p>
        </div>
        <div className="today-hero-right">
          <button
            type="button"
            className="btn-refresh"
            onClick={checkNow}
            disabled={checking}
          >
            <span className="refresh-icon">⚡</span>
            {checking ? "Scanning Rules..." : "Check Rules Now"}
          </button>
        </div>
      </header>

      {notice && (
        <div
          className={`card ${notice.type === "error" ? "error-box" : "ai-brief-card"}`}
          style={{ marginBottom: "1.25rem", padding: "0.85rem 1.25rem" }}
        >
          {notice.text}
        </div>
      )}

      {/* Create Alert Card */}
      <div className="card" style={{ marginBottom: "1.5rem", padding: "1.25rem 1.5rem" }}>
        <h3 className="section-title">Setup New Alert Rule</h3>
        <form
          className="form-row portfolio-inputs"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
          style={{ alignItems: "center" }}
        >
          <input
            className="search-input"
            value={sym}
            onChange={(e) => setSym(e.target.value)}
            placeholder="Symbol (e.g. TCS.NS)"
          />
          <select
            className="search-input"
            value={atype}
            onChange={(e) => {
              setAtype(e.target.value);
              if (e.target.value.includes("rsi")) setThresh("30");
              else if (e.target.value.includes("price")) setThresh("2500");
            }}
          >
            {Object.entries(ALERT_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          {needsThreshold && (
            <input
              className="search-input"
              type="number"
              value={thresh}
              onChange={(e) => setThresh(e.target.value)}
              placeholder="Threshold"
            />
          )}
          <button type="submit" className="btn-add-stock">
            + Create Alert
          </button>
        </form>
      </div>

      {/* Alerts Table */}
      <div className="card holdings-card">
        <h3 className="section-title">Active Alert Monitors ({rows.length})</h3>
        {loading ? (
          <div className="skeleton-cards-grid" style={{ padding: "1rem" }}>
            <div className="skeleton-box h-80" />
            <div className="skeleton-box h-80" />
          </div>
        ) : rows.length === 0 ? (
          <p className="muted empty-text" style={{ padding: "2rem 1rem", textAlign: "center" }}>
            No alert triggers configured. Setup an automated rule above.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Condition</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th>Last Triggered</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const threshVal = r.threshold?.price ?? r.threshold?.rsi ?? "—";
                  return (
                    <tr key={r.id}>
                      <td>
                        <button
                          type="button"
                          className="table-sym-btn"
                          onClick={() => nav(`/analyze?stock=${r.symbol}`)}
                          title={`Analyze ${r.symbol}`}
                        >
                          <strong>{r.symbol}</strong>
                        </button>
                      </td>
                      <td>{ALERT_TYPE_LABELS[r.alert_type] || r.alert_type}</td>
                      <td>
                        {threshVal !== "—" ? (
                          <span className="ticker-badge" style={{ background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8" }}>
                            {threshVal}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => toggleActive(r)}
                          className={`ticker-badge ${r.active ? "badge-green" : "badge-red"}`}
                          style={{ cursor: "pointer", border: "none" }}
                          title="Click to toggle"
                        >
                          {r.active ? "● ACTIVE" : "○ PAUSED"}
                        </button>
                      </td>
                      <td className="muted" style={{ fontSize: "0.85rem" }}>
                        {r.last_triggered_at ? new Date(r.last_triggered_at).toLocaleString() : "Never"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn-delete-row"
                          onClick={() => deleteAlert(r.id)}
                          title="Delete alert"
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
