import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/colors';
import type { RiskLevel } from '@/types/document';
import { useColorScheme } from '@/hooks/use-color-scheme';

type RiskBadgeProps = {
  level: RiskLevel;
  score?: number;
};

export function RiskBadge({ level, score }: RiskBadgeProps) {
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];

  const colors = {
    high: palette.highRisk,
    medium: palette.mediumRisk,
    low: palette.lowRisk,
  }[level];

  return (
    <View style={[styles.container, { borderColor: colors }]}> 
      <Text style={[styles.score, { color: colors }]}>{score ?? '--'}</Text>
      <Text style={[styles.label, { color: palette.textMuted }]}>Risk Score</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 32,
    borderWidth: 2,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    marginTop: 2,
  },
});
