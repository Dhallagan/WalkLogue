import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import { PaperSheet } from "../../src/components/notebook";
import { Screen } from "../../src/components/ui";
import {
  formatCompactDate,
  formatEntryMeta,
} from "../../src/lib/date";
import {
  createManualEntry,
  getEntryById,
  updateEntry,
} from "../../src/modules/journal/repository";
import type { EntryDetail } from "../../src/modules/journal/types";
import { colors } from "../../src/theme";

const ENTRY_RULE_GAP = 32;
const ENTRY_RULE_OFFSET = 40;

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const router = useRouter();

  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const dirtyRef = useRef(false);
  const hasCreatedManualRef = useRef(false);

  useEffect(() => {
    void loadEntry();
  }, [id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useFocusEffect(() => {
    return () => {
      if (dirtyRef.current && entry) {
        void saveChanges(entry.id, title, body);
      }
    };
  });

  async function loadEntry() {
    if (id === "new") {
      if (hasCreatedManualRef.current) {
        return;
      }

      hasCreatedManualRef.current = true;
      const created = await createManualEntry(db);
      const persisted = await getEntryById(db, created.id);

      if (persisted) {
        setEntry(persisted);
        setTitle(persisted.title);
        setBody(persisted.body);
      }

      return;
    }

    const persisted = await getEntryById(db, id);

    if (persisted) {
      setEntry(persisted);
      setTitle(persisted.title);
      setBody(persisted.body);
    }
  }

  async function saveChanges(nextId: string, nextTitle: string, nextBody: string) {
    dirtyRef.current = false;
    await updateEntry(db, nextId, {
      title: nextTitle.trim() || entry?.title || "",
      body: nextBody,
    });
  }

  async function handleDone() {
    if (dirtyRef.current && entry) {
      await saveChanges(entry.id, title, body);
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    router.replace("/");
  }

  if (!entry) {
    return (
      <Screen includeTopInset>
        <Text style={styles.loadingText}>Loading entry…</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll includeTopInset>
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <Text style={styles.dateText}>{formatCompactDate(entry.createdAt)}</Text>
          <Text style={styles.metaText}>{formatEntryMeta(entry.createdAt)}</Text>
        </View>
        <Pressable hitSlop={10} onPress={() => void handleDone()}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>

      <PaperSheet
        style={styles.sheet}
        contentStyle={styles.sheetContent}
        lineGap={ENTRY_RULE_GAP}
        lineOffset={ENTRY_RULE_OFFSET}
      >
        <TextInput
          value={body}
          onChangeText={(nextValue) => {
            dirtyRef.current = true;
            setBody(nextValue);
          }}
          onBlur={() => {
            if (dirtyRef.current) {
              void saveChanges(entry.id, title, body);
            }
          }}
          multiline
          textAlignVertical="top"
          style={styles.bodyInput}
          placeholder="Write what happened today."
          placeholderTextColor={colors.muted}
        />
      </PaperSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    color: colors.text,
    fontSize: 16,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  header: {
    gap: 4,
    paddingTop: 2,
    flex: 1,
  },
  dateText: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "300",
    letterSpacing: -0.6,
  },
  metaText: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: "Courier",
  },
  doneText: {
    color: colors.text,
    fontSize: 13,
    letterSpacing: 1,
    fontFamily: "Courier",
    paddingTop: 4,
  },
  sheet: {
    minHeight: 520,
    marginBottom: 16,
  },
  sheetContent: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  bodyInput: {
    minHeight: 472,
    color: colors.text,
    fontSize: 17,
    lineHeight: ENTRY_RULE_GAP,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
});
