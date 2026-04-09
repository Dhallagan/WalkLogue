import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors } from "../theme";

type ToastKind = "error" | "info";
type ToastMessage = { id: number; kind: ToastKind; text: string };

type Listener = (msg: ToastMessage) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function showToast(text: string, kind: ToastKind = "error") {
  const msg: ToastMessage = { id: ++counter, kind, text };
  for (const listener of listeners) listener(msg);
}

export function ToastHost() {
  const { colors } = useThemeColors();
  const [current, setCurrent] = useState<ToastMessage | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    const listener: Listener = (msg) => setCurrent(msg);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translate, { toValue: -20, duration: 220, useNativeDriver: true }),
      ]).start(() => setCurrent(null));
    }, 4000);

    return () => clearTimeout(timer);
  }, [current, opacity, translate]);

  if (!current) return null;

  const isError = current.kind === "error";

  return (
    <SafeAreaView pointerEvents="none" style={styles.safeArea} edges={["top"]}>
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: colors.surface,
            borderColor: isError ? "#C2654A" : colors.border,
            opacity,
            transform: [{ translateY: translate }],
          },
        ]}
      >
        <View
          style={[styles.dot, { backgroundColor: isError ? "#C2654A" : colors.muted }]}
        />
        <Text style={[styles.text, { color: colors.text }]} numberOfLines={2}>
          {current.text}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "92%",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
});
