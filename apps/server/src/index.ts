import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
export const isGrabUrl = (input: string) => {
  try {
    const u = new URL(input);
    return (
      u.protocol === "https:" &&
      u.username === "" &&
      u.password === "" &&
      !input.match(/^https:\/\/[^/]+:\d+/i) &&
      u.hash === "" &&
      ((u.hostname === "app.grab.com" &&
        /^\/s\/[A-Za-z0-9_-]+\/?$/.test(u.pathname) &&
        [...u.searchParams.keys()].every((key) => key === "shareOrderLink")) ||
        (u.hostname === "sharelocation.grab.com" &&
          /^\/o\/[A-Za-z0-9]+\/?$/.test(u.pathname) &&
          u.search === ""))
    );
  } catch {
    return false;
  }
};
export const isExpired = (created: string, now = Date.now()) =>
  now - new Date(created).getTime() >= 90 * 60 * 1000;
type Row = {
  id: number;
  url: string;
  token: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};
const dbDirectory = process.env.DB_PATH
  ? dirname(process.env.DB_PATH)
  : ".";
if (!existsSync(dbDirectory)) mkdirSync(dbDirectory, { recursive: true });
const db = new Database(process.env.DB_PATH || "orders.sqlite");
db.pragma("journal_mode = WAL");
db.exec(
  "CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY,url TEXT NOT NULL UNIQUE,token TEXT,status TEXT NOT NULL DEFAULT 'PENDING',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
);
const insert = db.prepare(
  "INSERT OR IGNORE INTO orders(url,token,status,created_at,updated_at) VALUES(?,?,'PENDING',?,?)",
);
const list = db.prepare(
  "SELECT id,url,status,created_at,updated_at FROM orders ORDER BY id DESC",
);
const update = db.prepare(
  "UPDATE orders SET token=?,status=?,updated_at=? WHERE id=?",
);
const get = db.prepare("SELECT * FROM orders WHERE id=?");
const app = Fastify({ logger: true });
await app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(",") || true,
});
const webDist = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../web/dist",
);
if (existsSync(webDist)) {
  await app.register(fastifyStatic, { root: webDist, wildcard: false });
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith("/api"))
      return reply.code(404).send({ error: "Not found" });
    return reply.sendFile("index.html");
  });
}
app.get("/health", async () => ({ ok: true }));
app.get("/api/orders", async () => list.all());
app.post<{ Body: { url?: string } }>("/api/orders", async (req, reply) => {
  if (!req.body?.url || !isGrabUrl(req.body.url))
    return reply.code(400).send({ error: "Invalid Grab share link" });
  const now = new Date().toISOString();
  insert.run(req.body.url, null, "PENDING", now, now);
  return reply.code(201).send({ ok: true });
});
app.get("/api/analytics", async () => ({
  active: (
    db.prepare("SELECT count(*) n FROM orders WHERE status='ACTIVE'").get() as {
      n: number;
    }
  ).n,
  today: (
    db
      .prepare(
        "SELECT count(*) n FROM orders WHERE date(created_at)=date('now','localtime')",
      )
      .get() as { n: number }
  ).n,
  total: (db.prepare("SELECT count(*) n FROM orders").get() as { n: number }).n,
}));
export async function pollOnce() {
  const orders = db
    .prepare("SELECT * FROM orders WHERE status IN ('PENDING','ACTIVE')")
    .all() as Row[];
  for (const order of orders) {
    if (isExpired(order.created_at)) {
      update.run(order.token, "EXPIRED", new Date().toISOString(), order.id);
      continue;
    }
    try {
      let token = order.token;
      if (!token) {
        const u = new URL(order.url);
        if (u.hostname === "sharelocation.grab.com")
          token =
            u.pathname.split("/")[2] || u.searchParams.get("shareOrderLink");
        else {
          const res = await fetch(order.url, {
            redirect: "manual",
            signal: AbortSignal.timeout(12000),
          });
          const dest = res.headers.get("location");
          if (dest && isGrabUrl(dest))
            token =
              new URL(dest).pathname.split("/")[2] ||
              new URL(dest).searchParams.get("shareOrderLink");
        }
      }
      if (!token) continue;
      const endpoint = `https://api.grab.com/api/v1/safety/sharemyride/${encodeURIComponent(token)}/bookingdetails?fullData=true`;
      const res = await fetch(endpoint, {
        headers: {
          Origin: "https://sharelocation.grab.com",
          Referer: `https://sharelocation.grab.com/o/${token}`,
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
        },
        signal: AbortSignal.timeout(12000),
      });
      if (res.status === 404) {
        update.run(token, "EXPIRED", new Date().toISOString(), order.id);
        continue;
      }
      if (!res.ok) continue;
      const data = (await res.json()) as { sessionStatus?: string };
      update.run(
        token,
        data.sessionStatus === "ACTIVE" ? "ACTIVE" : "COMPLETED",
        new Date().toISOString(),
        order.id,
      );
    } catch {}
  }
}
if (process.env.NODE_ENV !== "test") {
  const run = async () => {
    while (true) {
      await pollOnce();
      await sleep(30000);
    }
  };
  void run();
  await app.listen({ port: Number(process.env.PORT || 3000), host: "0.0.0.0" });
}
export default app;
