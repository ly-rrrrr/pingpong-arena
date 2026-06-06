import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { reportBug } from "@/lib/dev/report-bug";

export function BugReportButton() {
  if (!__DEV__) return null;

  return (
    <Pressable
      style={styles.button}
      onPress={() => {
        Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        reportBug({
          description: "用户测试时点击了报错按钮，请结合最近事件自动分析问题。",
          severity: "major",
        });
      }}
      onLongPress={() => {
        Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        reportBug({
          description: "用户长按报错按钮——这是一个严重问题，当前功能完全无法使用。",
          severity: "blocker",
        });
      }}
    >
      <Text style={styles.text}>BUG</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 16,
    bottom: 48,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  text: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
  },
});
