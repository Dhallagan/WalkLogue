const FALLBACK_FITBIT_CLIENT_ID = "23TZ2Y";

export function getFitbitClientId() {
  return process.env.EXPO_PUBLIC_FITBIT_CLIENT_ID?.trim() || FALLBACK_FITBIT_CLIENT_ID;
}

export function isFitbitClientConfigured() {
  return getFitbitClientId().length > 0;
}
