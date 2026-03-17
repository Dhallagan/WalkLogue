import { startTransition, useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  EntrySwipeRow,
  type EntrySwipeRowHandle,
} from "../../components/entry-swipe-row";
import { formatLongDay } from "../../lib/date";
import { deleteEntry, listEntries } from "./repository";
import type { EntryListItem } from "./types";
import { colors } from "../../theme";

type EntrySection = {
  title: string;
  data: EntryListItem[];
};

export default function EntriesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [entries, setEntries] = useState<EntryListItem[]>([]);
  const openSwipeableRef = useRef<EntrySwipeRowHandle | null>(null);
  const todayLabel = formatLongDay(new Date());
  const sections = useMemo(() => groupEntriesByDay(entries), [entries]);
  const loadEntries = useCallback(async () => {
    try {
      const loadedEntries = await listEntries(db);
      startTransition(() => {
        setEntries(loadedEntries);
      });
    } catch (error) {
      console.error("Failed to load entries", error);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void loadEntries();

      return () => {
        openSwipeableRef.current?.close();
        openSwipeableRef.current = null;
      };
    }, [loadEntries]),
  );

  const handleRowOpen = useCallback((nextSwipeable: EntrySwipeRowHandle) => {
    if (openSwipeableRef.current && openSwipeableRef.current !== nextSwipeable) {
      openSwipeableRef.current.close();
    }

    openSwipeableRef.current = nextSwipeable;
  }, []);

  const handleDelete = useCallback(
    async (entryId: string) => {
      openSwipeableRef.current?.close();
      openSwipeableRef.current = null;

      startTransition(() => {
        setEntries((currentEntries) =>
          currentEntries.filter((entry) => entry.id !== entryId),
        );
      });

      try {
        await deleteEntry(db, entryId);
      } catch (error) {
        console.error("Failed to delete entry", error);
        Alert.alert("Couldn't delete entry", "Please try again.");
        await loadEntries();
      }
    },
    [db, loadEntries],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.header}>
            <Text style={styles.title}>All Entries</Text>
          </View>
        </View>

        <SectionList
          style={styles.list}
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.listEmptyWrap}>
              <Text style={styles.emptyText}>No entries yet.</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>
              {section.title === todayLabel ? "Today" : section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <EntrySwipeRow
              entry={item}
              onOpen={handleRowOpen}
              onDelete={() => void handleDelete(item.id)}
              onPress={() => router.push(`/entry/${item.id}`)}
            />
          )}
          SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
        />
      </View>
    </SafeAreaView>
  );
}

function groupEntriesByDay(entries: EntryListItem[]): EntrySection[] {
  const sections = new Map<string, EntryListItem[]>();

  for (const entry of entries) {
    const key = formatLongDay(entry.createdAt);
    const nextGroup = sections.get(key) ?? [];
    nextGroup.push(entry);
    sections.set(key, nextGroup);
  }

  return Array.from(sections.entries()).map(([title, data]) => ({
    title,
    data,
  }));
}

const styles = StyleSheet.create({
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 2,
    paddingBottom: 18,
  },
  listEmptyWrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.8,
    fontFamily: "Courier",
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  sectionGap: {
    height: 10,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
  },
});
