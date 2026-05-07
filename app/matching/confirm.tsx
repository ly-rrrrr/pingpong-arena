import { useState, useEffect } from "react";
import { Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useMatching } from "@/lib/matching-context";

export default function ConfirmScreen() {
  const router = useRouter();
  const { state, dispatch } = useMatching();
  const [myConfirmed, setMyConfirmed] = useState(false);
  const [opponentConfirmed, setOpponentConfirmed] = useState(false);

  // 模拟对方确认（2秒后自动确认）
  useEffect(() => {
    if (myConfirmed && !opponentConfirmed) {
      const timer = setTimeout(() => {
        setOpponentConfirmed(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [myConfirmed, opponentConfirmed]);

  // 双方都确认后进入频道
  useEffect(() => {
    if (myConfirmed && opponentConfirmed) {
      const timer = setTimeout(() => {
        dispatch({ type: 'BOTH_CONFIRMED' });
        router.replace('/matching/channel' as any);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [myConfirmed, opponentConfirmed]);

  if (!state.session) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="p-4 items-center justify-center">
        <Text className="text-foreground">会话不存在</Text>
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 16 }]} onPress={() => router.back()}>
          <Text className="text-primary">返回</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-4 pt-2">
      <View className="flex-1 items-center justify-center">
        {/* 标题 */}
        <Text className="text-xl font-bold text-foreground mb-2">匹配确认</Text>
        <Text className="text-sm text-muted mb-8 text-center">双方同时点击确认后将进入专属频道</Text>

        {/* 双方头像 */}
        <View className="flex-row items-center mb-8">
          {/* 我 */}
          <View className="items-center">
            <View className={`w-20 h-20 rounded-full items-center justify-center border-4 ${myConfirmed ? 'border-success bg-success/10' : 'border-border bg-surface'}`}>
              <Text className="text-3xl">🏓</Text>
            </View>
            <Text className="text-sm font-medium text-foreground mt-2">我</Text>
            <Text className={`text-xs mt-1 ${myConfirmed ? 'text-success font-bold' : 'text-muted'}`}>
              {myConfirmed ? '✓ 已确认' : '等待确认'}
            </Text>
          </View>

          {/* 连接线 */}
          <View className="mx-6 items-center">
            <View className={`w-16 h-1 rounded-full ${myConfirmed && opponentConfirmed ? 'bg-success' : 'bg-border'}`} />
            <Text className="text-lg mt-1">
              {myConfirmed && opponentConfirmed ? '🤝' : '⚡'}
            </Text>
          </View>

          {/* 对手 */}
          <View className="items-center">
            <View className={`w-20 h-20 rounded-full items-center justify-center border-4 ${opponentConfirmed ? 'border-success bg-success/10' : 'border-border bg-surface'}`}>
              <Text className="text-3xl">{state.session.opponentAvatar}</Text>
            </View>
            <Text className="text-sm font-medium text-foreground mt-2">{state.session.opponentNickname}</Text>
            <Text className={`text-xs mt-1 ${opponentConfirmed ? 'text-success font-bold' : 'text-muted'}`}>
              {opponentConfirmed ? '✓ 已确认' : '等待确认'}
            </Text>
          </View>
        </View>

        {/* 状态提示 */}
        {myConfirmed && opponentConfirmed && (
          <View className="bg-success/10 rounded-xl px-6 py-3 mb-6">
            <Text className="text-sm text-success font-bold text-center">🎉 双方已确认！正在进入频道...</Text>
          </View>
        )}

        {myConfirmed && !opponentConfirmed && (
          <View className="bg-warning/10 rounded-xl px-6 py-3 mb-6">
            <Text className="text-sm text-warning font-medium text-center">等待对方确认中...</Text>
          </View>
        )}

        {/* 确认按钮 */}
        {!myConfirmed && (
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            onPress={() => setMyConfirmed(true)}
          >
            <View className="bg-primary rounded-2xl px-12 py-4 items-center">
              <Text className="text-base font-bold text-background">确认匹配</Text>
            </View>
          </Pressable>
        )}

        {/* 取消按钮 */}
        {!myConfirmed && (
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 16 }]}
            onPress={() => {
              dispatch({ type: 'CANCEL_SESSION' });
              router.back();
            }}
          >
            <Text className="text-sm text-muted">取消匹配</Text>
          </Pressable>
        )}
      </View>
    </ScreenContainer>
  );
}
