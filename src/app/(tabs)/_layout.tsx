import { Tabs } from 'expo-router/tabs';

import { useAppStore } from '@/features/store';
import { Icon, type IconName, fonts, useTheme } from '@/ui';

function TabIcon({ name, color }: { name: IconName; color: string }) {
  return <Icon name={name} size={22} color={color} strokeWidth={1.75} />;
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
        options={{ title: 'Öğren', tabBarIcon: ({ color }) => <TabIcon name="home" color={String(color)} /> }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: 'Tekrar',
          tabBarBadge: dueCount > 0 ? dueCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, color: colors.textOnColor },
          tabBarAccessibilityLabel: dueCount > 0 ? `Tekrar, ${dueCount} kelime bekliyor` : 'Tekrar',
          tabBarIcon: ({ color }) => <TabIcon name="review" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="konus"
        options={{ title: 'Konuş', tabBarIcon: ({ color }) => <TabIcon name="chat" color={String(color)} /> }}
      />
      <Tabs.Screen
        name="league"
        options={{ title: 'Lig', tabBarIcon: ({ color }) => <TabIcon name="trophy" color={String(color)} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: ({ color }) => <TabIcon name="user" color={String(color)} /> }}
      />
    </Tabs>
  );
}
