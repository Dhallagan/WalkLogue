import Healthkit, {
  HKAuthorizationStatus,
  HKQuantityTypeIdentifier,
  HKStatisticsOptions,
  HKUnits,
} from "@kingstinct/react-native-healthkit";

import { formatDayKey } from "../../lib/date";

export async function getHealthPermissionStatus() {
  try {
    const available = await Healthkit.isHealthDataAvailable();

    if (!available) {
      return "unavailable" as const;
    }

    const status = await Healthkit.authorizationStatusFor(
      HKQuantityTypeIdentifier.stepCount,
    );

    if (status === HKAuthorizationStatus.sharingAuthorized) {
      return "granted" as const;
    }

    if (status === HKAuthorizationStatus.sharingDenied) {
      return "denied" as const;
    }

    return "undetermined" as const;
  } catch {
    return "unavailable" as const;
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
