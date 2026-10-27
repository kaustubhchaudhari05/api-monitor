
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock3,
  RefreshCw,
  Search,
  Globe,
  Server,
  LoaderCircle,
  LogOut,
  LockKeyhole,
  Mail,
} from "lucide-react";
import "./App.css";

const API_BASE_URL = "http://localhost:3001";
const TOKEN_KEY = "authToken";

function App() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem(TOKEN_KEY) || ""
  );
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [activePage, setActivePage] = useState("overview");
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [url, setUrl] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");

  const logout = useCallback((message = "") => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setStats(null);
    setHistory([]);
    setError("");
    setNotice("");
    setLoginError(message);
    setAuthReady(true);
  }, []);

  // Verify any session token when the app starts.
  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      if (!token) {
        setAuthReady(true);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          if (!cancelled) logout("Your session expired. Please log in again.");
          return;
        }

        const result = await response.json();

        if (!cancelled) {
          setUser(result.user);
          setAuthReady(true);
        }
      } catch {
        if (!cancelled) {
          setLoginError(
            "Cannot connect to the backend. Please start the API server."
          );
          setAuthReady(true);
        }
      }
    }

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Login failed.");
      }

      sessionStorage.setItem(TOKEN_KEY, result.token);
      setUser(result.user);
      setPassword("");
      setToken(result.token);
      setAuthReady(true);
    } catch (err) {
      setLoginError(
        err.message || "Unable to log in. Check your backend connection."
      );
    } finally {
      setLoggingIn(false);
    }
  }

  const apiFetch = useCallback(
    async (url, options = {}) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        logout("Your session expired. Please log in again.");
        throw new Error("Your session has expired. Please log in again.");
      }

      return response;
    },
    [token, logout]
  );

  const loadDashboard = useCallback(async () => {
    if (!token || !authReady || !user) return;

    setLoading(true);
    setError("");

    try {
      const limit = 10;
      const offset = (page - 1) * limit;
      const query = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      if (statusFilter) query.set("status", statusFilter);

      const requests = [
        apiFetch(`${API_BASE_URL}/history?${query.toString()}`),
      ];

      if (activePage === "overview") {
        requests.push(apiFetch(`${API_BASE_URL}/stats`));
      }

      const responses = await Promise.all(requests);

      for (const response of responses) {
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.message || "Unable to load dashboard data.");
        }
      }

      const historyJson = await responses[0].json();
      setHistory(historyJson.data ?? []);

      if (activePage === "overview") {
        const statsJson = await responses[1].json();
        setStats(statsJson.data);
      }
    } catch (err) {
      if (err.message !== "Your session has expired. Please log in again.") {
        setError(
          err.message ||
            "Could not connect to the backend. Make sure it is running on port 3001."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [token, authReady, user, activePage, statusFilter, page, apiFetch]);

  useEffect(() => {
    if (authReady && token && user) {
      loadDashboard();
    }
  }, [authReady, token, user, loadDashboard]);

  async function checkApi(event) {
    event.preventDefault();
    setChecking(true);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch(
        `${API_BASE_URL}/monitor?url=${encodeURIComponent(url.trim())}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "The API check failed.");
      }

      setNotice(
        `Check completed: ${result.status} — ${
          result.responseTimeMs ?? "N/A"
        } ms`
      );

      setUrl("");
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Unable to run the API check.");
    } finally {
      setChecking(false);
    }
  }

  const cards = [
    {
      label: "Total checks",
      value: stats?.total_checks ?? "—",
      icon: Activity,
      tone: "blue",
    },
    {
      label: "Uptime",
      value:
        stats?.uptime_percentage == null
          ? "—"
          : `${stats.uptime_percentage}%`,
      icon: CheckCircle2,
      tone: "green",
    },
    {
      label: "Failed checks",
      value: stats?.failed_checks ?? "—",
      icon: XCircle,
      tone: "red",
    },
    {
      label: "Avg. response time",
      value:
        stats?.average_response_time_ms == null
          ? "—"
          : `${stats.average_response_time_ms} ms`,
      icon: Clock3,
      tone: "purple",
    },
  ];

  function renderHistoryTable() {
    return (
      <section className="history-panel">
        <div className="history-header">
          <div>
            <h2>Monitoring history</h2>
            <p>Review recorded API checks and their results.</p>
          </div>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter history by status"
          >
            <option value="">All statuses</option>
            <option value="UP">UP</option>
            <option value="DOWN">DOWN</option>
            <option value="DEGRADED">DEGRADED</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Status</th>
                <th>HTTP code</th>
                <th>Response time</th>
                <th>Checked at</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="endpoint-cell">
                        <span className="endpoint-icon">
                          <Globe size={16} />
                        </span>
                        <span className="endpoint-url" title={item.url}>
                          {item.url}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${(
                          item.status ?? "unknown"
                        ).toLowerCase()}`}
                      >
                        <span className="status-dot" />
                        {item.status}
                      </span>
                    </td>
                    <td>{item.status_code ?? "—"}</td>
                    <td>
                      {item.response_time_ms == null
                        ? "—"
                        : `${item.response_time_ms} ms`}
                    </td>
                    <td>{new Date(item.checked_at).toLocaleString()}</td>
                  </tr>
                ))}

              {loading && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    Loading monitoring history...
                  </td>
                </tr>
              )}

              {!loading && history.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No monitoring records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span>
            Showing {history.length} records on page {page}
          </span>
          <div className="pagination-controls">
            <button
              className="text-button"
              disabled={page === 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <span className="page-number">Page {page}</span>
            <button
              className="text-button"
              disabled={history.length < 10 || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!authReady) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <LoaderCircle className="spin" size={28} />
          <p>Verifying your session...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="auth-page">
        <form className="auth-card" onSubmit={handleLogin}>
          <div className="auth-brand-icon">
            <Activity size={28} />
          </div>
          <p className="auth-eyebrow">PULSEMONITOR</p>
          <h1>Welcome back</h1>
          <p className="auth-description">
            Sign in to monitor your APIs and review their reliability.
          </p>

          {loginError && (
            <div className="alert error-alert">{loginError}</div>
          )}

          <label htmlFor="login-email">Email address</label>
          <div className="auth-input-wrap">
            <Mail size={18} />
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <label htmlFor="login-password">Password</label>
          <div className="auth-input-wrap">
            <LockKeyhole size={18} />
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button
            className="primary-button auth-submit"
            type="submit"
            disabled={loggingIn}
          >
            {loggingIn ? (
              <>
                <LoaderCircle size={17} className="spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>

          <p className="auth-footnote">
            Secure access to your API monitoring dashboard.
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Activity size={22} />
          </div>
          <div>
            <strong>PulseMonitor</strong>
            <span>API OBSERVABILITY</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <button
          className={`nav-item ${activePage === "overview" ? "active" : ""}`}
          onClick={() => setActivePage("overview")}
        >
          <Activity size={18} />
          Overview
        </button>

        <button
          className={`nav-item ${activePage === "history" ? "active" : ""}`}
          onClick={() => setActivePage("history")}
        >
          <Server size={18} />
          API history
        </button>

        <div className="sidebar-bottom">
          <span className="live-dot" />
          Local monitor
          <span className="online-label">ACTIVE</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              Workspace /{" "}
              {activePage === "overview" ? "Overview" : "API History"}
            </div>
            <h1>
              {activePage === "overview" ? "API Monitoring" : "API History"}
            </h1>
            <p className="subtitle">
              {activePage === "overview"
                ? "Monitor endpoints and track their reliability."
                : "Review, filter, and inspect your recorded API checks."}
            </p>
          </div>

          <div className="account-actions">
            <div className="account-info">
              <strong>{user.email}</strong>
              <span>{user.role}</span>
            </div>
            <button
              className="refresh-button"
              onClick={() => logout()}
              title="Sign out"
            >
              <LogOut size={16} />
              Logout
            </button>
            <button
              className="refresh-button"
              onClick={loadDashboard}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={loading ? "spin" : ""}
              />
              Refresh
            </button>
          </div>
        </header>

        {error && <div className="alert error-alert">{error}</div>}
        {notice && <div className="alert success-alert">{notice}</div>}

        {activePage === "overview" && (
          <>
            <section className="stats-grid">
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <article className="stat-card" key={card.label}>
                    <div className={`stat-icon ${card.tone}`}>
                      <Icon size={20} />
                    </div>
                    <p>{card.label}</p>
                    <div className="stat-value">{card.value}</div>
                    <span className="stat-footnote">
                      Based on recorded checks
                    </span>
                  </article>
                );
              })}
            </section>

            <section className="monitor-panel">
              <div className="section-heading">
                <div className="heading-icon">
                  <Globe size={20} />
                </div>
                <div>
                  <h2>Run a new check</h2>
                  <p>Enter an endpoint URL to check its availability.</p>
                </div>
              </div>

              <form className="monitor-form" onSubmit={checkApi}>
                <div className="url-input-wrap">
                  <Search size={18} />
                  <input
                    type="url"
                    placeholder="https://api.example.com/health"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    required
                  />
                </div>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={checking}
                >
                  {checking ? (
                    <>
                      <LoaderCircle size={17} className="spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Activity size={17} />
                      Check API
                    </>
                  )}
                </button>
              </form>
            </section>

            {renderHistoryTable()}
          </>
        )}

        {activePage === "history" && renderHistoryTable()}

        <footer className="footer">
          PulseMonitor <span>·</span> API Monitoring System
        </footer>
      </main>
    </div>
  );
}

export default App;
