import React, { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from "react";
import { AppState, AppStateStatus, Linking, Platform } from "react-native";
import * as Location from "expo-location";

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

const LOW_ACCURACY_THRESHOLD_M = 30;

interface CampusContextType {
  status: LocationGateStatus;
  campus: Campus | null;
  viewerLocation: Coordinates | null;
  accuracy: number | null;
  isLowAccuracy: boolean;
  gateMessage: string;
  enterCampus: (user: CampusUser) => Promise<boolean>;
  retry: (user: CampusUser) => void;
  openSettings: () => void;
  enterWithLocation: (location: Coordinates, user: CampusUser) => Promise<void>;
}

const CampusContext = createContext<CampusContextType | undefined>(undefined);

export function CampusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LocationGateStatus>("idle");
  const [campus, setCampus] = useState<Campus | null>(null);
  const [viewerLocation, setViewerLocation] = useState<Coordinates | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const enterLobbyMutation = trpc.matching.enterLobby.useMutation();
  const refreshPresenceMutation = trpc.matching.refreshPresence.useMutation();

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>("active");
  const wasInsideRef = useRef(false);
  const userRef = useRef<CampusUser | null>(null);
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
      const user = userRef.current;
      const loc = viewerLocationRef.current;
      if (!user || !loc) return;
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
        // heartbeat failures are non-critical
      }
    }, 45_000);
  }, [clearHeartbeat, refreshPresenceMutation]);

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
        // Re-validate on foreground
      }
    });
    return () => sub.remove();
  }, []);

  const attemptEnterInternal = useCallback(
    async (user: CampusUser): Promise<boolean> => {
      setStatus("checking");

      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          setStatus("disabled");
          return false;
        }
      } catch {
        // continue
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setStatus("denied");
        return false;
      }

      let position: Location.LocationObject | null = null;
      try {
        position = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("LOCATION_TIMEOUT")), 15_000),
          ),
        ]);
      } catch {
        try {
          position = await Location.getLastKnownPositionAsync();
        } catch {
          // both failed
        }
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

      try {
        const result = await enterLobbyMutation.mutateAsync({ user, location: coords });
        if (result.allowed) {
          userRef.current = user;
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
    },
    [enterLobbyMutation, startHeartbeat, clearHeartbeat],
  );

  const enterCampus = useCallback(
    async (user: CampusUser) => attemptEnterInternal(user),
    [attemptEnterInternal],
  );

  const retry = useCallback(
    (user: CampusUser) => {
      attemptEnterInternal(user);
    },
    [attemptEnterInternal],
  );

  const enterWithLocation = useCallback(
    async (location: Coordinates, user: CampusUser) => {
      setViewerLocation(location);
      setStatus("checking");
      try {
        const result = await enterLobbyMutation.mutateAsync({ user, location });
        if (result.allowed) {
          userRef.current = user;
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
    [enterLobbyMutation, startHeartbeat, clearHeartbeat],
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

  const value: CampusContextType = {
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

  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
}

export function useCampusLocation(): CampusContextType {
  const ctx = useContext(CampusContext);
  if (!ctx) throw new Error("useCampusLocation must be used within CampusProvider");
  return ctx;
}
