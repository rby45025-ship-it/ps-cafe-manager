const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const PORT = process.env.PORT || 3721;
const userData = process.env.USER_DATA || path.join(require("os").homedir(), ".ps-cafe");

if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });

const dbPath = path.join(userData, "cafe.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    hourly_rate REAL NOT NULL DEFAULT 20
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL REFERENCES devices(id),
    start_time TEXT NOT NULL DEFAULT (datetime('now')),
    end_time TEXT,
    duration_minutes INTEGER NOT NULL,
    cost REAL,
    status TEXT NOT NULL DEFAULT 'active'
  );
  CREATE TABLE IF NOT EXISTS alarm_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL REFERENCES devices(id),
    active INTEGER NOT NULL DEFAULT 0,
    last_triggered_at TEXT
  );
  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_with_windows INTEGER NOT NULL DEFAULT 0
  );
`);

const deviceCount = db.prepare("SELECT COUNT(*) as c FROM devices").get();
if (deviceCount.c === 0) {
  const ins = db.prepare("INSERT INTO devices (name, hourly_rate) VALUES (?, ?)");
  ["PlayStation 1", "PlayStation 2", "PlayStation 3", "PlayStation 4", "PlayStation 5", "PlayStation VIP"].forEach((n, i) =>
    ins.run(n, i === 5 ? 30 : 20)
  );
}
const settingsCount = db.prepare("SELECT COUNT(*) as c FROM app_settings").get();
if (settingsCount.c === 0) db.prepare("INSERT INTO app_settings (start_with_windows) VALUES (0)").run();

const app = express();
app.use(cors());
app.use(express.json());

const isDev = process.env.NODE_ENV === "development";
if (!isDev) {
  const distPath = path.join(__dirname, "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────
function getDeviceWithSession(id) {
  const device = db.prepare("SELECT * FROM devices WHERE id = ?").get(id);
  if (!device) return null;
  const activeSession = db
    .prepare("SELECT * FROM sessions WHERE device_id = ? AND status IN ('active','expired') ORDER BY id DESC LIMIT 1")
    .get(id);
  const alarm = db.prepare("SELECT active FROM alarm_state WHERE device_id = ?").get(id);
  const alarmActive = alarm ? !!alarm.active : false;

  let status = "available";
  let sessionPayload = null;

  if (activeSession) {
    const now = Date.now();
    const start = new Date(activeSession.start_time).getTime();
    const durationMs = activeSession.duration_minutes * 60 * 1000;
    const remainingMs = durationMs - (now - start);
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    status = activeSession.status === "expired" || remainingSeconds === 0 ? "expired" : "in_use";
    sessionPayload = {
      id: activeSession.id,
      deviceId: activeSession.device_id,
      startTime: activeSession.start_time,
      endTime: activeSession.end_time,
      durationMinutes: activeSession.duration_minutes,
      remainingSeconds,
      cost: activeSession.cost,
      status: status === "expired" ? "expired" : "active",
    };
  }

  return {
    id: device.id,
    name: device.name,
    hourlyRate: device.hourly_rate,
    status,
    activeSession: sessionPayload,
    alarmActive,
  };
}

// ── GET /api/devices ──────────────────────────────────────────────────────────
app.get("/api/devices", (req, res) => {
  try {
    const devices = db.prepare("SELECT id FROM devices ORDER BY id").all();
    res.json(devices.map((d) => getDeviceWithSession(d.id)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/devices ─────────────────────────────────────────────────────────
app.post("/api/devices", (req, res) => {
  try {
    const { name, hourlyRate } = req.body;
    if (!name || hourlyRate === undefined) return res.status(400).json({ error: "name and hourlyRate required" });
    const r = db.prepare("INSERT INTO devices (name, hourly_rate) VALUES (?, ?)").run(name, parseFloat(hourlyRate));
    res.status(201).json({ id: r.lastInsertRowid, name, hourlyRate: parseFloat(hourlyRate), status: "available", activeSession: null, alarmActive: false });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/devices/:id ────────────────────────────────────────────────────
app.patch("/api/devices/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, hourlyRate } = req.body;
    db.prepare("UPDATE devices SET name = COALESCE(?, name), hourly_rate = COALESCE(?, hourly_rate) WHERE id = ?")
      .run(name ?? null, hourlyRate != null ? parseFloat(hourlyRate) : null, id);
    res.json(getDeviceWithSession(id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/devices/:id ───────────────────────────────────────────────────
app.delete("/api/devices/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    db.prepare("DELETE FROM sessions WHERE device_id = ?").run(id);
    db.prepare("DELETE FROM alarm_state WHERE device_id = ?").run(id);
    db.prepare("DELETE FROM devices WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/sessions/start ──────────────────────────────────────────────────
app.post("/api/sessions/start", (req, res) => {
  try {
    const { deviceId, durationMinutes } = req.body;
    const existing = db.prepare("SELECT id FROM sessions WHERE device_id = ? AND status IN ('active','expired')").get(deviceId);
    if (existing) return res.status(400).json({ error: "Device already in use" });

    const device = db.prepare("SELECT hourly_rate FROM devices WHERE id = ?").get(deviceId);
    if (!device) return res.status(404).json({ error: "Device not found" });

    const cost = (durationMinutes / 60) * device.hourly_rate;
    const r = db.prepare("INSERT INTO sessions (device_id, duration_minutes, cost, status, start_time) VALUES (?, ?, ?, 'active', datetime('now'))").run(deviceId, durationMinutes, cost);
    res.json({ id: r.lastInsertRowid, deviceId, durationMinutes, cost, status: "active" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/sessions/:id/end ────────────────────────────────────────────────
app.post("/api/sessions/:id/end", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const elapsed = (Date.now() - new Date(session.start_time).getTime()) / 60000;
    const device = db.prepare("SELECT hourly_rate FROM devices WHERE id = ?").get(session.device_id);
    const cost = (Math.min(elapsed, session.duration_minutes) / 60) * (device?.hourly_rate ?? 20);

    db.prepare("UPDATE sessions SET status='ended', end_time=datetime('now'), cost=? WHERE id=?").run(cost, id);
    db.prepare("UPDATE alarm_state SET active=0 WHERE device_id=?").run(session.device_id);
    res.json({ success: true, cost });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/sessions/:id/addtime ───────────────────────────────────────────
app.post("/api/sessions/:id/addtime", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { minutes } = req.body;
    const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const device = db.prepare("SELECT hourly_rate FROM devices WHERE id = ?").get(session.device_id);
    const newDuration = session.duration_minutes + parseInt(minutes);
    const newCost = (newDuration / 60) * (device?.hourly_rate ?? 20);

    db.prepare("UPDATE sessions SET duration_minutes=?, cost=?, status='active' WHERE id=?").run(newDuration, newCost, id);
    db.prepare("UPDATE alarm_state SET active=0 WHERE device_id=?").run(session.device_id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/alarm/:deviceId ─────────────────────────────────────────────────
app.post("/api/alarm/:deviceId", (req, res) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    const { active } = req.body;
    const exists = db.prepare("SELECT id FROM alarm_state WHERE device_id=?").get(deviceId);
    if (exists) {
      db.prepare("UPDATE alarm_state SET active=?, last_triggered_at=datetime('now') WHERE device_id=?").run(active ? 1 : 0, deviceId);
    } else {
      db.prepare("INSERT INTO alarm_state (device_id, active, last_triggered_at) VALUES (?,?,datetime('now'))").run(deviceId, active ? 1 : 0);
    }
    if (active) {
      db.prepare("UPDATE sessions SET status='expired' WHERE device_id=? AND status='active'").run(deviceId);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/revenue/today ────────────────────────────────────────────────────
app.get("/api/revenue/today", (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const rows = db.prepare("SELECT cost, duration_minutes FROM sessions WHERE status='ended' AND date(start_time)=?").all(today);
    res.json({
      totalRevenue: rows.reduce((a, r) => a + (r.cost || 0), 0),
      totalSessions: rows.length,
      totalMinutes: rows.reduce((a, r) => a + r.duration_minutes, 0),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/revenue/monthly ──────────────────────────────────────────────────
app.get("/api/revenue/monthly", (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear(), month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `${year}-${month}`;
    const rows = db.prepare(`SELECT date(start_time) as day, SUM(cost) as rev, COUNT(*) as cnt FROM sessions WHERE status='ended' AND start_time LIKE '${prefix}%' GROUP BY day ORDER BY day`).all();
    const totalRevenue = rows.reduce((a, r) => a + (r.rev || 0), 0);
    const days = rows.length || 1;
    const best = rows.reduce((a, r) => (!a || r.rev > a.rev ? r : a), null);
    res.json({
      totalRevenue,
      averageDaily: totalRevenue / days,
      mostProfitableDay: best?.day || null,
      dailyBreakdown: rows.map((r) => ({ date: r.day, revenue: r.rev || 0, sessions: r.cnt })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/stats ────────────────────────────────────────────────────────────
app.get("/api/stats", (req, res) => {
  try {
    const total = db.prepare("SELECT COUNT(*) as c, SUM(duration_minutes) as m FROM sessions WHERE status='ended'").get();
    const active = db.prepare("SELECT COUNT(*) as c FROM sessions WHERE status IN ('active','expired')").get();
    const devices = db.prepare("SELECT COUNT(*) as c FROM devices").get();
    const topDevice = db.prepare("SELECT d.name, COUNT(*) as c FROM sessions s JOIN devices d ON d.id=s.device_id WHERE s.status='ended' GROUP BY d.id ORDER BY c DESC LIMIT 1").get();
    res.json({
      totalSessions: total.c,
      totalMinutes: total.m || 0,
      activeDevices: active.c,
      availableDevices: devices.c - active.c,
      mostUsedDevice: topDevice?.name || null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/sessions/history ─────────────────────────────────────────────────
app.get("/api/sessions/history", (req, res) => {
  try {
    const rows = db.prepare("SELECT s.*, d.name as device_name FROM sessions s JOIN devices d ON d.id=s.device_id WHERE s.status='ended' ORDER BY s.id DESC LIMIT 100").all();
    res.json(rows.map((r) => ({
      id: r.id, deviceId: r.device_id, deviceName: r.device_name,
      startTime: r.start_time, endTime: r.end_time,
      durationMinutes: r.duration_minutes, cost: r.cost, status: r.status,
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/settings ─────────────────────────────────────────────────────────
app.get("/api/settings", (req, res) => {
  try {
    const s = db.prepare("SELECT * FROM app_settings LIMIT 1").get();
    res.json({ id: s.id, startWithWindows: !!s.start_with_windows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/settings ───────────────────────────────────────────────────────
app.patch("/api/settings", (req, res) => {
  try {
    const { startWithWindows } = req.body;
    db.prepare("UPDATE app_settings SET start_with_windows=? WHERE id=1").run(startWithWindows ? 1 : 0);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  const indexPath = path.join(__dirname, "dist", "index.html");
  if (!isDev && fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).json({ error: "Not found" });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`PS Cafe server running on http://127.0.0.1:${PORT}`);
});
