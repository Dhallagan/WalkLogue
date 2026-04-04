import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import { Panel, Screen, SectionLabel } from "../../components/ui";
import { getLastWeeklyDigest } from "../home/home-screen";
import { listEntries } from "../journal/repository";
import type { EntryListItem } from "../journal/types";
import {
  buildInsightSnapshot,
  INSIGHT_TIMEFRAMES,
  type InsightSnapshot,
  type InsightTimeframe,
} from "../insights/analysis";
import {
  generateReflection,
  generateSmartObservations,
  hasInsightsConfig,
  peekCachedObservations,
  peekCachedReflection,
  type ObservationCard,
} from "../insights/openai";
import { useTheme, useThemeColors, spacing } from "../../theme";

export default function ProfileScreen() {
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const db = useSQLiteContext();
  const [showDigestModal, setShowDigestModal] = useState(false);
  const weeklyDigest = getLastWeeklyDigest();
  const [entries, setEntries] = useState<EntryListItem[]>([]);
  const [timeframe, setTimeframe] = useState<InsightTimeframe>("30d");
  const [snapshot, setSnapshot] = useState<InsightSnapshot | null>(null);
  const [reflection, setReflection] = useState("");
  const [reflectionError, setReflectionError] = useState<string | null>(null);
  const [isRefreshingReflection, setIsRefreshingReflection] = useState(false);
  const [observations, setObservations] = useState<ObservationCard[]>([]);
  const aiReady = hasInsightsConfig();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void listEntries(db).then((loadedEntries) => {
        if (!isActive) {
          return;
        }

        setEntries(loadedEntries);

        if (aiReady && loadedEntries.length > 0) {
          const cachedReflection = peekCachedReflection(loadedEntries, timeframe);

          if (cachedReflection) {
            setReflectionError(null);
            setReflection(cachedReflection);
            setIsRefreshingReflection(false);
          } else {
            void loadReflection(loadedEntries, timeframe, () => isActive);
          }

          const cachedObs = peekCachedObservations(loadedEntries, timeframe);
          if (cachedObs) {
            setObservations(cachedObs);
          } else {
            void generateSmartObservations(loadedEntries, timeframe)
              .then((obs) => { if (isActive) setObservations(obs); })
              .catch(() => {});
          }
          return;
        }

        if (loadedEntries.length === 0) {
          setReflection("");
          setReflectionError(null);
        }
      });

      return () => {
        isActive = false;
      };
    }, [aiReady, db, timeframe]),
  );

  async function loadReflection(
    loadedEntries: EntryListItem[],
    nextTimeframe: InsightTimeframe,
    isActive = () => true,
  ) {
    const cachedReflection = peekCachedReflection(loadedEntries, nextTimeframe);

    if (cachedReflection) {
      setReflectionError(null);
      setReflection(cachedReflection);
      setIsRefreshingReflection(false);
      return;
    }

    setIsRefreshingReflection(true);
    setReflectionError(null);

    try {
      const nextReflection = await generateReflection(loadedEntries, nextTimeframe);

      if (!isActive()) {
        return;
      }

      setReflection(nextReflection);
    } catch (error) {
      if (!isActive()) {
        return;
      }

      const message =
        error instanceof Error ? error.message : "Could not load reflection.";
      setReflectionError(message);
      setReflection("");
    } finally {
      if (isActive()) {
        setIsRefreshingReflection(false);
      }
    }
  }

  return (
    <Screen scroll>
      <Panel style={styles.timeframePanel}>
        <Text style={styles.timeframeLabel}>Time Window</Text>
        <View style={styles.timeframeRow}>
          {INSIGHT_TIMEFRAMES.map((option) => (
            <Pressable
              key={option.id}
              style={[
                styles.timeframeChip,
                timeframe === option.id && styles.timeframeChipActive,
              ]}
              onPress={() => setTimeframe(option.id)}
            >
              <Text
                style={[
                  styles.timeframeChipText,
                  timeframe === option.id && styles.timeframeChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Panel>

      <Panel tone="soft">
        <Text style={styles.heroEyebrow}>Top Of Mind</Text>
        {entries.length === 0 ? (
          <Text style={styles.heroBody}>
            Once you have entries, this will show what keeps coming up.
          </Text>
        ) : isRefreshingReflection ? (
          <Text style={styles.heroBody}>Reading...</Text>
        ) : reflectionError ? (
          <Text style={styles.heroBody}>{reflectionError}</Text>
        ) : reflection ? (
          <Text style={styles.heroBody}>{reflection}</Text>
        ) : null}
      </Panel>

      {observations.length > 0 ? (
        <>
          <SectionLabel>Patterns</SectionLabel>
          {observations.map((card, index) => (
            <Panel key={index}>
              <Text style={styles.observationLabel}>
                {card.type === "person" ? "Who You Talk About"
                  : card.type === "task" ? "Did You Do This?"
                  : card.type === "reminder" ? "Circle Back"
                  : "Pattern"}
              </Text>
              <Text style={styles.observationTitle}>{card.title}</Text>
              <Text style={styles.observationDetail}>{card.detail}</Text>
            </Panel>
          ))}
        </>
      ) : null}

      {weeklyDigest ? (
        <>
          <Pressable
            onPress={() => setShowDigestModal(true)}
            style={({ pressed }) => [
              styles.digestButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.digestButtonText}>View Weekly Digest</Text>
          </Pressable>

          <Modal
            visible={showDigestModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowDigestModal(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Your Week</Text>
                <Pressable
                  hitSlop={12}
                  onPress={() => setShowDigestModal(false)}
                  style={({ pressed }) => pressed ? { opacity: 0.5 } : undefined}
                >
                  <Text style={styles.modalClose}>Done</Text>
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.modalContent}>
                <View style={styles.modalStatsRow}>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatValue}>
                      {weeklyDigest.snapshot.activeEntryCount}
                    </Text>
                    <Text style={styles.modalStatLabel}>Entries</Text>
                  </View>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatValue}>
                      {weeklyDigest.snapshot.walkCount}
                    </Text>
                    <Text style={styles.modalStatLabel}>Walks</Text>
                  </View>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatValue}>
                      {weeklyDigest.snapshot.totalSteps > 0
                        ? weeklyDigest.snapshot.totalSteps.toLocaleString()
                        : "--"}
                    </Text>
                    <Text style={styles.modalStatLabel}>Steps</Text>
                  </View>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatValue}>
                      {weeklyDigest.snapshot.totalWords.toLocaleString()}
                    </Text>
                    <Text style={styles.modalStatLabel}>Words</Text>
                  </View>
                </View>
                <Text style={styles.modalReflection}>{weeklyDigest.reflection}</Text>
              </ScrollView>
            </View>
          </Modal>
        </>
      ) : null}
    </Screen>
  );
}


type ColorTokens = ReturnType<typeof useTheme>["colors"];

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  timeframePanel: {
    gap: spacing.sm,
  },
  timeframeLabel: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: "Courier",
    textTransform: "uppercase",
  },
  timeframeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  timeframeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  timeframeChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  timeframeChipText: {
    color: colors.text,
    fontSize: 13,
    fontFamily: "Courier",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  timeframeChipTextActive: {
    color: "#FFF8F2",
  },
  heroEyebrow: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: "Courier",
    textTransform: "uppercase",
  },
  heroBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  panel: {
    gap: spacing.md,
  },
  observationLabel: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: "Courier",
    textTransform: "uppercase",
  },
  observationTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "500",
    letterSpacing: -0.3,
  },
  observationDetail: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  digestButton: {
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  digestButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "300",
    letterSpacing: -0.8,
  },
  modalClose: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "500",
  },
  modalContent: {
    paddingHorizontal: 22,
    paddingBottom: 40,
    gap: 24,
  },
  modalStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
  },
  modalStat: {
    alignItems: "center",
    gap: 4,
  },
  modalStatValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "300",
    letterSpacing: -0.5,
  },
  modalStatLabel: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: "Courier",
    textTransform: "uppercase",
  },
  modalReflection: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 26,
  },
});
}
