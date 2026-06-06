/**
 * Arena Watcher — MCP Server
 *
 * Stdio-based MCP server that exposes Arena Watcher tools to Claude Code.
 * Claude reads incidents, searches logs, runs checks, and marks bugs as fixed.
 *
 * Registered in .mcp.json
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const INCIDENTS_DIR = path.join(PROJECT_DIR, ".arena-watch", "incidents");
const LOGS_DIR = path.join(PROJECT_DIR, ".arena-watch", "logs");

// --- Helpers ---

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function listIncidentFiles(): Array<{ id: string; file: string; mtime: Date }> {
  try {
    return fs
      .readdirSync(INCIDENTS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const stat = fs.statSync(path.join(INCIDENTS_DIR, f));
        return { id: f.replace(".json", ""), file: f, mtime: stat.mtime };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  } catch {
    return [];
  }
}

function grepLogs(file: string, query: string, sinceMinutes: number): string[] {
  try {
    const filePath = path.join(LOGS_DIR, file);
    if (!fs.existsSync(filePath)) return [];
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
    const since = Date.now() - sinceMinutes * 60_000;
    const q = query.toLowerCase();

    return lines
      .filter((line) => {
        try {
          const evt = JSON.parse(line);
          const ts = new Date(evt.ts).getTime();
          return ts >= since && JSON.stringify(evt).toLowerCase().includes(q);
        } catch {
          return false;
        }
      })
      .slice(-100);
  } catch {
    return [];
  }
}

function runCheck(kind: string): string {
  const cmds: Record<string, string> = {
    check: "pnpm check",
    lint: "pnpm lint",
    test: "pnpm test",
  };
  const cmd = cmds[kind];
  if (!cmd) return JSON.stringify({ error: `Unknown check kind: ${kind}` });
  try {
    const output = execSync(cmd, { cwd: PROJECT_DIR, timeout: 120_000, encoding: "utf-8" });
    return output;
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string };
    return e.stdout ?? e.stderr ?? String(err);
  }
}

function findSuspectFiles(incident: Record<string, unknown>): string[] {
  const route = (incident.app as Record<string, unknown>)?.route as string ?? "";
  const errors = (incident.frontend as Record<string, unknown>)?.errors as Array<Record<string, unknown>> ?? [];
  const requests = (incident.backend as Record<string, unknown>)?.requests as Array<Record<string, unknown>> ?? [];
  const changedFiles = (incident.project as Record<string, unknown>)?.changedFiles as string[] ?? [];

  const suspects = new Set<string>();

  // Route-based suspects
  if (route.includes("matching")) {
    suspects.add("app/matching/index.tsx");
    suspects.add("lib/matching-context.tsx");
    suspects.add("lib/matching-types.ts");
    suspects.add("server/matching.ts");
    suspects.add("server/routers.ts");
  }
  if (route.includes("confirm")) {
    suspects.add("app/matching/confirm.tsx");
  }
  if (route.includes("channel")) {
    suspects.add("app/matching/channel.tsx");
    suspects.add("server/routers.ts");
  }

  // Error-based suspects
  for (const err of errors) {
    const msg = String(err.message ?? "");
    if (msg.includes("status")) {
      suspects.add("lib/matching-types.ts");
      suspects.add("server/routers.ts");
    }
    if (msg.includes("undefined")) {
      suspects.add("lib/matching-context.tsx");
    }
    if (msg.includes("fetch") || msg.includes("network")) {
      suspects.add("lib/trpc.ts");
    }
    if (msg.includes("campus") || msg.includes("location")) {
      suspects.add("lib/campus-context.tsx");
      suspects.add("server/campus-boundaries.ts");
    }
  }

  // Failed request suspects
  for (const req of requests) {
    const path = String(req.path ?? "");
    if (path.includes("matching")) {
      suspects.add("server/matching.ts");
      suspects.add("server/routers.ts");
    }
  }

  // Add any already-changed files
  for (const f of changedFiles) {
    suspects.add(f);
  }

  return [...suspects];
}

// --- MCP Protocol ---

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

function respond(id: string | number | undefined, result: unknown) {
  process.stdout.write(
    JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n"
  );
}

function error(id: string | number | undefined, code: number, message: string) {
  process.stdout.write(
    JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n"
  );
}

// --- Tool implementations ---

const TOOLS: Record<string, { description: string; inputSchema: Record<string, unknown>; handler: (params: Record<string, unknown>) => Promise<unknown> }> = {
  arena_latest_incident: {
    description: "Get the most recent bug incident summary with timeline, errors, and suspect files.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const files = listIncidentFiles();
      if (files.length === 0) return { status: "no_incidents", message: "No incidents recorded yet." };
      const incident = readJsonFile(path.join(INCIDENTS_DIR, files[0].file));
      if (!incident) return { status: "error", message: "Failed to read latest incident." };

      const timeline = (incident.timeline as Array<Record<string, unknown>>) ?? [];
      const errors = (incident.frontend as Record<string, unknown>)?.errors as Array<Record<string, unknown>> ?? [];
      const requests = (incident.backend as Record<string, unknown>)?.requests as Array<Record<string, unknown>> ?? [];
      const failedReqs = requests.filter((r) => r.error);
      const suspects = findSuspectFiles(incident);

      return {
        id: incident.id,
        createdAt: incident.createdAt,
        app: incident.app,
        user: incident.user,
        summary: {
          totalEvents: timeline.length,
          errorCount: errors.length,
          latestError: errors.length > 0 ? errors[errors.length - 1].message : null,
          failedRequests: failedReqs.length,
          routeHistory: (incident.frontend as Record<string, unknown>)?.routeHistory ?? [],
        },
        timeline: timeline.slice(-30),
        errors: errors.slice(-5),
        failedRequests: failedReqs.slice(-10),
        suspectedFiles: suspects,
        claude: incident.claude,
      };
    },
  },

  arena_read_incident: {
    description: "Read the full incident JSON by ID.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Incident ID" } },
      required: ["id"],
    },
    handler: async (params) => {
      const filePath = path.join(INCIDENTS_DIR, `${params.id}.json`);
      const incident = readJsonFile(filePath);
      if (!incident) return { status: "error", message: `Incident not found: ${params.id}` };
      return incident;
    },
  },

  arena_list_incidents: {
    description: "List all incidents with summaries.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by claude.status: new, analyzing, fixed, needs-human-check" },
      },
    },
    handler: async (params) => {
      const files = listIncidentFiles();
      const result = [];
      for (const f of files) {
        const incident = readJsonFile(path.join(INCIDENTS_DIR, f.file));
        if (!incident) continue;
        const status = (incident.claude as Record<string, unknown>)?.status as string;
        if (params.status && status !== params.status) continue;
        result.push({
          id: incident.id,
          createdAt: incident.createdAt,
          route: (incident.app as Record<string, unknown>)?.route,
          severity: (incident.user as Record<string, unknown>)?.severity,
          status,
        });
      }
      return result;
    },
  },

  arena_search_logs: {
    description: "Search frontend and backend event logs.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term" },
        sinceMinutes: { type: "number", description: "How far back to search, default 15" },
        source: { type: "string", description: "frontend, backend, or both (default)" },
      },
      required: ["query"],
    },
    handler: async (params) => {
      const query = params.query as string;
      const sinceMinutes = (params.sinceMinutes as number) ?? 15;
      const source = (params.source as string) ?? "both";

      const results: Record<string, string[]> = {};
      if (source === "both" || source === "frontend") {
        results.frontend = grepLogs("frontend.jsonl", query, sinceMinutes);
      }
      if (source === "both" || source === "backend") {
        results.backend = grepLogs("backend.jsonl", query, sinceMinutes);
      }
      return { query, sinceMinutes, count: Object.values(results).reduce((s, a) => s + a.length, 0), results };
    },
  },

  arena_get_project_state: {
    description: "Get current project state: git diff, changed files, recent commits.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      try {
        const changedFiles = execSync("git diff --name-only", { cwd: PROJECT_DIR, timeout: 5000, encoding: "utf-8" })
          .trim().split("\n").filter(Boolean);
        const diffSummary = execSync("git diff --stat", { cwd: PROJECT_DIR, timeout: 5000, encoding: "utf-8" }).trim();
        const recentCommits = execSync("git log --oneline -5", { cwd: PROJECT_DIR, timeout: 5000, encoding: "utf-8" }).trim();
        return { changedFiles, diffSummary, recentCommits };
      } catch {
        return { changedFiles: [], diffSummary: "", recentCommits: "" };
      }
    },
  },

  arena_run_checks: {
    description: "Run project checks (typecheck, lint, or test).",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", description: "check, lint, test, or all" },
      },
      required: ["kind"],
    },
    handler: async (params) => {
      const kind = params.kind as string;
      const output = runCheck(kind);
      return { kind, output: output.slice(-5000) };
    },
  },

  arena_mark_incident_fixed: {
    description: "Mark an incident as fixed with a summary.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Incident ID" },
        summary: { type: "string", description: "Brief fix summary" },
      },
      required: ["id"],
    },
    handler: async (params) => {
      const filePath = path.join(INCIDENTS_DIR, `${params.id}.json`);
      const incident = readJsonFile(filePath);
      if (!incident) return { status: "error", message: `Incident not found: ${params.id}` };
      (incident.claude as Record<string, unknown>).status = "fixed";
      if (params.summary) {
        (incident.claude as Record<string, unknown>).fixPlan = params.summary;
      }
      fs.writeFileSync(filePath, JSON.stringify(incident, null, 2));
      return { status: "ok", id: params.id };
    },
  },

  arena_find_suspect_files: {
    description: "Identify files likely related to an incident based on route, errors, and failed requests.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Incident ID (omit for latest)" } },
    },
    handler: async (params) => {
      let incident: Record<string, unknown> | null;
      if (params.id) {
        incident = readJsonFile(path.join(INCIDENTS_DIR, `${params.id}.json`));
      } else {
        const files = listIncidentFiles();
        if (files.length === 0) return { status: "no_incidents", suspectedFiles: [] };
        incident = readJsonFile(path.join(INCIDENTS_DIR, files[0].file));
      }
      if (!incident) return { status: "error", message: "Incident not found." };
      const suspects = findSuspectFiles(incident);
      return { id: incident.id, suspectedFiles: suspects };
    },
  },
};

// --- Main ---

process.stdin.setEncoding("utf-8");
let buffer = "";

process.stdin.on("data", (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const req: JsonRpcRequest = JSON.parse(line);

      if (req.method === "tools/list") {
        respond(req.id, {
          tools: Object.entries(TOOLS).map(([name, t]) => ({
            name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        });
        continue;
      }

      if (req.method === "tools/call") {
        const params = req.params as Record<string, unknown>;
        const toolName = params?.name as string;
        const toolArgs = (params?.arguments as Record<string, unknown>) ?? {};
        const tool = TOOLS[toolName];

        if (!tool) {
          error(req.id, -32601, `Unknown tool: ${toolName}`);
          continue;
        }

        tool.handler(toolArgs)
          .then((result) => {
            respond(req.id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
          })
          .catch((err) => {
            error(req.id, -32000, String(err));
          });
        continue;
      }

      if (req.method === "initialize") {
        respond(req.id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "arena-watcher", version: "0.1.0" },
        });
        continue;
      }

      if (req.method === "notifications/initialized") {
        // No response needed
        continue;
      }

      error(req.id, -32601, `Unknown method: ${req.method}`);
    } catch {
      // skip malformed lines
    }
  }
});

process.stderr.write("[arena-watcher] MCP server started\n");
