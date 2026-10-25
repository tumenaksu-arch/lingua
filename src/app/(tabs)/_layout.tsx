import { Text, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router/tabs';

import { useAppStore } from '@/features/store';
import { fonts, useTheme } from '@/ui';

function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return (
    <Text style={{ fontSize: 22, color }} accessible={false} maxFontSizeMultiplier={1.3}>
      {glyph}
    </Text>
  );
}

export default function TabsLayout() {
  const dueCount = useAppStore((s) => s.dueCount);
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        // 10px mono label is small text (WCAG AA needs ≥4.5:1): use primaryText, not primary
        // (light primary #b8714a on #f6f4f0 is only 3.48:1). The icon keeps the primary tint
        // via tabBarActiveTintColor.
        tabBarLabelStyle: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5, color: colors.primaryText },
        // No fixed height: the tab bar adds the bottom safe-area inset (Android nav buttons /
        // gesture bar) to its default height only when `height` is not overridden.
        tabBarStyle: { borderTopColor: colors.border, borderTopWidth: 1, backgroundColor: colors.background, paddingTop: 6 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Öğren', tabBarIcon: ({ color }) => <TabIcon glyph="🏠" color={color} /> }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: 'Tekrar',
          tabBarBadge: dueCount > 0 ? dueCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, color: colors.textOnColor },
          tabBarAccessibilityLabel: dueCount > 0 ? `Tekrar, ${dueCount} kelime bekliyor` : 'Tekrar',
          tabBarIcon: ({ color }) => <TabIcon glyph="🗂️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="league"
        options={{ title: 'Lig', tabBarIcon: ({ color }) => <TabIcon glyph="🏆" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: ({ color }) => <TabIcon glyph="👤" color={color} /> }}
      />
    </Tabs>
  );
}
