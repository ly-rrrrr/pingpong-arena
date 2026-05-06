import { useState } from "react";
import { Text, View, FlatList, Pressable } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { rankingData } from "@/lib/mock-data";
import { RankingEntry } from "@/lib/types";

const tabs = ['好友榜', '球馆榜', '城市榜'] as const;

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

function getMedalEmoji(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

function RankingItem({ item }: { item: RankingEntry }) {
  const isTopThree = item.rank <= 3;

  return (
    <View className={`flex-row items-center py-3 px-4 mb-2 rounded-xl ${item.isMe ? 'bg-primary/10 border border-primary/30' : 'bg-surface border border-border'}`}>
      {/* 排名 */}
      <View className="w-10 items-center">
        {isTopThree ? (
          <Text className="text-xl">{getMedalEmoji(item.rank)}</Text>
        ) : (
          <Text className="text-base font-bold text-muted">{item.rank}</Text>
        )}
      </View>

      {/* 头像 */}
      <View className="w-10 h-10 rounded-full bg-background items-center justify-center mx-3">
        <Text className="text-lg">{item.avatar}</Text>
      </View>

      {/* 用户信息 */}
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-sm font-semibold text-foreground">{item.nickname}</Text>
          {item.isMe && <Text className="text-xs text-primary ml-1">(我)</Text>}
        </View>
        <View className="flex-row items-center mt-0.5">
          <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: getRankColor(item.rankTier) + '25' }}>
            <Text className="text-[10px] font-medium" style={{ color: getRankColor(item.rankTier) }}>{item.rankTier}</Text>
          </View>
          <Text className="text-xs text-muted ml-2">{item.wins}胜 · {item.winRate}%</Text>
        </View>
      </View>

      {/* 积分 */}
      <View className="items-end">
        <Text className="text-base font-bold text-foreground">{item.score}</Text>
        <Text className="text-[10px] text-muted">积分</Text>
      </View>
    </View>
  );
}

export default function RankingScreen() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <ScreenContainer className="pt-2">
      {/* 标题 */}
      <View className="px-4 mb-3">
        <Text className="text-2xl font-bold text-foreground">排行榜</Text>
      </View>

      {/* Tab切换 */}
      <View className="flex-row mx-4 mb-4 bg-surface rounded-xl p-1 border border-border">
        {tabs.map((tab, index) => (
          <Pressable
            key={tab}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
            onPress={() => setActiveTab(index)}
          >
            <View className={`py-2 rounded-lg items-center ${activeTab === index ? 'bg-primary' : ''}`}>
              <Text className={`text-sm font-medium ${activeTab === index ? 'text-background' : 'text-muted'}`}>
                {tab}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* 排行列表 */}
      <FlatList
        data={rankingData}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => <RankingItem item={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      />
    </ScreenContainer>
  );
}
