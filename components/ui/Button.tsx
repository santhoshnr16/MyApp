import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

import { C, Radius } from '@/constants/colors';

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
  const isDisabled = disabled || loading;

  const variantConfig: Record<ButtonVariant, { bg: string; border: string; text: string }> = {
    primary: {
      bg: isDisabled ? C.border : C.gold,
      border: isDisabled ? C.border : C.gold,
      text: isDisabled ? C.textMuted : C.bg,
    },
    secondary: {
      bg: isDisabled ? C.border : C.elevated,
      border: isDisabled ? C.border : C.goldBorder,
      text: isDisabled ? C.textMuted : C.gold,
    },
    outline: {
      bg: 'transparent',
      border: C.goldBorder,
      text: C.gold,
    },
    ghost: {
      bg: 'transparent',
      border: 'transparent',
      text: C.gold,
    },
  };

  const { bg, border, text } = variantConfig[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
        },
        variant === 'primary' && !isDisabled && styles.primaryElevated,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={text} />
      ) : (
        <Text style={[styles.label, { color: text }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radius.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryElevated: {
    shadowColor: C.gold,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
