import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { C, GlassCard, Radius } from '@/constants/colors';

interface JudgeBarProps {
  exchangeNumber: number;
  maxExchanges: number;
  studentRole: string;
  opposingRole: string;
}

export function JudgeBar({
  exchangeNumber,
  maxExchanges,
  studentRole,
  opposingRole,
}: JudgeBarProps) {
  const progressPct = `${Math.round((exchangeNumber / maxExchanges) * 100)}%`;

  return (
    <View style={styles.container}>
      <View style={styles.rolesRow}>
        <Text style={styles.roleNavy}>
          You: <Text style={styles.roleNameNavy}>{studentRole.toUpperCase()}</Text>
        </Text>
        <View style={[GlassCard, styles.exchangePill]}>
          <Ionicons name="scale" size={10} color={C.gold} />
          <Text style={styles.exchangeText}>
            {exchangeNumber} / {maxExchanges}
          </Text>
        </View>
        <Text style={styles.roleRed}>
          AI: <Text style={styles.roleNameRed}>{opposingRole.toUpperCase()}</Text>
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressPct as `${number}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  rolesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleNavy: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: '500',
  },
  roleNameNavy: {
    color: '#6BAAFF',
    fontWeight: '700',
  },
  roleRed: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: '500',
  },
  roleNameRed: {
    color: '#FF8080',
    fontWeight: '700',
  },
  exchangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderTopWidth: 1,
    borderTopColor: C.gold,
  },
  exchangeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.gold,
  },
  progressTrack: {
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.gold,
    borderRadius: 2,
  },
});
