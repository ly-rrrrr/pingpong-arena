/**
 * Arena Watcher — Network Proxy
 *
 * Utility to manually track tRPC or custom API calls from within components.
 * The main fetch patching is done in arena-observer.ts; this module provides
 * explicit instrumentation for cases where the patched fetch doesn't capture
 * enough detail (e.g., tRPC batch calls).
 */

import { sendEvent } from "./arena-observer";
import type { NetworkEvent } from "./types";

export function trackApiCall(meta: {
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: string;
}) {
  if (!__DEV__) return;

  const evt: NetworkEvent = {
    ts: new Date().toISOString(),
    type: "network",
    source: "frontend",
    message: `${meta.method} ${meta.url}${meta.error ? " → ERROR" : ` → ${meta.status}`}`,
    data: meta,
  };

  sendEvent(evt);
}
