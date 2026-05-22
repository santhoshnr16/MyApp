import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { C } from '@/constants/colors';

function TabIcon({ name, focused }: { name: React.ComponentProps<typeof Ionicons>['name']; focused: boolean }) {
  return (
    <View style={styles.iconWrapper}>
      <Ionicons name={name} size={22} color={focused ? C.gold : C.textMuted} />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.gold,
        tabBarInactiveTintColor: C.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: C.goldBorder,
          backgroundColor: 'rgba(10,15,30,0.97)',
          height: 64,
          paddingTop: 4,
          shadowColor: C.gold,
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 10,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="document-text" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="moot"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="scale" focused={focused} />,
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 4,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.gold,
  },
});
