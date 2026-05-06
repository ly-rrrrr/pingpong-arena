import { useState } from "react";
import { ScrollView, Text, View, Pressable, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { friends } from "@/lib/mock-data";

export default function RecordMatchScreen() {
  const router = useRouter();
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);
  const [matchType, setMatchType] = useState<'ranked' | 'friendly'>('ranked');
  const [scores, setScores] = useState<Array<{ my: string; opp: string }>>([
    { my: '', opp: '' },
    { my: '', opp: '' },
    { my: '', opp: '' },
  ]);
  const [venue, setVenue] = useState('');

  const addGame = () => {
    if (scores.length < 7) {
      setScores([...scores, { my: '', opp: '' }]);
    }
  };

  const removeGame = () => {
    if (scores.length > 3) {
      setScores(scores.slice(0, -1));
    }
  };

  const updateScore = (index: number, field: 'my' | 'opp', value: string) => {
    const newScores = [...scores];
    newScores[index] = { ...newScores[index], [field]: value };
    setScores(newScores);
  };

  const handleSubmit = () => {
    if (!selectedOpponent) {
      Alert.alert('提示', '请选择对手');
      return;
    }

    const validScores = scores.filter(s => s.my && s.opp);
    if (validScores.length < 3) {
      Alert.alert('提示', '请至少输入3局比分');
      return;
    }

    Alert.alert('记录成功', '比赛已记录，战报已生成！', [
      { text: '查看战报', onPress: () => router.back() },
    ]);
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

        <Text className="text-2xl font-bold text-foreground mb-4">记录比赛</Text>

        {/* 比赛类型 */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-foreground mb-2">比赛类型</Text>
          <View className="flex-row gap-3">
            <Pressable
              style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => setMatchType('ranked')}
            >
              <View className={`py-3 rounded-xl items-center border ${matchType === 'ranked' ? 'bg-primary/10 border-primary' : 'bg-surface border-border'}`}>
                <Text className="text-lg mb-1">🏆</Text>
                <Text className={`text-sm font-medium ${matchType === 'ranked' ? 'text-primary' : 'text-muted'}`}>积分赛</Text>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => setMatchType('friendly')}
            >
              <View className={`py-3 rounded-xl items-center border ${matchType === 'friendly' ? 'bg-primary/10 border-primary' : 'bg-surface border-border'}`}>
                <Text className="text-lg mb-1">🤝</Text>
                <Text className={`text-sm font-medium ${matchType === 'friendly' ? 'text-primary' : 'text-muted'}`}>友谊赛</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* 选择对手 */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-foreground mb-2">选择对手</Text>
          <View className="flex-row flex-wrap gap-2">
            {friends.map((friend) => (
              <Pressable
                key={friend.id}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                onPress={() => setSelectedOpponent(friend.id)}
              >
                <View className={`flex-row items-center px-3 py-2 rounded-full border ${selectedOpponent === friend.id ? 'bg-primary/10 border-primary' : 'bg-surface border-border'}`}>
                  <Text className="text-sm mr-1">{friend.avatar}</Text>
                  <Text className={`text-xs font-medium ${selectedOpponent === friend.id ? 'text-primary' : 'text-foreground'}`}>
                    {friend.nickname}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 比分输入 */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-semibold text-foreground">比分</Text>
            <View className="flex-row gap-2">
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                onPress={removeGame}
              >
                <View className="bg-surface border border-border px-3 py-1 rounded-full">
                  <Text className="text-xs text-muted">- 删除局</Text>
                </View>
              </Pressable>
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                onPress={addGame}
              >
                <View className="bg-primary/10 border border-primary/30 px-3 py-1 rounded-full">
                  <Text className="text-xs text-primary">+ 添加局</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {scores.map((score, idx) => (
            <View key={idx} className="flex-row items-center mb-2 bg-surface rounded-xl p-3 border border-border">
              <Text className="text-sm text-muted w-14">第{idx + 1}局</Text>
              <View className="flex-1 flex-row items-center justify-center gap-3">
                <TextInput
                  className="bg-background rounded-lg px-3 py-2 w-14 text-center text-foreground text-base font-bold"
                  placeholder="0"
                  placeholderTextColor="#9BA1A6"
                  keyboardType="number-pad"
                  value={score.my}
                  onChangeText={(v) => updateScore(idx, 'my', v)}
                  returnKeyType="done"
                />
                <Text className="text-muted text-lg">:</Text>
                <TextInput
                  className="bg-background rounded-lg px-3 py-2 w-14 text-center text-foreground text-base font-bold"
                  placeholder="0"
                  placeholderTextColor="#9BA1A6"
                  keyboardType="number-pad"
                  value={score.opp}
                  onChangeText={(v) => updateScore(idx, 'opp', v)}
                  returnKeyType="done"
                />
              </View>
            </View>
          ))}
        </View>

        {/* 比赛场地 */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">比赛场地（可选）</Text>
          <TextInput
            className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground text-sm"
            placeholder="输入比赛场地名称"
            placeholderTextColor="#9BA1A6"
            value={venue}
            onChangeText={setVenue}
            returnKeyType="done"
          />
        </View>

        {/* 提交按钮 */}
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          onPress={handleSubmit}
        >
          <View className="bg-primary rounded-xl py-4 items-center">
            <Text className="text-base font-bold text-background">提交比赛记录</Text>
          </View>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
