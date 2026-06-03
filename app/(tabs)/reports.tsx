import { Text, View, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useAppData } from "@/lib/app-data";
import { MatchRecord } from "@/lib/types";

function MatchCard({ match }: { match: MatchRecord }) {
  const router = useRouter();
  const myGames = match.scores.filter(s => s[0] > s[1]).length;
  const oppGames = match.scores.filter(s => s[0] < s[1]).length;

  return (
    <Pressable
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      onPress={() => router.push(`/report-detail?id=${match.id}` as any)}
    >
      <View className="bg-surface rounded-xl p-4 mb-3 border border-border">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View className="w-11 h-11 rounded-full bg-background items-center justify-center mr-3">
              <Text className="text-xl">{match.opponent.avatar}</Text>
            </View>
            <View>
              <Text className="text-base font-semibold text-foreground">{match.opponent.nickname}</Text>
              <Text className="text-xs text-muted mt-0.5">{match.opponent.rankTier} · {match.date}</Text>
            </View>
          </View>
          <View className={`px-3 py-1.5 rounded-full ${match.result === 'win' ? 'bg-success/15' : 'bg-error/15'}`}>
            <Text className={`text-sm font-bold ${match.result === 'win' ? 'text-success' : 'text-error'}`}>
              {match.result === 'win' ? '胜利' : '失败'}
            </Text>
          </View>
        </View>

        {/* 比分详情 */}
        <View className="bg-background rounded-lg p-3 mb-3">
          <View className="flex-row justify-center items-center mb-2">
            <Text className="text-2xl font-bold text-foreground">{myGames}</Text>
            <Text className="text-lg text-muted mx-3">:</Text>
            <Text className="text-2xl font-bold text-foreground">{oppGames}</Text>
          </View>
          <View className="flex-row justify-center flex-wrap gap-2">
            {match.scores.map((score, idx) => (
              <View key={idx} className="bg-surface px-2 py-1 rounded">
                <Text className={`text-xs font-medium ${score[0] > score[1] ? 'text-success' : 'text-error'}`}>
                  {score[0]}-{score[1]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 底部信息 */}
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <Text className="text-xs text-muted">
              {match.matchType === 'ranked' ? '🏆 积分赛' : '🤝 友谊赛'}
            </Text>
            {match.venue && (
              <Text className="text-xs text-muted ml-2">📍 {match.venue}</Text>
            )}
          </View>
          {match.scoreChange !== 0 && (
            <Text className={`text-xs font-semibold ${match.scoreChange > 0 ? 'text-success' : 'text-error'}`}>
              {match.scoreChange > 0 ? '↑' : '↓'} {Math.abs(match.scoreChange)}分
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function ReportsScreen() {
  const { matchRecords } = useAppData();
  const totalWins = matchRecords.filter(m => m.result === 'win').length;
  const totalLosses = matchRecords.filter(m => m.result === 'lose').length;

  return (
    <ScreenContainer className="px-4 pt-2">
      {/* 统计头部 */}
      <View className="flex-row justify-around bg-surface rounded-xl p-3 mb-4 border border-border">
        <View className="items-center">
          <Text className="text-lg font-bold text-foreground">{matchRecords.length}</Text>
          <Text className="text-xs text-muted">总场次</Text>
        </View>
        <View className="items-center">
          <Text className="text-lg font-bold text-success">{totalWins}</Text>
          <Text className="text-xs text-muted">胜利</Text>
        </View>
        <View className="items-center">
          <Text className="text-lg font-bold text-error">{totalLosses}</Text>
          <Text className="text-xs text-muted">失败</Text>
        </View>
        <View className="items-center">
          <Text className="text-lg font-bold text-accent">
            {matchRecords.length > 0 ? Math.round(totalWins / matchRecords.length * 100) : 0}%
          </Text>
          <Text className="text-xs text-muted">胜率</Text>
        </View>
      </View>

      {/* 战报列表 */}
      <FlatList
        data={matchRecords}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MatchCard match={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </ScreenContainer>
  );
}
