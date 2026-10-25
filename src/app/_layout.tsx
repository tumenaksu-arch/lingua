import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useAppStore } from '@/features/store';
import { ShellUpdateBanner, useAutoUpdate } from '@/platform/autoUpdate';
import { useSettingsStore, useTheme, useThemeStore } from '@/ui';

export default function RootLayout() {
  const ready = useAppStore((s) => s.ready);
  const onboarded = useAppStore((s) => s.onboarded);
  const welcomed = useAppStore((s) => s.welcomed);
  const boot = useAppStore((s) => s.boot);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const { colors, isDark } = useTheme();
  const [error, setError] = useState<string | null>(null);
  useAutoUpdate();

  useEffect(() => {
    void hydrateTheme();
    void hydrateSettings();
    boot().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
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
        <Stack.Protected guard={!welcomed}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
        <Stack.Protected guard={welcomed && !onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={welcomed && onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="lesson/[id]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
          <Stack.Screen name="courses" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { textAlign: 'center' },
});
