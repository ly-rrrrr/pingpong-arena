import { ScrollView, Text, View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useAppData } from "@/lib/app-data";
import { createScoreReport } from "@/lib/match-rules";

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { matchRecords } = useAppData();
  const match = matchRecords.find(m => m.id === id);

  if (!match) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="p-4 items-center justify-center">
        <Text className="text-foreground">战报未找到</Text>
      </ScreenContainer>
    );
  }

  const myGames = match.scores.filter(s => s[0] > s[1]).length;
  const oppGames = match.scores.filter(s => s[0] < s[1]).length;
  const report = createScoreReport(match);

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

        {/* 比赛结果头部 */}
        <View className={`rounded-2xl p-5 mb-4 ${match.result === 'win' ? 'bg-success/10' : 'bg-error/10'}`}>
          <Text className="text-center text-sm text-muted mb-2">{match.date} · {match.matchType === 'ranked' ? '积分赛' : '友谊赛'}</Text>
          <View className="flex-row items-center justify-center mb-3">
            <View className="items-center flex-1">
              <Text className="text-3xl mb-1">🏓</Text>
              <Text className="text-sm font-semibold text-foreground">我</Text>
            </View>
            <View className="items-center mx-4">
              <Text className="text-3xl font-bold text-foreground">{myGames} : {oppGames}</Text>
              <Text className={`text-sm font-bold mt-1 ${match.result === 'win' ? 'text-success' : 'text-error'}`}>
                {match.result === 'win' ? '胜利 🎉' : '失败'}
              </Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-3xl mb-1">{match.opponent.avatar}</Text>
              <Text className="text-sm font-semibold text-foreground">{match.opponent.nickname}</Text>
            </View>
          </View>
          {match.scoreChange !== 0 && (
            <Text className={`text-center text-sm ${match.scoreChange > 0 ? 'text-success' : 'text-error'}`}>
              积分 {match.scoreChange > 0 ? '+' : ''}{match.scoreChange}
            </Text>
          )}
        </View>

        {/* 每局比分 */}
        <View className="bg-surface rounded-2xl p-4 mb-4 border border-border">
          <Text className="text-base font-bold text-foreground mb-3">📊 每局比分</Text>
          {match.scores.map((score, idx) => (
            <View key={idx} className="flex-row items-center py-2 border-b border-border/50">
              <Text className="text-sm text-muted w-16">第{idx + 1}局</Text>
              <View className="flex-1 flex-row items-center justify-center">
                <Text className={`text-lg font-bold ${score[0] > score[1] ? 'text-success' : 'text-foreground'}`}>
                  {score[0]}
                </Text>
                <Text className="text-sm text-muted mx-3">:</Text>
                <Text className={`text-lg font-bold ${score[1] > score[0] ? 'text-error' : 'text-foreground'}`}>
                  {score[1]}
                </Text>
              </View>
              <Text className={`text-xs font-medium w-8 text-right ${score[0] > score[1] ? 'text-success' : 'text-error'}`}>
                {score[0] > score[1] ? '胜' : '负'}
              </Text>
            </View>
          ))}
        </View>

        {/* 比分复盘 */}
        <View className="bg-surface rounded-2xl p-4 mb-4 border border-border">
          <Text className="text-base font-bold text-foreground mb-2">📌 比分复盘</Text>
          <Text className="text-sm text-muted leading-5 mb-3">{report.summary}</Text>
          <View className="flex-row flex-wrap">
            {[
              { label: '总小分', value: report.stats.pointDiff > 0 ? `+${report.stats.pointDiff}` : `${report.stats.pointDiff}` },
              { label: '胶着局', value: `${report.stats.closeGames}` },
              { label: '最大分差', value: `${report.stats.largestMargin}` },
            ].map((item) => (
              <View key={item.label} className="w-1/3 items-center mb-2">
                <View className="w-12 h-12 rounded-full items-center justify-center border-2 border-primary/30">
                  <Text className="text-sm font-bold text-primary">{item.value}</Text>
                </View>
                <Text className="text-xs text-muted mt-1">{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 记录洞察 */}
        <View className="bg-surface rounded-2xl p-4 mb-4 border border-border">
          <Text className="text-base font-bold text-foreground mb-3">💡 记录洞察</Text>
          {report.highlights.map((item, idx) => (
            <View key={idx} className="flex-row mb-2">
              <Text className="text-accent mr-2">•</Text>
              <Text className="text-sm text-foreground flex-1 leading-5">{item}</Text>
            </View>
          ))}
          {report.suggestions.map((suggestion, idx) => (
            <View key={`suggestion-${idx}`} className="flex-row mb-2">
              <Text className="text-primary mr-2">•</Text>
              <Text className="text-sm text-muted flex-1 leading-5">{suggestion}</Text>
            </View>
          ))}
        </View>

        {/* 比赛信息 */}
        <View className="bg-surface rounded-2xl p-4 border border-border">
          <Text className="text-base font-bold text-foreground mb-3">📋 比赛信息</Text>
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">比赛类型</Text>
              <Text className="text-sm text-foreground">{match.matchType === 'ranked' ? '积分赛' : '友谊赛'}</Text>
            </View>
            {match.venue && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">比赛场地</Text>
                <Text className="text-sm text-foreground">{match.venue}</Text>
              </View>
            )}
            {match.duration && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">比赛时长</Text>
                <Text className="text-sm text-foreground">{match.duration}分钟</Text>
              </View>
            )}
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">对手段位</Text>
              <Text className="text-sm text-foreground">{match.opponent.rankTier}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
