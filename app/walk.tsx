import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  PaperRecordButton,
  PaperSheet,
} from "../src/components/notebook";
import { formatCompactDate, formatElapsed } from "../src/lib/date";
import { createWalkEntry } from "../src/modules/journal/repository";
import { colors } from "../src/theme";

const DEFAULT_TRANSCRIPT =
  "Walked through the neighborhood and thought about how simple this should feel. This is where the transcript for the day would appear.";

export default function WalkScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [body, setBody] = useState(DEFAULT_TRANSCRIPT);
  const [startedAt] = useState(() => new Date());

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const intervalId = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isPaused]);

  const stepCount = useMemo(
    () => Math.max(412, Math.round(elapsedSeconds * 1.9)),
    [elapsedSeconds],
  );

  async function handleFinish() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const endedAt = new Date();
      const entry = await createWalkEntry(db, {
        body: body.trim() || "Prototype walk entry",
        startedAt,
        endedAt,
        durationSec: elapsedSeconds,
        stepCount,
      });

      if (entry) {
        router.replace(`/entry/${entry.id}`);
        return;
      }

      router.replace("/");
    } catch (error) {
      console.error("Could not save walk entry", error);
      Alert.alert("Could not save mock walk", "Try again from the home screen.");
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Today</Text>
          <View style={styles.metaRow}>
            <Text style={styles.dateText}>{formatCompactDate(new Date())}</Text>
            <Pressable onPress={() => setIsPaused((current) => !current)}>
              <Text style={styles.pauseText}>{isPaused ? "Resume" : "Pause"}</Text>
            </Pressable>
          </View>
          <Text style={styles.statusLine}>
            {formatElapsed(elapsedSeconds)}  •  {stepCount.toLocaleString()} steps
          </Text>
        </View>

        <PaperSheet style={styles.sheet} contentStyle={styles.sheetContent}>
          <TextInput
            multiline
            textAlignVertical="top"
            value={body}
            onChangeText={setBody}
            style={styles.noteInput}
            placeholder="Your walk transcript will appear here."
            placeholderTextColor={colors.muted}
          />
        </PaperSheet>

        <View style={styles.bottomAction}>
          <PaperRecordButton
            label={isSaving ? "Saving..." : "End Walk"}
            mode="stop"
            disabled={isSaving}
            onPress={() => void handleFinish()}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  dateText: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "300",
    letterSpacing: -0.6,
  },
  pauseText: {
    color: colors.text,
    fontSize: 13,
    letterSpacing: 0.8,
    fontFamily: "Courier",
  },
  statusLine: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: "Courier",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sheet: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 10,
  },
  sheetContent: {
    paddingTop: 14,
    paddingBottom: 14,
  },
  noteInput: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    lineHeight: 28,
    paddingTop: 0,
  },
  bottomAction: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: colors.background,
  },
});
