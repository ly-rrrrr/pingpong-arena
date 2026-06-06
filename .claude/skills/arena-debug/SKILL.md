---
description: Debug pingpong-arena runtime issues captured by Arena Watcher. Read-only analysis, no code changes.
---

# Arena Debug

You are debugging the pingpong-arena Expo/React Native app. Use Arena Watcher MCP tools to inspect the latest incident.

## Workflow

1. Call `arena_latest_incident` to get the most recent bug report.
2. Call `arena_find_suspect_files` to identify likely related files.
3. Call `arena_get_project_state` to see current git changes.
4. Analyze and report:
   - **Current route** and what the user was doing
   - **Root cause analysis** based on errors, failed requests, and timeline
   - **Suspected files** with reasoning
   - **Suggested fix approach** (high-level, no code edits)
5. If the incident is empty or has no useful data, tell the user and suggest they:
   - Ensure the collector is running (`pnpm arena:watch`)
   - Check that the Expo app can reach the collector
   - Tap the BUG button again while on the problematic screen

## Rules

- Do NOT edit any code in this skill. Only analyze.
- Keep analysis concise — focus on what matters for fixing.
- If multiple errors exist, prioritize by severity.
- Reference specific file paths and line numbers when possible.
