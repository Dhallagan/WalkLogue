import { useCallback, useEffect, useState } from "react";
import { Stack, router, useRootNavigationState } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";

import { initializeDatabase } from "../src/modules/journal/repository";
import {
  ThemeContext,
  setActiveTheme,
  useResolvedTheme,
  type ThemeMode,
} from "../src/theme";
import { ONBOARDING_KEY } from "./onboarding";

const THEME_KEY = "walklog-theme-mode";

export default function RootLayout() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const theme = useResolvedTheme(themeMode);

  useEffect(() => {
    setActiveTheme(theme);
  }, [theme]);

  useEffect(() => {
    void SecureStore.getItemAsync(THEME_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeMode(stored);
      }
    });
  }, []);

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const navState = useRootNavigationState();

  useEffect(() => {
    void SecureStore.getItemAsync(ONBOARDING_KEY).then((stored) => {
      setNeedsOnboarding(stored !== "true");
      setOnboardingChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!onboardingChecked || !navState?.key) return;
    if (needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [onboardingChecked, needsOnboarding, navState?.key]);

  const handleSetMode = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    void SecureStore.setItemAsync(THEME_KEY, mode);
  }, []);

  return (
    <ThemeContext.Provider value={{ ...theme, mode: themeMode, setMode: handleSetMode }}>
      <SQLiteProvider
        databaseName="walklog.db"
        onInit={initializeDatabase}
        onError={(error) => {
          console.error("SQLite bootstrap failed", error);
        }}
      >
        <StatusBar style={theme.isDark ? "light" : "dark"} />
        <Stack
          screenOptions={() => ({
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.text,
            headerBackButtonDisplayMode: "minimal",
            headerShadowVisible: false,
            headerTitleStyle: {
              fontSize: 17,
              fontWeight: "600",
            },
            contentStyle: { backgroundColor: theme.colors.background },
          })}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="walk"
            options={{ headerShown: false, presentation: "card" }}
          />
          <Stack.Screen name="day/[date]" options={{ title: "Day" }} />
          <Stack.Screen name="entry/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="person/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ title: "Profile" }} />
          <Stack.Screen name="tasks" options={{ title: "Tasks" }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
          <Stack.Screen
            name="onboarding"
            options={{ headerShown: false, gestureEnabled: false }}
          />
        </Stack>
      </SQLiteProvider>
    </ThemeContext.Provider>
  );
}
