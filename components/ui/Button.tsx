import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

import { AppColors, Radius } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];
  const isDisabled = disabled || loading;
  const showElevated = (variant === 'primary' || variant === 'secondary') && !isDisabled;

  const variantStyles = {
    primary: {
      backgroundColor: isDisabled ? palette.border : palette.primary,
      borderColor: isDisabled ? palette.border : palette.primary,
      textColor: isDisabled ? palette.textMuted : palette.accent,
    },
    secondary: {
      backgroundColor: isDisabled ? palette.border : palette.accent,
      borderColor: isDisabled ? palette.border : palette.accent,
      textColor: isDisabled ? palette.textMuted : palette.primary,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: palette.primary,
      textColor: palette.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: palette.primary,
    },
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
        },
        showElevated ? styles.elevated : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variantStyles.textColor} />
      ) : (
        <Text style={[styles.label, { color: variantStyles.textColor }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: Radius.standard,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  elevated: {
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
