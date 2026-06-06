/**
 * Arena Watcher — Frontend Observer
 *
 * React Context provider that patches global console, error handlers,
 * and fetch to capture runtime events in memory. Only active in __DEV__.
 *
 * Events are buffered and sent to the local collector when reportBug() is called.
 */

import React, { createContext, useContext, useEffect, useRef } from "react";
import { useSegments } from "expo-router";
import type { ArenaEvent, ConsoleEvent, ErrorEvent as ArenaErrorEvent, NavigationEvent, NetworkEvent } from "./types";

// Set EXPO_PUBLIC_ARENA_COLLECTOR_URL in .env.local to your LAN IP, e.g. http://172.17.170.212:4317
const COLLECTOR_URL = __DEV__
  ? process.env.EXPO_PUBLIC_ARENA_COLLECTOR_URL ?? "http://<YOUR_LAN_IP>:4317"
  : "";

const MAX_BUFFERED_EVENTS = 300;
const bufferedEvents: ArenaEvent[] = [];

let observerInitialized = false;
let lastRoute = "";

export function getBufferedEvents(): ArenaEvent[] {
  return [...bufferedEvents];
}

export function getCollectorUrl(): string {
  return COLLECTOR_URL;
}

function addEvent(event: ArenaEvent) {
  bufferedEvents.push(event);
  if (bufferedEvents.length > MAX_BUFFERED_EVENTS) bufferedEvents.shift();
}

export async function sendEvent(event: ArenaEvent) {
  if (!__DEV__ || !COLLECTOR_URL) return;
  try {
    await fetch(`${COLLECTOR_URL}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {
    // silently ignore collector connection errors
  }
}

// --- Console patching ---

function patchConsole() {
  const orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  function makePatched(level: "log" | "warn" | "error") {
    return (...args: unknown[]) => {
      orig[level](...args);
      const evt: ConsoleEvent = {
        ts: new Date().toISOString(),
        type: "console",
        source: "frontend",
        message: String(args[0] ?? ""),
        data: { level, args },
      };
      addEvent(evt);
      sendEvent(evt);
    };
  }

  console.log = makePatched("log");
  console.warn = makePatched("warn");
  console.error = makePatched("error");
}

// --- Global error catching ---

function setupErrorHandlers() {
  if (typeof window !== "undefined") {
    window.addEventListener("error", (e: Event) => {
      const err = e as ErrorEvent;
      const evt: ArenaErrorEvent = {
        ts: new Date().toISOString(),
        type: "error",
        source: "frontend",
        message: err.message ?? "Unknown error",
        data: {
          message: err.message ?? "Unknown error",
          stack: err.error?.stack,
        },
      };
      addEvent(evt);
      sendEvent(evt);
    });

    window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
      const evt: ArenaErrorEvent = {
        ts: new Date().toISOString(),
        type: "error",
        source: "frontend",
        message: String(e.reason?.message ?? e.reason ?? "Unhandled rejection"),
        data: {
          message: String(e.reason?.message ?? e.reason ?? "Unhandled rejection"),
          stack: e.reason?.stack,
        },
      };
      addEvent(evt);
      sendEvent(evt);
    });
  }
}

// --- Fetch wrapping ---

function patchFetch() {
  const origFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const startTime = Date.now();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? "GET";

    try {
      const response = await origFetch(input, init);
      const durationMs = Date.now() - startTime;

      if (url.includes("/api/") || url.includes("/trpc")) {
        const evt: NetworkEvent = {
          ts: new Date().toISOString(),
          type: "network",
          source: "frontend",
          message: `${method} ${url} → ${response.status}`,
          data: {
            method,
            url,
            status: response.status,
            durationMs,
          },
        };
        addEvent(evt);
        sendEvent(evt);
      }

      return response;
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const evt: NetworkEvent = {
        ts: new Date().toISOString(),
        type: "network",
        source: "frontend",
        message: `${method} ${url} → NETWORK ERROR`,
        data: {
          method,
          url,
          durationMs,
          error: String(err),
        },
      };
      addEvent(evt);
      sendEvent(evt);
      throw err;
    }
  };
}

// --- Initialize all patches (call once) ---

export function initArenaObserver() {
  if (observerInitialized || !__DEV__) return;
  observerInitialized = true;
  patchConsole();
  setupErrorHandlers();
  patchFetch();
}

// --- Route tracking hook ---

export function useArenaRouteTracker() {
  const segments = useSegments();
  const prevSegmentsRef = useRef<string[]>([]);

  useEffect(() => {
    const current = segments.join("/") || "/";
    const prev = prevSegmentsRef.current.join("/") || "/";

    if (current !== prev) {
      lastRoute = current;
      const evt: NavigationEvent = {
        ts: new Date().toISOString(),
        type: "navigation",
        source: "frontend",
        message: `${prev} → ${current}`,
        data: { from: prev, to: current },
      };
      addEvent(evt);
      sendEvent(evt);
      prevSegmentsRef.current = [...segments];
    }
  }, [segments]);
}

// --- React Context ---

const ArenaObserverContext = createContext<{ collectorUrl: string }>({
  collectorUrl: COLLECTOR_URL,
});

export function useArenaObserver() {
  return useContext(ArenaObserverContext);
}

export function ArenaObserverProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initArenaObserver();
  }, []);

  if (!__DEV__) return <>{children}</>;

  return (
    <ArenaObserverContext.Provider value={{ collectorUrl: COLLECTOR_URL }}>
      {children}
    </ArenaObserverContext.Provider>
  );
}

export { lastRoute };
