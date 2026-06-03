import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Linking, Platform } from "react-native";

import { trpc } from "@/lib/trpc";
import type { Campus, CampusUser, Coordinates } from "@/server/matching";

export type LocationGateStatus =
  | "idle"
  | "checking"
  | "inside"
  | "outside"
  | "denied"
  | "disabled"
  | "error";

export interface UseCampusLocationOptions {
  user: CampusUser;
  heartbeatIntervalMs?: number;
  locationTimeoutMs?: number;
  locationAccuracy?: Location.Accuracy;
}

export interface UseCampusLocationReturn {
  status: LocationGateStatus;
  campus: Campus | null;
  viewerLocation: Coordinates | null;
  accuracy: number | null;
  isLowAccuracy: boolean;
  gateMessage: string;
  enterCampus: () => Promise<void>;
  retry: () => void;
  openSettings: () => void;
  enterWithLocation: (location: Coordinates) => Promise<void>;
}

const LOW_ACCURACY_THRESHOLD_M = 30;

export function useCampusLocation(
  options: UseCampusLocationOptions,
): UseCampusLocationReturn {
  const {
    user,
    heartbeatIntervalMs = 45_000,
    locationTimeoutMs = 15_000,
    locationAccuracy = Location.Accuracy.High,
  } = options;

  const [status, setStatus] = useState<LocationGateStatus>("idle");
  const [campus, setCampus] = useState<Campus | null>(null);
  const [viewerLocation, setViewerLocation] = useState<Coordinates | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const enterLobbyMutation = trpc.matching.enterLobby.useMutation();
  const refreshPresenceMutation = trpc.matching.refreshPresence.useMutation();

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>("active");
  const wasInsideRef = useRef(false);
  const viewerLocationRef = useRef<Coordinates | null>(null);
  const campusRef = useRef<Campus | null>(null);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current !== null) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatRef.current = setInterval(async () => {
      if (appStateRef.current !== "active" || !wasInsideRef.current) return;
      const loc = viewerLocationRef.current;
      if (!loc) return;
      try {
        const result = await refreshPresenceMutation.mutateAsync({
          userId: user.id,
          location: loc,
        });
        if (!result.ok) {
          setStatus("outside");
          setCampus(null);
          wasInsideRef.current = false;
          clearHeartbeat();
        }
      } catch {
        // heartbeat failures are non-critical; next tick will retry
      }
    }, heartbeatIntervalMs);
  }, [clearHeartbeat, heartbeatIntervalMs, user.id, refreshPresenceMutation]);

  useEffect(() => {
    return () => clearHeartbeat();
  }, [clearHeartbeat]);

  useEffect(() => {
    viewerLocationRef.current = viewerLocation;
  }, [viewerLocation]);

  useEffect(() => {
    campusRef.current = campus;
  }, [campus]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      if (nextState === "active" && wasInsideRef.current) {
        // Re-validate on foreground return
        attemptEnterInternal();
      }
    });
    return () => sub.remove();
  }, []);

  const attemptEnterInternal = useCallback(async (): Promise<boolean> => {
    setStatus("checking");

    // Check system location services
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setStatus("disabled");
        return false;
      }
    } catch {
      // Some devices don't support hasServicesEnabledAsync; continue
    }

    // Request foreground permission
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setStatus("denied");
      return false;
    }

    // Get position with timeout
    let position: Location.LocationObject;
    try {
      position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: locationAccuracy }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("LOCATION_TIMEOUT")), locationTimeoutMs),
        ),
      ]);
    } catch {
      setStatus("error");
      return false;
    }

    if (!position) {
      setStatus("error");
      return false;
    }

    setAccuracy(position.coords.accuracy ?? null);

    const coords: Coordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    setViewerLocation(coords);

    // Call enterLobby
    try {
      const result = await enterLobbyMutation.mutateAsync({ user, location: coords });
      if (result.allowed) {
        setCampus(result.campus);
        setStatus("inside");
        wasInsideRef.current = true;
        startHeartbeat();
        return true;
      } else {
        setCampus(null);
        setStatus("outside");
        wasInsideRef.current = false;
        clearHeartbeat();
        return false;
      }
    } catch {
      setStatus("error");
      return false;
    }
  }, [
    user,
    locationAccuracy,
    locationTimeoutMs,
    enterLobbyMutation,
    startHeartbeat,
    clearHeartbeat,
  ]);

  const enterCampus = useCallback(async () => {
    await attemptEnterInternal();
  }, [attemptEnterInternal]);

  const retry = useCallback(() => {
    attemptEnterInternal();
  }, [attemptEnterInternal]);

  const enterWithLocation = useCallback(
    async (location: Coordinates) => {
      setViewerLocation(location);
      setStatus("checking");
      try {
        const result = await enterLobbyMutation.mutateAsync({ user, location });
        if (result.allowed) {
          setCampus(result.campus);
          setStatus("inside");
          wasInsideRef.current = true;
          startHeartbeat();
        } else {
          setCampus(null);
          setStatus("outside");
          wasInsideRef.current = false;
          clearHeartbeat();
        }
      } catch {
        setStatus("error");
      }
    },
    [user, enterLobbyMutation, startHeartbeat, clearHeartbeat],
  );

  const openSettings = useCallback(() => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  }, []);

  const gateMessage = ((): string => {
    switch (status) {
      case "checking":
        return "正在读取定位并校验校区范围...";
      case "inside":
        return "已确认当前位置位于开放校区内。";
      case "outside":
        return "当前位置不在已开放校区内，暂不能进入校区大厅。";
      case "denied":
        return "需要开启定位权限，才能确认你是否位于校区内。";
      case "disabled":
        return "手机定位服务未开启，请在系统设置中打开定位。";
      case "error":
        return "定位校验失败，请检查网络和GPS信号后重试。";
      default:
        return "进入大厅前需要用手机定位确认你位于已开放校区内。";
    }
  })();

  const isLowAccuracy = accuracy !== null && accuracy > LOW_ACCURACY_THRESHOLD_M;

  return {
    status,
    campus,
    viewerLocation,
    accuracy,
    isLowAccuracy,
    gateMessage,
    enterCampus,
    retry,
    openSettings,
    enterWithLocation,
  };
}
