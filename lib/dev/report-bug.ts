/**
 * Arena Watcher — Report Bug
 *
 * Collects all buffered frontend events, state snapshots, and user
 * description, then sends them to the local collector as an incident.
 */

import { Platform } from "react-native";
import { getBufferedEvents, getCollectorUrl, lastRoute } from "./arena-observer";
import { captureStateSnapshot } from "./state-snapshot";
import type { ReportBugInput, ArenaEvent } from "./types";

export async function reportBug(input: ReportBugInput = {}) {
  if (!__DEV__) return;

  const events = getBufferedEvents();
  const stateSnapshot = await captureStateSnapshot();

  const payload = {
    platform: Platform.OS as "ios" | "android" | "web",
    expoMode: "expo-go" as const,
    route: lastRoute || "unknown",
    description: input.description ?? "用户在测试时点击了报错按钮，请结合最近事件自动分析。",
    severity: input.severity ?? "major",
    expected: input.expected,
    actual: input.actual,
    recentActions: extractRecentActions(events),
    stateSnapshot,
    timeline: events,
  };

  const collectorUrl = getCollectorUrl();

  try {
    const res = await fetch(`${collectorUrl}/incident`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log(`[arena-watch] Bug reported: ${(data as Record<string, unknown>).id}`);
  } catch (err) {
    console.warn("[arena-watch] Failed to report bug. Is the collector running?", String(err));
  }
}

function extractRecentActions(events: ArenaEvent[]): string[] {
  const actions: string[] = [];
  for (const evt of events.slice(-100)) {
    switch (evt.type) {
      case "navigation":
        actions.push(`导航到 ${(evt as { data?: { to?: string } }).data?.to ?? "?"}`);
        break;
      case "tap":
        actions.push(`点击 ${evt.message}`);
        break;
      case "network":
        actions.push(
          `${(evt as { data?: { method?: string; url?: string } }).data?.method ?? ""} ${(evt as { data?: { url?: string } }).data?.url ?? ""}`
        );
        break;
      case "error":
        actions.push(`错误: ${evt.message}`);
        break;
    }
  }
  return actions.slice(-30);
}
