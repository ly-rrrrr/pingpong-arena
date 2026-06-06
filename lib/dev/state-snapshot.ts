/**
 * Arena Watcher — State Snapshot
 *
 * Captures key app state at the moment of a bug report:
 * - AsyncStorage content (key list + selected values)
 * - Last known route
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_BLACKLIST = ["expo-image-picker", "expo-secure-store"];
const MAX_VALUE_LENGTH = 500;

export async function captureStateSnapshot(): Promise<{
  route: string;
  asyncStorageKeys: string[];
  asyncStorageSample: Record<string, string>;
}> {
  const keys = await listAsyncStorageKeys();
  const sampleKeys = keys
    .filter((k) => !KEY_BLACKLIST.some((b) => k.includes(b)))
    .slice(0, 20);
  const sample: Record<string, string> = {};

  for (const key of sampleKeys) {
    try {
      const val = await AsyncStorage.getItem(key);
      if (val != null) {
        sample[key] = val.length > MAX_VALUE_LENGTH ? val.slice(0, MAX_VALUE_LENGTH) + "…" : val;
      }
    } catch {
      // key might be unavailable
    }
  }

  return {
    route: "",
    asyncStorageKeys: keys,
    asyncStorageSample: sample,
  };
}

async function listAsyncStorageKeys(): Promise<string[]> {
  try {
    // AsyncStorage doesn't have getAllKeys in all environments
    const raw = await AsyncStorage.getItem("pingpong-arena:v1:app-data");
    const keys: string[] = [];
    if (raw) keys.push("pingpong-arena:v1:app-data");
    keys.push("pingpong-arena:v1:theme");
    keys.push("pingpong-arena:v1:auth");
    return keys;
  } catch {
    return [];
  }
}
