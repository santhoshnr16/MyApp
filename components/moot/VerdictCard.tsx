import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { C, GlassCard, Radius } from '@/constants/colors';
import type { VerdictData } from '@/types/moot';

interface VerdictCardProps {
  verdict: VerdictData;
  onRetry: () => void;
  onBackToSummary: () => void;
}

export function VerdictCard({ verdict, onRetry, onBackToSummary }: VerdictCardProps) {
  const studentWon = verdict.winner === 'petitioner';

  return (
    <View style={styles.container}>
      {/* Winner Banner */}
      <View
        style={[
          styles.winnerBanner,
          studentWon ? styles.bannerGold : styles.bannerRed,
        ]}>
        <Ionicons
          name={studentWon ? 'trophy' : 'close-circle'}
          size={18}
          color={studentWon ? C.bg : C.mootRedText}
        />
        <Text style={[styles.winnerText, { color: studentWon ? C.bg : C.mootRedText }]}>
          {studentWon ? 'YOU WIN' : 'JUDGMENT AGAINST YOU'}
        </Text>
      </View>

      {/* Scores */}
      <View style={styles.scoreRow}>
        <View style={[GlassCard, styles.scoreCard]}>
          <Text style={styles.scoreSide}>PETITIONER</Text>
          <Text style={[styles.scoreNum, { color: '#6BAAFF' }]}>{verdict.score.petitioner}</Text>
        </View>
        <Text style={styles.vsText}>VS</Text>
        <View style={[GlassCard, styles.scoreCard]}>
          <Text style={styles.scoreSide}>RESPONDENT</Text>
          <Text style={[styles.scoreNum, { color: '#FF8080' }]}>{verdict.score.respondent}</Text>
        </View>
      </View>

      {/* Summary */}
      <Text style={styles.summary}>{verdict.summary}</Text>

      {/* Judge Remarks */}
      <View style={[GlassCard, styles.remarksCard]}>
        <View style={styles.remarksTop}>
          <Ionicons name="scale" size={14} color={C.gold} />
          <Text style={styles.remarksLabel}>JUDGE&apos;S REMARKS</Text>
        </View>
        <Text style={styles.remarksText}>{verdict.judgeRemarks}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Ionicons name="refresh" size={14} color={C.gold} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.summaryBtn} onPress={onBackToSummary}>
          <Text style={styles.summaryText}>Back to Summary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 16,
  },
  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.button,
  },
  bannerGold: {
    backgroundColor: C.gold,
  },
  bannerRed: {
    backgroundColor: 'rgba(139,26,26,0.7)',
    borderWidth: 1,
    borderColor: C.mootRed,
  },
  winnerText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  scoreSide: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.textMuted,
  },
  scoreNum: {
    fontSize: 36,
    fontWeight: '800',
  },
  vsText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 1,
  },
  summary: {
    fontSize: 13,
    color: C.legalText,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  remarksCard: {
    gap: 8,
  },
  remarksTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  remarksLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: C.gold,
  },
  remarksText: {
    fontSize: 13,
    color: C.legalText,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  retryBtn: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: Radius.button,
    backgroundColor: C.goldGlow,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.gold,
  },
  summaryBtn: {
    flex: 2,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.gold,
    borderRadius: Radius.button,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.bg,
  },
});
