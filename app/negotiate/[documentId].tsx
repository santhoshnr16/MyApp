import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, GlassCard, Radius } from '@/constants/colors';
import { analyseForNegotiation } from '@/services/negotiationAI';
import type {
  NegotiationContext,
  NegotiationAnalysis,
  CounterpartyType,
  DealDuration,
  MarketContext,
  NegotiationPriority,
  PowerDynamic,
  NegotiationPosture,
  ClauseIssue,
} from '@/types/negotiation';

type Phase = 'form' | 'loading' | 'results';

const POSTURE_COLOR: Record<NegotiationPosture, string> = {
  AGGRESSIVE: C.highRisk,
  BALANCED: C.gold,
  COLLABORATIVE: C.lowRisk,
  DEFENSIVE: C.mediumRisk,
};

const POSTURE_ICON: Record<NegotiationPosture, string> = {
  AGGRESSIVE: 'flash',
  BALANCED: 'scale',
  COLLABORATIVE: 'handshake',
  DEFENSIVE: 'shield',
};

function ChipSelect<T extends string>({
  options, value, onChange, label,
}: { options: T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <View style={fStyles.chipGroup}>
      <Text style={fStyles.fieldLabel}>{label}</Text>
      <View style={fStyles.chipRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[fStyles.chip, value === opt && fStyles.chipActive]}
            onPress={() => onChange(opt)}>
            <Text style={[fStyles.chipText, value === opt && fStyles.chipTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ClauseCard({ item }: { item: ClauseIssue }) {
  const [open, setOpen] = useState(false);
  const riskColor = item.risk === 'HIGH' ? C.highRisk : item.risk === 'MEDIUM' ? C.mediumRisk : C.lowRisk;
  return (
    <TouchableOpacity style={[GlassCard, rStyles.clauseCard]} onPress={() => setOpen(!open)} activeOpacity={0.8}>
      <View style={rStyles.clauseHeader}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={rStyles.clauseName}>{item.clauseName}</Text>
          <View style={[rStyles.riskBadge, { backgroundColor: `${riskColor}22`, borderColor: `${riskColor}44` }]}>
            <Text style={[rStyles.riskBadgeText, { color: riskColor }]}>{item.risk} RISK</Text>
          </View>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
      </View>
      {open && (
        <View style={rStyles.clauseBody}>
          <Text style={rStyles.clauseBodyLabel}>ISSUE</Text>
          <Text style={rStyles.clauseBodyText}>{item.issue}</Text>
          <View style={rStyles.counterBlock}>
            <View style={rStyles.counterBlockHeader}>
              <Ionicons name="create-outline" size={14} color={C.gold} />
              <Text style={rStyles.counterBlockLabel}>PROPOSED COUNTER-LANGUAGE</Text>
            </View>
            <Text style={rStyles.counterText}>{item.counter}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function NegotiateScreen() {
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('form');
  const [analysis, setAnalysis] = useState<NegotiationAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'clauses' | 'strategy' | 'email'>('clauses');

  const spinAnim = useRef(new Animated.Value(0)).current;

  const [ctx, setCtx] = useState<NegotiationContext>({
    contractType: '',
    counterpartyName: '',
    counterpartyType: 'SME',
    yourCompanyName: '',
    yourType: 'SME',
    dealValue: '',
    dealDuration: 'ongoing',
    industry: '',
    jurisdiction: 'India',
    marketContext: 'balanced',
    priority: 'balanced',
    stage: 'initial review',
    powerDynamic: 'balanced',
    counterpartyContact: '',
  });

  function update<K extends keyof NegotiationContext>(key: K, val: NegotiationContext[K]) {
    setCtx((prev) => ({ ...prev, [key]: val }));
  }

  function startSpin() {
    spinAnim.setValue(0);
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1400, useNativeDriver: true })
    ).start();
  }

  async function handleAnalyse() {
    if (!documentId) return;
    setError(null);
    setPhase('loading');
    startSpin();
    try {
      const result = await analyseForNegotiation(documentId, ctx);
      setAnalysis(result);
      setPhase('results');
    } catch (err) {
      setError((err as Error).message ?? 'Analysis failed');
      setPhase('form');
    }
  }

  async function handleShare() {
    if (!analysis) return;
    await Share.share({
      message: `Negotiation Analysis\n\nPosture: ${analysis.posture}\nVerdict: ${analysis.verdict}\n\n${analysis.finalRecommendation}`,
    });
  }

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingCenter}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="scale-outline" size={52} color={C.gold} />
          </Animated.View>
          <Text style={styles.loadingTitle}>Analysing Contract…</Text>
          <Text style={styles.loadingSubtitle}>Senior counsel is reviewing clause by clause</Text>
          <ActivityIndicator color={C.gold} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'results' && analysis) {
    const postureColor = POSTURE_COLOR[analysis.posture];
    const postureIcon = POSTURE_ICON[analysis.posture];
    const TABS = [
      { key: 'clauses', label: 'Clauses', icon: 'document-text-outline' },
      { key: 'strategy', label: 'Strategy', icon: 'compass-outline' },
      { key: 'email', label: 'Email', icon: 'mail-outline' },
    ] as const;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setPhase('form')} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.wordmark}>LEXAI</Text>
            <Text style={styles.featureName}>NegotiationCounsel</Text>
          </View>
          <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
            <Ionicons name="share-outline" size={20} color={C.gold} />
          </TouchableOpacity>
        </View>

        {/* Verdict banner */}
        <View style={[rStyles.verdictBanner, { borderColor: `${postureColor}44`, backgroundColor: `${postureColor}11` }]}>
          <View style={rStyles.verdictLeft}>
            <View style={[rStyles.postureBadge, { backgroundColor: `${postureColor}22`, borderColor: `${postureColor}55` }]}>
              <Ionicons name={postureIcon as never} size={14} color={postureColor} />
              <Text style={[rStyles.postureBadgeText, { color: postureColor }]}>{analysis.posture}</Text>
            </View>
            <Text style={rStyles.verdictText} numberOfLines={2}>{analysis.verdict}</Text>
          </View>
          <View style={[rStyles.riskRing, { borderColor: postureColor }]}>
            <Text style={[rStyles.riskRingScore, { color: postureColor }]}>{analysis.riskScore}</Text>
            <Text style={rStyles.riskRingLabel}>RISK</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={rStyles.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[rStyles.tabBtn, activeTab === t.key && rStyles.tabBtnActive]}
              onPress={() => setActiveTab(t.key)}>
              <Ionicons name={t.icon} size={14} color={activeTab === t.key ? C.gold : C.textMuted} />
              <Text style={[rStyles.tabLabel, activeTab === t.key && rStyles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {activeTab === 'clauses' && (
            <View style={styles.section}>
              {analysis.clauseIssues.length > 0 ? (
                analysis.clauseIssues.map((item, i) => <ClauseCard key={i} item={item} />)
              ) : (
                <View style={[GlassCard, rStyles.emptyState]}>
                  <Ionicons name="checkmark-circle-outline" size={32} color={C.lowRisk} />
                  <Text style={rStyles.emptyText}>No major clause issues found</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'strategy' && (
            <View style={styles.section}>
              {analysis.dealBreakers.length > 0 && (
                <View style={[GlassCard, rStyles.stratBlock, { borderTopColor: C.highRisk }]}>
                  <View style={rStyles.stratHeader}>
                    <Ionicons name="ban" size={16} color={C.highRisk} />
                    <Text style={[rStyles.stratTitle, { color: C.highRisk }]}>DEAL-BREAKERS</Text>
                  </View>
                  {analysis.dealBreakers.map((d, i) => (
                    <View key={i} style={rStyles.stratItem}>
                      <Text style={rStyles.stratBullet}>🚫</Text>
                      <Text style={rStyles.stratText}>{d}</Text>
                    </View>
                  ))}
                </View>
              )}

              {analysis.quickWins.length > 0 && (
                <View style={[GlassCard, rStyles.stratBlock, { borderTopColor: C.lowRisk }]}>
                  <View style={rStyles.stratHeader}>
                    <Ionicons name="checkmark-circle" size={16} color={C.lowRisk} />
                    <Text style={[rStyles.stratTitle, { color: C.lowRisk }]}>QUICK WINS</Text>
                  </View>
                  {analysis.quickWins.map((q, i) => (
                    <View key={i} style={rStyles.stratItem}>
                      <Text style={rStyles.stratBullet}>✓</Text>
                      <Text style={rStyles.stratText}>{q}</Text>
                    </View>
                  ))}
                </View>
              )}

              {analysis.priorityActions.length > 0 && (
                <View style={[GlassCard, rStyles.stratBlock]}>
                  <View style={rStyles.stratHeader}>
                    <Ionicons name="list" size={16} color={C.gold} />
                    <Text style={[rStyles.stratTitle, { color: C.gold }]}>PRIORITY ACTIONS</Text>
                  </View>
                  {analysis.priorityActions.map((p, i) => (
                    <View key={i} style={rStyles.stratItem}>
                      <Text style={[rStyles.stratBullet, { color: C.gold }]}>{i + 1}.</Text>
                      <Text style={rStyles.stratText}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}

              {analysis.finalRecommendation.length > 0 && (
                <View style={[GlassCard, rStyles.recommendBlock]}>
                  <Text style={rStyles.recommendLabel}>COUNSEL&apos;S RECOMMENDATION</Text>
                  <Text style={rStyles.recommendText}>{analysis.finalRecommendation}</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'email' && (
            <View style={styles.section}>
              {analysis.emailDraft ? (
                <>
                  <View style={[GlassCard, rStyles.emailCard]}>
                    <Text style={rStyles.emailText}>{analysis.emailDraft}</Text>
                  </View>
                  <TouchableOpacity
                    style={rStyles.copyBtn}
                    onPress={() => Share.share({ message: analysis.emailDraft })}>
                    <Ionicons name="copy-outline" size={16} color={C.bg} />
                    <Text style={rStyles.copyBtnText}>Copy Email</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={[GlassCard, rStyles.emptyState]}>
                  <Ionicons name="mail-outline" size={32} color={C.textMuted} />
                  <Text style={rStyles.emptyText}>Email draft not available</Text>
                </View>
              )}
              <View style={[GlassCard, rStyles.disclaimerCard]}>
                <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
                <Text style={rStyles.disclaimerText}>
                  AI-generated negotiation advice. Review with a qualified lawyer before acting.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Form phase
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.wordmark}>LEXAI</Text>
              <Text style={styles.featureName}>NegotiationCounsel</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Contract Negotiation{'\n'}Analysis</Text>
            <Text style={styles.heroSub}>Strategic clause-by-clause review by senior counsel AI</Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={C.highRisk} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={fStyles.formSection}>
            <Text style={fStyles.sectionTitle}>CONTRACT DETAILS</Text>

            <Text style={fStyles.fieldLabel}>Contract Type</Text>
            <TextInput
              style={fStyles.input}
              placeholder="e.g. Service Agreement, NDA, Employment"
              placeholderTextColor={C.textMuted}
              value={ctx.contractType}
              onChangeText={(v) => update('contractType', v)}
            />

            <Text style={fStyles.fieldLabel}>Your Company / Name</Text>
            <TextInput
              style={fStyles.input}
              placeholder="e.g. Acme Technologies Pvt Ltd"
              placeholderTextColor={C.textMuted}
              value={ctx.yourCompanyName}
              onChangeText={(v) => update('yourCompanyName', v)}
            />

            <Text style={fStyles.fieldLabel}>Counterparty Name</Text>
            <TextInput
              style={fStyles.input}
              placeholder="e.g. Global Corp Inc."
              placeholderTextColor={C.textMuted}
              value={ctx.counterpartyName}
              onChangeText={(v) => update('counterpartyName', v)}
            />

            <Text style={fStyles.fieldLabel}>Counterparty Contact (for email)</Text>
            <TextInput
              style={fStyles.input}
              placeholder="e.g. Mr. Sharma / Legal Team"
              placeholderTextColor={C.textMuted}
              value={ctx.counterpartyContact}
              onChangeText={(v) => update('counterpartyContact', v)}
            />

            <Text style={fStyles.fieldLabel}>Deal Value</Text>
            <TextInput
              style={fStyles.input}
              placeholder="e.g. Rs. 50 Lakhs / USD 100K"
              placeholderTextColor={C.textMuted}
              value={ctx.dealValue}
              onChangeText={(v) => update('dealValue', v)}
            />

            <Text style={fStyles.fieldLabel}>Industry</Text>
            <TextInput
              style={fStyles.input}
              placeholder="e.g. Technology, Manufacturing, Finance"
              placeholderTextColor={C.textMuted}
              value={ctx.industry}
              onChangeText={(v) => update('industry', v)}
            />
          </View>

          <View style={fStyles.formSection}>
            <Text style={fStyles.sectionTitle}>NEGOTIATION CONTEXT</Text>

            <ChipSelect<CounterpartyType>
              label="Counterparty Type"
              options={['individual', 'SME', 'MNC', 'startup', 'government']}
              value={ctx.counterpartyType}
              onChange={(v) => update('counterpartyType', v)}
            />

            <ChipSelect<DealDuration>
              label="Deal Duration"
              options={['one-time', 'ongoing', 'recurring']}
              value={ctx.dealDuration}
              onChange={(v) => update('dealDuration', v)}
            />

            <ChipSelect<MarketContext>
              label="Market Context"
              options={["buyer's market", "seller's market", 'balanced']}
              value={ctx.marketContext}
              onChange={(v) => update('marketContext', v)}
            />

            <ChipSelect<NegotiationPriority>
              label="Your Priority"
              options={['get deal done', 'maximize leverage', 'minimize risk', 'balanced']}
              value={ctx.priority}
              onChange={(v) => update('priority', v)}
            />

            <ChipSelect<PowerDynamic>
              label="Power Dynamic"
              options={['counterparty stronger', 'balanced', 'we are stronger']}
              value={ctx.powerDynamic}
              onChange={(v) => update('powerDynamic', v)}
            />
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleAnalyse}>
            <Ionicons name="scale-outline" size={20} color={C.bg} />
            <Text style={styles.primaryBtnText}>Analyse for Negotiation</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 },
  loadingTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary, textAlign: 'center' },
  loadingSubtitle: { fontSize: 14, color: C.textSecondary, textAlign: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, paddingBottom: 12,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 12 },
  wordmark: { fontSize: 10, fontWeight: '800', letterSpacing: 3, color: C.gold },
  featureName: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  heroSection: { paddingVertical: 20, gap: 8 },
  heroTitle: { fontSize: 26, fontWeight: '700', color: C.textPrimary, lineHeight: 32 },
  heroSub: { fontSize: 14, color: C.textSecondary },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(229,62,62,0.1)', borderWidth: 1,
    borderColor: 'rgba(229,62,62,0.3)', borderRadius: Radius.button, padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: C.highRisk },
  section: { gap: 12 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.gold, paddingVertical: 18, borderRadius: Radius.button,
    marginTop: 8, shadowColor: C.gold, shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: C.bg },
});

const fStyles = StyleSheet.create({
  formSection: { gap: 14, marginBottom: 24 },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', letterSpacing: 2, color: C.gold,
    marginBottom: 4,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  input: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: Radius.button, padding: 14, color: C.textPrimary, fontSize: 14,
  },
  chipGroup: { gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  chipActive: { backgroundColor: C.goldGlow, borderColor: C.gold },
  chipText: { fontSize: 12, fontWeight: '500', color: C.textSecondary },
  chipTextActive: { color: C.gold, fontWeight: '700' },
});

const rStyles = StyleSheet.create({
  verdictBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginBottom: 12, padding: 16,
    borderRadius: Radius.card, borderWidth: 1,
  },
  verdictLeft: { flex: 1, gap: 6, marginRight: 12 },
  postureBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 1,
  },
  postureBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  verdictText: { fontSize: 13, fontWeight: '600', color: C.textPrimary, lineHeight: 18 },
  riskRing: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface,
  },
  riskRingScore: { fontSize: 17, fontWeight: '800' },
  riskRingLabel: { fontSize: 8, fontWeight: '700', color: C.textMuted, letterSpacing: 1 },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 12,
    backgroundColor: C.surface, borderRadius: Radius.button,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 12,
  },
  tabBtnActive: { backgroundColor: C.goldGlow, borderBottomWidth: 2, borderBottomColor: C.gold },
  tabLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  tabLabelActive: { color: C.gold },
  clauseCard: { padding: 16 },
  clauseHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  clauseName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  riskBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  riskBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  clauseBody: { marginTop: 14, gap: 10 },
  clauseBodyLabel: { fontSize: 10, fontWeight: '800', color: C.textMuted, letterSpacing: 1.5 },
  clauseBodyText: { fontSize: 13, color: C.bodyText, lineHeight: 19 },
  counterBlock: {
    backgroundColor: C.elevated, borderRadius: Radius.button, padding: 12, gap: 8,
    borderLeftWidth: 3, borderLeftColor: C.gold,
  },
  counterBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  counterBlockLabel: { fontSize: 10, fontWeight: '800', color: C.gold, letterSpacing: 1.2 },
  counterText: { fontSize: 12, color: C.goldSoft, lineHeight: 18, fontStyle: 'italic' },
  stratBlock: { padding: 16, gap: 12 },
  stratHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stratTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  stratItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stratBullet: { fontSize: 14, color: C.textSecondary, width: 20 },
  stratText: { flex: 1, fontSize: 13, color: C.bodyText, lineHeight: 19 },
  recommendBlock: { padding: 16, gap: 8 },
  recommendLabel: { fontSize: 10, fontWeight: '800', color: C.gold, letterSpacing: 1.5 },
  recommendText: { fontSize: 13, color: C.textPrimary, lineHeight: 20 },
  emailCard: { padding: 16 },
  emailText: {
    fontSize: 13, color: C.legalText, lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.gold, paddingVertical: 14, borderRadius: Radius.button,
  },
  copyBtnText: { fontSize: 14, fontWeight: '700', color: C.bg },
  disclaimerCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: C.textMuted, lineHeight: 16 },
  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  emptyText: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },
});
