import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  challenges as initialChallenges,
  currentUser as initialCurrentUser,
  friends as initialFriends,
  matchRecords as initialMatchRecords,
  rankingData as initialRankingData,
} from './mock-data';
import { applyMatchToRanking, applyMatchToUser, createManualMatchRecord, ManualMatchInput } from './match-rules';
import { Challenge, Friend, MatchRecord, RankingEntry, UserProfile } from './types';

const STORAGE_KEY = 'pingpong-arena:v1:app-data';

type AppData = {
  currentUser: UserProfile;
  matchRecords: MatchRecord[];
  rankingData: RankingEntry[];
  friends: Friend[];
  challenges: Challenge[];
};

type AppDataContextValue = AppData & {
  loading: boolean;
  addManualMatch: (input: Omit<ManualMatchInput, 'currentUser'>) => Promise<MatchRecord>;
};

const initialData: AppData = {
  currentUser: initialCurrentUser,
  matchRecords: initialMatchRecords,
  rankingData: initialRankingData,
  friends: initialFriends,
  challenges: initialChallenges,
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(initialData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!mounted || !stored) return;
        setData(JSON.parse(stored) as AppData);
      })
      .catch((error) => {
        console.warn('[AppData] Failed to load local data:', error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback(async (next: AppData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('[AppData] Failed to persist local data:', error);
    }
  }, []);

  const addManualMatch = useCallback<AppDataContextValue['addManualMatch']>(
    async (input) => {
      const match = createManualMatchRecord({
        currentUser: data.currentUser,
        ...input,
      });
      const currentUser = applyMatchToUser(data.currentUser, match);
      const rankingData = applyMatchToRanking(data.rankingData, currentUser);
      const next = {
        ...data,
        currentUser,
        rankingData,
        matchRecords: [match, ...data.matchRecords],
      };

      setData(next);
      await persist(next);
      return match;
    },
    [data, persist],
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      ...data,
      loading,
      addManualMatch,
    }),
    [addManualMatch, data, loading],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
