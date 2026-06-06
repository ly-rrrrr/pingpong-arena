---
description: Fix the latest pingpong-arena bug using Arena Watcher incident data.
---

# Arena Fix

Fix the latest bug captured by Arena Watcher. Follow this workflow strictly.

## Required Workflow

1. **Read the incident**: Call `arena_latest_incident`. If it returns no incidents, inform the user and stop.
2. **Find suspect files**: Call `arena_find_suspect_files` with the incident ID.
3. **Read the relevant source files**: Only read files identified as suspects. Do not read unrelated files.
4. **Make minimal targeted edits**: Fix the root cause, not symptoms. Match existing code style.
5. **Verify the fix**:
   - Call `arena_run_checks` with `{ kind: "check" }` for type checking.
   - If the fix involves matching/routing logic, call `arena_run_checks` with `{ kind: "test" }`.
6. **If checks fail**: Read the error output and fix again. Loop until clean.
7. **Mark as fixed**: Call `arena_mark_incident_fixed` with the incident ID and a one-line fix summary.

## Final Response

After fixing, report:
- **Root cause**: What was actually wrong
- **Files changed**: With brief explanation of each change
- **Verification**: Check and test results
- **Retest instructions**: What the user should test on their phone

## Project Context

- Expo Router + React Native + TypeScript
- tRPC for client-server communication
- Matching flow: index (lobby) → confirm → channel → venue-select → retreat
- State management: React Context + useReducer in `lib/matching-context.tsx`
- Server: Express + tRPC in `server/`, matching logic in `server/matching.ts`
- Do not modify files under `server/_core/` or `lib/_core/` unless absolutely necessary.
