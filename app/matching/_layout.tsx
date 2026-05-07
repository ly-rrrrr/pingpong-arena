import { Stack } from "expo-router";

export default function MatchingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="confirm" />
      <Stack.Screen name="channel" />
      <Stack.Screen name="venue-select" />
      <Stack.Screen name="retreat" />
    </Stack>
  );
}
