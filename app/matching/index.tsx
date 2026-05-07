import { useState } from "react";
import { ScrollView, Text, View, Pressable, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { matchBroadcasts } from "@/lib/matching-mock-data";
import { useMatching } from "@/lib/matching-context";
import { MatchBroadcast } from "@/lib/matching-types";

function getRankColor(rankTier: string): string {
  const colors: Record<string, string> = {
    '青铜': '#CD7F32', '白银': '#C0C0C0', '黄金': '#FFD700',
    '铂金': '#00CED1', '钻石': '#B9F2FF', '大师': '#FF69B4', '王者': '#FF4500',
  };
  return colors[rankTier] || '#FFD700';
}

function BroadcastCard({ broadcast, onAccept }: { broadcast: MatchBroadcast; onAccept: () => void }) {
  return (
    <View className="bg-surface rounded-2xl p-4 mb-3 border border-border">
      <View className="flex-row items-center mb-3">
        <View className="w-12 h-12 rounded-full bg-background items-center justify-center mr-3">
          <Text className="text-xl">{broadcast.avatar}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-sm font-bold text-foreground">{broadcast.nickname}</Text>
            <View className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: getRankColor(broadcast.rankTier) + '25' }}>
              <Text className="text-[10px] font-bold" style={{ color: getRankColor(broadcast.rankTier) }}>{broadcast.rankTier}</Text>
            </View>
            <Text className="text-xs text-muted ml-2">积分 {broadcast.score}</Text>
          </View>
          <View className="flex-row items-center mt-1">
            <Text className="text-xs text-primary">📍 {broadcast.distance}</Text>
            <Text className="text-xs text-muted ml-2">· {broadcast.createdAt}</Text>
          </View>
        </View>
      </View>

      <Text className="text-sm text-foreground mb-2 leading-5">"{broadcast.message}"</Text>

      <View className="flex-row items-center mb-3">
        <View className="bg-primary/10 px-2.5 py-1 rounded-full mr-2">
          <Text className="text-xs text-primary">🕐 {broadcast.preferredTime}</Text>
        </View>
        {broadcast.preferredVenue && (
          <View className="bg-accent/10 px-2.5 py-1 rounded-full">
            <Text className="text-xs text-accent">📍 {broadcast.preferredVenue}</Text>
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

export default function MatchingScreen() {
  const router = useRouter();
  const { state, dispatch } = useMatching();
  const [showPublish, setShowPublish] = useState(false);
  const [message, setMessage] = useState('');
  const [preferredTime, setPreferredTime] = useState('');

  const handlePublish = () => {
    if (!message.trim()) {
      Alert.alert('提示', '请输入匹配留言');
      return;
    }
    dispatch({ type: 'START_BROADCAST', message: message.trim() });
    setShowPublish(false);
    Alert.alert('发布成功', '匹配广播已发出，等待附近球友响应...');
  };

  const handleAcceptBroadcast = (broadcast: MatchBroadcast) => {
    Alert.alert(
      '接受匹配',
      `确定要接受 ${broadcast.nickname} 的匹配邀请吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: () => {
            dispatch({
              type: 'ACCEPT_MATCH',
              opponentId: broadcast.userId,
              opponentNickname: broadcast.nickname,
              opponentAvatar: broadcast.avatar,
              opponentRankTier: broadcast.rankTier,
            });
            router.push('/matching/confirm' as any);
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-4 pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* 返回按钮 */}
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
        >
          <View className="flex-row items-center mb-4">
            <Text className="text-primary text-base">← 返回</Text>
          </View>
        </Pressable>

        {/* 标题 */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-foreground">附近匹配</Text>
          <View className="bg-success/15 px-3 py-1.5 rounded-full">
            <Text className="text-xs text-success font-medium">📡 校园范围</Text>
          </View>
        </View>

        {/* 我的匹配状态 */}
        {state.isMatching && (
          <View className="bg-primary/10 rounded-2xl p-4 mb-4 border border-primary/30">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Text className="text-lg mr-2">📡</Text>
                <View>
                  <Text className="text-sm font-bold text-primary">正在广播匹配...</Text>
                  <Text className="text-xs text-muted mt-0.5">等待附近球友响应</Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                onPress={() => dispatch({ type: 'CANCEL_BROADCAST' })}
              >
                <View className="bg-error/15 px-3 py-1.5 rounded-full">
                  <Text className="text-xs text-error font-medium">取消</Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}

        {/* 发布匹配按钮/表单 */}
        {!state.isMatching && !showPublish && (
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            onPress={() => setShowPublish(true)}
          >
            <View className="bg-accent rounded-2xl py-4 items-center mb-4">
              <Text className="text-lg mb-1">📡</Text>
              <Text className="text-sm font-bold text-background">发布匹配广播</Text>
              <Text className="text-xs text-background/70 mt-0.5">让校园内的球友看到你的匹配需求</Text>
            </View>
          </Pressable>
        )}

        {/* 发布表单 */}
        {showPublish && (
          <View className="bg-surface rounded-2xl p-4 mb-4 border border-border">
            <Text className="text-base font-bold text-foreground mb-3">发布匹配广播</Text>

            <Text className="text-xs text-muted mb-1">匹配留言 *</Text>
            <TextInput
              className="bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm mb-3"
              placeholder="例如：想找个人练练正手，积分赛友谊赛都行"
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

            <View className="flex-row gap-3">
              <Pressable
                style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
                onPress={() => setShowPublish(false)}
              >
                <View className="bg-surface border border-border rounded-xl py-3 items-center">
                  <Text className="text-sm text-muted">取消</Text>
                </View>
              </Pressable>
              <Pressable
                style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
                onPress={handlePublish}
              >
                <View className="bg-primary rounded-xl py-3 items-center">
                  <Text className="text-sm font-bold text-background">发布</Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}

        {/* 区域匹配列表 */}
        <Text className="text-base font-bold text-foreground mb-3">
          🏓 附近正在找人 ({matchBroadcasts.filter(b => b.status === 'active').length})
        </Text>

        {matchBroadcasts
          .filter(b => b.status === 'active')
          .map((broadcast) => (
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
