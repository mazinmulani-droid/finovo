import React, { useState } from "react";
import axios from "axios";
import { getApiBase } from "../api.js";
import { useNavigate } from "react-router-dom";

const QUICK_PAIRS = [
  { a: "TCS.NS", b: "INFY.NS", label: "TCS vs Infosys" },
  { a: "HDFCBANK.NS", b: "ICICIBANK.NS", label: "HDFC vs ICICI" },
  { a: "RELIANCE.NS", b: "ONGC.NS", label: "Reliance vs ONGC" },
  { a: "SBIN.NS", b: "KOTAKBANK.NS", label: "SBI vs Kotak" },
];

export default function ComparePage() {
  const nav = useNavigate();
  const [a, setA] = useState("TCS.NS");
  const [b, setB] = useState("INFY.NS");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const base = getApiBase();

  function runComparison(symA = a, symB = b) {
    if (!symA.trim() || !symB.trim()) return;
    setLoading(true);
    setErr("");
    axios
      .get(`${base}/compare`, { params: { a: symA.trim().toUpperCase(), b: symB.trim().toUpperCase() } })
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }

  const handlePairClick = (pairA, pairB) => {
    setA(pairA);
    setB(pairB);
    runComparison(pairA, pairB);
  };

  const getMetric = (stockData, key) => {
    if (!stockData) return "—";
    if (key === "price") return stockData.ratios?.["Current Price"] ? `₹${Number(stockData.ratios["Current Price"]).toLocaleString()}` : "—";
    if (key === "pe") return stockData.ratios?.["P/E"] ?? "—";
    if (key === "roe") return stockData.ratios?.["ROE (%)"] ? `${stockData.ratios["ROE (%)"]}%` : "—";
    if (key === "mcap") return stockData.ratios?.["Market Cap (Cr)"] ? `₹${Number(stockData.ratios["Market Cap (Cr)"]).toLocaleString()} Cr` : "—";
    if (key === "de") return stockData.ratios?.["Debt/Equity"] ?? "—";
    if (key === "rsi") return stockData.technical_snapshot?.rsi ? Number(stockData.technical_snapshot.rsi).toFixed(1) : "—";
    if (key === "trend") return stockData.technical_snapshot?.trend ?? "—";
    return "—";
  };

  return (
    <div className="compare-dashboard page-pad">
      <header className="today-hero">
        <div className="today-hero-left">
          <div className="today-badge">
            <span className="live-pulse"></span>
            EQUITY BENCHMARKING
          </div>
          <h1 className="today-title">Head-to-Head Comparison</h1>
          <p className="today-subtitle">
            Side-by-side fundamentals, valuation multiples, technical health &amp; AI comparative breakdown.
          </p>
        </div>
      </header>

      {/* Compare Inputs */}
      <div className="card" style={{ marginBottom: "1.5rem", padding: "1.25rem 1.5rem" }}>
        <form
          className="form-row"
          onSubmit={(e) => {
            e.preventDefault();
            runComparison();
          }}
          style={{ alignItems: "center", gap: "1rem" }}
        >
          <input
            className="search-input"
            value={a}
            onChange={(e) => setA(e.target.value)}
            placeholder="Stock A (e.g. TCS.NS)"
          />
          <span style={{ fontWeight: 700, color: "var(--accent)" }}>VS</span>
          <input
            className="search-input"
            value={b}
            onChange={(e) => setB(e.target.value)}
            placeholder="Stock B (e.g. INFY.NS)"
          />
          <button type="submit" className="btn-add-stock" disabled={loading}>
            {loading ? "Comparing..." : "Compare"}
          </button>
        </form>

        <div className="watchlist-quick-chips" style={{ marginTop: "1rem" }}>
          <span className="quick-label">Popular pairs:</span>
          {QUICK_PAIRS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="chip-quick-add"
              onClick={() => handlePairClick(p.a, p.b)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {err && <div className="error-box" style={{ marginBottom: "1.25rem" }}>{err}</div>}
      {data?.error && <div className="error-box" style={{ marginBottom: "1.25rem" }}>{data.error}</div>}

      {/* Skeleton when loading */}
      {loading ? (
        <div className="skeleton-cards-grid">
          <div className="skeleton-box h-200" />
          <div className="skeleton-box h-200" />
        </div>
      ) : data?.a && data?.b ? (
        <>
          {/* AI Comparison Brief */}
          {data.ai_comparison && (
            <section className="card ai-brief-card" style={{ marginBottom: "1.5rem" }}>
              <div className="ai-brief-header">
                <span className="ai-spark">✨</span>
                <h3>AI Comparative Breakdown</h3>
              </div>
              <div className="ai-brief-content prose">
                {data.ai_comparison}
              </div>
            </section>
          )}

          {/* Side-by-Side Cards */}
          <div className="grid-two" style={{ marginBottom: "1.5rem" }}>
            {/* Card A */}
            <div className="card compare-stock-card">
              <div className="mwc-top" style={{ marginBottom: "1rem" }}>
                <div>
                  <h2 style={{ margin: "0 0 0.25rem 0", color: "#f8fafc" }}>{data.a.symbol}</h2>
                  <span className="muted">{data.a.company}</span>
                </div>
                <span className="mwc-verdict v-bull">{data.a.strategy_type || "Neutral"}</span>
              </div>

              <div className="metrics-compare-list">
                <div className="m-compare-row">
                  <span className="m-label">Current Price</span>
                  <span className="m-val highlight">{getMetric(data.a, "price")}</span>
                </div>
                <div className="m-compare-row">
                  <span className="m-label">P/E Ratio</span>
                  <span className="m-val">{getMetric(data.a, "pe")}</span>
                </div>
                <div className="m-compare-row">
                  <span className="m-label">ROE</span>
                  <span className="m-val">{getMetric(data.a, "roe")}</span>
                </div>
                <div className="m-compare-row">
                  <span className="m-label">Market Cap</span>
                  <span className="m-val">{getMetric(data.a, "mcap")}</span>
                </div>
                <div className="m-compare-row">
                  <span className="m-label">RSI (14)</span>
                  <span className="m-val">{getMetric(data.a, "rsi")}</span>
                </div>
                <div className="m-compare-row">
                  <span className="m-label">Trend Posture</span>
                  <span className="m-val">{getMetric(data.a, "trend")}</span>
                </div>
                <div className="m-compare-row">
                  <span className="m-label">Quant Score</span>
                  <span className="m-val" style={{ color: "var(--accent)", fontWeight: 700 }}>
                    {data.a.signal_score != null ? `${data.a.signal_score}/10` : "—"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn-add-stock"
                style={{ width: "100%", marginTop: "1.25rem", background: "rgba(56, 189, 248, 0.15)", border: "1px solid var(--accent)" }}
                onClick={() => nav(`/analyze?stock=${data.a.symbol}`)}
              >
                Open Full Analysis for {data.a.symbol} &rarr;
              </button>
            </div>

            {/* Card B */}
            <div className="card compare-stock-card">
              <div className="mwc-top" style={{ marginBottom: "1rem" }}>
                <div>
                  <h2 style={{ margin: "0 0 0.25rem 0", color: "#f8fafc" }}>{data.b.symbol}</h2>
                  <span className="muted">{data.b.company}</span>
                </div>
                <span className="mwc-verdict v-bull">{data.b.strategy_type || "Neutral"}</span>
              </div>

              <div className="metrics-compare-list">
                <div className="m-compare-row">
                  <span className="m-label">Current Price</span>
                  <span className="m-val highlight">{getMetric(data.b, "price")}</span>
                </div>
                <div className="m-compare-row">
                  <span className="m-label">P/E Ratio</span>
                  <span className="m-val">{getMetric(data.b, "pe")}</span>
                </div>
                <div className="m-compare-row">
                  <span className="m-label">ROE</span>
                  <span className="m-val">{getMetric(data.b, "roe")}</span>
                </div>
                <div className="m-compare-row">
                  <span className="m-label">Market Cap</span>
                  <span className="m-val">{getMetric(data.b, "mcap")}</span>
                </div>
                <div className="m-compare-row">
                  <span className="m-label">RSI (14)</span>
                  <span className="m-val">{getMetric(data.b, "rsi")}</span>
                </div>
                <div className="m-compare-row">
                  <span className="m-label">Trend Posture</span>
                  <span className="m-val">{getMetric(data.b, "trend")}</span>
                </div>
                <div className="m-compare-row">
                  <span className="m-label">Quant Score</span>
                  <span className="m-val" style={{ color: "var(--accent)", fontWeight: 700 }}>
                    {data.b.signal_score != null ? `${data.b.signal_score}/10` : "—"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn-add-stock"
                style={{ width: "100%", marginTop: "1.25rem", background: "rgba(56, 189, 248, 0.15)", border: "1px solid var(--accent)" }}
                onClick={() => nav(`/analyze?stock=${data.b.symbol}`)}
              >
                Open Full Analysis for {data.b.symbol} &rarr;
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="card empty-watchlist-card">
          <span className="empty-icon">⚖️</span>
          <h3>Select two tickers to compare</h3>
          <p>Choose any popular benchmark pair above or enter any two NSE tickers to compare fundamentals &amp; technicals.</p>
        </div>
      )}
    </div>
  );
}
