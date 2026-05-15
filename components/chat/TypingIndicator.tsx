import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function TypingIndicator() {
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, animatedStyle, { backgroundColor: palette.primary }]} />
      <Animated.View style={[styles.dot, animatedStyle, { backgroundColor: palette.primary }]} />
      <Animated.View style={[styles.dot, animatedStyle, { backgroundColor: palette.primary }]} />
      <Text style={[styles.text, { color: palette.textMuted }]}>LexAI is analyzing...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    marginLeft: 6,
  },
});
