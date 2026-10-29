import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Inter_300Light, Inter_400Regular } from '@expo-google-fonts/inter';
import { SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { useFonts } from 'expo-font';

import { useAppStore } from '@/features/store';
import { startSocialSync } from '@/features/social/socialStore';
import { ShellUpdateBanner, useAutoUpdate } from '@/platform/autoUpdate';
import { useSystemBars } from '@/platform/systemBars';
import { useSettingsStore, useTheme, useThemeStore } from '@/ui';

export default function RootLayout() {
  const ready = useAppStore((s) => s.ready);
  const onboarded = useAppStore((s) => s.onboarded);
  const welcomed = useAppStore((s) => s.welcomed);
  const legacyAccount = useAppStore((s) => s.legacyAccount);
  const boot = useAppStore((s) => s.boot);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const { colors, isDark } = useTheme();
  useSystemBars(colors.background, !isDark);
  const [error, setError] = useState<string | null>(null);
  useAutoUpdate();
  // EduPilot typefaces, loaded once for the whole app. Rendering is NOT blocked:
  // text uses the platform fallback until the fonts are ready.
  useFonts({
    SpaceGrotesk_400Regular,
    Inter_300Light,
    Inter_400Regular,
    SpaceMono_400Regular,
  });

  useEffect(() => {
    void hydrateTheme();
    void hydrateSettings();
    boot().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    startSocialSync(); // publish weekly XP to the leaderboard, debounced
  }, [boot, hydrateTheme, hydrateSettings]);

  // Navigation containers (headers, card backgrounds, tab bars) follow the active palette.
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.dangerText }]} accessibilityRole="alert">
          Uygulama başlatılamadı: {error}
        </Text>
      </View>
    );
  }
  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]} accessibilityLabel="Yükleniyor">
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ShellUpdateBanner />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={legacyAccount !== null}>
          <Stack.Screen name="migrate" />
        </Stack.Protected>
        <Stack.Protected guard={!welcomed}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
        <Stack.Protected guard={welcomed && !onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={welcomed && onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="lesson/[id]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="skip/[unitId]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="placement" options={{ gestureEnabled: false }} />
          <Stack.Screen name="notes/[unitId]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="story/[unitId]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
          <Stack.Screen name="courses" options={{ presentation: 'modal' }} />
          <Stack.Screen name="ogretmen" />
          <Stack.Screen name="ogretmen/[classId]" />
          <Stack.Screen name="sinif/[classId]" />
          <Stack.Screen name="konus/[scenarioId]" />
        </Stack.Protected>
        {/* Class join is reachable from the welcome screen too (no account needed). Must stay AFTER the
            guarded groups: the first registered screen becomes the initial route (it opened on launch). */}
        <Stack.Screen name="sinif-katil" options={{ presentation: 'modal' }} />
        <Stack.Screen name="lisanslar" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { textAlign: 'center' },
});
