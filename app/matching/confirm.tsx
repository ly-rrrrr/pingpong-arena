import { useState, useEffect, useRef } from "react";
import { Alert, Text, View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useMatching } from "@/lib/matching-context";
import { trpc } from "@/lib/trpc";

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    matchRequestId: string;
    role: "broadcaster" | "acceptor";
    opponentId: string;
    myId: string;
  }>();
  const { matchRequestId, role, myId: currentUserId } = params;
  const { state, dispatch } = useMatching();

  const [myConfirmed, setMyConfirmed] = useState(role === "broadcaster");
  const [opponentConfirmed, setOpponentConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const autoConfirmed = useRef(false);

  const confirmMutation = trpc.matching.confirmMatchFromAcceptor.useMutation();
  const respondMutation = trpc.matching.respondToMatchRequest.useMutation();
  const declineMutation = trpc.matching.declineMatchRequest.useMutation();
  const statusQuery = trpc.matching.getMatchRequestStatus.useQuery(
    { matchRequestId: matchRequestId ?? "" },
    { enabled: !!matchRequestId, refetchInterval: 2000 },
  );

  // Watch status — update confirmed states, navigate when both done
  useEffect(() => {
    const s = statusQuery.data;
    if (!s) return;

    const mySideConfirmed = role === "broadcaster" ? s.toConfirmed : s.fromConfirmed;
    const oppSideConfirmed = role === "broadcaster" ? s.fromConfirmed : s.toConfirmed;

    setMyConfirmed(mySideConfirmed);
    setOpponentConfirmed(oppSideConfirmed);

    if (mySideConfirmed && oppSideConfirmed) {
      const timer = setTimeout(() => {
        dispatch({ type: "BOTH_CONFIRMED" });
        router.replace({
          pathname: "/matching/channel",
          params: { matchRequestId, myId: currentUserId },
        } as any);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [statusQuery.data, role, dispatch, router]);

  // Broadcaster: auto-confirm on mount (accept the incoming match request)
  useEffect(() => {
    if (role === "broadcaster" && matchRequestId && !autoConfirmed.current) {
      autoConfirmed.current = true;
      respondMutation.mutate(
        { matchRequestId, userId: currentUserId ?? "", accept: true },
        { onError: (err) => { console.warn("[Confirm] auto-accept failed:", err.message); setError("自动确认失败：" + (err.message ?? "")); } },
      );
    }
  }, [role, matchRequestId, currentUserId]);

  // Acceptor: tap to confirm
  const handleConfirm = async () => {
    if (!matchRequestId || confirming) return;
    setConfirming(true);
    setError("");
    try {
      await confirmMutation.mutateAsync({
        matchRequestId,
        userId: currentUserId ?? "",
      });
    } catch (err: any) {
      setError(err?.message ?? "确认失败");
      setConfirming(false);
    }
  };

  // Cancel match — decline on server and go back
  const handleCancel = () => {
    Alert.alert("取消匹配", "确定要取消此次匹配吗？", [
      { text: "否", style: "cancel" },
      {
        text: "是",
        style: "destructive",
        onPress: () => {
          // Decline the match request on server
          if (matchRequestId) {
            declineMutation.mutate({ matchRequestId, userId: currentUserId ?? "" });
          }
          dispatch({ type: "CANCEL_SESSION" });
          router.back();
        },
      },
    ]);
  };

  if (!state.session) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="p-4 items-center justify-center">
        <Text className="text-foreground mb-4">会话不存在</Text>
        <Text className="text-xs text-muted mb-2">matchRequestId: {matchRequestId ?? "(无)"}</Text>
        <Text className="text-xs text-muted mb-4">role: {role ?? "(无)"}  myId: {currentUserId ?? "(无)"}</Text>
        <Pressable onPress={() => router.replace("/matching" as any)}>
          <View className="bg-primary rounded-xl px-6 py-3">
            <Text className="text-background font-bold">返回匹配大厅</Text>
          </View>
        </Pressable>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-4 pt-2">
      <View className="flex-1 items-center justify-center">
        <Text className="text-xl font-bold text-foreground mb-2">匹配确认</Text>
        <Text className="text-sm text-muted mb-6 text-center">双方同时点击确认后将进入专属频道</Text>

        {state.session.opponentApproxDistance && (
          <View className="bg-primary/10 rounded-full px-4 py-2 mb-5">
            <Text className="text-xs text-primary font-medium">
              {state.session.opponentApproxDistance === "同校区"
                ? "对方与您在同一校区"
                : `对方距离您${state.session.opponentApproxDistance}`}
            </Text>
          </View>
        )}

        <Text className="text-xs text-muted mb-4">你: {state.session.myId}  |  对方: {state.session.opponentId}</Text>

        {/* 双方头像 */}
        <View className="flex-row items-center mb-8">
          <View className="items-center">
            <View className={`w-20 h-20 rounded-full items-center justify-center border-4 ${myConfirmed ? "border-success bg-success/10" : "border-border bg-surface"}`}>
              <Text className="text-3xl">🏓</Text>
            </View>
            <Text className="text-sm font-medium text-foreground mt-2">我</Text>
            <Text className={`text-xs mt-1 ${myConfirmed ? "text-success font-bold" : "text-muted"}`}>
              {myConfirmed ? "✓ 已确认" : "等待确认"}
            </Text>
          </View>

          <View className="mx-6 items-center">
            <View className={`w-16 h-1 rounded-full ${myConfirmed && opponentConfirmed ? "bg-success" : "bg-border"}`} />
            <Text className="text-lg mt-1">{myConfirmed && opponentConfirmed ? "🤝" : "⚡"}</Text>
          </View>

          <View className="items-center">
            <View className={`w-20 h-20 rounded-full items-center justify-center border-4 ${opponentConfirmed ? "border-success bg-success/10" : "border-border bg-surface"}`}>
              <Text className="text-3xl">{state.session.opponentAvatar}</Text>
            </View>
            <Text className="text-sm font-medium text-foreground mt-2">{state.session.opponentNickname}</Text>
            <Text className={`text-xs mt-1 ${opponentConfirmed ? "text-success font-bold" : "text-muted"}`}>
              {opponentConfirmed ? "✓ 已确认" : "等待确认"}
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

        {error && (
          <View className="bg-error/10 rounded-xl px-6 py-3 mb-4">
            <Text className="text-sm text-error text-center">{error}</Text>
          </View>
        )}

        {/* 确认按钮 (仅acceptor需要点) */}
        {!myConfirmed && role === "acceptor" && (
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            onPress={handleConfirm}
            disabled={confirming}
          >
            <View className={`rounded-2xl px-12 py-4 items-center ${confirming ? "bg-muted" : "bg-primary"}`}>
              <Text className="text-base font-bold text-background">
                {confirming ? "确认中..." : "确认匹配"}
              </Text>
            </View>
          </Pressable>
        )}

        {/* 取消按钮 */}
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 20 }]}
          onPress={handleCancel}
        >
          <Text className="text-sm text-muted">取消匹配</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
