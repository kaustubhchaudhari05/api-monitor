
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
} from "lucide-react";
import "./App.css";

const API_BASE_URL = "http://localhost:3001";

function App() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [url, setUrl] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({ limit: "10", offset: "0" });

      if (statusFilter) {
        query.set("status", statusFilter);
      }

      const [statsResponse, historyResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/stats`),
        fetch(`${API_BASE_URL}/history?${query.toString()}`),
      ]);

      if (!statsResponse.ok || !historyResponse.ok) {
        throw new Error("Unable to load dashboard data.");
      }

      const statsJson = await statsResponse.json();
      const historyJson = await historyResponse.json();

      setStats(statsJson.data);
      setHistory(historyJson.data);
    } catch (err) {
      setError(
        "Could not connect to the backend. Check that your API Monitor server is running on port 3001."
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function checkApi(event) {
    event.preventDefault();
    setChecking(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/monitor?url=${encodeURIComponent(url.trim())}`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "The API check failed.");
      }

      setNotice(
        `Check completed: ${result.status} — ${result.responseTimeMs} ms`
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Activity size={22} /></div>
          <div>
            <strong>PulseMonitor</strong>
            <span>API OBSERVABILITY</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <div className="nav-item active"><Activity size={18} /> Overview</div>
        <div className="nav-item"><Server size={18} /> API history</div>

        <div className="sidebar-bottom">
          <span className="live-dot" />
          Local monitor
          <span className="online-label">ACTIVE</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">Workspace / Overview</div>
            <h1>API Monitoring</h1>
            <p className="subtitle">
              Monitor endpoints and track their reliability.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </header>

        {error && <div className="alert error-alert">{error}</div>}
        {notice && <div className="alert success-alert">{notice}</div>}

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
                <span className="stat-footnote">Based on recorded checks</span>
              </article>
            );
          })}
        </section>

        <section className="monitor-panel">
          <div className="section-heading">
            <div className="heading-icon"><Globe size={20} /></div>
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
            <button className="primary-button" type="submit" disabled={checking}>
              {checking ? (
                <><LoaderCircle size={17} className="spin" /> Checking...</>
              ) : (
                <><Activity size={17} /> Check API</>
              )}
            </button>
          </form>
        </section>

        <section className="history-panel">
          <div className="history-header">
            <div>
              <h2>Monitoring history</h2>
              <p>Recent endpoint checks and their results.</p>
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
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
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="endpoint-cell">
                        <span className="endpoint-icon"><Globe size={16} /></span>
                        <span className="endpoint-url" title={item.url}>
                          {item.url}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${item.status.toLowerCase()}`}>
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

                {!loading && history.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      No monitoring records found.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      Loading monitoring history...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <span>Showing {history.length} recent records</span>
            <button className="text-button" onClick={loadDashboard}>
              <RefreshCw size={14} /> Reload data
            </button>
          </div>
        </section>

        <footer className="footer">
          PulseMonitor <span>·</span> API Monitoring System
        </footer>
      </main>
    </div>
  );
}

export default App;
