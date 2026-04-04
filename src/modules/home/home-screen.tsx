import { startTransition, useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

import { PaperRecordButton } from "../../components/notebook";
import { formatDayKey, formatLongDay } from "../../lib/date";
import {
  completeTask,
  countUtcEntries,
  createTask,
  getEntriesNeedingTaskExtraction,
  listOpenTasks,
  markTasksExtracted,
  migrateUtcToLocal,
  skipTask,
  type TaskRow,
} from "../journal/repository";
import {
  backfillMissingTitles,
  backfillPeople,
  generateDailyHomeCards,
  generatePersonSummary,
  hasInsightsConfig,
  peekCachedDailyHomeCards,
  type DailyHomeCards,
} from "../insights/openai";
import {
  getEntriesForPerson,
  getEntriesNeedingPeopleExtraction,
  getExistingPeopleContext,
  linkPeopleToEntry,
  listEntries,
  listPeople,
  updateEntryTitle,
  updatePerson,
  upsertDailySteps,
} from "../journal/repository";
import type { EntryListItem } from "../journal/types";
import {
  getTodayStepSnapshot,
  makeDailyStepsRecord,
  type StepPermissionStatus,
  type StepSource,
} from "../steps/service";
import {
  buildInsightSnapshot,
  type InsightSnapshot,
} from "../insights/analysis";
import {
  backfillTasks,
  generateReflection,
  generateSmartObservations,
  peekCachedObservations,
  peekCachedReflection,
  type ExtractedTask,
  type ObservationCard,
} from "../insights/openai";
import { useTheme, useThemeColors } from "../../theme";

type WeeklyDigest = {
  snapshot: InsightSnapshot;
  reflection: string;
};

type HomeScreenMemoryState = {
  entries: EntryListItem[];
  todaySteps: number | null;
  stepPermission: StepPermissionStatus;
  stepSource: StepSource;
  hasLoadedOnce: boolean;
  dailyHomeCards: DailyHomeCards | null;
  weeklyDigest: WeeklyDigest | null;
};

type TodayOverview = {
  journalValue: string;
  journalDetail: string;
  latestEntryRoute?: Href;
  stepsValue: string;
  stepsDetail: string;
};


const initialMemoryState: HomeScreenMemoryState = {
  entries: [],
  todaySteps: null,
  stepPermission: "undetermined",
  stepSource: "apple-health",
  hasLoadedOnce: false,
  dailyHomeCards: null,
  weeklyDigest: null,
};

let homeScreenMemoryState: HomeScreenMemoryState = initialMemoryState;
let lastWeeklyDigest: WeeklyDigest | null = null;

export function getLastWeeklyDigest() {
  return lastWeeklyDigest;
}

export default function HomeScreen({
  onNavigateEntries: _onNavigateEntries,
  onNavigateInsights: _onNavigateInsights,
}: {
  onNavigateEntries: () => void;
  onNavigateInsights: () => void;
}) {
  const db = useSQLiteContext();
  const router = useRouter();
  const [entries, setEntries] = useState<EntryListItem[]>(homeScreenMemoryState.entries);
  const [todaySteps, setTodaySteps] = useState<number | null>(
    homeScreenMemoryState.todaySteps,
  );
  const [stepPermission, setStepPermission] = useState<StepPermissionStatus>(
    homeScreenMemoryState.stepPermission,
  );
  const [stepSource, setStepSource] = useState<StepSource>(homeScreenMemoryState.stepSource);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(homeScreenMemoryState.hasLoadedOnce);
  const [dailyHomeCards, setDailyHomeCards] = useState<DailyHomeCards | null>(
    homeScreenMemoryState.dailyHomeCards,
  );
  const [weeklyDigest, setWeeklyDigest] = useState<WeeklyDigest | null>(null);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [observations, setObservations] = useState<ObservationCard[]>([]);
  const [openTasks, setOpenTasks] = useState<TaskRow[]>([]);
  const hasCheckedUtcRef = useRef(false);
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const todayLabel = formatLongDay(new Date());
  const aiReady = hasInsightsConfig();

  const loadHome = useCallback(async () => {
    try {
      const [nextEntries, stepSnapshot] = await Promise.all([
        listEntries(db),
        getTodayStepSnapshot(),
      ]);

      startTransition(() => {
        setEntries(nextEntries);
        setTodaySteps(stepSnapshot.totalSteps);
        setStepPermission(stepSnapshot.permission);
        setStepSource(stepSnapshot.source);
        setHasLoadedOnce(true);
      });

      const todayEntries = nextEntries.filter(
        (entry) => isSameCalendarDay(entry.createdAt, new Date()) && isJournalEntryComplete(entry),
      );
      const cachedDailyCards =
        aiReady && todayEntries.length > 0 ? peekCachedDailyHomeCards(todayEntries) : null;

      startTransition(() => {
        setDailyHomeCards(cachedDailyCards ?? null);
      });

      homeScreenMemoryState = {
        ...homeScreenMemoryState,
        entries: nextEntries,
        todaySteps: stepSnapshot.totalSteps,
        stepPermission: stepSnapshot.permission,
        stepSource: stepSnapshot.source,
        hasLoadedOnce: true,
        dailyHomeCards: cachedDailyCards ?? null,
      };

      if (stepSnapshot.permission === "granted") {
        void upsertDailySteps(db, makeDailyStepsRecord(stepSnapshot.totalSteps));
      }

      if (aiReady && todayEntries.length > 0) {
        void loadDailyHomeCards(todayEntries);
      }

      if (aiReady && nextEntries.length >= 3) {
        const cachedObs = peekCachedObservations(nextEntries, "30d");
        if (cachedObs) {
          setObservations(cachedObs);
        } else {
          void generateSmartObservations(nextEntries, "30d").then(setObservations).catch(() => {});
        }
      }

      backfillMissingTitles(nextEntries, (entryId, title, emoji) => {
        void updateEntryTitle(db, entryId, {
          title,
          titleEmoji: emoji,
        });
      });

      if (aiReady) {
        void runPeopleBackfill();
        void runTaskBackfill();
      }

      void loadOpenTasks();

      if (!hasCheckedUtcRef.current) {
        hasCheckedUtcRef.current = true;
        void checkUtcTimestamps();
      }

      if (aiReady && nextEntries.length >= 3 && new Date().getDay() === 0) {
        void loadWeeklyDigest(nextEntries);
      }
    } catch (error) {
      console.error("Failed to load Home", error);
      startTransition(() => {
        setHasLoadedOnce(true);
      });
    }
  }, [aiReady, db]);

  const loadDailyHomeCards = useCallback(async (todayEntries: EntryListItem[]) => {
    try {
      const nextDailyHomeCards = await generateDailyHomeCards(todayEntries);

      startTransition(() => {
        setDailyHomeCards(nextDailyHomeCards);
      });

      homeScreenMemoryState = {
        ...homeScreenMemoryState,
        dailyHomeCards: nextDailyHomeCards,
      };
    } catch (error) {
      console.error("Failed to load daily home cards", error);
    }
  }, []);

  const runPeopleBackfill = useCallback(async () => {
    try {
      const needsExtraction = await getEntriesNeedingPeopleExtraction(db);
      if (needsExtraction.length === 0) return;

      backfillPeople(
        needsExtraction,
        () => getExistingPeopleContext(db),
        async (entryId, extracted) => {
          if (extracted.length > 0) {
            await linkPeopleToEntry(db, entryId, extracted);
          }
        },
        async () => {
          try {
            const allPeople = await listPeople(db);
            for (const person of allPeople) {
              if (!person.summary) {
                const entries = await getEntriesForPerson(db, person.id);
                const result = await generatePersonSummary(person.name, person.aliases, entries);
                if (result) {
                  await updatePerson(db, person.id, {
                    summary: result.summary,
                    emoji: result.emoji,
                  });
                }
              }
            }
          } catch (error) {
            console.error("People summary generation failed", error);
          }
        },
      );
    } catch (error) {
      console.error("People backfill failed", error);
    }
  }, [db]);

  const loadOpenTasks = useCallback(async () => {
    try {
      const tasks = await listOpenTasks(db);
      setOpenTasks(tasks);
    } catch (error) {
      console.error("Failed to load tasks", error);
    }
  }, [db]);

  const runTaskBackfill = useCallback(async () => {
    try {
      const needsExtraction = await getEntriesNeedingTaskExtraction(db);
      if (needsExtraction.length === 0) return;

      backfillTasks(needsExtraction, async (entryId, tasks) => {
        for (const task of tasks) {
          await createTask(db, entryId, task.title, task.timeframe);
        }
        await markTasksExtracted(db, entryId);
      });
    } catch (error) {
      console.error("Task backfill failed", error);
    }
  }, [db]);

  const checkUtcTimestamps = useCallback(async () => {
    try {
      const count = await countUtcEntries(db);
      if (count === 0) return;

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      Alert.alert(
        "Fix Entry Timestamps",
        `${count} ${count === 1 ? "entry" : "entries"} stored in UTC. Convert to your current timezone (${tz})?`,
        [
          { text: "Not Now", style: "cancel" },
          {
            text: "Fix",
            onPress: async () => {
              const fixed = await migrateUtcToLocal(db);
              Alert.alert("Done", `Converted ${fixed} ${fixed === 1 ? "entry" : "entries"} to ${tz}.`);
            },
          },
        ],
      );
    } catch (error) {
      console.error("UTC check failed", error);
    }
  }, [db]);

  const loadWeeklyDigest = useCallback(async (loadedEntries: EntryListItem[]) => {
    try {
      const lastShown = await SecureStore.getItemAsync("walklog-digest-shown");
      const weekKey = formatDayKey(new Date());
      if (lastShown === weekKey) return;

      const snapshot = buildInsightSnapshot(loadedEntries, "7d");
      if (snapshot.activeEntryCount === 0) return;

      const cached = peekCachedReflection(loadedEntries, "7d");
      if (cached) {
        const digest = { snapshot, reflection: cached };
        lastWeeklyDigest = digest;
        setWeeklyDigest(digest);
        setShowWeeklyModal(true);
        void SecureStore.setItemAsync("walklog-digest-shown", weekKey);
        return;
      }

      const reflection = await generateReflection(loadedEntries, "7d");
      const digest = { snapshot, reflection };
      lastWeeklyDigest = digest;
      setWeeklyDigest(digest);
      setShowWeeklyModal(true);
      void SecureStore.setItemAsync("walklog-digest-shown", weekKey);
    } catch (error) {
      console.error("Weekly digest failed", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHome();
    }, [loadHome]),
  );

  const todayOverview = useMemo(
    () =>
      buildTodayOverview({
        entries,
        hasLoadedOnce,
        permission: stepPermission,
        source: stepSource,
        todaySteps,
      }),
    [entries, hasLoadedOnce, stepPermission, stepSource, todaySteps],
  );

  const handleOpenProfile = useCallback(() => {
    router.push("/profile");
  }, [router]);

  const handleOpenSettings = useCallback(() => {
    router.push("/settings");
  }, [router]);

  const handleOpenLatestEntry = useCallback(() => {
    if (!todayOverview.latestEntryRoute) {
      return;
    }

    router.push(todayOverview.latestEntryRoute);
  }, [router, todayOverview.latestEntryRoute]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.header}>
            <Text style={styles.title}>Today</Text>
            <Text style={styles.dateText}>{todayLabel}</Text>
          </View>
          <View style={styles.headerIcons}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile"
              hitSlop={8}
              onPress={handleOpenProfile}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
            >
              <Ionicons name="person-outline" size={20} color={colors.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={8}
              onPress={handleOpenSettings}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
            >
              <Ionicons name="settings-outline" size={20} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.summaryRow}>
            <Pressable
              disabled={!todayOverview.latestEntryRoute}
              onPress={handleOpenLatestEntry}
              style={({ pressed }) => [
                styles.summaryCard,
                styles.summaryCardLeft,
                pressed && todayOverview.latestEntryRoute && styles.summaryCardPressed,
              ]}
            >
              <Text style={styles.summaryLabel}>Journal</Text>
              <Text style={styles.summaryValue}>{todayOverview.journalValue}</Text>
              <Text style={styles.summaryDetail}>{todayOverview.journalDetail}</Text>
            </Pressable>
            <View style={styles.summaryDivider} />
            <View style={[styles.summaryCard, styles.summaryCardRight]}>
              <Text style={styles.summaryLabel}>Steps</Text>
              <Text style={styles.summaryValue}>{todayOverview.stepsValue}</Text>
              <Text style={styles.summaryDetail}>{todayOverview.stepsDetail}</Text>
            </View>
          </View>

          {openTasks.length > 0 ? (
            <View style={styles.tasksList}>
              {openTasks.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    {task.timeframe ? (
                      <Text style={styles.taskTimeframe}>{task.timeframe}</Text>
                    ) : null}
                  </View>
                  <View style={styles.taskActions}>
                    <Pressable
                      onPress={async () => {
                        await completeTask(db, task.id);
                        void loadOpenTasks();
                      }}
                      style={({ pressed }) => [
                        styles.taskButton,
                        styles.taskButtonDone,
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <Text style={styles.taskButtonDoneText}>{"\u2713"}</Text>
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        await skipTask(db, task.id);
                        void loadOpenTasks();
                      }}
                      style={({ pressed }) => [
                        styles.taskButton,
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <Text style={styles.taskButtonSkipText}>{"\u2717"}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}


        </ScrollView>

        {weeklyDigest ? (
          <Modal
            visible={showWeeklyModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowWeeklyModal(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Your Week</Text>
                <Pressable
                  hitSlop={12}
                  onPress={() => setShowWeeklyModal(false)}
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
        ) : null}

        <View style={styles.bottomDock}>
          <View style={styles.bottomDockRule} />
          <PaperRecordButton label="Start Walk" onPress={() => router.push("/walk")} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function buildTodayOverview({
  entries,
  hasLoadedOnce,
  permission,
  source,
  todaySteps,
}: {
  entries: EntryListItem[];
  hasLoadedOnce: boolean;
  permission: StepPermissionStatus;
  source: StepSource;
  todaySteps: number | null;
}): TodayOverview {
  const sourceLabel = source === "fitbit" ? "Fitbit" : "Apple Health";
  const todayJournalCount = countTodayJournalEntries(entries);
  const latestTodayEntry = findLatestTodayJournalEntry(entries);
  const stepsGranted = permission === "granted";
  const stepValue = todaySteps === null ? "--" : todaySteps.toLocaleString();

  if (!hasLoadedOnce && todaySteps === null) {
    return {
      journalValue: "--",
      journalDetail: "Loading",
      stepsValue: "--",
      stepsDetail: "Loading",
    };
  }

  const journalValue = todayJournalCount > 0 ? "Done" : "Open";
  const journalDetail =
    todayJournalCount === 0
      ? "No entry today"
      : todayJournalCount === 1
        ? "1 entry today"
        : `${todayJournalCount} entries today`;

  const stepsValue = stepsGranted
    ? stepValue
    : permission === "unavailable"
      ? "N/A"
      : "Off";

  const stepsDetail = stepsGranted
    ? sourceLabel
    : permission === "unavailable"
      ? `${sourceLabel} unavailable`
      : `${sourceLabel} off`;

  return {
    journalValue,
    journalDetail,
    latestEntryRoute: latestTodayEntry ? (`/entry/${latestTodayEntry.id}` as Href) : undefined,
    stepsValue,
    stepsDetail,
  };
}

function countTodayJournalEntries(entries: EntryListItem[]) {
  const today = new Date();
  let count = 0;

  for (const entry of entries) {
    if (!isSameCalendarDay(entry.createdAt, today)) {
      continue;
    }

    if (isJournalEntryComplete(entry)) {
      count += 1;
    }
  }

  return count;
}

function findLatestTodayJournalEntry(entries: EntryListItem[]) {
  const today = new Date();

  for (const entry of entries) {
    if (!isSameCalendarDay(entry.createdAt, today)) {
      continue;
    }

    if (isJournalEntryComplete(entry)) {
      return entry;
    }
  }

  return null;
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isJournalEntryComplete(entry: EntryListItem) {
  if (entry.source === "walk") {
    return true;
  }

  return entry.body.trim().length > 0;
}

function countWords(body: string) {
  return tokenize(body).length;
}

function tokenize(body: string) {
  return body
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}


function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  header: {
    flex: 1,
    paddingLeft: 18,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "300",
    letterSpacing: -1.2,
  },
  dateText: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "300",
    letterSpacing: -0.6,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    marginRight: 14,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPressed: {
    opacity: 0.5,
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    paddingTop: 2,
    paddingBottom: 12,
    gap: 16,
  },
  summaryRow: {
    flexDirection: "row",
    minHeight: 110,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginHorizontal: 18,
  },
  summaryCard: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 6,
  },
  summaryCardLeft: {
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  summaryCardRight: {
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  summaryCardPressed: {
    backgroundColor: colors.accentSoft,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.rule,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: "Courier",
    textTransform: "uppercase",
  },
  summaryValue: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "300",
    letterSpacing: -0.6,
  },
  summaryDetail: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  tasksList: {
    paddingHorizontal: 18,
    gap: 8,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 12,
  },
  taskContent: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  taskTimeframe: {
    color: colors.muted,
    fontSize: 12,
  },
  taskActions: {
    flexDirection: "row",
    gap: 6,
  },
  taskButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  taskButtonDone: {
    backgroundColor: colors.accentSoft,
  },
  taskButtonDoneText: {
    color: colors.success,
    fontSize: 16,
    fontWeight: "600",
  },
  taskButtonSkipText: {
    color: colors.muted,
    fontSize: 14,
  },
  insightCard: {
    marginHorizontal: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 6,
  },
  insightCardPressed: {
    opacity: 0.7,
  },
  insightTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "400",
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  insightDetail: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  insightMore: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
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
  homeCardBodyMuted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
  bottomDock: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
    paddingBottom: 16,
    backgroundColor: colors.background,
    gap: 8,
  },
  bottomDockRule: {
    alignSelf: "stretch",
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 18,
    backgroundColor: colors.rule,
  },
});
}
