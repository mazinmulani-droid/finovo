import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { getApiBase } from "../api.js";

const AuthContext = createContext(null);

const TOKEN_KEY = "finovo_token";

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);

  const setToken = useCallback((t) => {
    setTokenState(t || "");
    if (t) {
      localStorage.setItem(TOKEN_KEY, t);
      localStorage.removeItem("finovo_logged_out");
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setUser(null);
      return;
    }
    const base = getApiBase();
    try {
      const res = await axios.get(`${base}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch {
      setUser(null);
      setToken("");
    }
  }, [token, setToken]);

  const logout = useCallback(() => {
    localStorage.setItem("finovo_logged_out", "1");
    setToken("");
    setUser(null);
  }, [setToken]);

  useEffect(() => {
    if (token) {
      refreshMe();
    } else if (!localStorage.getItem("finovo_logged_out")) {
      // Automatically log in with pre-configured credentials
      const base = getApiBase();
      axios
        .post(`${base}/auth/login`, {
          email: "mazin@finovo.com",
          password: "password123",
        })
        .then((res) => {
          if (res.data?.access_token) {
            setToken(res.data.access_token);
          }
        })
        .catch(() => {});
    }
  }, [token, refreshMe, setToken]);

  const value = useMemo(
    () => ({
      token,
      user,
      setToken,
      refreshMe,
      logout,
      authHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    }),
    [token, user, setToken, refreshMe, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
