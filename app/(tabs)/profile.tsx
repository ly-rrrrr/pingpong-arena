import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { currentUser, techAnalysis } from "@/lib/mock-data";

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

function RadarChart() {
  const dimensions = [
    { label: '发球', value: techAnalysis.dimensions.serve },
    { label: '接发球', value: techAnalysis.dimensions.receive },
    { label: '正手', value: techAnalysis.dimensions.forehand },
    { label: '反手', value: techAnalysis.dimensions.backhand },
    { label: '步法', value: techAnalysis.dimensions.footwork },
    { label: '心态', value: techAnalysis.dimensions.mentality },
  ];

  return (
    <View className="bg-surface rounded-2xl p-4 border border-border mb-4">
      <Text className="text-base font-bold text-foreground mb-3">🎯 技术雷达</Text>
      <View className="flex-row flex-wrap">
        {dimensions.map((dim) => (
          <View key={dim.label} className="w-1/3 items-center mb-3">
            <View className="w-14 h-14 rounded-full items-center justify-center border-2 border-primary/30 mb-1">
              <Text className="text-sm font-bold text-primary">{dim.value}</Text>
            </View>
            <Text className="text-xs text-muted">{dim.label}</Text>
          </View>
        ))}
      </View>
      <View className="bg-background rounded-lg p-3 mt-2">
        <Text className="text-xs text-muted text-center">
          综合评分 <Text className="text-lg font-bold text-accent">{techAnalysis.overall}</Text> / 100
        </Text>
      </View>
    </View>
  );
}

function TrendChart() {
  const maxScore = Math.max(...techAnalysis.trend.map(t => t.score));
  const minScore = Math.min(...techAnalysis.trend.map(t => t.score));
  const range = maxScore - minScore || 1;

  return (
    <View className="bg-surface rounded-2xl p-4 border border-border mb-4">
      <Text className="text-base font-bold text-foreground mb-3">📈 成长趋势</Text>
      <View className="flex-row items-end justify-around h-24 px-2">
        {techAnalysis.trend.map((point, idx) => {
          const height = ((point.score - minScore) / range) * 60 + 20;
          return (
            <View key={idx} className="items-center">
              <Text className="text-[10px] text-muted mb-1">{point.score}</Text>
              <View
                className="w-6 rounded-t-md bg-primary"
                style={{ height }}
              />
              <Text className="text-[10px] text-muted mt-1">{point.date}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="px-4 pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* 个人信息卡片 */}
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

          {/* 数据统计 */}
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
              <Text className="text-xs text-muted">连胜</Text>
            </View>
          </View>
        </View>

        {/* 技术雷达图 */}
        <RadarChart />

        {/* 成长趋势 */}
        <TrendChart />

        {/* AI建议 */}
        <View className="bg-surface rounded-2xl p-4 border border-border mb-4">
          <Text className="text-base font-bold text-foreground mb-3">🤖 AI 训练建议</Text>
          {techAnalysis.suggestions.map((suggestion, idx) => (
            <View key={idx} className="flex-row mb-2">
              <Text className="text-accent mr-2 text-sm">•</Text>
              <Text className="text-sm text-foreground flex-1 leading-5">{suggestion}</Text>
            </View>
          ))}
        </View>

        {/* 优势与不足 */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-success/10 rounded-xl p-3 border border-success/20">
            <Text className="text-sm font-bold text-success mb-2">💪 优势</Text>
            {techAnalysis.strengths.map((s, idx) => (
              <Text key={idx} className="text-xs text-foreground mb-1 leading-4">{s}</Text>
            ))}
          </View>
          <View className="flex-1 bg-error/10 rounded-xl p-3 border border-error/20">
            <Text className="text-sm font-bold text-error mb-2">📌 待提升</Text>
            {techAnalysis.weaknesses.map((w, idx) => (
              <Text key={idx} className="text-xs text-foreground mb-1 leading-4">{w}</Text>
            ))}
          </View>
        </View>

        {/* 成就徽章 */}
        <View className="bg-surface rounded-2xl p-4 border border-border mb-4">
          <Text className="text-base font-bold text-foreground mb-3">🏅 成就徽章</Text>
          <View className="flex-row flex-wrap gap-3">
            {[
              { emoji: '🔥', name: '三连胜', desc: '连续赢得3场比赛' },
              { emoji: '🎯', name: '精准发球', desc: '发球得分率超过70%' },
              { emoji: '⚡', name: '速战速决', desc: '3-0横扫对手' },
              { emoji: '🛡️', name: '绝地反击', desc: '落后2局逆转获胜' },
              { emoji: '📈', name: '稳步上升', desc: '连续4周积分上涨' },
              { emoji: '🤝', name: '社交达人', desc: '添加10位好友' },
            ].map((badge) => (
              <View key={badge.name} className="w-[30%] items-center bg-background rounded-lg p-2">
                <Text className="text-2xl mb-1">{badge.emoji}</Text>
                <Text className="text-[10px] font-medium text-foreground">{badge.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 设置入口 */}
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
