import {
  AuthRequest,
  ResponseType,
  TokenResponse,
  exchangeCodeAsync,
  makeRedirectUri,
  refreshAsync,
  revokeAsync,
} from "expo-auth-session";
import { Platform } from "react-native";
import {
  deleteStoredValue,
  getStoredValue,
  setStoredValue,
} from "./store";

const FITBIT_DISCOVERY = {
  authorizationEndpoint: "https://www.fitbit.com/oauth2/authorize",
  tokenEndpoint: "https://api.fitbit.com/oauth2/token",
  revocationEndpoint: "https://api.fitbit.com/oauth2/revoke",
} as const;

const FITBIT_SESSION_KEY = "walklog.fitbit.session";
const FITBIT_SCOPES = ["activity"];
const FITBIT_CLIENT_ID =
  process.env.EXPO_PUBLIC_FITBIT_CLIENT_ID?.trim() ?? "";
const FITBIT_REDIRECT_URI = makeRedirectUri({
  scheme: "walklog",
  path: "fitbit",
});

type FitbitSession = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  issuedAt: number;
  scope?: string;
  tokenType: "bearer" | "mac";
};

type FitbitIntradayResponse = {
  "activities-steps-intraday"?: {
    dataset?: Array<{
      time?: string;
      value?: number | string;
    }>;
  };
};

export type FitbitPermissionStatus = "granted" | "undetermined" | "unavailable";

export function isFitbitConfigured() {
  return FITBIT_CLIENT_ID.length > 0;
}

export async function getFitbitPermissionStatus(): Promise<FitbitPermissionStatus> {
  if (!isFitbitSupported()) {
    return "unavailable";
  }

  const session = await getValidSession();
  return session ? "granted" : "undetermined";
}

export async function connectFitbit() {
  if (!isFitbitSupported()) {
    return false;
  }

  const request = new AuthRequest({
    clientId: FITBIT_CLIENT_ID,
    redirectUri: FITBIT_REDIRECT_URI,
    responseType: ResponseType.Code,
    scopes: FITBIT_SCOPES,
    usePKCE: true,
  });

  const result = await request.promptAsync(FITBIT_DISCOVERY);

  if (result.type !== "success" || !result.params.code || !request.codeVerifier) {
    return false;
  }

  const tokenResponse = await exchangeCodeAsync(
    {
      clientId: FITBIT_CLIENT_ID,
      code: result.params.code,
      redirectUri: FITBIT_REDIRECT_URI,
      extraParams: {
        code_verifier: request.codeVerifier,
      },
    },
    FITBIT_DISCOVERY,
  );

  await writeSession({
    accessToken: tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken,
    expiresIn: tokenResponse.expiresIn,
    issuedAt: tokenResponse.issuedAt,
    scope: tokenResponse.scope,
    tokenType: tokenResponse.tokenType ?? "bearer",
  });

  return true;
}

export async function disconnectFitbit() {
  const session = await readSession();

  try {
    if (session?.accessToken && isFitbitSupported()) {
      await revokeAsync(
        {
          clientId: FITBIT_CLIENT_ID,
          token: session.accessToken,
        },
        FITBIT_DISCOVERY,
      );
    }
  } catch {
    // Clear local credentials even if Fitbit revocation fails.
  } finally {
    await deleteStoredValue(FITBIT_SESSION_KEY);
  }
}

export async function getTodayFitbitStepCount() {
  return getFitbitStepCountForWindow(startOfDay(new Date()), new Date());
}

export async function getFitbitStepCountForWindow(startedAt: Date, endedAt: Date) {
  const session = await getValidSession();

  if (!session) {
    return 0;
  }

  try {
    let total = 0;

    for (const segment of splitRangeByDay(startedAt, endedAt)) {
      total += await getSegmentStepCount(session.accessToken, segment);
    }

    return total;
  } catch {
    return 0;
  }
}

function isFitbitSupported() {
  return isFitbitConfigured() && Platform.OS !== "web";
}

async function getValidSession() {
  if (!isFitbitSupported()) {
    return null;
  }

  const session = await readSession();

  if (!session) {
    return null;
  }

  const tokenResponse = new TokenResponse({
    accessToken: session.accessToken,
    expiresIn: session.expiresIn,
    issuedAt: session.issuedAt,
    refreshToken: session.refreshToken,
    scope: session.scope,
    tokenType: session.tokenType,
  });

  if (!tokenResponse.shouldRefresh()) {
    return session;
  }

  if (!session.refreshToken) {
    await deleteStoredValue(FITBIT_SESSION_KEY);
    return null;
  }

  try {
    const refreshed = await refreshAsync(
      {
        clientId: FITBIT_CLIENT_ID,
        refreshToken: session.refreshToken,
        scopes: FITBIT_SCOPES,
      },
      FITBIT_DISCOVERY,
    );

    const nextSession: FitbitSession = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? session.refreshToken,
      expiresIn: refreshed.expiresIn,
      issuedAt: refreshed.issuedAt,
      scope: refreshed.scope ?? session.scope,
      tokenType: refreshed.tokenType ?? session.tokenType,
    };

    await writeSession(nextSession);
    return nextSession;
  } catch {
    await deleteStoredValue(FITBIT_SESSION_KEY);
    return null;
  }
}

async function getSegmentStepCount(
  accessToken: string,
  segment: { day: Date; startedAt: Date; endedAt: Date },
) {
  const url =
    "https://api.fitbit.com/1/user/-/activities/steps/date/" +
    `${formatDate(segment.day)}/1d/1min/time/${formatTime(segment.startedAt)}/${formatTime(segment.endedAt)}.json`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Fitbit request failed with ${response.status}`);
  }

  const payload = (await response.json()) as FitbitIntradayResponse;
  const dataset = payload["activities-steps-intraday"]?.dataset ?? [];

  return dataset.reduce((sum, point) => {
    const value = Number(point.value ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function splitRangeByDay(startedAt: Date, endedAt: Date) {
  if (endedAt <= startedAt) {
    return [{ day: startedAt, startedAt, endedAt }];
  }

  const segments: Array<{ day: Date; startedAt: Date; endedAt: Date }> = [];
  let cursor = new Date(startedAt);

  while (cursor < endedAt) {
    const endOfDay = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate(),
      23,
      59,
      0,
      0,
    );
    const segmentEnd = endOfDay < endedAt ? endOfDay : endedAt;

    segments.push({
      day: new Date(cursor),
      startedAt: new Date(cursor),
      endedAt: new Date(segmentEnd),
    });

    cursor = new Date(segmentEnd);
    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  return segments;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${hours}:${minutes}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

async function readSession() {
  const raw = await getStoredValue(FITBIT_SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as FitbitSession;
  } catch {
    await deleteStoredValue(FITBIT_SESSION_KEY);
    return null;
  }
}

async function writeSession(session: FitbitSession) {
  await setStoredValue(FITBIT_SESSION_KEY, JSON.stringify(session));
}
