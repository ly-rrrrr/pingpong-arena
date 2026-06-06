/**
 * Arena Watcher — Local Collector
 *
 * Lightweight HTTP server that receives runtime events from the Expo app
 * and backend, buffers them in memory, and generates structured incident
 * bundles when the user hits the BUG button.
 *
 * Usage: pnpm arena:watch
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const PORT = parseInt(process.env.ARENA_WATCH_PORT ?? "4317", 10);
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const INCIDENTS_DIR = path.join(PROJECT_DIR, ".arena-watch", "incidents");
const LOGS_DIR = path.join(PROJECT_DIR, ".arena-watch", "logs");

// In-memory ring buffer for recent events
const MAX_EVENTS = 500;
const recentEvents: unknown[] = [];

function addEvent(event: unknown) {
  recentEvents.push(event);
  if (recentEvents.length > MAX_EVENTS) recentEvents.shift();
}

function ensureDirs() {
  fs.mkdirSync(INCIDENTS_DIR, { recursive: true });
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function appendJsonl(file: string, obj: unknown) {
  fs.appendFileSync(path.join(LOGS_DIR, file), JSON.stringify(obj) + "\n");
}

function readJsonFile(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function listIncidents(): Array<{ id: string; file: string; mtime: Date }> {
  const files = fs.readdirSync(INCIDENTS_DIR).filter((f) => f.endsWith(".json"));
  return files
    .map((f) => {
      const stat = fs.statSync(path.join(INCIDENTS_DIR, f));
      return { id: f.replace(".json", ""), file: f, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

function summarizeIncident(incident: Record<string, unknown>) {
  const timeline = (incident.timeline as Array<Record<string, unknown>>) ?? [];
  const errors = timeline.filter((e) => e.type === "error" || e.source === "backend");
  const failedReqs = timeline.filter(
    (e) =>
      e.type === "network" &&
      e.data &&
      typeof e.data === "object" &&
      (e.data as Record<string, unknown>).error
  );
  const routes = timeline
    .filter((e) => e.type === "navigation")
    .map((e) => (e.data as Record<string, unknown>)?.to);

  return {
    id: incident.id,
    createdAt: incident.createdAt,
    route: (incident.app as Record<string, unknown>)?.route ?? "",
    severity: (incident.user as Record<string, unknown>)?.severity ?? "major",
    errorCount: errors.length,
    latestError: errors.length > 0 ? (errors[errors.length - 1] as Record<string, unknown>).message : null,
    failedRequests: failedReqs.length,
    routeHistory: routes,
    suspectedFiles: incident.claude
      ? (incident.claude as Record<string, unknown>).suspectedFiles ?? []
      : [],
  };
}

function collectProjectState(): Record<string, unknown> {
  try {
    const changedFiles = execSync("git diff --name-only", { cwd: PROJECT_DIR, timeout: 5000 })
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean);
    const diffSummary = execSync("git diff --stat", { cwd: PROJECT_DIR, timeout: 5000 })
      .toString()
      .trim();
    return { changedFiles, gitDiffSummary: diffSummary };
  } catch {
    return { changedFiles: [], gitDiffSummary: "" };
  }
}

function buildIncident(body: Record<string, unknown>): Record<string, unknown> {
  const now = new Date().toISOString();
  const id = `incident-${now.replace(/[:.]/g, "-")}`;

  const timeline = [...recentEvents];

  const frontendEvents = timeline.filter((e) => (e as Record<string, unknown>).source === "frontend");
  const backendEvents = timeline.filter((e) => (e as Record<string, unknown>).source === "backend");

  const errors = frontendEvents
    .filter((e) => (e as Record<string, unknown>).type === "error")
    .map((e) => {
      const d = (e as Record<string, unknown>).data as Record<string, unknown>;
      return { message: d?.message ?? "", stack: d?.stack, componentStack: d?.componentStack };
    });

  const consoleLines = frontendEvents
    .filter((e) => (e as Record<string, unknown>).type === "console")
    .map((e) => {
      const d = (e as Record<string, unknown>).data as Record<string, unknown>;
      const args = d?.args as unknown[];
      return `[${d?.level}] ${args?.map(String).join(" ")}`;
    });

  const routeEvents = frontendEvents.filter((e) => (e as Record<string, unknown>).type === "navigation");
  const routeHistory = routeEvents.map((e) => {
    const d = (e as Record<string, unknown>).data as Record<string, unknown>;
    return String(d?.to ?? "");
  });

  const networkRequests = backendEvents
    .filter((e) => (e as Record<string, unknown>).type === "request")
    .map((e) => {
      const d = (e as Record<string, unknown>).data as Record<string, unknown>;
      return {
        method: d?.method ?? "",
        path: d?.path ?? "",
        status: d?.status,
        durationMs: d?.durationMs,
        requestBody: d?.requestBody,
        responseBody: d?.responseBody,
        error: d?.error,
      };
    });

  const incident = {
    id,
    createdAt: now,
    app: {
      platform: body.platform ?? "ios",
      expoMode: body.expoMode ?? "expo-go",
      route: body.route ?? "",
      screenName: body.screenName,
      gitCommit: body.gitCommit,
    },
    user: {
      description: body.description,
      expected: body.expected,
      actual: body.actual,
      severity: body.severity ?? "major",
    },
    timeline,
    frontend: {
      console: consoleLines.slice(-50),
      errors,
      routeHistory,
      recentActions: body.recentActions as string[] ?? [],
      stateSnapshot: body.stateSnapshot,
      asyncStorageSnapshot: body.asyncStorageSnapshot,
    },
    backend: {
      requests: networkRequests,
      serverLogs: [],
    },
    project: collectProjectState(),
    claude: {
      status: "new",
    },
  };

  return incident;
}

// --- HTTP Server ---

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /health
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, uptime: process.uptime(), eventsBuffered: recentEvents.length }));
    return;
  }

  // GET /incidents/latest
  if (req.method === "GET" && req.url === "/incidents/latest") {
    const incidents = listIncidents();
    if (incidents.length === 0) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No incidents found" }));
      return;
    }
    const latest = readJsonFile(path.join(INCIDENTS_DIR, incidents[0].file));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(latest));
    return;
  }

  // GET /incidents — list all incidents
  if (req.method === "GET" && req.url === "/incidents") {
    const incidents = listIncidents().map((i) => {
      const raw = readJsonFile(path.join(INCIDENTS_DIR, i.file));
      return raw ? summarizeIncident(raw) : null;
    }).filter(Boolean);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(incidents));
    return;
  }

  // POST /event — receive frontend event
  if (req.method === "POST" && req.url === "/event") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const event = JSON.parse(body);
        event.source = "frontend";
        addEvent(event);
        appendJsonl("frontend.jsonl", event);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, buffered: recentEvents.length }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  // POST /backend-event — receive backend event
  if (req.method === "POST" && req.url === "/backend-event") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const event = JSON.parse(body);
        event.source = "backend";
        addEvent(event);
        appendJsonl("backend.jsonl", event);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, buffered: recentEvents.length }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  // POST /incident — create bug bundle
  if (req.method === "POST" && req.url === "/incident") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const input = JSON.parse(body);
        const incident = buildIncident(input);
        const filePath = path.join(INCIDENTS_DIR, `${incident.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(incident, null, 2));
        console.log(`[arena-watch] Incident created: ${incident.id}`);
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, id: incident.id, path: filePath }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

ensureDirs();

server.listen(PORT, () => {
  console.log(`[arena-watch] Collector listening on http://localhost:${PORT}`);
  console.log(`[arena-watch] Project dir: ${PROJECT_DIR}`);
  console.log(`[arena-watch] Incidents dir: ${INCIDENTS_DIR}`);
});
