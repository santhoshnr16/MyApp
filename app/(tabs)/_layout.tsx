import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { C } from '@/constants/colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; icon: IconName; iconFilled: IconName }[] = [
  { name: 'index',  icon: 'home-outline',          iconFilled: 'home' },
  { name: 'upload', icon: 'document-text-outline',  iconFilled: 'document-text' },
  { name: 'moot',   icon: 'scale-outline',           iconFilled: 'scale' },
];

function TabIcon({ icon, iconFilled, focused }: { icon: IconName; iconFilled: IconName; focused: boolean }) {
  return (
    <View style={styles.iconWrapper}>
      <Ionicons
        name={focused ? iconFilled : icon}
        size={22}
        color={focused ? C.ink : C.textMuted}
      />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: C.border,
          backgroundColor: C.surface,
          height: 64,
          paddingTop: 4,
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
          elevation: 4,
        },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon icon={tab.icon} iconFilled={tab.iconFilled} focused={focused} />
            ),
          }}
        />
      ))}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 4,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.gold,
  },
});
