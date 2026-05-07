import { useState, useRef } from "react";
import { ScrollView, Text, View, Pressable, TextInput, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useMatching } from "@/lib/matching-context";
import { ChannelMessage } from "@/lib/matching-types";

function MessageBubble({ message, isMe }: { message: ChannelMessage; isMe: boolean }) {
  if (message.type === 'system') {
    return (
      <View className="items-center my-3">
        <View className="bg-primary/10 rounded-full px-4 py-2 max-w-[85%]">
          <Text className="text-xs text-primary text-center">{message.content}</Text>
        </View>
      </View>
    );
  }

  if (message.type === 'time_proposal') {
    return (
      <View className="items-center my-3">
        <View className="bg-accent/10 rounded-xl px-4 py-3 max-w-[85%] border border-accent/30">
          <Text className="text-xs text-accent font-bold text-center mb-1">📅 时间提议</Text>
          <Text className="text-sm text-foreground text-center">{message.content}</Text>
        </View>
      </View>
    );
  }

  if (message.type === 'venue_proposal') {
    return (
      <View className="items-center my-3">
        <View className="bg-success/10 rounded-xl px-4 py-3 max-w-[85%] border border-success/30">
          <Text className="text-xs text-success font-bold text-center mb-1">📍 场馆提议</Text>
          <Text className="text-sm text-foreground text-center">{message.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-row mb-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <View className="w-8 h-8 rounded-full bg-surface items-center justify-center mr-2 mt-1">
          <Text className="text-sm">{message.senderAvatar}</Text>
        </View>
      )}
      <View className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && <Text className="text-[10px] text-muted mb-0.5 ml-1">{message.senderName}</Text>}
        <View className={`rounded-2xl px-4 py-2.5 ${isMe ? 'bg-primary rounded-br-sm' : 'bg-surface rounded-bl-sm'}`}>
          <Text className={`text-sm leading-5 ${isMe ? 'text-background' : 'text-foreground'}`}>{message.content}</Text>
        </View>
        <Text className="text-[10px] text-muted mt-0.5 mx-1">{message.timestamp}</Text>
      </View>
      {isMe && (
        <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center ml-2 mt-1">
          <Text className="text-sm">🏓</Text>
        </View>
      )}
    </View>
  );
}

export default function ChannelScreen() {
  const router = useRouter();
  const { state, dispatch } = useMatching();
  const [inputText, setInputText] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  if (!state.session) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="p-4 items-center justify-center">
        <Text className="text-foreground">频道不存在</Text>
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 16 }]} onPress={() => router.back()}>
          <Text className="text-primary">返回</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMessage: ChannelMessage = {
      id: `msg_${Date.now()}`,
      senderId: 'user_001',
      senderName: '乒乓小王子',
      senderAvatar: '🏓',
      content: inputText.trim(),
      type: 'text',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };
    dispatch({ type: 'SEND_MESSAGE', message: newMessage });
    setInputText('');

    // 模拟对方回复
    setTimeout(() => {
      const replies = [
        '好的，我看看场地',
        '可以的，你看哪个时间方便？',
        '校园体育馆怎么样？',
        '那我们约个时间吧',
        '行，我也有空',
      ];
      const reply: ChannelMessage = {
        id: `msg_${Date.now() + 1}`,
        senderId: state.session!.opponentId,
        senderName: state.session!.opponentNickname,
        senderAvatar: state.session!.opponentAvatar,
        content: replies[Math.floor(Math.random() * replies.length)],
        type: 'text',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };
      dispatch({ type: 'SEND_MESSAGE', message: reply });
    }, 1500);
  };

  const handleVoicePress = () => {
    // 模拟语音消息
    const voiceMsg: ChannelMessage = {
      id: `msg_${Date.now()}`,
      senderId: 'user_001',
      senderName: '乒乓小王子',
      senderAvatar: '🏓',
      content: '🎤 [语音消息 0:03]',
      type: 'voice',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };
    dispatch({ type: 'SEND_MESSAGE', message: voiceMsg });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1">
      {/* 顶部栏 */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
        >
          <Text className="text-primary text-sm">← 返回</Text>
        </Pressable>
        <View className="items-center">
          <Text className="text-sm font-bold text-foreground">{state.session.opponentNickname}</Text>
          <Text className="text-[10px] text-success">● 在线</Text>
        </View>
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.push('/matching/venue-select' as any)}
        >
          <View className="bg-accent/15 px-3 py-1.5 rounded-full">
            <Text className="text-xs text-accent font-medium">📍 选场地</Text>
          </View>
        </Pressable>
      </View>

      {/* 消息列表 */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {state.session.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} isMe={msg.senderId === 'user_001'} />
          ))}
        </ScrollView>

        {/* 输入栏 */}
        <View className="flex-row items-center px-4 py-3 border-t border-border bg-background">
          {/* 语音/文字切换 */}
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginRight: 8 }]}
            onPress={() => setIsVoiceMode(!isVoiceMode)}
          >
            <View className="w-9 h-9 rounded-full bg-surface items-center justify-center">
              <Text className="text-sm">{isVoiceMode ? '⌨️' : '🎤'}</Text>
            </View>
          </Pressable>

          {isVoiceMode ? (
            <Pressable
              style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
              onPress={handleVoicePress}
            >
              <View className="bg-surface rounded-full py-3 items-center border border-border">
                <Text className="text-sm text-muted">按住说话</Text>
              </View>
            </Pressable>
          ) : (
            <View className="flex-1 flex-row items-center bg-surface rounded-full border border-border px-4">
              <TextInput
                className="flex-1 py-2.5 text-sm text-foreground"
                placeholder="输入消息..."
                placeholderTextColor="#9BA1A6"
                value={inputText}
                onChangeText={setInputText}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
            </View>
          )}

          {/* 发送按钮 */}
          {!isVoiceMode && (
            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginLeft: 8 }]}
              onPress={handleSend}
            >
              <View className="w-9 h-9 rounded-full bg-primary items-center justify-center">
                <Text className="text-sm">📤</Text>
              </View>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
