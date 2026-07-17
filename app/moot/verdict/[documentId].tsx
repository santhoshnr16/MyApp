import { Ionicons } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, GlassCard, Radius } from '@/constants/colors';
import { loadVerdict } from '@/services/mootAI';
import type { VerdictData } from '@/types/moot';

function AnimatedScore({ target, color }: { target: number; color: string }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let current = 0;
    const step = Math.ceil(target / 40);
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplayed(current);
      if (current >= target) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [target]);

  return <Text style={[styles.scoreNum, { color }]}>{displayed}</Text>;
}

function GavelIcon() {
  const drop = useRef(new Animated.Value(-60)).current;
  const bounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(drop, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.spring(bounce, {
        toValue: 1.2,
        useNativeDriver: true,
        friction: 4,
        tension: 300,
      }),
      Animated.spring(bounce, { toValue: 1, useNativeDriver: true, friction: 6 }),
    ]).start();
  }, [drop, bounce]);

  return (
    <Animated.View
      style={{
        transform: [{ translateY: drop }, { scale: bounce }],
      }}>
      <Text style={styles.gavelEmoji}>⚖️</Text>
    </Animated.View>
  );
}

function SectionAccordion({
  icon,
  title,
  color,
  items,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  color: string;
  items: string[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <View style={[GlassCard, styles.accordionCard]}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => setOpen((p) => !p)}
        activeOpacity={0.8}>
        <View style={styles.accordionLeft}>
          <Ionicons name={icon} size={16} color={color} />
          <Text style={[styles.accordionTitle, { color }]}>{title}</Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={C.textMuted}
        />
      </TouchableOpacity>
      {open && (
        <View style={styles.accordionBody}>
          {items.map((item, i) => (
            <View key={i} style={styles.accordionItem}>
              <View style={[styles.accordionDot, { backgroundColor: color }]} />
              <Text style={styles.accordionText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function VerdictScreen() {
  const router = useRouter();
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const [verdict, setVerdict] = useState<VerdictData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documentId) return;
    loadVerdict(documentId).then((v) => {
      setVerdict(v);
      setLoading(false);
    });
  }, [documentId]);

  if (!documentId) return null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading verdict...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!verdict) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Verdict not found.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const studentWon = verdict.winner === 'petitioner';
  const petScore = verdict.score.petitioner;
  const respScore = verdict.score.respondent;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>

        {/* Gavel */}
        <View style={styles.gavelRow}>
          <GavelIcon />
        </View>

        {/* Verdict Title */}
        <Text style={styles.verdictTitle}>VERDICT</Text>

        {/* Winner Banner */}
        <View
          style={[
            styles.winnerBanner,
            studentWon ? styles.winnerBannerGold : styles.winnerBannerRed,
          ]}>
          <Ionicons
            name={studentWon ? 'trophy' : 'close-circle'}
            size={20}
            color={studentWon ? C.bg : C.mootRedText}
          />
          <Text
            style={[
              styles.winnerBannerText,
              { color: studentWon ? C.bg : C.mootRedText },
            ]}>
            {studentWon ? 'YOU WIN' : 'JUDGMENT AGAINST YOU'}
          </Text>
        </View>

        {/* Summary */}
        <Text style={styles.verdictSummary}>{verdict.summary}</Text>

        {/* Score Cards */}
        <View style={styles.scoreRow}>
          <View style={[GlassCard, styles.scoreCard]}>
            <Text style={styles.scoreSide}>PETITIONER</Text>
            <AnimatedScore target={petScore} color={C.mootNavy === '#1A3A6B' ? '#6BAAFF' : C.mootNavy} />
            <Text style={styles.scoreLabel}>pts</Text>
          </View>
          <View style={styles.scoreVS}>
            <Text style={styles.scoreVSText}>VS</Text>
          </View>
          <View style={[GlassCard, styles.scoreCard]}>
            <Text style={styles.scoreSide}>RESPONDENT</Text>
            <AnimatedScore target={respScore} color="#FF8080" />
            <Text style={styles.scoreLabel}>pts</Text>
          </View>
        </View>

        {/* Strengths */}
        {verdict.studentStrengths.length > 0 && (
          <SectionAccordion
            icon="checkmark-circle"
            title="YOUR STRENGTHS"
            color={C.lowRisk}
            items={verdict.studentStrengths}
          />
        )}

        {/* Weaknesses */}
        {verdict.studentWeaknesses.length > 0 && (
          <SectionAccordion
            icon="close-circle"
            title="YOUR WEAKNESSES"
            color={C.highRisk}
            items={verdict.studentWeaknesses}
          />
        )}

        {/* Missed Arguments */}
        {verdict.missedArguments.length > 0 && (
          <SectionAccordion
            icon="bulb"
            title="WHAT YOU MISSED"
            color={C.gold}
            items={verdict.missedArguments}
          />
        )}

        {/* Judge Remarks */}
        <View style={[GlassCard, styles.judgeCard]}>
          <View style={styles.judgeTop}>
            <Ionicons name="scale" size={18} color={C.gold} />
            <Text style={styles.judgeLabel}>JUDGE&apos;S REMARKS</Text>
          </View>
          <Text style={styles.judgeRemarks}>{verdict.judgeRemarks}</Text>
        </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomBtns}>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() =>
              router.replace({
                pathname: '/moot/[documentId]',
                params: { documentId },
              } as unknown as Href)
            }>
            <Ionicons name="refresh" size={16} color={C.gold} />
            <Text style={styles.retryBtnText}>Retry Same Document</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.summaryBtn}
            onPress={() =>
              router.replace({
                pathname: '/summary/[documentId]',
                params: { documentId },
              } as unknown as Href)
            }>
            <Ionicons name="document-text" size={16} color={C.bg} />
            <Text style={styles.summaryBtnText}>Back to Summary</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: C.textMuted,
  },
  errorText: {
    fontSize: 14,
    color: C.highRisk,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: C.border,
  },
  backBtnText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '600',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 60,
    gap: 16,
    alignItems: 'center',
  },
  gavelRow: {
    marginTop: 32,
    alignItems: 'center',
  },
  gavelEmoji: {
    fontSize: 56,
  },
  verdictTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: C.gold,
    letterSpacing: 8,
    textAlign: 'center',
  },
  winnerBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: Radius.button,
  },
  winnerBannerGold: {
    backgroundColor: C.gold,
  },
  winnerBannerRed: {
    backgroundColor: 'rgba(139,26,26,0.7)',
    borderWidth: 1,
    borderColor: C.mootRed,
  },
  winnerBannerText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  verdictSummary: {
    fontSize: 14,
    color: C.legalText,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },
  scoreRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  scoreSide: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.textMuted,
  },
  scoreNum: {
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 52,
  },
  scoreLabel: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '600',
  },
  scoreVS: {
    width: 32,
    alignItems: 'center',
  },
  scoreVSText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 1,
  },
  accordionCard: {
    width: '100%',
    gap: 0,
    padding: 0,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  accordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  accordionItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  accordionDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
    flexShrink: 0,
  },
  accordionText: {
    flex: 1,
    fontSize: 13,
    color: C.bodyText,
    lineHeight: 20,
  },
  judgeCard: {
    width: '100%',
    gap: 12,
  },
  judgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  judgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: C.gold,
  },
  judgeRemarks: {
    fontSize: 14,
    color: C.legalText,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  bottomBtns: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  retryBtn: {
    height: 50,
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: Radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.goldGlow,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.gold,
  },
  summaryBtn: {
    height: 50,
    backgroundColor: C.gold,
    borderRadius: Radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: C.gold,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  summaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.bg,
  },
});
