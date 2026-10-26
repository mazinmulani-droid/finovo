import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { getApiBase } from "../api.js";
import AssistantPanel from "../components/AssistantPanel.jsx";

export default function HomePage() {
  const nav = useNavigate();
  const [data, setData] = useState(() => {
    try {
      const cached = sessionStorage.getItem("finovo_today_cache");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!data);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);

  const fetchSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!data) setLoading(true);
    setErr(null);

    const base = getApiBase();
    try {
      const url = `${base}/dashboard/daily-summary${isRefresh ? "?refresh=true" : ""}`;
      const res = await axios.get(url);
      setData(res.data);
      try {
        sessionStorage.setItem("finovo_today_cache", JSON.stringify(res.data));
      } catch {}
    } catch (e) {
      if (!data) {
        setErr(e.response?.data?.detail || e.message || "Failed to load market overview");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Mood badge styling helper
  const getMoodConfig = (mood = "") => {
    const m = mood.toLowerCase();
    if (m.includes("risk-on") || m.includes("bull")) {
      return {
        label: "Bullish (Risk-On)",
        icon: "📈",
        className: "mood-bullish",
        description: "Market breadth favors buyers. Higher probability for breakouts.",
      };
    }
    if (m.includes("cautious") || m.includes("bear")) {
      return {
        label: "Cautious (Risk-Off)",
        icon: "📉",
        className: "mood-bearish",
        description: "Defensive positioning observed. Exercise strict risk control.",
      };
    }
    return {
      label: "Neutral Momentum",
      icon: "⚖️",
      className: "mood-neutral",
      description: "Balanced index action. Selective stock-specific momentum.",
    };
  };

  const moodInfo = getMoodConfig(data?.market_mood);

  return (
    <div className="home-dashboard page-pad">
      {/* Hero Welcome Header */}
      <header className="today-hero">
        <div className="today-hero-left">
          <div className="today-badge">
            <span className="live-pulse"></span>
            LIVE MARKET INTELLIGENCE
          </div>
          <h1 className="today-title">Today&apos;s Market Brief</h1>
          <p className="today-subtitle">
            Algorithmic overview, momentum leaders, institutional flow &amp; AI insights.
          </p>
        </div>

        <div className="today-hero-right">
          <div className="date-chip">
            <span className="date-icon">📅</span>
            <span>{data?.day_key || new Date().toISOString().slice(0, 10)}</span>
          </div>
          <button
            type="button"
            className={`btn-refresh ${refreshing ? "spinning" : ""}`}
            onClick={() => fetchSummary(true)}
            disabled={refreshing}
            title="Refresh market data"
          >
            <span className="refresh-icon">🔄</span>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {/* Quick Navigation Shortcuts */}
      <div className="quick-nav-bar">
        <Link to="/analyze" className="quick-chip">
          🔍 Stock Analyzer
        </Link>
        <Link to="/intraday-scanner" className="quick-chip">
          ⚡ Intraday Scanner
        </Link>
        <Link to="/breakout-strategy" className="quick-chip">
          🎯 Breakout Strategy
        </Link>
        <Link to="/stock-prediction" className="quick-chip">
          🔮 Price Prediction
        </Link>
        <Link to="/watchlist" className="quick-chip">
          ⭐ Watchlist
        </Link>
        <Link to="/portfolio" className="quick-chip">
          💼 Portfolio
        </Link>
      </div>

      {loading && !data ? (
        <div className="today-skeleton">
          <div className="skeleton-cards-grid">
            <div className="skeleton-box h-120" />
            <div className="skeleton-box h-120" />
            <div className="skeleton-box h-120" />
          </div>
          <div className="skeleton-box h-80" />
          <div className="skeleton-two-col">
            <div className="skeleton-box h-200" />
            <div className="skeleton-box h-200" />
          </div>
          <div className="skeleton-box h-120" />
        </div>
      ) : err && !data ? (
        <div className="panel error-box">
          <h3>Failed to load market snapshot</h3>
          <p>{err}</p>
          <button type="button" onClick={() => fetchSummary(true)} className="btn-retry">
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <section className="grid-cards today-kpis">
            <div className={`card kpi-card mood-card ${moodInfo.className}`}>
              <div className="kpi-header">
                <span className="kpi-tag">MARKET MOOD</span>
                <span className="kpi-icon">{moodInfo.icon}</span>
              </div>
              <div className="kpi-main">
                <span className="mood-text">{moodInfo.label}</span>
              </div>
              <p className="kpi-desc">{moodInfo.description}</p>
            </div>

            <div className="card kpi-card opp-card">
              <div className="kpi-header">
                <span className="kpi-tag">TOP OPPORTUNITY</span>
                <span className="kpi-icon">🚀</span>
              </div>
              <div className="kpi-main">
                <span className="opp-symbol">
                  {data?.top_opportunity?.match(/([A-Z0-9.\-]+)\.?$/)?.[1] || "Momentum Pick"}
                </span>
              </div>
              <p className="kpi-desc">{data?.top_opportunity}</p>
              {data?.top_gainers?.[0]?.symbol && (
                <button
                  type="button"
                  className="kpi-action-btn"
                  onClick={() => nav(`/analyze?stock=${data.top_gainers[0].symbol}`)}
                >
                  Analyze {data.top_gainers[0].symbol} &rarr;
                </button>
              )}
            </div>

            <div className="card kpi-card risk-card">
              <div className="kpi-header">
                <span className="kpi-tag">PRIMARY RISK</span>
                <span className="kpi-icon">🛡️</span>
              </div>
              <div className="kpi-main">
                <span className="risk-symbol">
                  {data?.top_risk?.match(/([A-Z0-9.\-]+)\.?$/)?.[1] || "Volatility Watch"}
                </span>
              </div>
              <p className="kpi-desc">{data?.top_risk}</p>
            </div>
          </section>

          {/* FII / DII Flow Card */}
          <section className="card fii-card">
            <div className="fii-header">
              <div className="fii-title-wrap">
                <span className="fii-icon">🏛️</span>
                <h3>Institutional Market Triggers (FII / DII)</h3>
              </div>
              <span className="fii-badge">Cash Market Flow</span>
            </div>
            <div className="fii-body">
              <p className="fii-content">{data?.fii_dii || "No institutional data recorded today."}</p>
            </div>
          </section>

          {/* Movers Grid */}
          <section className="grid-two movers-section">
            <div className="card mover-card gainers-card">
              <div className="mover-head">
                <div className="mover-title-wrap">
                  <span className="trend-dot gainer-dot"></span>
                  <h3>Top Benchmark Gainers</h3>
                </div>
                <span className="count-pill">{(data?.top_gainers || []).length} Stocks</span>
              </div>
              <div className="stock-ticker-list">
                {(data?.top_gainers || []).length === 0 ? (
                  <p className="muted empty-text">No active gainers in sample</p>
                ) : (
                  (data?.top_gainers || []).map((g) => (
                    <div
                      key={g.symbol}
                      className="ticker-item clickable"
                      onClick={() => nav(`/analyze?stock=${g.symbol}`)}
                      title={`Analyze ${g.symbol}`}
                    >
                      <div className="ticker-left">
                        <span className="ticker-sym">{g.symbol}</span>
                        {g.last && <span className="ticker-price">₹{g.last.toLocaleString()}</span>}
                      </div>
                      <div className="ticker-badge badge-green">
                        +{g.pct_change}% ▲
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card mover-card losers-card">
              <div className="mover-head">
                <div className="mover-title-wrap">
                  <span className="trend-dot loser-dot"></span>
                  <h3>Top Benchmark Losers</h3>
                </div>
                <span className="count-pill">{(data?.top_losers || []).length} Stocks</span>
              </div>
              <div className="stock-ticker-list">
                {(data?.top_losers || []).length === 0 ? (
                  <p className="muted empty-text">No active losers in sample</p>
                ) : (
                  (data?.top_losers || []).map((l) => (
                    <div
                      key={l.symbol}
                      className="ticker-item clickable"
                      onClick={() => nav(`/analyze?stock=${l.symbol}`)}
                      title={`Analyze ${l.symbol}`}
                    >
                      <div className="ticker-left">
                        <span className="ticker-sym">{l.symbol}</span>
                        {l.last && <span className="ticker-price">₹{l.last.toLocaleString()}</span>}
                      </div>
                      <div className="ticker-badge badge-red">
                        {l.pct_change}% ▼
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* AI Intelligence Brief */}
          <section className="card ai-brief-card">
            <div className="ai-brief-header">
              <span className="ai-spark">✨</span>
              <h3>Executive AI Market Brief</h3>
            </div>
            <div className="ai-brief-content prose">
              {data?.ai_summary}
            </div>
          </section>

          {/* Headlines Feed */}
          <section className="card headlines-card">
            <div className="headlines-header">
              <span className="headlines-icon">📰</span>
              <h3>Live Financial Headlines</h3>
            </div>
            <div className="news-feed-list">
              {(data?.headlines || []).length === 0 ? (
                <p className="muted empty-text">No news headlines available.</p>
              ) : (
                (data?.headlines || []).map((h, i) => (
                  <div key={i} className="news-feed-row">
                    <span className="news-bullet">▪</span>
                    <span className="news-text">{h}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <AssistantPanel />
        </>
      )}
    </div>
  );
}
