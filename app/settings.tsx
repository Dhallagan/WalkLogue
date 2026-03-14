import { StyleSheet, Text, View } from "react-native";

import { Card, Pill, Screen, SectionTitle } from "../src/components/ui";
import { colors, spacing } from "../src/theme";

export default function SettingsScreen() {
  return (
    <Screen scroll>
      <SectionTitle>Prototype Settings</SectionTitle>
      <Text style={styles.intro}>
        Native integrations are intentionally disabled in this build. This screen
        exists to shape the settings UI before speech recognition and HealthKit
        are reintroduced.
      </Text>

      <Card style={styles.permissionCard}>
        <View style={styles.permissionHeader}>
          <Text style={styles.permissionTitle}>Microphone + Speech</Text>
          <Pill>Planned</Pill>
        </View>
        <Text style={styles.permissionBody}>
          Later this will show whether spoken walk capture is available and where
          to fix denied permissions.
        </Text>
      </Card>

      <Card style={styles.permissionCard}>
        <View style={styles.permissionHeader}>
          <Text style={styles.permissionTitle}>Apple Health</Text>
          <Pill>Planned</Pill>
        </View>
        <Text style={styles.permissionBody}>
          Later this will show step-read access and whether session and daily step
          totals are connected.
        </Text>
      </Card>

      <Card style={styles.permissionCard}>
        <View style={styles.permissionHeader}>
          <Text style={styles.permissionTitle}>Prototype Mode</Text>
          <Pill tone="success">Active</Pill>
        </View>
        <Text style={styles.permissionBody}>
          The current app is optimized for iterating on screen design, copy, and
          navigation. Walk capture is mocked and saves a demo entry when you end
          a session.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    color: colors.muted,
    lineHeight: 21,
  },
  permissionCard: {
    gap: spacing.sm,
  },
  permissionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  permissionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    flex: 1,
  },
  permissionBody: {
    color: colors.muted,
    lineHeight: 21,
  },
});
