import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppColors, Radius } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ProgressBarProps = {
  progress: number;
};

export function ProgressBar({ progress }: ProgressBarProps) {
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];
  const widthValue = useSharedValue(0);

  useEffect(() => {
    widthValue.value = withTiming(Math.min(Math.max(progress, 0), 1), { duration: 500 });
  }, [progress, widthValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthValue.value * 100}%`,
  }));

  return (
    <View style={[styles.track, { backgroundColor: palette.border }]}> 
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: palette.accent },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
});
