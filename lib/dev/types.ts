/** Event types captured by the frontend observer. */
export type FrontendEventType =
  | "console"
  | "error"
  | "navigation"
  | "tap"
  | "network"
  | "state"
  | "lifecycle";

export type BackendEventType =
  | "request"
  | "error"
  | "db"
  | "matching"
  | "auth";

export interface ArenaEvent {
  ts: string;
  type: FrontendEventType | BackendEventType;
  source: "frontend" | "backend";
  message: string;
  data?: unknown;
}

export interface ConsoleEvent extends ArenaEvent {
  type: "console";
  data: { level: "log" | "warn" | "error"; args: unknown[] };
}

export interface ErrorEvent extends ArenaEvent {
  type: "error";
  data: { message: string; stack?: string; componentStack?: string };
}

export interface NavigationEvent extends ArenaEvent {
  type: "navigation";
  data: { from?: string; to: string; params?: Record<string, string> };
}

export interface NetworkEvent extends ArenaEvent {
  type: "network";
  data: {
    method: string;
    url: string;
    status?: number;
    durationMs?: number;
    requestBody?: unknown;
    responseBody?: unknown;
    error?: string;
  };
}

export interface StateSnapshotEvent extends ArenaEvent {
  type: "state";
  data: {
    route: string;
    matchingState?: unknown;
    campusStatus?: string;
    asyncStorageKeys?: string[];
  };
}

export interface ArenaIncident {
  id: string;
  createdAt: string;

  app: {
    platform: "ios" | "android" | "web";
    expoMode: "expo-go" | "dev-build" | "web";
    route: string;
    screenName?: string;
    gitCommit?: string;
  };

  user: {
    description?: string;
    expected?: string;
    actual?: string;
    severity?: "blocker" | "major" | "minor";
  };

  timeline: ArenaEvent[];

  frontend: {
    console: string[];
    errors: Array<{
      message: string;
      stack?: string;
      componentStack?: string;
    }>;
    routeHistory: string[];
    recentActions: string[];
    stateSnapshot?: unknown;
    asyncStorageSnapshot?: Record<string, string>;
  };

  backend: {
    requests: Array<{
      method: string;
      path: string;
      status?: number;
      durationMs?: number;
      requestBody?: unknown;
      responseBody?: unknown;
      error?: string;
    }>;
    serverLogs: string[];
    dbEvents?: unknown[];
  };

  project: {
    changedFiles: string[];
    gitDiffSummary: string;
    typecheck?: string;
    testResult?: string;
    lintResult?: string;
  };

  claude: {
    suspectedFiles?: string[];
    fixPlan?: string;
    status: "new" | "analyzing" | "fixed" | "needs-human-check";
  };
}

export interface IncidentSummary {
  id: string;
  createdAt: string;
  route: string;
  severity: string;
  errorCount: number;
  latestError?: string;
  failedRequests: number;
  suspectedFiles: string[];
}

export interface ReportBugInput {
  description?: string;
  severity?: "blocker" | "major" | "minor";
  expected?: string;
  actual?: string;
}
