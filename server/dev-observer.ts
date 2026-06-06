/**
 * Arena Watcher — Backend Observer
 *
 * Lightweight development-only event sender for backend tracing.
 * Sends structured events to the local Arena Watcher collector.
 */

const COLLECTOR_URL =
  process.env.ARENA_COLLECTOR_URL ?? "http://127.0.0.1:4317";

export function devLogBackendEvent(event: {
  type: string;
  message: string;
  data?: unknown;
}) {
  if (process.env.NODE_ENV !== "development") return;

  const payload = {
    ts: new Date().toISOString(),
    ...event,
  };

  fetch(`${COLLECTOR_URL}/backend-event`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    // collector might not be running — ignore
  });
}
