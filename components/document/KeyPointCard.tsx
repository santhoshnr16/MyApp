import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { AppColors } from '@/constants/colors';
import type { KeyPoint } from '@/types/document';
import { useColorScheme } from '@/hooks/use-color-scheme';

type KeyPointCardProps = {
  point: KeyPoint;
  index: number;
};

export function KeyPointCard({ point, index }: KeyPointCardProps) {
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];

  const tone =
    point.importance === 'critical'
      ? 'danger'
      : point.importance === 'important'
        ? 'warning'
        : 'neutral';

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.indexCircle, { backgroundColor: palette.primary }]}> 
          <Text style={[styles.indexText, { color: palette.accent }]}>{index + 1}</Text>
        </View>
        <Text style={[styles.text, { color: palette.textPrimary }]}>{point.text}</Text>
      </View>
      <Badge label={point.importance.toUpperCase()} tone={tone} style={styles.badge} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  indexCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  indexText: {
    fontSize: 12,
    fontWeight: '700',
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  badge: {
    marginTop: 12,
  },
});
