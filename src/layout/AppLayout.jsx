import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <Link to="/" className="nav-brand">
          <span className="brand-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 17L9 11L13 15L21 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 7H21V11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="brand-text">Finovo</span>
          <span className="brand-version-badge">AI</span>
        </Link>

        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            Today
          </NavLink>
          <NavLink to="/analyze" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            Analyze
          </NavLink>
          <NavLink to="/watchlist" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            Watchlist
          </NavLink>
          <NavLink to="/alerts" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            Alerts
          </NavLink>
          <NavLink to="/portfolio" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            Portfolio
          </NavLink>
          <NavLink to="/compare" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            Compare
          </NavLink>
          <NavLink to="/breakout-strategy" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            Strategy
          </NavLink>
          <NavLink to="/intraday-scanner" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            Scanner
          </NavLink>
          <NavLink to="/stock-prediction" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            Prediction
          </NavLink>
          <NavLink to="/ai-recommendations" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            AI Picks
          </NavLink>
          <NavLink to="/intraday-picks" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            Intraday
          </NavLink>

          <span className="nav-divider"></span>

          {user ? (
            <div className="nav-user">
              <span className="user-avatar" title={user.email}>
                {user.email.charAt(0).toUpperCase()}
              </span>
              <span className="nav-email" title={user.email}>{user.email}</span>
              <button type="button" className="btn-logout" onClick={logout} title="Sign Out">
                Log out
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="nav-login-btn">Log in</NavLink>
          )}
        </div>
      </nav>
      <main className="main-area">
        <Outlet />
      </main>
    </div>
  );
}
