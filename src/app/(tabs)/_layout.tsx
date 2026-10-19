import { Text, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router/tabs';

import { useAppStore } from '@/features/store';
import { useTheme } from '@/ui';

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
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.background, height: 64, paddingTop: 6 },
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
        name="profile"
        options={{ title: 'Profil', tabBarIcon: ({ color }) => <TabIcon glyph="👤" color={color} /> }}
      />
    </Tabs>
  );
}
