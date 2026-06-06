import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollView, Text, View, Pressable, TextInput, KeyboardAvoidingView, Platform, Image, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { ScreenContainer } from "@/components/screen-container";
import { useMatching } from "@/lib/matching-context";
import { ChannelMessage } from "@/lib/matching-types";
import { trpc } from "@/lib/trpc";

// ---- 常用语 & 表情 ----
const QUICK_PHRASES = [
  "来一局！🏓", "我准备好了", "稍等一下", "好的没问题",
  "你在哪个馆？", "三局两胜？", "积分赛还是友谊赛？", "时间你定",
];

const EMOJI_STICKERS = [
  "🏓", "🔥", "💪", "😄", "👏", "🤝", "⚡", "🎯",
  "😅", "👍", "😤", "🥇", "🎉", "⏰", "📍", "✅",
];

// ---- 时间段（类似外卖订餐） ----
function getNextDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getMonth() + 1}月${d.getDate()}日${["日","一","二","三","四","五","六"][d.getDay()]}`;
}

interface TimeSlot {
  label: string;
  date: string;
  startTime: string;
  endTime: string;
}

function buildTimeSlots(): TimeSlot[] {
  const today = getNextDays(0);
  const tomorrow = getNextDays(1);
  const dayAfter = getNextDays(2);
  const sat = getNextDays((6 - new Date().getDay() + 7) % 7 || 7);
  const sun = getNextDays(((7 - new Date().getDay()) % 7) || 7);

  return [
    { label: "☀️ 今天上午", date: today, startTime: "9:00", endTime: "12:00" },
    { label: "🌤 今天下午", date: today, startTime: "14:00", endTime: "17:00" },
    { label: "🌙 今天晚上", date: today, startTime: "18:00", endTime: "21:00" },
    { label: "☀️ 明天上午", date: tomorrow, startTime: "9:00", endTime: "12:00" },
    { label: "🌤 明天下午", date: tomorrow, startTime: "14:00", endTime: "17:00" },
    { label: "🌙 明天晚上", date: tomorrow, startTime: "18:00", endTime: "21:00" },
    { label: "📅 后天上午", date: dayAfter, startTime: "9:00", endTime: "12:00" },
    { label: "📅 后天下午", date: dayAfter, startTime: "14:00", endTime: "17:00" },
    { label: "🎯 本周六", date: sat, startTime: "9:00", endTime: "12:00" },
    { label: "🎯 本周日", date: sun, startTime: "14:00", endTime: "17:00" },
  ];
}

function timeNow() {
  return new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

// ---- 消息气泡 ----
function MessageBubble({ message, isMe }: { message: ChannelMessage; isMe: boolean }) {
  if (message.type === "system") {
    return (
      <View className="items-center my-3">
        <View className="bg-primary/10 rounded-full px-4 py-2 max-w-[85%]">
          <Text className="text-xs text-primary text-center">{message.content}</Text>
        </View>
      </View>
    );
  }

  if (message.type === "image" && message.metadata?.imageUri) {
    return (
      <View className={`flex-row mb-3 ${isMe ? "justify-end" : "justify-start"}`}>
        {!isMe && (
          <View className="w-8 h-8 rounded-full bg-surface items-center justify-center mr-2 mt-1">
            <Text className="text-sm">{message.senderAvatar}</Text>
          </View>
        )}
        <View className={`max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
          {!isMe && <Text className="text-[10px] text-muted mb-0.5 ml-1">{message.senderName}</Text>}
          <View className={`rounded-2xl overflow-hidden ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}>
            <Image
              source={{ uri: message.metadata.imageUri }}
              className="w-48 h-48"
              resizeMode="cover"
            />
            {message.content ? (
              <View className={`px-3 py-1.5 ${isMe ? "bg-primary" : "bg-surface"}`}>
                <Text className={`text-xs ${isMe ? "text-background" : "text-foreground"}`}>{message.content}</Text>
              </View>
            ) : null}
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

  if (message.type === "time_proposal") {
    return (
      <View className={`flex-row mb-3 ${isMe ? "justify-end" : "justify-start"}`}>
        <View className="max-w-[75%]">
          <View className="bg-accent/10 rounded-2xl px-4 py-3 border border-accent/30">
            <Text className="text-xs text-accent font-bold mb-1">📅 约球时间</Text>
            <Text className="text-sm text-foreground font-medium">{message.content}</Text>
            {message.metadata?.proposedDate && (
              <Text className="text-xs text-muted mt-1">
                {message.metadata.proposedDate} {message.metadata.proposedTime}
              </Text>
            )}
          </View>
          <Text className="text-[10px] text-muted mt-0.5 mx-1">{message.timestamp}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-row mb-3 ${isMe ? "justify-end" : "justify-start"}`}>
      {!isMe && (
        <View className="w-8 h-8 rounded-full bg-surface items-center justify-center mr-2 mt-1">
          <Text className="text-sm">{message.senderAvatar}</Text>
        </View>
      )}
      <View className={`max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
        {!isMe && <Text className="text-[10px] text-muted mb-0.5 ml-1">{message.senderName}</Text>}
        <View className={`rounded-2xl px-4 py-2.5 ${isMe ? "bg-primary rounded-br-sm" : "bg-surface rounded-bl-sm"}`}>
          <Text className={`text-sm leading-5 ${isMe ? "text-background" : "text-foreground"}`}>{message.content}</Text>
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
  const params = useLocalSearchParams<{ matchRequestId: string; myId: string }>();
  const { matchRequestId, myId } = params;
  const { state, dispatch } = useMatching();
  const [inputText, setInputText] = useState("");
  const [showPhrases, setShowPhrases] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const lastMsgIdRef = useRef("");
  const sentIdsRef = useRef(new Set<string>());

  const session = state.session;
  const sendMutation = trpc.matching.sendChannelMessage.useMutation();

  // Poll for new messages
  const messagesQuery = trpc.matching.pollChannelMessages.useQuery(
    { matchRequestId: matchRequestId ?? "", sinceId: lastMsgIdRef.current || undefined },
    { enabled: !!matchRequestId, refetchInterval: 1500 },
  );

  // Merge incoming server messages
  useEffect(() => {
    const serverMsgs = messagesQuery.data;
    if (!serverMsgs || serverMsgs.length === 0) return;

    for (const sm of serverMsgs) {
      if (sentIdsRef.current.has(sm.id)) continue;
      sentIdsRef.current.add(sm.id);

      const localMsg: ChannelMessage = {
        id: sm.id,
        senderId: sm.senderId,
        senderName: sm.senderName,
        senderAvatar: sm.senderAvatar,
        content: sm.content,
        type: sm.type as ChannelMessage["type"],
        timestamp: sm.timestamp,
        metadata: (sm as any).metadata,
      };
      dispatch({ type: "SEND_MESSAGE", message: localMsg });
      if (sm.id > lastMsgIdRef.current) lastMsgIdRef.current = sm.id;
    }
  }, [messagesQuery.data]);

  // Welcome message
  const welcomedRef = useRef(false);
  useEffect(() => {
    if (!matchRequestId || welcomedRef.current) return;
    welcomedRef.current = true;
    sendMutation.mutate({
      matchRequestId,
      senderId: "system",
      senderName: "系统",
      senderAvatar: "",
      content: "🎉 双方已确认匹配！你们已进入专属频道，可以文字交流、发送表情和图片，选时间段约球。",
      type: "system",
    });
  }, [matchRequestId]);

  const sendMessage = useCallback(
    (
      text: string,
      type: "text" | "voice" | "time_proposal" = "text",
      extra?: { metadata?: Record<string, string> },
    ) => {
      if (!text.trim() && !extra?.metadata?.imageUri) return;
      if (!matchRequestId || !myId) return;

      const msgId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      sentIdsRef.current.add(msgId);

      const localMsg: ChannelMessage = {
        id: msgId,
        senderId: myId,
        senderName: "我",
        senderAvatar: "🏓",
        content: text.trim(),
        type: type === "time_proposal" ? "time_proposal" : type === "voice" ? "voice" : extra?.metadata?.imageUri ? "image" : "text",
        timestamp: timeNow(),
        metadata: extra?.metadata as any,
      };
      dispatch({ type: "SEND_MESSAGE", message: localMsg });

      sendMutation.mutate({
        matchRequestId,
        senderId: myId,
        senderName: "我",
        senderAvatar: "🏓",
        content: text.trim(),
        type: localMsg.type,
        id: msgId,
        ...(extra?.metadata ? { metadata: extra.metadata } : {}),
      });

      setInputText("");
      setShowPhrases(false);
      setShowEmoji(false);
      setShowTime(false);
    },
    [matchRequestId, myId, dispatch, sendMutation],
  );

  // ---- 图片选择 ----
  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("权限不足", "需要相册权限才能发送图片。");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      sendMessage("", "text", {
        metadata: { imageUri: result.assets[0].uri },
      });
    }
  };

  // ---- 选时间段 ----
  const timeSlots = buildTimeSlots();

  const handlePickTime = (slot: TimeSlot) => {
    const text = `${slot.label.split(" ")[1]} ${slot.startTime}-${slot.endTime}`;
    sendMessage(text, "time_proposal", {
      metadata: { proposedDate: slot.date, proposedTime: `${slot.startTime}-${slot.endTime}` },
    });
  };

  if (!session) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="p-4 items-center justify-center">
        <Text className="text-foreground">频道不存在</Text>
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 16 }]} onPress={() => router.back()}>
          <Text className="text-primary">返回</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top"]} className="flex-1">
      {/* 顶部栏 */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-background">
        <Pressable onPress={() => router.back()}>
          <Text className="text-primary text-sm">← 返回</Text>
        </Pressable>
        <View className="items-center">
          <Text className="text-sm font-bold text-foreground">{session.opponentNickname}</Text>
          <Text className="text-[10px] text-success">● 在线</Text>
        </View>
        <View className="w-16" />
      </View>

      {/* 消息列表 */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {session.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isMe={msg.senderId === myId} />
        ))}
      </ScrollView>

      {/* 面板区域 */}
      {showTime && (
        <View className="px-3 py-2 border-t border-border bg-surface">
          <Text className="text-xs text-muted mb-2">选择一个时间段，发送给对方确认</Text>
          <View className="flex-row flex-wrap gap-2">
            {timeSlots.map((slot, i) => (
              <Pressable key={i} onPress={() => handlePickTime(slot)}>
                <View className="bg-accent/10 rounded-xl px-3 py-2 border border-accent/20">
                  <Text className="text-xs text-accent font-medium">{slot.label}</Text>
                  <Text className="text-[10px] text-muted mt-0.5">{slot.startTime}-{slot.endTime}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {showPhrases && (
        <View className="px-3 py-2 border-t border-border bg-surface">
          <View className="flex-row flex-wrap gap-2">
            {QUICK_PHRASES.map((phrase, i) => (
              <Pressable key={i} onPress={() => sendMessage(phrase)}>
                <View className="bg-primary/10 rounded-full px-3 py-1.5">
                  <Text className="text-xs text-primary">{phrase}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {showEmoji && (
        <View className="px-3 py-2 border-t border-border bg-surface">
          <View className="flex-row flex-wrap gap-1">
            {EMOJI_STICKERS.map((emoji, i) => (
              <Pressable key={i} onPress={() => sendMessage(emoji)}>
                <View className="w-10 h-10 items-center justify-center bg-background rounded-lg">
                  <Text className="text-xl">{emoji}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* 输入栏 — 键盘上移由 KeyboardAvoidingView 处理 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View className="border-t border-border bg-background">
          {/* 快捷按钮行 */}
          <View className="flex-row items-center px-3 pt-2 gap-1">
            <Pressable onPress={() => { setShowPhrases(!showPhrases); setShowEmoji(false); setShowTime(false); }}>
              <View className={`rounded-full px-3 py-1.5 ${showPhrases ? "bg-primary/20" : "bg-surface"}`}>
                <Text className="text-xs font-medium text-foreground">💬 常用语</Text>
              </View>
            </Pressable>
            <Pressable onPress={() => { setShowEmoji(!showEmoji); setShowPhrases(false); setShowTime(false); }}>
              <View className={`rounded-full px-3 py-1.5 ${showEmoji ? "bg-primary/20" : "bg-surface"}`}>
                <Text className="text-xs font-medium text-foreground">😊 表情</Text>
              </View>
            </Pressable>
            <Pressable onPress={handlePickImage}>
              <View className="rounded-full px-3 py-1.5 bg-surface">
                <Text className="text-xs font-medium text-foreground">🖼 图片</Text>
              </View>
            </Pressable>
            <View className="flex-1" />
            <Pressable onPress={() => { setShowTime(!showTime); setShowPhrases(false); setShowEmoji(false); }}>
              <View className={`rounded-full px-3 py-1.5 ${showTime ? "bg-accent/25" : "bg-accent/15"}`}>
                <Text className="text-xs font-medium text-accent">📅 约时间</Text>
              </View>
            </Pressable>
          </View>

          {/* 文本输入行 */}
          <View className="flex-row items-center px-3 py-2">
            <TextInput
              className="flex-1 bg-surface rounded-full border border-border px-4 py-2.5 text-sm text-foreground"
              placeholder="输入消息..."
              placeholderTextColor="#9BA1A6"
              value={inputText}
              onChangeText={setInputText}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(inputText)}
              onFocus={() => { setShowPhrases(false); setShowEmoji(false); setShowTime(false); }}
            />
            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginLeft: 8 }]}
              onPress={() => sendMessage(inputText)}
            >
              <View className="w-9 h-9 rounded-full bg-primary items-center justify-center">
                <Text className="text-sm">📤</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
