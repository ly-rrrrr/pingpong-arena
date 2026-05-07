import { useState, useEffect } from "react";
import { Text, View, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useMatching } from "@/lib/matching-context";
import { RetreatChoice } from "@/lib/matching-types";

export default function RetreatScreen() {
  const router = useRouter();
  const { state, dispatch } = useMatching();
  const [myChoice, setMyChoice] = useState<RetreatChoice | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<RetreatChoice | null>(null);
  const [waitingForResult, setWaitingForResult] = useState(false);

  // 模拟对方选择（3秒后随机选择）
  useEffect(() => {
    if (myChoice && !opponentChoice) {
      const timer = setTimeout(() => {
        // 对方随机选择
        const choices: RetreatChoice[] = ['continue_negotiate', 'force_exit'];
        const oppChoice = choices[Math.floor(Math.random() * choices.length)];
        setOpponentChoice(oppChoice);
        dispatch({ type: 'SET_OPPONENT_RETREAT_CHOICE', choice: oppChoice });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [myChoice, opponentChoice]);

  // 双方都选择后处理结果
  useEffect(() => {
    if (myChoice && opponentChoice) {
      setWaitingForResult(true);
      const timer = setTimeout(() => {
        if (myChoice === 'continue_negotiate' && opponentChoice === 'continue_negotiate') {
          Alert.alert(
            '🤝 继续协商',
            '双方都选择了继续协商时间，将返回频道重新沟通。',
            [{ text: '好的', onPress: () => {
              dispatch({ type: 'SET_MY_RETREAT_CHOICE', choice: 'continue_negotiate' });
              router.replace('/matching/channel' as any);
            }}]
          );
        } else if (myChoice === 'force_exit' && opponentChoice === 'force_exit') {
          Alert.alert(
            '👋 匹配结束',
            '双方都选择了退出频道，本次匹配已结束。',
            [{ text: '确定', onPress: () => {
              dispatch({ type: 'CANCEL_SESSION' });
              router.replace('/matching' as any);
            }}]
          );
        } else {
          // 一方继续一方退出 - 保持当前状态，允许改选
          setWaitingForResult(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [myChoice, opponentChoice]);

  if (!state.session) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="p-4 items-center justify-center">
        <Text className="text-foreground">会话不存在</Text>
      </ScreenContainer>
    );
  }

  const handleChoose = (choice: RetreatChoice) => {
    setMyChoice(choice);
    dispatch({ type: 'SET_MY_RETREAT_CHOICE', choice });
  };

  const handleChangeChoice = () => {
    // 允许从"继续协商"改为"执意退出"
    setMyChoice('force_exit');
    dispatch({ type: 'SET_MY_RETREAT_CHOICE', choice: 'force_exit' });
  };

  // 检查是否出现一方继续一方退出的僵局
  const isDeadlock = myChoice && opponentChoice && myChoice !== opponentChoice;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-4 pt-2">
      <View className="flex-1">
        {/* 标题 */}
        <View className="items-center mt-8 mb-6">
          <Text className="text-4xl mb-3">⚠️</Text>
          <Text className="text-xl font-bold text-foreground">协商劝退通知</Text>
          <Text className="text-sm text-muted mt-2 text-center leading-5">
            双方在时间安排上未能达成一致{'\n'}系统向双方发出以下选项
          </Text>
        </View>

        {/* 规则说明 */}
        <View className="bg-warning/10 rounded-xl p-4 mb-6 border border-warning/30">
          <Text className="text-xs text-warning font-bold mb-2">📋 规则说明</Text>
          <Text className="text-xs text-foreground leading-4 mb-1">• 双方可以看到对方的选择状态</Text>
          <Text className="text-xs text-foreground leading-4 mb-1">• 当双方同时选择同一项时，事务才会生效</Text>
          <Text className="text-xs text-foreground leading-4">• 选择"继续协商"后可随时改选为"执意退出"</Text>
        </View>

        {/* 双方选择状态 */}
        <View className="flex-row mb-6">
          {/* 我的状态 */}
          <View className="flex-1 bg-surface rounded-xl p-3 mr-2 border border-border items-center">
            <Text className="text-lg mb-1">🏓</Text>
            <Text className="text-xs font-bold text-foreground mb-1">我</Text>
            {myChoice ? (
              <View className={`px-2 py-1 rounded-full ${myChoice === 'continue_negotiate' ? 'bg-success/15' : 'bg-error/15'}`}>
                <Text className={`text-[10px] font-medium ${myChoice === 'continue_negotiate' ? 'text-success' : 'text-error'}`}>
                  {myChoice === 'continue_negotiate' ? '继续协商' : '执意退出'}
                </Text>
              </View>
            ) : (
              <View className="bg-muted/15 px-2 py-1 rounded-full">
                <Text className="text-[10px] text-muted">未选择</Text>
              </View>
            )}
          </View>

          {/* 对方状态 */}
          <View className="flex-1 bg-surface rounded-xl p-3 ml-2 border border-border items-center">
            <Text className="text-lg mb-1">{state.session.opponentAvatar}</Text>
            <Text className="text-xs font-bold text-foreground mb-1">{state.session.opponentNickname}</Text>
            {opponentChoice ? (
              <View className={`px-2 py-1 rounded-full ${opponentChoice === 'continue_negotiate' ? 'bg-success/15' : 'bg-error/15'}`}>
                <Text className={`text-[10px] font-medium ${opponentChoice === 'continue_negotiate' ? 'text-success' : 'text-error'}`}>
                  {opponentChoice === 'continue_negotiate' ? '继续协商' : '执意退出'}
                </Text>
              </View>
            ) : (
              <View className="bg-muted/15 px-2 py-1 rounded-full">
                <Text className="text-[10px] text-muted">{myChoice ? '等待选择...' : '未选择'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 僵局提示 */}
        {isDeadlock && !waitingForResult && (
          <View className="bg-warning/10 rounded-xl p-4 mb-4 border border-warning/30">
            <Text className="text-sm text-warning font-bold text-center mb-2">⚡ 选择不一致</Text>
            <Text className="text-xs text-foreground text-center leading-4">
              双方选择不同，事务无法生效。{'\n'}
              {myChoice === 'continue_negotiate'
                ? '你选择了继续协商，对方选择了退出。你可以改选为"执意退出"以结束匹配。'
                : '你选择了退出，对方选择了继续协商。等待对方改选或维持当前选择。'}
            </Text>
            {myChoice === 'continue_negotiate' && (
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, marginTop: 12 }]}
                onPress={handleChangeChoice}
              >
                <View className="bg-error/15 rounded-lg py-2.5 items-center border border-error/30">
                  <Text className="text-xs text-error font-medium">改选为：执意退出频道</Text>
                </View>
              </Pressable>
            )}
          </View>
        )}

        {/* 选择按钮 */}
        {!myChoice && (
          <View className="gap-3 mt-4">
            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
              onPress={() => handleChoose('continue_negotiate')}
            >
              <View className="bg-success/10 rounded-2xl py-5 items-center border-2 border-success/30">
                <Text className="text-2xl mb-2">🤝</Text>
                <Text className="text-base font-bold text-success">继续协商时间</Text>
                <Text className="text-xs text-muted mt-1">返回频道重新沟通时间安排</Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
              onPress={() => handleChoose('force_exit')}
            >
              <View className="bg-error/10 rounded-2xl py-5 items-center border-2 border-error/30">
                <Text className="text-2xl mb-2">🚪</Text>
                <Text className="text-base font-bold text-error">执意退出频道</Text>
                <Text className="text-xs text-muted mt-1">结束本次匹配，退出频道</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* 等待状态 */}
        {myChoice && !opponentChoice && (
          <View className="items-center mt-6">
            <View className="bg-primary/10 rounded-xl px-6 py-4">
              <Text className="text-sm text-primary font-medium text-center">⏳ 等待对方做出选择...</Text>
            </View>
          </View>
        )}

        {/* 结果处理中 */}
        {waitingForResult && (
          <View className="items-center mt-6">
            <View className="bg-accent/10 rounded-xl px-6 py-4">
              <Text className="text-sm text-accent font-medium text-center">🔄 正在处理结果...</Text>
            </View>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
