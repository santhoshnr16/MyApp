import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { AppColors, Radius } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

type BadgeProps = {
  label: string;
  tone?: 'neutral' | 'accent' | 'warning' | 'success' | 'danger';
  style?: ViewStyle;
};

export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];

  const toneStyles = {
    neutral: {
      backgroundColor: palette.border,
      textColor: palette.textSecondary,
    },
    accent: {
      backgroundColor: palette.accent,
      textColor: palette.primary,
    },
    warning: {
      backgroundColor: palette.warning,
      textColor: palette.primary,
    },
    success: {
      backgroundColor: palette.success,
      textColor: palette.surface,
    },
    danger: {
      backgroundColor: palette.danger,
      textColor: palette.surface,
    },
  }[tone];

  return (
    <View style={[styles.container, { backgroundColor: toneStyles.backgroundColor }, style]}>
      <Text style={[styles.text, { color: toneStyles.textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
