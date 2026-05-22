import { StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/colors';
import type { ArgumentStrength } from '@/types/moot';

interface ArgumentStrengthBarProps {
  strength: ArgumentStrength;
}

export function ArgumentStrengthBar({ strength }: ArgumentStrengthBarProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.labelNavy}>YOU</Text>
      <View style={styles.track}>
        <View style={[styles.fillNavy, { width: `${strength.student}%` }]} />
        <View style={[styles.fillRed, { width: `${strength.counsel}%` }]} />
      </View>
      <Text style={styles.labelRed}>ADV.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 8,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  labelNavy: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6BAAFF',
    letterSpacing: 1,
    width: 28,
  },
  track: {
    flex: 1,
    height: 5,
    backgroundColor: C.border,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  fillNavy: {
    height: '100%',
    backgroundColor: C.mootNavy,
    borderRadius: 3,
  },
  fillRed: {
    height: '100%',
    backgroundColor: C.mootRed,
    borderRadius: 3,
  },
  labelRed: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF8080',
    letterSpacing: 1,
    width: 28,
    textAlign: 'right',
  },
});
