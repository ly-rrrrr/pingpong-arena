import { Text, View, Pressable } from "react-native";
import type { CampusBroadcastView } from "@/server/matching";

export function getRankColor(rankTier: string): string {
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

export function formatCreatedAt(createdAt: string) {
  const diffMs = Date.now() - Date.parse(createdAt);
  if (!Number.isFinite(diffMs) || diffMs < 60_000) return "刚刚";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}分钟前`;
  return `${Math.floor(minutes / 60)}小时前`;
}

export function BroadcastCard({
  broadcast,
  onAccept,
  isMine,
  isMatched,
}: {
  broadcast: CampusBroadcastView;
  onAccept: () => void;
  isMine?: boolean;
  isMatched?: boolean;
}) {
  const matched = isMatched || broadcast.status === "matched";
  const countStr = matched ? "1/1" : "0/1";

  return (
    <View
      className={`bg-surface rounded-2xl p-4 mb-3 border ${
        matched ? "border-success/50" : isMine ? "border-accent/50" : "border-border"
      }`}
    >
      <View className="flex-row items-center mb-3">
        <View className="w-12 h-12 rounded-full bg-background items-center justify-center mr-3">
          <Text className="text-xl">{broadcast.avatar}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center flex-wrap">
            <Text className="text-sm font-bold text-foreground">{broadcast.nickname}</Text>
            {isMine && (
              <View className="ml-2 px-2 py-0.5 rounded-full bg-accent/15">
                <Text className="text-[10px] font-bold text-accent">我的</Text>
              </View>
            )}
            <View
              className="ml-2 px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${getRankColor(broadcast.rankTier)}25` }}
            >
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
        <View className={`rounded-full px-2.5 py-1 ${matched ? "bg-success/15" : "bg-muted/10"}`}>
          <Text className={`text-xs font-bold ${matched ? "text-success" : "text-muted"}`}>{countStr}</Text>
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

      {isMine ? (
        matched ? (
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            onPress={onAccept}
          >
            <View className="bg-success rounded-xl py-3 items-center">
              <Text className="text-sm font-bold text-background">查看确认 →</Text>
            </View>
          </Pressable>
        ) : (
          <View className="bg-muted/10 rounded-xl py-3 items-center">
            <Text className="text-sm text-muted">等待匹配中...</Text>
          </View>
        )
      ) : (
        <Pressable
          style={({ pressed }) => [{ opacity: matched ? 0.5 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          onPress={matched ? undefined : onAccept}
          disabled={matched}
        >
          <View className={`rounded-xl py-3 items-center ${matched ? "bg-success/20" : "bg-primary"}`}>
            <Text className={`text-sm font-bold ${matched ? "text-success" : "text-background"}`}>
              {matched ? "已有人确认匹配" : "接受匹配"}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}
