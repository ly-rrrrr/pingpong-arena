import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useAppData } from "@/lib/app-data";
import { useMatching } from "@/lib/matching-context";
import { trpc } from "@/lib/trpc";
import { useCampusLocation } from "@/hooks/use-campus-location";
import type { CampusBroadcastView, Coordinates, LobbyUser } from "@/server/matching";

const DEMO_CAMPUS_LOCATION: Coordinates = {
  latitude: 26.0608,
  longitude: 119.2005,
};

// 多设备测试用身份 — 每台手机选一个不同用户
const TEST_USERS: Array<{ id: string; nickname: string; avatar: string; rankTier: string; score: number }> = [
  { id: "user_001", nickname: "乒乓小王子", avatar: "🏓", rankTier: "黄金", score: 1580 },
  { id: "campus_user_001", nickname: "同校快攻手", avatar: "⚡", rankTier: "黄金", score: 1510 },
  { id: "campus_user_002", nickname: "体育馆球友", avatar: "🏀", rankTier: "铂金", score: 1680 },
];

function getRankColor(rankTier: string): string {
  const colors: Record<string, string> = {
    青铜: "#CD7F32",
    白银: "#C0C0C0",
    黄金: "#D6A100",
    铂金: "#00A6B2",
    钻石: "#55A6D9",
    大师: "#D84C91",
    王者: "#E65A2E",
  };
  return colors[rankTier] || "#D6A100";
}

function formatCreatedAt(createdAt: string) {
  const diffMs = Date.now() - Date.parse(createdAt);
  if (!Number.isFinite(diffMs) || diffMs < 60_000) return "刚刚";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}分钟前`;
  return `${Math.floor(minutes / 60)}小时前`;
}

function BroadcastCard({
  broadcast,
  onAccept,
}: {
  broadcast: CampusBroadcastView;
  onAccept: () => void;
}) {
  return (
    <View className="bg-surface rounded-2xl p-4 mb-3 border border-border">
      <View className="flex-row items-center mb-3">
        <View className="w-12 h-12 rounded-full bg-background items-center justify-center mr-3">
          <Text className="text-xl">{broadcast.avatar}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center flex-wrap">
            <Text className="text-sm font-bold text-foreground">{broadcast.nickname}</Text>
            <View className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${getRankColor(broadcast.rankTier)}25` }}>
              <Text className="text-[10px] font-bold" style={{ color: getRankColor(broadcast.rankTier) }}>
                {broadcast.rankTier}
              </Text>
            </View>
            <Text className="text-xs text-muted ml-2">积分 {broadcast.score}</Text>
          </View>
          <View className="flex-row items-center mt-1">
            <Text className="text-xs text-primary">粗略距离 {broadcast.approxDistance}</Text>
            <Text className="text-xs text-muted ml-2">· {formatCreatedAt(broadcast.createdAt)}</Text>
          </View>
        </View>
      </View>

      <Text className="text-sm text-foreground mb-2 leading-5">"{broadcast.message}"</Text>

      <View className="flex-row items-center mb-3 flex-wrap gap-2">
        {broadcast.preferredTime && (
          <View className="bg-primary/10 px-2.5 py-1 rounded-full">
            <Text className="text-xs text-primary">时间 {broadcast.preferredTime}</Text>
          </View>
        )}
        {broadcast.preferredVenue && (
          <View className="bg-accent/10 px-2.5 py-1 rounded-full">
            <Text className="text-xs text-accent">场地 {broadcast.preferredVenue}</Text>
          </View>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        onPress={onAccept}
      >
        <View className="bg-primary rounded-xl py-3 items-center">
          <Text className="text-sm font-bold text-background">接受匹配</Text>
        </View>
      </Pressable>
    </View>
  );
}

function LobbyUserRow({ user }: { user: LobbyUser }) {
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-border last:border-b-0">
      <View className="flex-row items-center">
        <View className="w-9 h-9 rounded-full bg-background items-center justify-center mr-3">
          <Text className="text-base">{user.avatar}</Text>
        </View>
        <View>
          <Text className="text-sm font-medium text-foreground">{user.nickname}</Text>
          <Text className="text-xs text-muted">{user.rankTier} · {user.score}分</Text>
        </View>
      </View>
      <Text className={`text-xs ${user.status === "matching" ? "text-primary" : "text-success"}`}>
        {user.status === "matching" ? "找球友" : "在线"}
      </Text>
    </View>
  );
}

export default function MatchingScreen() {
  const router = useRouter();
  const { currentUser } = useAppData();
  const { state, dispatch } = useMatching();
  const [showPublish, setShowPublish] = useState(false);
  const [message, setMessage] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [devUserIndex, setDevUserIndex] = useState(0);

  const devUser = TEST_USERS[devUserIndex] ?? TEST_USERS[0];

  const campusUser = useMemo(
    () => ({
      id: devUser.id,
      nickname: devUser.nickname,
      avatar: devUser.avatar,
      rankTier: devUser.rankTier,
      score: devUser.score,
    }),
    [devUser],
  );

  const {
    status,
    campus,
    viewerLocation,
    isLowAccuracy,
    gateMessage,
    enterCampus,
    retry,
    openSettings,
    enterWithLocation,
  } = useCampusLocation({ user: campusUser });

  const createBroadcastMutation = trpc.matching.createBroadcast.useMutation();
  const cancelBroadcastMutation = trpc.matching.cancelBroadcast.useMutation();

  const campusId = campus?.id ?? "__no_campus__";
  const lobbyQuery = trpc.matching.listLobby.useQuery(
    { campusId },
    { enabled: Boolean(campus), refetchInterval: 15_000 },
  );
  const broadcastsQuery = trpc.matching.listBroadcasts.useQuery(
    { campusId, viewerLocation: viewerLocation ?? undefined },
    { enabled: Boolean(campus), refetchInterval: 10_000 },
  );

  const onlineUsers = (lobbyQuery.data ?? []).filter((user) => user.id !== devUser.id);
  const activeBroadcasts = (broadcastsQuery.data ?? []).filter((broadcast) => broadcast.userId !== devUser.id);
  const canUseLobby = status === "inside" && Boolean(campus);

  const handlePublish = async () => {
    if (!canUseLobby) {
      Alert.alert("无法发布", "请先通过校区定位校验并进入大厅。");
      return;
    }
    if (!message.trim()) {
      Alert.alert("提示", "请输入匹配留言");
      return;
    }

    try {
      await createBroadcastMutation.mutateAsync({
        userId: devUser.id,
        message: message.trim(),
        preferredTime: preferredTime.trim() || undefined,
      });
      dispatch({ type: "START_BROADCAST", message: message.trim() });
      setShowPublish(false);
      setMessage("");
      setPreferredTime("");
      await Promise.all([lobbyQuery.refetch(), broadcastsQuery.refetch()]);
      Alert.alert("发布成功", "匹配广播已发出，同校区在线球友可以看到。");
    } catch (error) {
      console.warn("[Matching] Create broadcast failed:", error);
      Alert.alert("发布失败", "请重新进入校区大厅后再发布。");
    }
  };

  const handleCancelBroadcast = async () => {
    try {
      await cancelBroadcastMutation.mutateAsync({ userId: devUser.id });
      await Promise.all([lobbyQuery.refetch(), broadcastsQuery.refetch()]);
    } finally {
      dispatch({ type: "CANCEL_BROADCAST" });
    }
  };

  const handleAcceptBroadcast = (broadcast: CampusBroadcastView) => {
    Alert.alert("接受匹配", `确定要接受 ${broadcast.nickname} 的匹配邀请吗？`, [
      { text: "取消", style: "cancel" },
      {
        text: "确定",
        onPress: () => {
          dispatch({
            type: "ACCEPT_MATCH",
            opponentId: broadcast.userId,
            opponentNickname: broadcast.nickname,
            opponentAvatar: broadcast.avatar,
            opponentRankTier: broadcast.rankTier,
            opponentApproxDistance: broadcast.approxDistance,
          });
          router.push("/matching/confirm" as any);
        },
      },
    ]);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-4 pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => router.back()}>
          <View className="flex-row items-center mb-4">
            <Text className="text-primary text-base">← 返回</Text>
          </View>
        </Pressable>

        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-foreground">附近匹配</Text>
          <View className={`px-3 py-1.5 rounded-full ${canUseLobby ? "bg-success/15" : "bg-muted/10"}`}>
            <Text className={`text-xs font-medium ${canUseLobby ? "text-success" : "text-muted"}`}>
              {canUseLobby ? campus?.name : "校区定位"}
            </Text>
          </View>
        </View>

        {/* ===== 多设备测试：身份选择器 ===== */}
        {process.env.NODE_ENV !== "production" && (
          <View className="bg-surface rounded-2xl p-3 mb-4 border border-accent/30">
            <Text className="text-xs text-accent font-bold mb-2">多设备测试 — 每台手机选一个不同身份</Text>
            <View className="flex-row gap-2">
              {TEST_USERS.map((user, idx) => (
                <Pressable
                  key={user.id}
                  style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => {
                    setDevUserIndex(idx);
                    // Reset lobby state when switching users
                    if (canUseLobby) {
                      enterWithLocation(viewerLocation ?? DEMO_CAMPUS_LOCATION);
                    }
                  }}
                >
                  <View className={`rounded-xl py-2.5 px-2 items-center border ${
                    idx === devUserIndex ? "bg-accent/15 border-accent" : "bg-background border-border"
                  }`}>
                    <Text className="text-lg">{user.avatar}</Text>
                    <Text className={`text-xs font-medium mt-0.5 ${idx === devUserIndex ? "text-accent" : "text-foreground"}`}>
                      {user.nickname}
                    </Text>
                    <Text className="text-[10px] text-muted">{user.rankTier}·{user.score}分</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* ===== 校区准入 + 发布广播 (整合为一张卡片) ===== */}
        <View className="bg-surface rounded-2xl p-4 mb-4 border border-border">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-base font-bold text-foreground mb-1">校区准入</Text>
              <Text className="text-sm text-muted leading-5">{gateMessage}</Text>
            </View>
            {status === "checking" && <ActivityIndicator color="#2F80ED" />}
          </View>

          {isLowAccuracy && canUseLobby && (
            <View className="mt-3 bg-warning/10 rounded-lg px-3 py-2 border border-warning/30">
              <Text className="text-xs text-warning">当前GPS精度较低，位置可能不准确</Text>
            </View>
          )}

          {/* 未进入大厅：显示各种入口按钮 */}
          {!canUseLobby && (
            <View className="mt-4 gap-2">
              {status === "idle" && (
                <Pressable
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                  onPress={enterCampus}
                >
                  <View className="bg-primary rounded-xl py-3 items-center">
                    <Text className="text-sm font-bold text-background">使用当前位置进入校区大厅</Text>
                  </View>
                </Pressable>
              )}

              {(status === "denied" || status === "disabled") && (
                <Pressable
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                  onPress={openSettings}
                >
                  <View className="bg-primary rounded-xl py-3 items-center">
                    <Text className="text-sm font-bold text-background">
                      {status === "denied" ? "前往设置开启定位权限" : "前往系统设置开启定位"}
                    </Text>
                  </View>
                </Pressable>
              )}

              {status === "error" && (
                <Pressable
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                  onPress={retry}
                >
                  <View className="bg-primary rounded-xl py-3 items-center">
                    <Text className="text-sm font-bold text-background">重新尝试定位</Text>
                  </View>
                </Pressable>
              )}

              {status === "outside" && (
                <View className="bg-warning/10 rounded-lg px-3 py-2 border border-warning/30">
                  <Text className="text-xs text-warning text-center">请移动到已开放校区范围内后重试</Text>
                </View>
              )}

              {process.env.NODE_ENV !== "production" && (
                <Pressable
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => enterWithLocation(DEMO_CAMPUS_LOCATION)}
                  disabled={status === "checking"}
                >
                  <View className="bg-surface border border-border rounded-xl py-3 items-center">
                    <Text className="text-sm text-muted">开发预览：使用示例校区定位</Text>
                  </View>
                </Pressable>
              )}
            </View>
          )}

          {/* 已进入大厅：直接嵌入发布广播功能 */}
          {canUseLobby && (
            <View className="mt-4 pt-4 border-t border-border">
              {state.isMatching ? (
                <View className="bg-primary/10 rounded-xl p-4 border border-primary/30">
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-primary">正在广播匹配</Text>
                      <Text className="text-xs text-muted mt-0.5">等待同校区球友响应</Text>
                    </View>
                    <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={handleCancelBroadcast}>
                      <View className="bg-error/15 px-3 py-1.5 rounded-full">
                        <Text className="text-xs text-error font-medium">取消</Text>
                      </View>
                    </Pressable>
                  </View>
                </View>
              ) : showPublish ? (
                <View>
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-sm font-bold text-foreground">发布匹配广播</Text>
                    <Pressable
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      onPress={() => setShowPublish(false)}
                    >
                      <Text className="text-xs text-muted">收起</Text>
                    </Pressable>
                  </View>

                  <Text className="text-xs text-muted mb-1">匹配留言 *</Text>
                  <TextInput
                    className="bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm mb-3"
                    placeholder="例如：想约一场三局两胜，积分赛友谊赛都行"
                    placeholderTextColor="#9BA1A6"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={2}
                    returnKeyType="done"
                  />

                  <Text className="text-xs text-muted mb-1">期望时间（可选）</Text>
                  <TextInput
                    className="bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm mb-4"
                    placeholder="例如：今天下午3点-5点"
                    placeholderTextColor="#9BA1A6"
                    value={preferredTime}
                    onChangeText={setPreferredTime}
                    returnKeyType="done"
                  />

                  <Pressable
                    style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
                    onPress={handlePublish}
                    disabled={createBroadcastMutation.isPending}
                  >
                    <View className="bg-accent rounded-xl py-3.5 items-center">
                      <Text className="text-sm font-bold text-background">
                        {createBroadcastMutation.isPending ? "发布中..." : "发布广播"}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
                  onPress={() => setShowPublish(true)}
                >
                  <View className="bg-accent rounded-xl py-3.5 items-center">
                    <Text className="text-sm font-bold text-background">发布匹配广播</Text>
                    <Text className="text-xs text-background/60 mt-0.5">仅同校区在线球友可见</Text>
                  </View>
                </Pressable>
              )}
            </View>
          )}

          <Text className="text-[10px] text-muted mt-3 leading-4">
            校区边界来源：OpenStreetMap 贡献者 / 本地维护
          </Text>
        </View>

        {/* ===== 校区大厅：在线用户 ===== */}
        {canUseLobby && (
          <View className="bg-surface rounded-2xl p-4 mb-4 border border-border">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-bold text-foreground">校区大厅</Text>
              <Text className="text-xs text-muted">{onlineUsers.length} 位同校在线</Text>
            </View>
            {lobbyQuery.isLoading ? (
              <ActivityIndicator color="#2F80ED" />
            ) : onlineUsers.length > 0 ? (
              onlineUsers.slice(0, 4).map((user) => <LobbyUserRow key={user.id} user={user} />)
            ) : (
              <Text className="text-sm text-muted py-2">当前还没有其他在线球友。</Text>
            )}
          </View>
        )}

        <Text className="text-base font-bold text-foreground mb-3">
          附近正在找人 ({canUseLobby ? activeBroadcasts.length : 0})
        </Text>

        {!canUseLobby && (
          <View className="bg-surface rounded-2xl p-4 border border-border">
            <Text className="text-sm text-muted leading-5">通过校区定位校验后，才能查看同校区匹配广播。</Text>
          </View>
        )}

        {canUseLobby && broadcastsQuery.isLoading && <ActivityIndicator color="#2F80ED" />}

        {canUseLobby && !broadcastsQuery.isLoading && activeBroadcasts.length === 0 && (
          <View className="bg-surface rounded-2xl p-4 border border-border">
            <Text className="text-sm text-muted leading-5">当前没有其他同校区匹配广播，可以先发布自己的需求。</Text>
          </View>
        )}

        {canUseLobby &&
          activeBroadcasts.map((broadcast) => (
            <BroadcastCard
              key={broadcast.id}
              broadcast={broadcast}
              onAccept={() => handleAcceptBroadcast(broadcast)}
            />
          ))}
      </ScrollView>
    </ScreenContainer>
  );
}
