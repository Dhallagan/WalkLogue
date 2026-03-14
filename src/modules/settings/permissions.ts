import { Linking } from "react-native";

import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

export async function ensureSpeechPermissions() {
  const response = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return response.granted;
}

export async function getSpeechPermissionStatus() {
  try {
    const [microphone, speech] = await Promise.all([
      ExpoSpeechRecognitionModule.getMicrophonePermissionsAsync(),
      ExpoSpeechRecognitionModule.getSpeechRecognizerPermissionsAsync(),
    ]);

    if (microphone.granted && speech.granted) {
      return "granted" as const;
    }

    if (!microphone.canAskAgain || !speech.canAskAgain) {
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
