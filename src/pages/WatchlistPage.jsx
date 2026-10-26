import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { getApiBase } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Link, useNavigate } from "react-router-dom";

const SUGGESTIONS = ["TCS.NS", "RELIANCE.NS", "INFY.NS", "HDFCBANK.NS", "SBIN.NS", "ITC.NS"];

export default function WatchlistPage() {
  const { token, authHeaders } = useAuth();
  const nav = useNavigate();
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [wid, setWid] = useState(null);
  const [symbol, setSymbol] = useState("");
  const [err, setErr] = useState("");

  const base = getApiBase();

  const loadCards = useCallback(async (watchlistId) => {
    if (!token || !watchlistId) return;
    setLoading(true);
    try {
      const r = await axios.get(`${base}/watchlists/${watchlistId}/cards`, { headers: authHeaders });
      setCards(r.data);
    } catch {
      setCards({ cards: [] });
    } finally {
      setLoading(false);
    }
  }, [base, token, authHeaders]);

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${base}/watchlists`, { headers: authHeaders })
      .then((r) => {
        setLists(r.data);
        if (r.data[0]) {
          setWid(r.data[0].id);
          loadCards(r.data[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch((e) => {
        setErr(String(e.response?.data?.detail || e.message));
        setLoading(false);
      });
  }, [token, authHeaders, base, loadCards]);

  const handleSelectWatchlist = (id) => {
    setWid(id);
    loadCards(id);
  };

  async function addSymbol(symToAdd) {
    const s = (symToAdd || symbol).trim().toUpperCase();
    if (!wid || !s) return;
    setAdding(true);
    setErr("");
    try {
      await axios.post(
        `${base}/watchlists/${wid}/items`,
        { symbol: s, pinned: false },
        { headers: authHeaders }
      );
      setSymbol("");
      await loadCards(wid);
    } catch (e) {
      setErr(String(e.response?.data?.detail || e.message));
    } finally {
      setAdding(false);
    }
  }

  async function removeSymbol(symToRemove, e) {
    e.stopPropagation();
    if (!wid || !symToRemove) return;
    try {
      await axios.delete(
        `${base}/watchlists/${wid}/items/${encodeURIComponent(symToRemove)}`,
        { headers: authHeaders }
      );
      loadCards(wid);
    } catch (e) {
      setErr(String(e.response?.data?.detail || e.message));
    }
  }

  if (!token) {
    return (
      <div className="page-pad">
        <div className="panel error-box">
          <p>Please <Link to="/login" style={{ color: "var(--accent)" }}>log in</Link> to view and manage your custom watchlists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="watchlist-dashboard page-pad">
      <header className="today-hero">
        <div className="today-hero-left">
          <div className="today-badge">
            <span className="live-pulse"></span>
            PORTFOLIO RADAR
          </div>
          <h1 className="today-title">Institutional Watchlist</h1>
          <p className="today-subtitle">
            Track key tickers, automated technical health checks &amp; quantitative setup verdicts.
          </p>
        </div>
        <div className="today-hero-right">
          {lists.length > 0 && (
            <select
              className="watchlist-select"
              value={wid ?? ""}
              onChange={(e) => handleSelectWatchlist(Number(e.target.value))}
            >
              {lists.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.item_count || 0})
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      {err && <div className="error-box" style={{ marginBottom: "1.25rem" }}>{err}</div>}

      {/* Add Symbol Bar */}
      <div className="watchlist-action-bar">
        <form
          className="watchlist-add-form"
          onSubmit={(e) => {
            e.preventDefault();
            addSymbol();
          }}
        >
          <input
            type="text"
            className="watchlist-input"
            placeholder="Add ticker e.g. TCS.NS, RELIANCE.NS..."
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />
          <button type="submit" className="btn-add-stock" disabled={adding || !symbol.trim()}>
            {adding ? "Adding..." : "+ Add Stock"}
          </button>
        </form>

        <div className="watchlist-quick-chips">
          <span className="quick-label">Suggestions:</span>
          {SUGGESTIONS.map((t) => (
            <button
              key={t}
              type="button"
              className="chip-quick-add"
              onClick={() => addSymbol(t)}
              disabled={adding}
            >
              +{t.replace(".NS", "")}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="skeleton-cards-grid" style={{ marginTop: "1.5rem" }}>
          <div className="skeleton-box h-200" />
          <div className="skeleton-box h-200" />
          <div className="skeleton-box h-200" />
        </div>
      ) : (cards?.cards || []).length === 0 ? (
        <div className="card empty-watchlist-card">
          <span className="empty-icon">⭐</span>
          <h3>Your watchlist is empty</h3>
          <p>Add stocks above or click one of the suggestion chips to start tracking live signals.</p>
        </div>
      ) : (
        <div className="watchlist-cards-grid">
          {(cards?.cards || []).map((c) => {
            const isBullish = (c.verdict || "").toLowerCase().includes("buy") || (c.verdict || "").toLowerCase().includes("bull");
            const isBearish = (c.verdict || "").toLowerCase().includes("sell") || (c.verdict || "").toLowerCase().includes("bear");

            return (
              <div
                key={c.symbol}
                className="card modern-watch-card clickable"
                onClick={() => nav(`/analyze?stock=${c.symbol}`)}
                title={`Click to analyze ${c.symbol}`}
              >
                <div className="mwc-top">
                  <div className="mwc-sym-wrap">
                    <span className="mwc-sym">{c.symbol}</span>
                    <span className="mwc-company">{c.company || "NSE Constituent"}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-remove-sym"
                    onClick={(e) => removeSymbol(c.symbol, e)}
                    title={`Remove ${c.symbol}`}
                  >
                    &times;
                  </button>
                </div>

                {c.error ? (
                  <p className="error-inline" style={{ marginTop: "1rem" }}>{c.error}</p>
                ) : (
                  <>
                    <div className="mwc-price-row">
                      <span className="mwc-price">
                        {c.current_price ? `₹${Number(c.current_price).toLocaleString()}` : "—"}
                      </span>
                      {c.verdict && (
                        <span className={`mwc-verdict ${isBullish ? "v-bull" : isBearish ? "v-bear" : "v-neutral"}`}>
                          {c.verdict}
                        </span>
                      )}
                    </div>

                    <div className="mwc-metrics">
                      <div className="mwc-metric-item">
                        <span className="m-label">RSI</span>
                        <span className={`m-val ${c.rsi > 70 ? "val-high" : c.rsi < 30 ? "val-low" : ""}`}>
                          {c.rsi ? Number(c.rsi).toFixed(1) : "—"}
                        </span>
                      </div>
                      <div className="mwc-metric-item">
                        <span className="m-label">Trend</span>
                        <span className="m-val">{c.trend || "Neutral"}</span>
                      </div>
                      <div className="mwc-metric-item">
                        <span className="m-label">Score</span>
                        <span className="m-val">{c.signal_score != null ? `${c.signal_score}/10` : "—"}</span>
                      </div>
                    </div>

                    {c.one_liner && (
                      <p className="mwc-note">{c.one_liner}</p>
                    )}

                    <div className="mwc-footer">
                      <span className="mwc-action-link">Open Full Analysis &rarr;</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
