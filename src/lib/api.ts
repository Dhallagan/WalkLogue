const DEFAULT_API_URL = "https://walklog-site.vercel.app";

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
