import { useEffect, useState } from "react";
import { Activity, PackagePlus, ExternalLink, RefreshCw } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
type Order = {
  id: number;
  url: string;
  status: string;
  created_at: string;
  updated_at: string;
};
const api = import.meta.env.VITE_API_URL || "http://localhost:3000";
export default function App() {
  const [orders, setOrders] = useState<Order[]>([]),
    [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      const r = await fetch(api + "/api/orders");
      if (!r.ok) throw Error("API unavailable");
      setOrders(await r.json());
    } catch (e) {
      setError(String(e));
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(api + "/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!r.ok) throw Error((await r.json()).error || "Could not add link");
      setUrl("");
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const today = orders.filter(
      (o) =>
        new Date(o.created_at).toDateString() === new Date().toDateString(),
    ).length,
    active = orders.filter((o) => o.status === "ACTIVE").length;
  return (
    <main>
      <header>
        <div className="brand">
          <span className="logo">
            <Activity />
          </span>
          <div>
            <b>Grab Tracker</b>
            <small>ORDER INTELLIGENCE</small>
          </div>
        </div>
        <button className="refresh" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </header>
      <section className="welcome">
        <div>
          <p className="eyebrow">LIVE OVERVIEW</p>
          <h1>
            Your orders,
            <br />
            in good hands.
          </h1>
          <p>Track every delivery from one simple dashboard.</p>
        </div>
        <div className="orb">
          GRAB
          <br />
          TRACKER
        </div>
      </section>
      <section className="stats">
        <article>
          <span>ACTIVE ORDERS</span>
          <strong>{active}</strong>
          <small>Currently tracking</small>
        </article>
        <article>
          <span>ADDED TODAY</span>
          <strong>{today}</strong>
          <small>New tracking links</small>
        </article>
        <article>
          <span>ALL ORDERS</span>
          <strong>{orders.length}</strong>
          <small>In your dashboard</small>
        </article>
      </section>
      <section className="grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">ACTIVITY</p>
              <h2>Tracking activity</h2>
            </div>
            <span className="live">● LIVE</span>
          </div>
          <div className="chart">
            {orders.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={orders
                    .slice(0, 12)
                    .reverse()
                    .map((o, i) => ({ name: i + 1, value: i + 1 }))}
                >
                  <defs>
                    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#ea580c"
                        stopOpacity={0.35}
                      />
                      <stop offset="100%" stopColor="#ea580c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#ea580c"
                    fill="url(#fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Add an order to see activity</div>
            )}
          </div>
        </article>
        <article className="panel add-panel">
          <p className="eyebrow">NEW TRACKING LINK</p>
          <h2>Add an order</h2>
          <p>Paste your Grab share link to start tracking.</p>
          <form onSubmit={add}>
            <input
              type="url"
              required
              placeholder="https://app.grab.com/s/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button className="primary" disabled={busy}>
              <PackagePlus size={17} />
              {busy ? "Adding..." : "Track order"}
            </button>
          </form>
          {error && <p className="error">{error}</p>}
        </article>
      </section>
      <section className="panel orders">
        <div className="panel-head">
          <div>
            <p className="eyebrow">YOUR DELIVERY LIST</p>
            <h2>
              Orders <span className="count">{orders.length}</span>
            </h2>
          </div>
        </div>
        {orders.length ? (
          orders.map((o) => (
            <div className="order" key={o.id}>
              <span className={"dot " + (o.status === "ACTIVE" ? "on" : "")} />
              <div className="order-info">
                <b>{o.status === "ACTIVE" ? "Order in progress" : o.status}</b>
                <small>{new Date(o.created_at).toLocaleString()}</small>
              </div>
              <a href={o.url} target="_blank" rel="noreferrer">
                Open tracking <ExternalLink size={15} />
              </a>
            </div>
          ))
        ) : (
          <div className="empty">
            No orders yet. Add a Grab share link above.
          </div>
        )}
      </section>
      <footer>
        GRAB ORDER TRACKER <span>•</span> PERSONAL DELIVERY DASHBOARD
      </footer>
    </main>
  );
}
