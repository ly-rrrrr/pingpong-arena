---
description: Verify that a fix for a pingpong-arena incident is complete and ready for retesting.
---

# Arena Verify

Verify that the current code changes fix the latest incident and the project is in a healthy state.

## Workflow

1. **Read the latest incident**: Call `arena_latest_incident` to see what was broken.
2. **Check project state**: Call `arena_get_project_state` to see what files changed.
3. **Run type check**: Call `arena_run_checks` with `{ kind: "check" }`.
4. **Run tests**: Call `arena_run_checks` with `{ kind: "test" }`.
5. **Run lint**: Call `arena_run_checks` with `{ kind: "lint" }`.
6. **Report**:
   - All checks pass? → "Ready to retest on device."
   - Some failures? → Summarize what's failing and suggest the user run `/arena-fix latest`.
   - No incidents? → "No incidents to verify. The project appears clean."
7. If all checks pass, call `arena_mark_incident_fixed` to close the incident.

## Rules

- This skill only verifies — do not edit any code.
- If checks fail, do NOT attempt to fix. Report the failures and suggest `/arena-fix latest`.
