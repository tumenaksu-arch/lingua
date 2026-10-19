import { Text, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router/tabs';

import { useAppStore } from '@/features/store';
import { colors } from '@/ui';

function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 22, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const dueCount = useAppStore((s) => s.dueCount);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.border, height: 64, paddingTop: 6 },
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
          tabBarBadgeStyle: { backgroundColor: colors.danger },
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
