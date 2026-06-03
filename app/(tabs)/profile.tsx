import { ScrollView, Text, View, Pressable } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAppData } from "@/lib/app-data";
import { createScoreTrend } from "@/lib/match-rules";

function getRankColor(rankTier: string): string {
  const colors: Record<string, string> = {
    '青铜': '#CD7F32',
    '白银': '#C0C0C0',
    '黄金': '#FFD700',
    '铂金': '#00CED1',
    '钻石': '#B9F2FF',
    '大师': '#FF69B4',
    '王者': '#FF4500',
  };
  return colors[rankTier] || '#FFD700';
}

function TrendChart({ trend }: { trend: Array<{ date: string; score: number }> }) {
  const maxScore = Math.max(...trend.map(t => t.score));
  const minScore = Math.min(...trend.map(t => t.score));
  const range = maxScore - minScore || 1;

  return (
    <View className="bg-surface rounded-2xl p-4 border border-border mb-4">
      <Text className="text-base font-bold text-foreground mb-3">📈 积分走势</Text>
      <View className="flex-row items-end justify-around h-24 px-2">
        {trend.map((point, idx) => {
          const height = ((point.score - minScore) / range) * 60 + 20;
          return (
            <View key={`${point.date}-${idx}`} className="items-center">
              <Text className="text-[10px] text-muted mb-1">{point.score}</Text>
              <View className="w-6 rounded-t-md bg-primary" style={{ height }} />
              <Text className="text-[10px] text-muted mt-1">{point.date}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { currentUser, matchRecords } = useAppData();
  const recentMatches = matchRecords.slice(0, 5);
  const recentWins = recentMatches.filter((match) => match.result === 'win').length;
  const rankedMatches = matchRecords.filter((match) => match.matchType === 'ranked');
  const scoreTrend = createScoreTrend(currentUser, rankedMatches);
  const closeGameCount = recentMatches.reduce(
    (sum, match) => sum + match.scores.filter(([my, opp]) => Math.abs(my - opp) <= 2).length,
    0,
  );

  const scoreNotes = [
    `近5场 ${recentWins}胜${recentMatches.length - recentWins}负`,
    `近5场胶着局 ${closeGameCount} 局`,
    rankedMatches.length > 0 ? `积分赛记录 ${rankedMatches.length} 场` : '暂无积分赛记录',
  ];

  return (
    <ScreenContainer className="px-4 pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="bg-surface rounded-2xl p-5 mb-4 border border-border">
          <View className="flex-row items-center mb-4">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mr-4">
              <Text className="text-4xl">{currentUser.avatar}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground">{currentUser.nickname}</Text>
              <View className="flex-row items-center mt-1">
                <View className="px-2.5 py-1 rounded-full mr-2" style={{ backgroundColor: getRankColor(currentUser.rankTier) + '30' }}>
                  <Text className="text-xs font-bold" style={{ color: getRankColor(currentUser.rankTier) }}>{currentUser.rankTier}</Text>
                </View>
                <Text className="text-sm text-muted">积分 {currentUser.score}</Text>
              </View>
              <Text className="text-xs text-muted mt-1">
                {currentUser.totalMatches}场比赛 · 胜率{currentUser.winRate}%
              </Text>
            </View>
          </View>

          <View className="flex-row justify-around bg-background rounded-xl py-3">
            <View className="items-center">
              <Text className="text-lg font-bold text-success">{currentUser.wins}</Text>
              <Text className="text-xs text-muted">胜利</Text>
            </View>
            <View className="items-center">
              <Text className="text-lg font-bold text-error">{currentUser.losses}</Text>
              <Text className="text-xs text-muted">失败</Text>
            </View>
            <View className="items-center">
              <Text className="text-lg font-bold text-accent">{currentUser.streak}</Text>
              <Text className="text-xs text-muted">{currentUser.streak >= 0 ? '连胜' : '连败'}</Text>
            </View>
          </View>
        </View>

        <View className="bg-surface rounded-2xl p-4 border border-border mb-4">
          <Text className="text-base font-bold text-foreground mb-3">📊 比分数据摘要</Text>
          {scoreNotes.map((note, idx) => (
            <View key={idx} className="flex-row mb-2">
              <Text className="text-accent mr-2 text-sm">•</Text>
              <Text className="text-sm text-foreground flex-1 leading-5">{note}</Text>
            </View>
          ))}
          <Text className="text-xs text-muted leading-5 mt-2">
            当前数据只来自手动比分记录，不包含视频动作识别或技术评分。
          </Text>
        </View>

        {scoreTrend.length > 0 && <TrendChart trend={scoreTrend} />}

        <View className="bg-surface rounded-2xl p-4 border border-border mb-4">
          <Text className="text-base font-bold text-foreground mb-3">💡 记录建议</Text>
          {[
            '每场至少记录完整局分，保证胜率和积分统计可靠。',
            '遇到胶着局时，可在后续版本补充关键分备注，提升复盘价值。',
            '当前阶段先沉淀真实比赛结果，视频级技术分析暂不作为产品承诺。',
          ].map((suggestion, idx) => (
            <View key={idx} className="flex-row mb-2">
              <Text className="text-primary mr-2 text-sm">•</Text>
              <Text className="text-sm text-muted flex-1 leading-5">{suggestion}</Text>
            </View>
          ))}
        </View>

        <View className="bg-surface rounded-2xl p-4 border border-border mb-4">
          <Text className="text-base font-bold text-foreground mb-3">🏅 成就徽章</Text>
          <View className="flex-row flex-wrap gap-3">
            {[
              { emoji: '🔥', name: '连胜记录' },
              { emoji: '⚡', name: '速战速决' },
              { emoji: '📈', name: '积分上升' },
              { emoji: '🤝', name: '社交达人' },
            ].map((badge) => (
              <View key={badge.name} className="w-[30%] items-center bg-background rounded-lg p-2">
                <Text className="text-2xl mb-1">{badge.emoji}</Text>
                <Text className="text-[10px] font-medium text-foreground">{badge.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <View className="bg-surface rounded-xl p-4 border border-border flex-row items-center justify-between">
            <Text className="text-sm text-foreground">⚙️ 设置</Text>
            <Text className="text-muted">›</Text>
          </View>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
