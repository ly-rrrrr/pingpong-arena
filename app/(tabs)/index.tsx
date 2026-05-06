import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { currentUser, matchRecords } from "@/lib/mock-data";

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

export default function HomeScreen() {
  const router = useRouter();
  const recentMatches = matchRecords.slice(0, 5);
  const recentWins = recentMatches.filter(m => m.result === 'win').length;
  const recentLosses = recentMatches.filter(m => m.result === 'lose').length;

  return (
    <ScreenContainer className="px-4 pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* 用户信息卡片 */}
        <View className="bg-surface rounded-2xl p-5 mb-4 border border-border">
          <View className="flex-row items-center mb-4">
            <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mr-4">
              <Text className="text-3xl">{currentUser.avatar}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground">{currentUser.nickname}</Text>
              <View className="flex-row items-center mt-1">
                <View className="px-2 py-0.5 rounded-full mr-2" style={{ backgroundColor: getRankColor(currentUser.rankTier) + '30' }}>
                  <Text className="text-xs font-semibold" style={{ color: getRankColor(currentUser.rankTier) }}>{currentUser.rankTier}</Text>
                </View>
                <Text className="text-sm text-muted">积分 {currentUser.score}</Text>
              </View>
            </View>
            {currentUser.streak > 0 && (
              <View className="bg-accent/10 px-3 py-1.5 rounded-full">
                <Text className="text-xs font-bold text-accent">{currentUser.streak}连胜🔥</Text>
              </View>
            )}
          </View>

          {/* 战绩统计 */}
          <View className="flex-row justify-around bg-background rounded-xl py-3">
            <View className="items-center">
              <Text className="text-lg font-bold text-foreground">{currentUser.totalMatches}</Text>
              <Text className="text-xs text-muted">总场次</Text>
            </View>
            <View className="items-center">
              <Text className="text-lg font-bold text-success">{currentUser.wins}</Text>
              <Text className="text-xs text-muted">胜</Text>
            </View>
            <View className="items-center">
              <Text className="text-lg font-bold text-error">{currentUser.losses}</Text>
              <Text className="text-xs text-muted">负</Text>
            </View>
            <View className="items-center">
              <Text className="text-lg font-bold text-accent">{currentUser.winRate}%</Text>
              <Text className="text-xs text-muted">胜率</Text>
            </View>
          </View>
        </View>

        {/* 快捷操作 */}
        <View className="flex-row mb-4 gap-3">
          <Pressable
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push('/record-match' as any)}
          >
            <View className="bg-primary rounded-xl py-4 items-center">
              <Text className="text-2xl mb-1">🏓</Text>
              <Text className="text-sm font-semibold text-background">记录比赛</Text>
            </View>
          </Pressable>
          <Pressable
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push('/(tabs)/challenge' as any)}
          >
            <View className="bg-accent rounded-xl py-4 items-center">
              <Text className="text-2xl mb-1">⚔️</Text>
              <Text className="text-sm font-semibold text-background">发起挑战</Text>
            </View>
          </Pressable>
          <Pressable
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push('/(tabs)/profile' as any)}
          >
            <View className="bg-surface border border-border rounded-xl py-4 items-center">
              <Text className="text-2xl mb-1">📊</Text>
              <Text className="text-sm font-semibold text-foreground">AI分析</Text>
            </View>
          </Pressable>
        </View>

        {/* 最近战绩 */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-bold text-foreground">最近战绩</Text>
            <View className="flex-row items-center">
              <Text className="text-sm text-success font-semibold">{recentWins}胜</Text>
              <Text className="text-sm text-muted mx-1">/</Text>
              <Text className="text-sm text-error font-semibold">{recentLosses}负</Text>
            </View>
          </View>

          {recentMatches.map((match) => (
            <Pressable
              key={match.id}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              onPress={() => router.push(`/report-detail?id=${match.id}` as any)}
            >
              <View className="bg-surface rounded-xl p-4 mb-2 border border-border flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-background items-center justify-center mr-3">
                  <Text className="text-lg">{match.opponent.avatar}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">{match.opponent.nickname}</Text>
                  <Text className="text-xs text-muted mt-0.5">
                    {match.date} · {match.matchType === 'ranked' ? '积分赛' : '友谊赛'}
                  </Text>
                </View>
                <View className="items-end">
                  <View className="flex-row items-center">
                    <Text className={`text-sm font-bold ${match.result === 'win' ? 'text-success' : 'text-error'}`}>
                      {match.result === 'win' ? '胜' : '负'}
                    </Text>
                    <Text className="text-xs text-muted ml-1">
                      {match.scores.filter(s => s[0] > s[1]).length}-{match.scores.filter(s => s[0] < s[1]).length}
                    </Text>
                  </View>
                  {match.scoreChange !== 0 && (
                    <Text className={`text-xs mt-0.5 ${match.scoreChange > 0 ? 'text-success' : 'text-error'}`}>
                      {match.scoreChange > 0 ? '+' : ''}{match.scoreChange}分
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* 今日推荐 */}
        <View className="bg-surface rounded-2xl p-4 border border-border">
          <Text className="text-lg font-bold text-foreground mb-2">💡 今日训练建议</Text>
          <Text className="text-sm text-muted leading-5">
            根据您最近的比赛表现，建议今天重点练习反手位接发球。可以进行20分钟多球训练，注意判断来球旋转方向。
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
