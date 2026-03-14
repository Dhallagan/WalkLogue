import { PropsWithChildren } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "../theme";

export function Screen({
  children,
  scroll = false,
  style,
}: PropsWithChildren<{ scroll?: boolean; style?: ViewStyle }>) {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, style]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function PrimaryButton({
  children,
  style,
  ...props
}: PropsWithChildren<PressableProps & { style?: ViewStyle }>) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && styles.buttonPressed,
        style,
      ]}
    >
      <Text style={styles.primaryButtonText}>{children}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  children,
  style,
  ...props
}: PropsWithChildren<PressableProps & { style?: ViewStyle }>) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.secondaryButton,
        pressed && styles.buttonPressed,
        style,
      ]}
    >
      <Text style={styles.secondaryButtonText}>{children}</Text>
    </Pressable>
  );
}

export function Pill({
  children,
  tone = "default",
}: PropsWithChildren<{ tone?: "default" | "success" | "danger" }>) {
  return (
    <View
      style={[
        styles.pill,
        tone === "success" && styles.pillSuccess,
        tone === "danger" && styles.pillDanger,
      ]}
    >
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionTitle: {
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: {
    color: "#FFF8F2",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: -0.2,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
    letterSpacing: -0.2,
  },
  buttonPressed: {
    opacity: 0.84,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillSuccess: {
    backgroundColor: "#E9F4EA",
    borderColor: "#B8D0BE",
  },
  pillDanger: {
    backgroundColor: "#FCEBE6",
    borderColor: "#E3B8AB",
  },
  pillText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
});
