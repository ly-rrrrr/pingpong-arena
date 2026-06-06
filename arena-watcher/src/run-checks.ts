/**
 * Arena Watcher — Run Checks
 *
 * Wrapper script that runs pnpm check / lint / test and outputs structured
 * results for the MCP server to read.
 */

import { execSync } from "node:child_process";

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const kind = process.argv[2] ?? "all";

function run(cmd: string, label: string): { ok: boolean; output: string } {
  try {
    const output = execSync(cmd, { cwd: PROJECT_DIR, timeout: 120_000, encoding: "utf-8" });
    return { ok: true, output };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, output: e.stdout ?? e.stderr ?? e.message ?? "Unknown error" };
  }
}

const results: Record<string, { ok: boolean; output: string }> = {};

if (kind === "all" || kind === "check") results.check = run("pnpm check", "typecheck");
if (kind === "all" || kind === "lint") results.lint = run("pnpm lint", "lint");
if (kind === "all" || kind === "test") results.test = run("pnpm test", "test");

console.log(JSON.stringify(results, null, 2));
