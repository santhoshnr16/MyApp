import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { AppColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          borderTopColor: 'transparent',
          backgroundColor: palette.surface,
          height: 64,
          paddingTop: 8,
          shadowColor: palette.primary,
          shadowOpacity: 0.08,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -4 },
          elevation: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Upload',
          tabBarIcon: ({ color }) => <Ionicons name="cloud-upload" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
