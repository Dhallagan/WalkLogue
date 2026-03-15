import Healthkit, {
  HKAuthorizationRequestStatus,
  HKQuantityTypeIdentifier,
  HKStatisticsOptions,
  HKUnits,
} from "@kingstinct/react-native-healthkit";

import { formatDayKey } from "../../lib/date";

export type HealthPermissionStatus =
  | "granted"
  | "undetermined"
  | "unavailable";

export async function getHealthPermissionStatus() {
  try {
    const available = await Healthkit.isHealthDataAvailable();

    if (!available) {
      return "unavailable" as const satisfies HealthPermissionStatus;
    }

    // HealthKit does not expose a reliable read-only grant/deny status for steps.
    // We use whether the authorization sheet still needs to be shown to decide
    // when it is safe to start querying without crashing.
    const status = await Healthkit.getRequestStatusForAuthorization([
      HKQuantityTypeIdentifier.stepCount,
    ]);

    if (status === HKAuthorizationRequestStatus.unnecessary) {
      return "granted" as const satisfies HealthPermissionStatus;
    }

    return "undetermined" as const satisfies HealthPermissionStatus;
  } catch {
    return "unavailable" as const satisfies HealthPermissionStatus;
  }
}

export async function requestHealthPermission() {
  try {
    const available = await Healthkit.isHealthDataAvailable();

    if (!available) {
      return false;
    }

    return await Healthkit.requestAuthorization([
      HKQuantityTypeIdentifier.stepCount,
    ]);
  } catch {
    return false;
  }
}

export async function getTodayStepCount() {
  return getStepCountForWindow(startOfDay(new Date()), new Date());
}

export async function getTodayStepSnapshot() {
  const permission = await getHealthPermissionStatus();

  if (permission !== "granted") {
    return {
      permission,
      totalSteps: 0,
    };
  }

  return {
    permission,
    totalSteps: await getTodayStepCount(),
  };
}

export async function getStepCountForWindow(startedAt: Date, endedAt: Date) {
  try {
    const permission = await getHealthPermissionStatus();

    if (permission !== "granted") {
      return 0;
    }

    const result = await Healthkit.queryStatisticsForQuantity(
      HKQuantityTypeIdentifier.stepCount,
      [HKStatisticsOptions.cumulativeSum],
      startedAt,
      endedAt,
      HKUnits.Count,
    );

    return Math.round(result.sumQuantity?.quantity ?? 0);
  } catch {
    return 0;
  }
}

export function makeDailyStepsRecord(totalSteps: number) {
  return {
    date: formatDayKey(new Date()),
    totalSteps,
  };
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
