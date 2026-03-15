import {
  getHealthPermissionStatus,
  getStepCountForWindow as getHealthStepCountForWindow,
  getTodayStepCount as getTodayHealthStepCount,
  makeDailyStepsRecord,
} from "./health";
import {
  deleteStoredValue,
  getStoredValue,
  setStoredValue,
} from "./store";

const STEP_SOURCE_KEY = "walklog.steps.source";

export type StepSource = "apple-health" | "fitbit";
export type StepPermissionStatus = "granted" | "undetermined" | "unavailable";

export type StepSnapshot = {
  permission: StepPermissionStatus;
  totalSteps: number;
  source: StepSource;
  sourceLabel: string;
};

export { makeDailyStepsRecord };

export async function getSelectedStepSource() {
  const stored = await getStoredValue(STEP_SOURCE_KEY);
  return isStepSource(stored) ? stored : null;
}

export async function setSelectedStepSource(source: StepSource) {
  await setStoredValue(STEP_SOURCE_KEY, source);
}

export async function clearSelectedStepSource() {
  await deleteStoredValue(STEP_SOURCE_KEY);
}

export async function getResolvedStepSource() {
  const [selected, healthStatus, fitbitStatus] = await Promise.all([
    getSelectedStepSource(),
    getHealthPermissionStatus(),
    getFitbitStatus(),
  ]);

  if (selected === "apple-health") {
    if (healthStatus !== "unavailable") {
      return selected;
    }

    if (fitbitStatus === "granted") {
      return "fitbit" as const;
    }
  }

  if (selected === "fitbit") {
    if (fitbitStatus !== "unavailable") {
      return selected;
    }

    if (healthStatus === "granted") {
      return "apple-health" as const;
    }
  }

  if (healthStatus === "granted") {
    return "apple-health" as const;
  }

  if (fitbitStatus === "granted") {
    return "fitbit" as const;
  }

  if (healthStatus !== "unavailable") {
    return "apple-health" as const;
  }

  return "fitbit" as const;
}

export async function getStepSourceStatus(source: StepSource) {
  if (source === "apple-health") {
    return getHealthPermissionStatus();
  }

  return getFitbitStatus();
}

export async function requestStepSourceAccess(source: StepSource) {
  if (source === "apple-health") {
    const { requestHealthPermission } = await import("./health");
    const granted = await requestHealthPermission();

    if (granted) {
      await setSelectedStepSource(source);
    }

    return granted;
  }

  const fitbit = await loadFitbitModule();
  const connected = await fitbit.connectFitbit();

  if (connected) {
    await setSelectedStepSource(source);
  }

  return connected;
}

export async function useStepSource(source: StepSource) {
  await setSelectedStepSource(source);
}

export async function disconnectFitbitSource() {
  const fitbit = await loadFitbitModule();
  await fitbit.disconnectFitbit();

  if ((await getHealthPermissionStatus()) === "granted") {
    await setSelectedStepSource("apple-health");
    return;
  }

  await clearSelectedStepSource();
}

export async function getTodayStepSnapshot(): Promise<StepSnapshot> {
  const source = await getResolvedStepSource();
  const permission = await getStepSourceStatus(source);

  if (permission !== "granted") {
    return {
      permission,
      totalSteps: 0,
      source,
      sourceLabel: getStepSourceLabel(source),
    };
  }

  const totalSteps =
    source === "apple-health"
      ? await getTodayHealthStepCount()
      : await getTodayFitbitSteps();

  return {
    permission,
    totalSteps,
    source,
    sourceLabel: getStepSourceLabel(source),
  };
}

export async function getWindowStepSnapshot(
  startedAt: Date,
  endedAt: Date,
): Promise<StepSnapshot> {
  const source = await getResolvedStepSource();
  const permission = await getStepSourceStatus(source);

  if (permission !== "granted") {
    return {
      permission,
      totalSteps: 0,
      source,
      sourceLabel: getStepSourceLabel(source),
    };
  }

  const totalSteps =
    source === "apple-health"
      ? await getHealthStepCountForWindow(startedAt, endedAt)
      : await getFitbitStepsForWindow(startedAt, endedAt);

  return {
    permission,
    totalSteps,
    source,
    sourceLabel: getStepSourceLabel(source),
  };
}

export function getStepSourceLabel(source: StepSource) {
  return source === "apple-health" ? "Apple Health" : "Fitbit";
}

export function getStepPollingIntervalMs(source: StepSource) {
  return source === "fitbit" ? 60000 : 15000;
}

export function isFitbitStepSourceConfigured() {
  return Boolean(process.env.EXPO_PUBLIC_FITBIT_CLIENT_ID?.trim());
}

function isStepSource(value: string | null): value is StepSource {
  return value === "apple-health" || value === "fitbit";
}

async function getFitbitStatus(): Promise<StepPermissionStatus> {
  const fitbit = await loadFitbitModule();
  return fitbit.getFitbitPermissionStatus();
}

async function getTodayFitbitSteps() {
  const fitbit = await loadFitbitModule();
  return fitbit.getTodayFitbitStepCount();
}

async function getFitbitStepsForWindow(startedAt: Date, endedAt: Date) {
  const fitbit = await loadFitbitModule();
  return fitbit.getFitbitStepCountForWindow(startedAt, endedAt);
}

async function loadFitbitModule() {
  try {
    return await import("./fitbit");
  } catch {
    return {
      connectFitbit: async () => false,
      disconnectFitbit: async () => {},
      getFitbitPermissionStatus: async () => "unavailable" as const,
      getFitbitStepCountForWindow: async () => 0,
      getTodayFitbitStepCount: async () => 0,
    };
  }
}
