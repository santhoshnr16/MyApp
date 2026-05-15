import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { AppColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SummaryCardProps = {
  summary: string;
};

export function SummaryCard({ summary }: SummaryCardProps) {
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];

  return (
    <Card style={[styles.card, { backgroundColor: palette.accentSoft }]}> 
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: palette.textMuted }]}>AI Summary</Text>
      </View>
      <Text style={[styles.summaryText, { color: palette.textPrimary }]}>{summary}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  labelRow: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
