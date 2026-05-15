import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { AppColors, Radius } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

type CardProps = PropsWithChildren<ViewProps>;

export function Card({ children, style, ...rest }: CardProps) {
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          shadowColor: palette.primary,
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.standard,
    borderWidth: 1,
    padding: 16,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
});
