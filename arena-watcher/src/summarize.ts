/**
 * Arena Watcher — Summarize utility
 *
 * Generates human-readable summaries from incident JSON for Claude context.
 */

import fs from "node:fs";
import path from "node:path";

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const INCIDENTS_DIR = path.join(PROJECT_DIR, ".arena-watch", "incidents");

function latestIncidentPath(): string | null {
  try {
    const files = fs
      .readdirSync(INCIDENTS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(INCIDENTS_DIR, f)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    return files.length > 0 ? path.join(INCIDENTS_DIR, files[0].name) : null;
  } catch {
    return null;
  }
}

function summarizeFromPath(filePath: string): string {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const id = raw.id ?? path.basename(filePath, ".json");
  const route = raw.app?.route ?? "unknown";
  const severity = raw.user?.severity ?? "major";
  const description = raw.user?.description ?? "(no description)";
  const errors = raw.frontend?.errors ?? [];
  const consoleLines = raw.frontend?.console ?? [];
  const requests = raw.backend?.requests ?? [];
  const failedReqs = requests.filter((r: Record<string, unknown>) => r.error);
  const changedFiles = raw.project?.changedFiles ?? [];

  const lines = [
    `# Incident: ${id}`,
    ``,
    `**Route**: ${route}`,
    `**Severity**: ${severity}`,
    `**Description**: ${description}`,
    ``,
    `## Errors (${errors.length})`,
    ...errors.map((e: Record<string, unknown>, i: number) =>
      `- ${e.message}${e.stack ? `\n  \`\`\`\n  ${e.stack}\n  \`\`\`` : ""}`
    ),
    ``,
    `## Failed Requests (${failedReqs.length})`,
    ...failedReqs.map((r: Record<string, unknown>) =>
      `- ${r.method} ${r.path} → ${r.error}`
    ),
    ``,
    `## Recent Console (last 20)`,
    ...consoleLines.slice(-20).map((l: string) => `  ${l}`),
    ``,
    `## Changed Files`,
    ...changedFiles.map((f: string) => `- ${f}`),
  ];

  return lines.join("\n");
}

// CLI usage: tsx scripts/arena-watch/summarize.ts [latest|<id>]
const arg = process.argv[2] ?? "latest";

if (arg === "latest") {
  const filePath = latestIncidentPath();
  if (!filePath) {
    console.log("No incidents found.");
    process.exit(0);
  }
  console.log(summarizeFromPath(filePath));
} else {
  const filePath = path.join(INCIDENTS_DIR, `${arg}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`Incident not found: ${arg}`);
    process.exit(1);
  }
  console.log(summarizeFromPath(filePath));
}
