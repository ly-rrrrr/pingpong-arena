import { useState } from "react";
import { Text, View, FlatList, Pressable, Alert } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAppData } from "@/lib/app-data";
import { Friend, Challenge } from "@/lib/types";

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

function FriendCard({ friend }: { friend: Friend }) {
  const handleChallenge = () => {
    Alert.alert('发起挑战', `确定要向 ${friend.nickname} 发起挑战吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '确定', onPress: () => Alert.alert('挑战已发送', `已向 ${friend.nickname} 发送挑战邀请！`) },
    ]);
  };

  return (
    <View className="bg-surface rounded-xl p-4 mb-3 border border-border">
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-background items-center justify-center mr-3">
          <Text className="text-xl">{friend.avatar}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-sm font-semibold text-foreground">{friend.nickname}</Text>
            <View className="ml-2 px-1.5 py-0.5 rounded" style={{ backgroundColor: getRankColor(friend.rankTier) + '25' }}>
              <Text className="text-[10px] font-medium" style={{ color: getRankColor(friend.rankTier) }}>{friend.rankTier}</Text>
            </View>
          </View>
          <View className="flex-row items-center mt-1">
            <Text className="text-xs text-muted">战绩 </Text>
            <Text className="text-xs text-success font-medium">{friend.headToHead.wins}胜</Text>
            <Text className="text-xs text-muted"> / </Text>
            <Text className="text-xs text-error font-medium">{friend.headToHead.losses}负</Text>
            <Text className="text-xs text-muted ml-2">· {friend.lastActive}</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          onPress={handleChallenge}
        >
          <View className="bg-accent px-4 py-2 rounded-full">
            <Text className="text-xs font-bold text-background">挑战</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const isChallenger = challenge.challenger.id === 'user_001';
  const opponent = isChallenger ? challenge.challenged : challenge.challenger;

  const statusConfig = {
    pending: { text: '等待接受', color: 'text-warning', bg: 'bg-warning/15' },
    accepted: { text: '已接受', color: 'text-success', bg: 'bg-success/15' },
    completed: { text: '已完成', color: 'text-muted', bg: 'bg-muted/15' },
    declined: { text: '已拒绝', color: 'text-error', bg: 'bg-error/15' },
  };

  const status = statusConfig[challenge.status];

  return (
    <View className="bg-surface rounded-xl p-4 mb-3 border border-border">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-full bg-background items-center justify-center mr-2">
            <Text className="text-base">{opponent.avatar}</Text>
          </View>
          <View>
            <Text className="text-sm font-semibold text-foreground">
              {isChallenger ? '挑战' : '被挑战'} {opponent.nickname}
            </Text>
            <Text className="text-xs text-muted">{challenge.createdAt}</Text>
          </View>
        </View>
        <View className={`px-2.5 py-1 rounded-full ${status.bg}`}>
          <Text className={`text-xs font-medium ${status.color}`}>{status.text}</Text>
        </View>
      </View>
      {challenge.status === 'completed' && challenge.result && (
        <View className="bg-background rounded-lg p-2 mt-1">
          <Text className={`text-xs text-center font-medium ${challenge.result === 'win' ? 'text-success' : 'text-error'}`}>
            {challenge.result === 'win' ? '🎉 挑战成功' : '😔 挑战失败'}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function ChallengeScreen() {
  const [activeTab, setActiveTab] = useState<'friends' | 'challenges'>('friends');
  const { friends, challenges } = useAppData();

  return (
    <ScreenContainer className="pt-2">
      {/* 标题 */}
      <View className="px-4 mb-3">
        <Text className="text-2xl font-bold text-foreground">挑战</Text>
      </View>

      {/* Tab切换 */}
      <View className="flex-row mx-4 mb-4 bg-surface rounded-xl p-1 border border-border">
        <Pressable
          style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
          onPress={() => setActiveTab('friends')}
        >
          <View className={`py-2 rounded-lg items-center ${activeTab === 'friends' ? 'bg-primary' : ''}`}>
            <Text className={`text-sm font-medium ${activeTab === 'friends' ? 'text-background' : 'text-muted'}`}>
              好友列表
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
          onPress={() => setActiveTab('challenges')}
        >
          <View className={`py-2 rounded-lg items-center ${activeTab === 'challenges' ? 'bg-primary' : ''}`}>
            <Text className={`text-sm font-medium ${activeTab === 'challenges' ? 'text-background' : 'text-muted'}`}>
              挑战记录
            </Text>
          </View>
        </Pressable>
      </View>

      {/* 列表 */}
      {activeTab === 'friends' ? (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FriendCard friend={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        />
      ) : (
        <FlatList
          data={challenges}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChallengeCard challenge={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        />
      )}
    </ScreenContainer>
  );
}
