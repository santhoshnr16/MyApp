import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, GlassCard, Radius } from '@/constants/colors';
import { evaluateUndertrialBailEligibility, ingestDLSAWebhookPayload } from '@/services/undertrialBailAI';
import type { BNSS479EligibilityResult, PrisonerRecordPayload } from '@/types/undertrialBail';

export default function PrisonBailScreen() {
  const router = useRouter();

  const [prisonerId, setPrisonerId] = useState('');
  const [firNumber, setFirNumber] = useState('');
  const [name, setName] = useState('');
  const [chargeInput, setChargeInput] = useState('BNS Section 303(2) / IPC 379 Theft');
  const [daysIncarcerated, setDaysIncarcerated] = useState('385');
  const [isFirstOffender, setIsFirstOffender] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<PrisonerRecordPayload | null>(null);
  const [evaluation, setEvaluation] = useState<BNSS479EligibilityResult | null>(null);

  const [activeTab, setActiveTab] = useState<'calculator' | 'webhook'>('calculator');
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  async function handleEvaluate() {
    setError(null);
    setLoading(true);
    setWebhookStatus(null);

    try {
      const daysNum = parseInt(daysIncarcerated, 10);
      const res = await evaluateUndertrialBailEligibility({
        prisonerId: prisonerId.trim() || undefined,
        firNumber: firNumber.trim() || undefined,
        name: name.trim() || undefined,
        chargeInput: chargeInput.trim() || undefined,
        daysIncarcerated: isNaN(daysNum) ? undefined : daysNum,
        isFirstOffender,
      });

      setRecord(res.record);
      setEvaluation(res.evaluation);
    } catch (err) {
      setError((err as Error).message || 'Evaluation failed. Please check network.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulateWebhook() {
    setError(null);
    setLoading(true);
    setWebhookStatus(null);

    try {
      const sampleWebhook = {
        prisonerId: `UTP-DLSA-${Math.floor(10000 + Math.random() * 90000)}`,
        fullName: name.trim() || 'Sunita Devi',
        gender: 'FEMALE' as const,
        age: 31,
        prisonLocation: 'Tihar Jail No. 3, New Delhi',
        districtLegalServicesAuthority: 'DLSA Central District',
        firNumber: firNumber.trim() || 'FIR-1092/2024',
        caseType: 'Undertrial Review',
        incarcerationDate: new Date(Date.now() - (parseInt(daysIncarcerated, 10) || 400) * 86400000).toISOString(),
        isFirstOffender,
        hasMultipleCases: false,
        chargeInput: chargeInput.trim() || 'BNS 318(4) / IPC 420 Cheating',
      };

      const res = await ingestDLSAWebhookPayload(sampleWebhook);
      setRecord(res.record);
      setEvaluation(res.evaluation);
      setWebhookStatus('Payload ingested successfully via DLSA Webhook (POST /api/v1/webhook/prison-intake)!');
    } catch (err) {
      setError((err as Error).message || 'Webhook intake failed.');
    } finally {
      setLoading(false);
    }
  }

  const isEligible = evaluation?.isEligibleForBail;
  const isExcluded = evaluation?.eligibilityStatus === 'EXCLUDED_OFFENSE';
  const statusColor = isExcluded ? C.highRisk : isEligible ? C.lowRisk : C.gold;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Top Bar */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.wordmark}>LEXAI</Text>
              <Text style={styles.featureName}>e-Prisons BNSS 479 Engine</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          {/* Title */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Undertrial Prisoner{'\n'}Bail Eligibility</Text>
            <Text style={styles.heroSub}>
              BNSS Sec 479 (2023) Rule: 1/3rd max detention threshold for First Offender; 1/2 max sentence for others.
            </Text>
          </View>

          {/* Mode Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'calculator' && styles.tabBtnActive]}
              onPress={() => setActiveTab('calculator')}>
              <Ionicons name="calculator-outline" size={14} color={activeTab === 'calculator' ? C.gold : C.textMuted} />
              <Text style={[styles.tabLabel, activeTab === 'calculator' && styles.tabLabelActive]}>Bail Calculator</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'webhook' && styles.tabBtnActive]}
              onPress={() => setActiveTab('webhook')}>
              <Ionicons name="cloud-upload-outline" size={14} color={activeTab === 'webhook' ? C.gold : C.textMuted} />
              <Text style={[styles.tabLabel, activeTab === 'webhook' && styles.tabLabelActive]}>DLSA Webhook Simulator</Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={C.highRisk} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {webhookStatus && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={16} color={C.lowRisk} />
              <Text style={styles.successText}>{webhookStatus}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>LOOKUP & CHARGE PARAMETERS</Text>

            <Text style={styles.fieldLabel}>Prisoner ID (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. UTP-2026-91823"
              placeholderTextColor={C.textMuted}
              value={prisonerId}
              onChangeText={setPrisonerId}
            />

            <Text style={styles.fieldLabel}>BNS / IPC Charge Section (Dynamic Ollama AI Analysis)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. BNS Section 303(2), IPC 379, BNS 105, IPC 420"
              placeholderTextColor={C.textMuted}
              value={chargeInput}
              onChangeText={setChargeInput}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Days Incarcerated</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 385"
                  placeholderTextColor={C.textMuted}
                  value={daysIncarcerated}
                  onChangeText={setDaysIncarcerated}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>FIR Number (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. FIR-402/2024"
                  placeholderTextColor={C.textMuted}
                  value={firNumber}
                  onChangeText={setFirNumber}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Prisoner Name (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor={C.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Offender Status Switch */}
            <Text style={styles.fieldLabel}>BNSS 479 Offender Classification</Text>
            <View style={styles.switchRow}>
              <TouchableOpacity
                style={[styles.switchChip, isFirstOffender && styles.switchChipActive]}
                onPress={() => setIsFirstOffender(true)}>
                <Ionicons name="shield-checkmark-outline" size={14} color={isFirstOffender ? C.gold : C.textMuted} />
                <Text style={[styles.switchChipText, isFirstOffender && styles.switchChipTextActive]}>
                  First-Time Offender (1/3rd Max Threshold)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.switchChip, !isFirstOffender && styles.switchChipActive]}
                onPress={() => setIsFirstOffender(false)}>
                <Ionicons name="repeat-outline" size={14} color={!isFirstOffender ? C.gold : C.textMuted} />
                <Text style={[styles.switchChipText, !isFirstOffender && styles.switchChipTextActive]}>
                  Repeat Offender (1/2 Max Threshold)
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'calculator' ? (
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleEvaluate}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={C.bg} />
                ) : (
                  <>
                    <Ionicons name="scale-outline" size={18} color={C.bg} />
                    <Text style={styles.primaryBtnText}>Evaluate BNSS Sec 479 Bail</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.gold }, loading && styles.primaryBtnDisabled]}
                onPress={handleSimulateWebhook}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={C.gold} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={18} color={C.gold} />
                    <Text style={[styles.primaryBtnText, { color: C.gold }]}>Simulate DLSA Webhook Push</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Results View */}
          {evaluation && record && (
            <View style={styles.resultsSection}>

              {/* Status Banner */}
              <View style={[styles.verdictBanner, { borderColor: `${statusColor}55`, backgroundColor: `${statusColor}15` }]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={[styles.badgePill, { backgroundColor: `${statusColor}22`, borderColor: statusColor }]}>
                    <Ionicons
                      name={isExcluded ? 'ban-outline' : isEligible ? 'checkmark-circle-outline' : 'time-outline'}
                      size={13}
                      color={statusColor}
                    />
                    <Text style={[styles.badgePillText, { color: statusColor }]}>
                      {evaluation.eligibilityStatus.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <Text style={styles.verdictTitle}>
                    {isExcluded
                      ? 'Ineligible (Excluded Offense / Death / Life Penalty)'
                      : isEligible
                      ? 'ELIGIBLE FOR MANDATORY BAIL'
                      : 'Detention Period Remaining'}
                  </Text>
                </View>
              </View>

              {/* Legal Summary */}
              <View style={[GlassCard, styles.infoCard]}>
                <Text style={styles.cardHeaderLabel}>STATUTORY LEGAL SUMMARY</Text>
                <Text style={styles.legalSummaryText}>{evaluation.legalSummary}</Text>

                <View style={styles.statsGrid}>
                  <View style={styles.gridBox}>
                    <Text style={styles.gridLabel}>INCARCERATED</Text>
                    <Text style={styles.gridVal}>{evaluation.monthsIncarcerated} Mos ({evaluation.daysIncarcerated} Days)</Text>
                  </View>
                  <View style={styles.gridBox}>
                    <Text style={styles.gridLabel}>REQUIRED THRESHOLD</Text>
                    <Text style={[styles.gridVal, { color: C.gold }]}>
                      {evaluation.requiredSentenceMonthsForBail} Mos ({evaluation.requiredDetentionPercentage})
                    </Text>
                  </View>
                  <View style={styles.gridBox}>
                    <Text style={styles.gridLabel}>MAX SENTENCE</Text>
                    <Text style={styles.gridVal}>{evaluation.maxSentenceMonths} Months</Text>
                  </View>
                  <View style={styles.gridBox}>
                    <Text style={styles.gridLabel}>ELIGIBLE FROM</Text>
                    <Text style={[styles.gridVal, { color: isEligible ? C.lowRisk : C.textPrimary }]}>
                      {evaluation.eligibleFromDate}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Charge Breakdown (Dynamic Ollama AI Analysis) */}
              <View style={[GlassCard, styles.infoCard]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="hardware-chip-outline" size={14} color={C.gold} />
                  <Text style={styles.cardHeaderLabel}>DYNAMIC OLLAMA BNS LEGAL PARSER</Text>
                </View>

                {record.charges.map((c, i) => (
                  <View key={i} style={styles.chargeItem}>
                    <Text style={styles.chargeSection}>{c.section}</Text>
                    <Text style={styles.chargeDesc}>{c.description}</Text>
                    <View style={styles.chargePillRow}>
                      <View style={styles.tagPill}>
                        <Text style={styles.tagText}>Max Sentence: {c.maxSentenceMonths} Months</Text>
                      </View>
                      <View style={[styles.tagPill, c.isDeathOrLifePunishable && styles.dangerPill]}>
                        <Text style={[styles.tagText, c.isDeathOrLifePunishable && styles.dangerText]}>
                          {c.isDeathOrLifePunishable ? 'Death/Life Punishable: YES' : 'Death/Life Punishable: NO'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Record Metadata */}
              <View style={[GlassCard, styles.metaCard]}>
                <Text style={styles.metaText}>Prisoner ID: {record.prisonerId} • Facility: {record.prisonLocation}</Text>
                <Text style={styles.metaText}>Source: {record.metadata?.source || 'SIMULATION_MODE'} • Ref: {evaluation.bnssReference}</Text>
              </View>

            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
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
  heroSection: { paddingVertical: 16, gap: 6 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: C.textPrimary, lineHeight: 30 },
  heroSub: { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
  tabRow: {
    flexDirection: 'row', marginBottom: 16,
    backgroundColor: C.surface, borderRadius: Radius.button,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
  },
  tabBtnActive: { backgroundColor: C.goldGlow, borderBottomWidth: 2, borderBottomColor: C.gold },
  tabLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted },
  tabLabelActive: { color: C.gold },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(229,62,62,0.1)', borderWidth: 1,
    borderColor: 'rgba(229,62,62,0.3)', borderRadius: Radius.button, padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: C.highRisk },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(72,187,120,0.1)', borderWidth: 1,
    borderColor: 'rgba(72,187,120,0.3)', borderRadius: Radius.button, padding: 12, marginBottom: 16,
  },
  successText: { flex: 1, fontSize: 12, color: C.lowRisk, fontWeight: '600' },
  formCard: {
    ...GlassCard,
    padding: 16, gap: 12, marginBottom: 20,
  },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: C.gold },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  input: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: Radius.button, padding: 12, color: C.textPrimary, fontSize: 13,
  },
  row: { flexDirection: 'row', gap: 10 },
  switchRow: { gap: 8, marginVertical: 4 },
  switchChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: Radius.button,
  },
  switchChipActive: { backgroundColor: C.goldGlow, borderColor: C.gold },
  switchChipText: { fontSize: 12, color: C.textSecondary, fontWeight: '500' },
  switchChipTextActive: { color: C.gold, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.gold, paddingVertical: 14, borderRadius: Radius.button, marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: C.bg },
  resultsSection: { gap: 14 },
  verdictBanner: {
    padding: 16, borderRadius: Radius.card, borderWidth: 1,
  },
  badgePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 1,
    marginBottom: 6,
  },
  badgePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  verdictTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  infoCard: { padding: 16, gap: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardHeaderLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: C.gold },
  legalSummaryText: { fontSize: 13, color: C.textPrimary, lineHeight: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  gridBox: {
    width: '47%', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    padding: 10, borderRadius: Radius.button, gap: 4,
  },
  gridLabel: { fontSize: 9, fontWeight: '800', color: C.textMuted, letterSpacing: 1 },
  gridVal: { fontSize: 12, fontWeight: '700', color: C.textPrimary },
  chargeItem: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: Radius.button, padding: 12, gap: 6,
  },
  chargeSection: { fontSize: 13, fontWeight: '700', color: C.gold },
  chargeDesc: { fontSize: 12, color: C.textSecondary },
  chargePillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tagPill: {
    backgroundColor: C.goldGlow, borderWidth: 1, borderColor: C.goldBorder,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill,
  },
  dangerPill: { backgroundColor: 'rgba(229,62,62,0.1)', borderColor: 'rgba(229,62,62,0.3)' },
  tagText: { fontSize: 10, fontWeight: '600', color: C.gold },
  dangerText: { color: C.highRisk },
  metaCard: { padding: 12, gap: 4, alignItems: 'center' },
  metaText: { fontSize: 10, color: C.textMuted },
});
