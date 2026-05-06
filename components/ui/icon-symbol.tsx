// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings for PingPong Arena
 */
const MAPPING = {
  // Tab icons
  "house.fill": "home",
  "doc.text.fill": "description",
  "trophy.fill": "emoji-events",
  "sportscourt.fill": "sports-tennis",
  "person.fill": "person",
  // Common icons
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "plus.circle.fill": "add-circle",
  "chart.bar.fill": "bar-chart",
  "flame.fill": "local-fire-department",
  "star.fill": "star",
  "bolt.fill": "bolt",
  "person.2.fill": "people",
  "calendar": "event",
  "location.fill": "place",
  "gear": "settings",
  "arrow.up.circle.fill": "trending-up",
  "arrow.down.circle.fill": "trending-down",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
