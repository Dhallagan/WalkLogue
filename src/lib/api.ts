import * as SecureStore from "expo-secure-store";

const DEFAULT_API_URL = "https://walklog-site.vercel.app";
const TRANSCRIPTION_KEY_STORE = "walklogue-transcription-key";

export function getApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;
}

export function getApiSecret(): string {
  const secret = process.env.EXPO_PUBLIC_API_SECRET;
  if (!secret) {
    throw new Error("Missing EXPO_PUBLIC_API_SECRET.");
  }
  return secret;
}

export function hasApiConfig(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_API_SECRET);
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/health`, {
      method: "GET",
    });
    return res.ok;
  } catch {
    return false;
  }
}

let cachedTranscriptionKey: string | null = null;

export async function getTranscriptionKey(): Promise<string> {
  // Return cached key
  if (cachedTranscriptionKey) return cachedTranscriptionKey;

  // Check SecureStore
  const stored = await SecureStore.getItemAsync(TRANSCRIPTION_KEY_STORE);
  if (stored) {
    cachedTranscriptionKey = stored;
    return stored;
  }

  // Fetch from server
  const res = await fetch(`${getApiBaseUrl()}/api/config`, {
    headers: { Authorization: `Bearer ${getApiSecret()}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch transcription config.");
  }

  const data = (await res.json()) as { transcriptionKey?: string };
  const key = data.transcriptionKey;

  if (!key) {
    throw new Error("Server returned empty transcription config.");
  }

  // Cache in memory and SecureStore
  cachedTranscriptionKey = key;
  await SecureStore.setItemAsync(TRANSCRIPTION_KEY_STORE, key);

  return key;
}
