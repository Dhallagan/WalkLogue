let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
  // Test if the native module is actually available
  void Haptics!.impactAsync(Haptics!.ImpactFeedbackStyle.Light).catch(() => {
    Haptics = null;
  });
} catch {
  Haptics = null;
}

function run(fn: () => void) {
  if (!Haptics) return;
  try { fn(); } catch { /* native module missing */ }
}

export function tapLight() {
  run(() => void Haptics!.impactAsync(Haptics!.ImpactFeedbackStyle.Light));
}

export function tapMedium() {
  run(() => void Haptics!.impactAsync(Haptics!.ImpactFeedbackStyle.Medium));
}

export function tapHeavy() {
  run(() => void Haptics!.impactAsync(Haptics!.ImpactFeedbackStyle.Heavy));
}

export function success() {
  run(() => void Haptics!.notificationAsync(Haptics!.NotificationFeedbackType.Success));
}

export function warning() {
  run(() => void Haptics!.notificationAsync(Haptics!.NotificationFeedbackType.Warning));
}
