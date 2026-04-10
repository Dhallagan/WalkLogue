import { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useTheme, useThemeColors } from "../../theme";
import { STAGE_LABELS, type BuddyState } from "./state";
import { SPRITES } from "./sprites";
import { PixelSprite } from "./pixel-sprite";
import { PixelHealthBar } from "./pixel-heart";

export function BuddyView({ buddy }: { buddy: BuddyState }) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sprite = SPRITES[buddy.kind][buddy.stage];
  const stageLabel = STAGE_LABELS[buddy.kind][buddy.stage];
  const isDead = buddy.mood === "dead";

  return (
    <View style={styles.container}>
      {/* Health row */}
      <View style={styles.healthRow}>
        <Text style={styles.label}>HP</Text>
        <PixelHealthBar
          health={buddy.health}
          pixelSize={3}
          color={buddy.health > 25 ? "#C2654A" : "#8B3A2A"}
          emptyColor={colors.border}
        />
      </View>

      {/* Sprite */}
      <View style={styles.spriteContainer}>
        <PixelSprite grid={sprite} size={140} dead={isDead} />
      </View>

      {/* Speech */}
      {buddy.speech ? (
        <Text style={styles.speech}>&quot;{buddy.speech}&quot;</Text>
      ) : null}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statIcon}>{">"}</Text>
          <Text style={styles.statLabel}>STEPS</Text>
          <Text style={styles.statValue}>
            {buddy.stepsBar >= 100 ? "OK" : `${buddy.stepsBar}%`}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statIcon}>{">"}</Text>
          <Text style={styles.statLabel}>JOURNAL</Text>
          <Text style={styles.statValue}>
            {buddy.journalBar >= 100 ? "OK" : "--"}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        {isDead
          ? "GAME OVER - RESET IN SETTINGS"
          : `DAY ${buddy.streak}  ·  ${stageLabel.toUpperCase()}`}
      </Text>
    </View>
  );
}

type ColorTokens = ReturnType<typeof useTheme>["colors"];

function createStyles(colors: ColorTokens) {
  const mono = Platform.select({
    ios: "Courier",
    android: "monospace",
    default: "monospace",
  });

  return StyleSheet.create({
    container: {
      marginHorizontal: 18,
      padding: 16,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: "center",
      gap: 12,
    },
    healthRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      alignSelf: "stretch",
    },
    label: {
      fontFamily: mono,
      fontSize: 11,
      fontWeight: "700",
      color: colors.muted,
      letterSpacing: 1,
    },
    spriteContainer: {
      paddingVertical: 4,
    },
    speech: {
      fontFamily: mono,
      fontSize: 13,
      color: colors.text,
      textAlign: "center",
      lineHeight: 18,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "stretch",
      gap: 12,
    },
    stat: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      height: 14,
      backgroundColor: colors.border,
    },
    statIcon: {
      fontFamily: mono,
      fontSize: 10,
      color: colors.muted,
    },
    statLabel: {
      fontFamily: mono,
      fontSize: 10,
      fontWeight: "600",
      color: colors.muted,
      letterSpacing: 0.5,
    },
    statValue: {
      fontFamily: mono,
      fontSize: 10,
      fontWeight: "700",
      color: colors.text,
      marginLeft: "auto",
    },
    footer: {
      fontFamily: mono,
      fontSize: 10,
      color: colors.muted,
      letterSpacing: 1.5,
      textAlign: "center",
    },
  });
}
