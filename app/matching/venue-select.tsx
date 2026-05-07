import { useState } from "react";
import { ScrollView, Text, View, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useMatching } from "@/lib/matching-context";
import { venues } from "@/lib/matching-mock-data";
import { Venue, TimeSlot, TimeProposal } from "@/lib/matching-types";

function VenueCard({ venue, isSelected, onSelect }: { venue: Venue; isSelected: boolean; onSelect: () => void }) {
  const availableCount = venue.availableSlots.filter(s => s.available).length;

  return (
    <Pressable
      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      onPress={onSelect}
    >
      <View className={`rounded-2xl p-4 mb-3 border ${isSelected ? 'bg-primary/10 border-primary' : 'bg-surface border-border'}`}>
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <Text className="text-lg mr-2">🏟️</Text>
            <View>
              <Text className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{venue.name}</Text>
              <Text className="text-xs text-muted">{venue.address}</Text>
            </View>
          </View>
          {isSelected && (
            <View className="bg-primary rounded-full w-6 h-6 items-center justify-center">
              <Text className="text-xs text-background">✓</Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-3">
          <View className="bg-background rounded-lg px-2 py-1">
            <Text className="text-xs text-muted">📍 {venue.distance}</Text>
          </View>
          <View className="bg-background rounded-lg px-2 py-1">
            <Text className="text-xs text-muted">🏓 {venue.tables}台</Text>
          </View>
          <View className="bg-background rounded-lg px-2 py-1">
            <Text className="text-xs text-muted">💰 {venue.pricePerHour === 0 ? '免费' : `¥${venue.pricePerHour}/h`}</Text>
          </View>
          <View className={`rounded-lg px-2 py-1 ${availableCount > 2 ? 'bg-success/10' : 'bg-warning/10'}`}>
            <Text className={`text-xs ${availableCount > 2 ? 'text-success' : 'text-warning'}`}>空闲 {availableCount}段</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function TimeSlotButton({ slot, isSelected, onSelect }: { slot: TimeSlot; isSelected: boolean; onSelect: () => void }) {
  if (!slot.available) {
    return (
      <View className="bg-error/5 rounded-lg px-3 py-2.5 mr-2 mb-2 border border-error/20 opacity-50">
        <Text className="text-xs text-error line-through">{slot.startTime}-{slot.endTime}</Text>
        <Text className="text-[10px] text-error">已占用</Text>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      onPress={onSelect}
    >
      <View className={`rounded-lg px-3 py-2.5 mr-2 mb-2 border ${isSelected ? 'bg-primary/10 border-primary' : 'bg-surface border-border'}`}>
        <Text className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>{slot.startTime}-{slot.endTime}</Text>
        <Text className={`text-[10px] ${isSelected ? 'text-primary' : 'text-success'}`}>可预约</Text>
      </View>
    </Pressable>
  );
}

export default function VenueSelectScreen() {
  const router = useRouter();
  const { state, dispatch } = useMatching();
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [proposalRound, setProposalRound] = useState(1);

  if (!state.session) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="p-4 items-center justify-center">
        <Text className="text-foreground">会话不存在</Text>
      </ScreenContainer>
    );
  }

  const rejectedCount = state.session.timeProposals.filter(p => p.status === 'rejected').length;

  const handlePropose = () => {
    if (!selectedVenue || !selectedSlot) {
      Alert.alert('提示', '请选择场馆和时间段');
      return;
    }

    const proposal: TimeProposal = {
      id: `proposal_${Date.now()}`,
      proposerId: 'user_001',
      proposerName: '乒乓小王子',
      date: selectedSlot.date,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      venueId: selectedVenue.id,
      venueName: selectedVenue.name,
      status: 'pending',
      round: proposalRound,
    };

    dispatch({ type: 'PROPOSE_TIME', proposal });

    // 模拟对方响应（Demo中2秒后随机接受或拒绝）
    setTimeout(() => {
      const currentRound = proposalRound;
      // 第一次提议被拒绝概率高，第二次接受概率高
      const acceptChance = currentRound === 1 ? 0.3 : 0.7;
      const accepted = Math.random() < acceptChance;

      dispatch({ type: 'RESPOND_TIME', proposalId: proposal.id, accepted });

      if (accepted) {
        Alert.alert(
          '🎉 时间确认',
          `对方同意了！\n\n场馆：${selectedVenue.name}\n时间：${selectedSlot.date} ${selectedSlot.startTime}-${selectedSlot.endTime}`,
          [{ text: '太好了', onPress: () => router.replace('/matching/channel' as any) }]
        );
      } else {
        if (currentRound >= 2) {
          // 已经协商两次，触发劝退
          Alert.alert(
            '⚠️ 协商未达成',
            '双方在时间上未能达成一致，系统将发出劝退通知。',
            [{ text: '查看', onPress: () => router.replace('/matching/retreat' as any) }]
          );
        } else {
          Alert.alert(
            '时间被拒绝',
            `对方不同意该时间安排，请重新选择。\n\n剩余协商次数：${2 - currentRound}次`,
            [{ text: '重新选择', onPress: () => {
              setSelectedSlot(null);
              setProposalRound(currentRound + 1);
            }}]
          );
        }
      }
    }, 2000);
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
            <Text className="text-primary text-base">← 返回频道</Text>
          </View>
        </Pressable>

        {/* 标题 */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-foreground">选择场馆和时间</Text>
          <View className="bg-warning/15 px-3 py-1.5 rounded-full">
            <Text className="text-xs text-warning font-medium">协商第{proposalRound}/2轮</Text>
          </View>
        </View>

        {/* 流程说明 */}
        <View className="bg-primary/5 rounded-xl p-3 mb-4 border border-primary/20">
          <Text className="text-xs text-primary leading-4">
            💡 选择空闲场馆和时间段后发送给对方。对方同意则预约成功，不同意可更换时间。最多协商2轮，如无法达成一致将触发劝退流程。
          </Text>
        </View>

        {/* 场馆列表 */}
        <Text className="text-base font-bold text-foreground mb-3">🏟️ 附近空闲场馆</Text>
        {venues.map((venue) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            isSelected={selectedVenue?.id === venue.id}
            onSelect={() => {
              setSelectedVenue(venue);
              setSelectedSlot(null);
            }}
          />
        ))}

        {/* 时间段选择 */}
        {selectedVenue && (
          <View className="mt-4">
            <Text className="text-base font-bold text-foreground mb-3">
              🕐 {selectedVenue.name} - 可用时间段
            </Text>
            <Text className="text-xs text-muted mb-3">日期：2026-05-07（明天）</Text>
            <View className="flex-row flex-wrap">
              {selectedVenue.availableSlots.map((slot) => (
                <TimeSlotButton
                  key={slot.id}
                  slot={slot}
                  isSelected={selectedSlot?.id === slot.id}
                  onSelect={() => setSelectedSlot(slot)}
                />
              ))}
            </View>
          </View>
        )}

        {/* 已有提议历史 */}
        {state.session.timeProposals.length > 0 && (
          <View className="mt-4">
            <Text className="text-base font-bold text-foreground mb-3">📋 协商历史</Text>
            {state.session.timeProposals.map((proposal) => (
              <View key={proposal.id} className={`rounded-xl p-3 mb-2 border ${
                proposal.status === 'accepted' ? 'bg-success/10 border-success/30' :
                proposal.status === 'rejected' ? 'bg-error/10 border-error/30' :
                'bg-warning/10 border-warning/30'
              }`}>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-sm text-foreground font-medium">
                      第{proposal.round}轮：{proposal.venueName}
                    </Text>
                    <Text className="text-xs text-muted mt-0.5">
                      {proposal.date} {proposal.startTime}-{proposal.endTime}
                    </Text>
                  </View>
                  <View className={`px-2 py-1 rounded-full ${
                    proposal.status === 'accepted' ? 'bg-success/20' :
                    proposal.status === 'rejected' ? 'bg-error/20' :
                    'bg-warning/20'
                  }`}>
                    <Text className={`text-xs font-medium ${
                      proposal.status === 'accepted' ? 'text-success' :
                      proposal.status === 'rejected' ? 'text-error' :
                      'text-warning'
                    }`}>
                      {proposal.status === 'accepted' ? '已接受' :
                       proposal.status === 'rejected' ? '已拒绝' : '等待中'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 提交按钮 */}
        {selectedVenue && selectedSlot && (
          <View className="mt-6">
            <View className="bg-surface rounded-xl p-4 mb-4 border border-border">
              <Text className="text-sm font-bold text-foreground mb-2">确认信息</Text>
              <Text className="text-xs text-muted">场馆：{selectedVenue.name}</Text>
              <Text className="text-xs text-muted">时间：{selectedSlot.date} {selectedSlot.startTime}-{selectedSlot.endTime}</Text>
              <Text className="text-xs text-muted">费用：{selectedVenue.pricePerHour === 0 ? '免费' : `¥${selectedVenue.pricePerHour}`}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
              onPress={handlePropose}
            >
              <View className="bg-primary rounded-xl py-4 items-center">
                <Text className="text-base font-bold text-background">发送时间申请</Text>
              </View>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
