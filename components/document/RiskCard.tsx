import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { AppColors } from '@/constants/colors';
import type { DocumentRisk } from '@/types/document';
import { useColorScheme } from '@/hooks/use-color-scheme';

type RiskCardProps = {
  risk: DocumentRisk;
};

export function RiskCard({ risk }: RiskCardProps) {
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];

  const tone =
    risk.level === 'high' ? 'danger' : risk.level === 'medium' ? 'warning' : 'success';

  const levelColor =
    risk.level === 'high'
      ? palette.highRisk
      : risk.level === 'medium'
        ? palette.mediumRisk
        : palette.lowRisk;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.levelBar, { backgroundColor: levelColor }]} />
        <Text style={[styles.title, { color: palette.textPrimary }]}>{risk.title}</Text>
        <Badge label={risk.level.toUpperCase()} tone={tone} />
      </View>
      <Text style={[styles.description, { color: palette.textSecondary }]}>{risk.description}</Text>
      {risk.recommendation && (
        <Text style={[styles.recommendation, { color: palette.primary }]}>
          Recommendation: {risk.recommendation}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  levelBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 6,
  },
  recommendation: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
