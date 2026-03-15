import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import {
  Panel,
  Pill,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionLabel,
} from "../src/components/ui";
import {
  ensureRecordingPermissions,
  getRecordingPermissionStatus,
  openAppSettings,
} from "../src/modules/settings/permissions";
import {
  disconnectFitbitSource,
  getResolvedStepSource,
  getStepSourceLabel,
  getStepSourceStatus,
  isFitbitStepSourceConfigured,
  requestStepSourceAccess,
  useStepSource,
  type StepPermissionStatus,
  type StepSource,
} from "../src/modules/steps/service";
import { colors, layout, spacing } from "../src/theme";

type RecordingPermissionStatus =
  | "granted"
  | "denied"
  | "undetermined"
  | "unavailable";

export default function SettingsScreen() {
  const [microphoneStatus, setMicrophoneStatus] =
    useState<RecordingPermissionStatus>("undetermined");
  const [healthStatus, setHealthStatus] =
    useState<StepPermissionStatus>("undetermined");
  const [fitbitStatus, setFitbitStatus] =
    useState<StepPermissionStatus>("undetermined");
  const [selectedStepSource, setSelectedStepSource] =
    useState<StepSource>("apple-health");
  const hasOpenAIKey = Boolean(process.env.EXPO_PUBLIC_OPENAI_API_KEY);
  const fitbitConfigured = isFitbitStepSourceConfigured();

  const loadPermissionState = useCallback(async () => {
    const [
      nextMicrophoneStatus,
      nextHealthStatus,
      nextFitbitStatus,
      nextSelectedStepSource,
    ] = await Promise.all([
      getRecordingPermissionStatus(),
      getStepSourceStatus("apple-health"),
      getStepSourceStatus("fitbit"),
      getResolvedStepSource(),
    ]);

    setMicrophoneStatus(nextMicrophoneStatus);
    setHealthStatus(nextHealthStatus);
    setFitbitStatus(nextFitbitStatus);
    setSelectedStepSource(nextSelectedStepSource);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPermissionState();
    }, [loadPermissionState]),
  );

  const microphoneTone = getPillTone(microphoneStatus);
  const healthTone = getPillTone(healthStatus);
  const whisperTone = hasOpenAIKey ? "success" : "danger";

  async function handleAllowMicrophone() {
    await ensureRecordingPermissions();
    await loadPermissionState();
  }

  async function handleAllowHealth() {
    await requestStepSourceAccess("apple-health");
    await loadPermissionState();
  }

  async function handleConnectFitbit() {
    await requestStepSourceAccess("fitbit");
    await loadPermissionState();
  }

  async function handleUseStepSource(source: StepSource) {
    await useStepSource(source);
    await loadPermissionState();
  }

  async function handleDisconnectFitbit() {
    await disconnectFitbitSource();
    await loadPermissionState();
  }

  return (
    <Screen scroll>
      <SectionLabel>Permissions</SectionLabel>
      <Panel style={styles.groupPanel}>
        <SettingBlock
          eyebrow="Required"
          title="Microphone"
          tone={microphoneTone}
          status={formatPermissionLabel(microphoneStatus)}
          description="Required to record a walk. If access is denied, WalkLog returns you home instead of trying to start capture."
          note="Grant this once and the rest of the recording flow stays simple."
          action={
            microphoneStatus === "undetermined"
              ? {
                  label: "Allow Microphone",
                  kind: "primary",
                  onPress: () => void handleAllowMicrophone(),
                }
              : microphoneStatus === "denied"
                ? {
                    label: "Open Settings",
                    kind: "secondary",
                    onPress: () => void openAppSettings(),
                  }
                : undefined
          }
        />
      </Panel>

      <SectionLabel>Step Sources</SectionLabel>
      <Panel style={styles.groupPanel}>
        <SettingBlock
          eyebrow={selectedStepSource === "apple-health" ? "Selected" : "Optional"}
          title="Apple Health"
          tone={healthTone}
          status={formatPermissionLabel(healthStatus)}
          description="Adds today&apos;s step count to Home and stores step totals with each saved walk."
          note={getAppleHealthNote(healthStatus, selectedStepSource)}
          action={
            healthStatus === "undetermined"
              ? {
                  label: "Allow Health Access",
                  kind: "primary",
                  onPress: () => void handleAllowHealth(),
                }
              : healthStatus === "granted" &&
                  selectedStepSource !== "apple-health"
                ? {
                    label: `Use ${getStepSourceLabel("apple-health")}`,
                    kind: "secondary",
                    onPress: () => void handleUseStepSource("apple-health"),
                  }
                : undefined
          }
        />

        <View style={styles.divider} />

        <SettingBlock
          eyebrow={selectedStepSource === "fitbit" ? "Selected" : "Optional"}
          title="Fitbit"
          tone={getPillTone(fitbitStatus)}
          status={formatFitbitLabel(fitbitStatus, fitbitConfigured)}
          description="Uses your Fitbit account as the source for today&apos;s steps and saved walk totals."
          note={getFitbitNote(fitbitStatus, selectedStepSource, fitbitConfigured)}
          action={getFitbitAction({
            fitbitConfigured,
            fitbitStatus,
            selectedStepSource,
            onConnect: () => void handleConnectFitbit(),
            onDisconnect: () => void handleDisconnectFitbit(),
            onUseFitbit: () => void handleUseStepSource("fitbit"),
          })}
        />
      </Panel>

      <SectionLabel>Services</SectionLabel>
      <Panel style={styles.groupPanel}>
        <SettingBlock
          eyebrow="Prototype"
          title="OpenAI Whisper"
          tone={whisperTone}
          status={hasOpenAIKey ? "Ready" : "Missing"}
          description="Audio uploads when you end a walk so Whisper can return a transcript for the saved entry."
          note={
            hasOpenAIKey
              ? "This build includes EXPO_PUBLIC_OPENAI_API_KEY."
              : "Set EXPO_PUBLIC_OPENAI_API_KEY before running the app on a device."
          }
        />
      </Panel>
    </Screen>
  );
}

type SettingAction = {
  label: string;
  kind: "primary" | "secondary";
  onPress: () => void;
};

function SettingBlock({
  eyebrow,
  title,
  tone,
  status,
  description,
  note,
  action,
}: {
  eyebrow: string;
  title: string;
  tone: "default" | "success" | "danger";
  status: string;
  description: string;
  note?: string;
  action?: SettingAction;
}) {
  return (
    <View style={styles.settingBlock}>
      <Text style={styles.blockEyebrow}>{eyebrow}</Text>
      <View style={styles.permissionHeader}>
        <Text style={styles.permissionTitle}>{title}</Text>
        <Pill tone={tone}>{status}</Pill>
      </View>
      <Text style={styles.permissionBody}>{description}</Text>
      {note ? <Text style={styles.permissionNote}>{note}</Text> : null}
      {action?.kind === "primary" ? (
        <PrimaryButton onPress={action.onPress}>{action.label}</PrimaryButton>
      ) : null}
      {action?.kind === "secondary" ? (
        <SecondaryButton onPress={action.onPress}>{action.label}</SecondaryButton>
      ) : null}
    </View>
  );
}

function getPillTone(status: RecordingPermissionStatus | StepPermissionStatus) {
  if (status === "granted") {
    return "success" as const;
  }

  if (status === "denied" || status === "unavailable") {
    return "danger" as const;
  }

  return "default" as const;
}

function formatPermissionLabel(
  status: RecordingPermissionStatus | StepPermissionStatus,
) {
  if (status === "granted") {
    return "Ready";
  }

  if (status === "undetermined") {
    return "Ask";
  }

  if (status === "unavailable") {
    return "Unavailable";
  }

  return "Unknown";
}

function formatFitbitLabel(
  status: StepPermissionStatus,
  fitbitConfigured: boolean,
) {
  if (!fitbitConfigured) {
    return "Setup";
  }

  return formatPermissionLabel(status);
}

function getAppleHealthNote(
  status: StepPermissionStatus,
  selectedStepSource: StepSource,
) {
  if (status === "unavailable") {
    return "Apple Health only works on supported Apple devices.";
  }

  if (selectedStepSource === "apple-health" && status === "granted") {
    return "Currently used for Home and Walk steps. This is the fastest on-device option.";
  }

  if (status === "granted") {
    return "Ready to use if you want on-device, near real-time step updates.";
  }

  return "After you allow access once, manage step access in the Health app if totals stay at 0.";
}

function getFitbitNote(
  status: StepPermissionStatus,
  selectedStepSource: StepSource,
  fitbitConfigured: boolean,
) {
  if (!fitbitConfigured) {
    return "Set EXPO_PUBLIC_FITBIT_CLIENT_ID and register walklog://fitbit as a Fitbit redirect URI.";
  }

  if (selectedStepSource === "fitbit" && status === "granted") {
    return "Currently used for Home and Walk steps. Fitbit sync can lag behind live walking by a few minutes.";
  }

  if (status === "granted") {
    return "Connected and ready. Fitbit sync can lag behind live walking by a few minutes.";
  }

  if (status === "unavailable") {
    return "Fitbit login is unavailable in this environment.";
  }

  return "Connect your Fitbit account to pull steps from the Fitbit Web API.";
}

function getFitbitAction({
  fitbitConfigured,
  fitbitStatus,
  selectedStepSource,
  onConnect,
  onDisconnect,
  onUseFitbit,
}: {
  fitbitConfigured: boolean;
  fitbitStatus: StepPermissionStatus;
  selectedStepSource: StepSource;
  onConnect: () => void;
  onDisconnect: () => void;
  onUseFitbit: () => void;
}) {
  if (!fitbitConfigured || fitbitStatus === "unavailable") {
    return undefined;
  }

  if (fitbitStatus === "undetermined") {
    return {
      label: "Connect Fitbit",
      kind: "primary" as const,
      onPress: onConnect,
    };
  }

  if (selectedStepSource === "fitbit") {
    return {
      label: "Disconnect Fitbit",
      kind: "secondary" as const,
      onPress: onDisconnect,
    };
  }

  return {
    label: "Use Fitbit",
    kind: "secondary" as const,
    onPress: onUseFitbit,
  };
}

const styles = StyleSheet.create({
  groupPanel: {
    gap: 0,
    paddingVertical: layout.panelPadding,
    paddingHorizontal: 0,
  },
  settingBlock: {
    gap: spacing.sm,
    paddingHorizontal: layout.panelPadding,
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
    fontWeight: "300",
    letterSpacing: -0.45,
    flex: 1,
  },
  permissionBody: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  permissionNote: {
    color: colors.muted,
    lineHeight: 21,
  },
  blockEyebrow: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: "Courier",
    textTransform: "uppercase",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.rule,
    marginVertical: spacing.md,
    marginHorizontal: layout.panelPadding,
  },
});
