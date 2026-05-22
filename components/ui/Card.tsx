import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { C, Radius } from '@/constants/colors';

type CardProps = PropsWithChildren<ViewProps>;

export function Card({ children, style, ...rest }: CardProps) {
  return (
    <View style={[styles.base, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.card,
    borderTopWidth: 2,
    borderTopColor: C.gold,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftColor: C.glassBorder,
    borderRightColor: C.glassBorder,
    borderBottomColor: C.glassBorder,
    backgroundColor: C.glass,
    padding: 16,
    shadowColor: C.gold,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
});
