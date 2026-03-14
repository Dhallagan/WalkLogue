import { Linking } from "react-native";
import { Audio } from "expo-av";

export async function ensureRecordingPermissions() {
  const response = await Audio.requestPermissionsAsync();
  return response.granted;
}

export async function getRecordingPermissionStatus() {
  try {
    const microphone = await Audio.getPermissionsAsync();

    if (microphone.granted) {
      return "granted" as const;
    }

    if (!microphone.canAskAgain) {
      return "denied" as const;
    }

    return "undetermined" as const;
  } catch {
    return "unavailable" as const;
  }
}

export async function openAppSettings() {
  await Linking.openSettings();
}
