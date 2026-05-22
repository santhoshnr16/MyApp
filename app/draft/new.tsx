import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
import { generateStructure, generateDocument } from '@/services/draftAI';
import { saveDraft } from '@/storage/draftStorage';
import type { DraftDetails, DocumentType, TriggerFlag, Party, DocumentStructure } from '@/types/draft';

const DOCUMENT_TYPES: DocumentType[] = [
  'NDA',
  'Service Agreement',
  'Employment Contract',
  'Freelance Contract',
  'MOU',
  'Partnership Deed',
  'Lease Agreement',
  'Loan Agreement',
  'Share Purchase Agreement',
  'Founders Agreement',
];

const TRIGGER_FLAGS: { key: TriggerFlag; label: string; icon: string }[] = [
  { key: 'HAS_DATA_SHARING', label: 'Data Sharing', icon: 'cloud-outline' },
  { key: 'HAS_IP', label: 'IP / Copyright', icon: 'bulb-outline' },
  { key: 'INTERNATIONAL_PARTIES', label: 'International', icon: 'globe-outline' },
  { key: 'HAS_EQUITY', label: 'Equity / Shares', icon: 'pie-chart-outline' },
  { key: 'HAS_NON_COMPETE', label: 'Non-Compete', icon: 'ban-outline' },
  { key: 'HAS_SLA', label: 'SLA', icon: 'speedometer-outline' },
  { key: 'HAS_ARBITRATION', label: 'Arbitration', icon: 'hammer-outline' },
  { key: 'IS_STARTUP', label: 'Startup', icon: 'rocket-outline' },
  { key: 'IS_ENTERPRISE', label: 'Enterprise', icon: 'business-outline' },
];

type Step = 'type' | 'parties' | 'context' | 'questions' | 'drafting';

export default function DraftNewScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('type');
  const [docType, setDocType] = useState<DocumentType>('NDA');
  const [title, setTitle] = useState('');
  const [parties, setParties] = useState<Party[]>([
    { name: '', role: 'Party A', type: 'company' },
    { name: '', role: 'Party B', type: 'company' },
  ]);
  const [jurisdiction, setJurisdiction] = useState('Maharashtra, India');
  const [context, setContext] = useState('');
  const [flags, setFlags] = useState<TriggerFlag[]>([]);
  const [structure, setStructure] = useState<DocumentStructure | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;

  function startSpin() {
    spinAnim.setValue(0);
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
  }

  function toggleFlag(flag: TriggerFlag) {
    setFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  }

  function updateParty(index: number, field: keyof Party, value: string) {
    setParties((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addParty() {
    if (parties.length >= 4) return;
    setParties((prev) => [...prev, { name: '', role: `Party ${String.fromCharCode(65 + prev.length)}`, type: 'company' }]);
  }

  function removeParty(index: number) {
    if (parties.length <= 2) return;
    setParties((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGenerateStructure() {
    setError(null);
    const details: DraftDetails = {
      documentType: docType,
      title: title || `${docType} Agreement`,
      parties,
      jurisdiction,
      context,
      flags,
    };
    setStep('drafting');
    startSpin();
    try {
      const result = await generateStructure(details);
      setStructure(result);
      const initialAnswers: Record<string, string> = {};
      result.questions.forEach((q) => { initialAnswers[q.id] = ''; });
      setAnswers(initialAnswers);
      setStep('questions');
    } catch (err) {
      setError((err as Error).message ?? 'Structure generation failed');
      setStep('context');
    }
  }

  async function handleDraftDocument() {
    if (!structure) return;
    setError(null);
    const details: DraftDetails = {
      documentType: docType,
      title: title || `${docType} Agreement`,
      parties,
      jurisdiction,
      context,
      flags,
    };
    setStep('drafting');
    startSpin();
    try {
      const result = await generateDocument(details, structure, answers);
      const draftId = generateId();
      await saveDraft({
        draftId,
        details,
        structure,
        documentText: result.documentText,
        complianceReport: result.complianceReport,
        riskAnalysis: result.riskAnalysis,
        createdAt: new Date().toISOString(),
      });
      router.replace({
        pathname: '/draft/[draftId]',
        params: { draftId },
      } as never);
    } catch (err) {
      setError((err as Error).message ?? 'Document drafting failed');
      setStep('questions');
    }
  }

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (step === 'drafting') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingCenter}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="document-text-outline" size={48} color={C.gold} />
          </Animated.View>
          <Text style={styles.loadingTitle}>
            {structure ? 'Drafting your document…' : 'Analysing requirements…'}
          </Text>
          <Text style={styles.loadingSubtitle}>
            {structure
              ? 'LexAI is writing your legal document'
              : 'LexAI is planning the document structure'}
          </Text>
          <ActivityIndicator color={C.gold} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.wordmark}>LEXAI</Text>
              <Text style={styles.featureName}>DraftCounsel</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            {(['type', 'parties', 'context'] as Step[]).map((s, i) => (
              <View key={s} style={styles.stepItem}>
                <View style={[styles.stepDot, step === s && styles.stepDotActive,
                  (['type', 'parties', 'context'].indexOf(step) > i) && styles.stepDotDone]}>
                  {(['type', 'parties', 'context'].indexOf(step) > i)
                    ? <Ionicons name="checkmark" size={10} color={C.bg} />
                    : <Text style={[styles.stepNum, step === s && styles.stepNumActive]}>{i + 1}</Text>}
                </View>
                {i < 2 && <View style={[styles.stepLine,
                  (['type', 'parties', 'context'].indexOf(step) > i) && styles.stepLineDone]} />}
              </View>
            ))}
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={C.highRisk} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Step 1: Document Type */}
          {step === 'type' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Select Document Type</Text>
              <Text style={styles.stepSubtitle}>What kind of legal document do you need?</Text>

              <View style={styles.typeGrid}>
                {DOCUMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeCard, docType === type && styles.typeCardActive]}
                    onPress={() => setDocType(type)}>
                    <Text style={[styles.typeText, docType === type && styles.typeTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Document Title (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder={`e.g. ${docType} between Acme Corp and John Doe`}
                placeholderTextColor={C.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('parties')}>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={C.bg} />
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: Parties */}
          {step === 'parties' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Parties & Jurisdiction</Text>
              <Text style={styles.stepSubtitle}>Who are the parties to this agreement?</Text>

              {parties.map((party, index) => (
                <View key={index} style={[GlassCard, styles.partyCard]}>
                  <View style={styles.partyHeader}>
                    <Text style={styles.partyNum}>Party {index + 1}</Text>
                    {index >= 2 && (
                      <TouchableOpacity onPress={() => removeParty(index)}>
                        <Ionicons name="close-circle" size={18} color={C.highRisk} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Full name / Company name"
                    placeholderTextColor={C.textMuted}
                    value={party.name}
                    onChangeText={(v) => updateParty(index, 'name', v)}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Role (e.g. Employer, Contractor, Licensor)"
                    placeholderTextColor={C.textMuted}
                    value={party.role}
                    onChangeText={(v) => updateParty(index, 'role', v)}
                  />
                  <View style={styles.typeToggleRow}>
                    {(['individual', 'company'] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.typeToggle, party.type === t && styles.typeToggleActive]}
                        onPress={() => updateParty(index, 'type', t)}>
                        <Text style={[styles.typeToggleText, party.type === t && styles.typeToggleTextActive]}>
                          {t === 'individual' ? 'Individual' : 'Company'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              {parties.length < 4 && (
                <TouchableOpacity style={styles.addPartyBtn} onPress={addParty}>
                  <Ionicons name="add-circle-outline" size={18} color={C.gold} />
                  <Text style={styles.addPartyText}>Add Another Party</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.fieldLabel}>Governing Jurisdiction</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Maharashtra, India"
                placeholderTextColor={C.textMuted}
                value={jurisdiction}
                onChangeText={setJurisdiction}
              />

              <View style={styles.navRow}>
                <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('type')}>
                  <Ionicons name="arrow-back" size={18} color={C.textSecondary} />
                  <Text style={styles.ghostBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('context')}>
                  <Text style={styles.primaryBtnText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color={C.bg} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 3: Context & Flags */}
          {step === 'context' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Context & Clauses</Text>
              <Text style={styles.stepSubtitle}>Describe the agreement and select special clauses</Text>

              <Text style={styles.fieldLabel}>Agreement Context</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Briefly describe the purpose and key terms of this agreement…"
                placeholderTextColor={C.textMuted}
                value={context}
                onChangeText={setContext}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={styles.fieldLabel}>Special Clauses</Text>
              <View style={styles.flagGrid}>
                {TRIGGER_FLAGS.map(({ key, label, icon }) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.flagChip, flags.includes(key) && styles.flagChipActive]}
                    onPress={() => toggleFlag(key)}>
                    <Ionicons
                      name={icon as never}
                      size={14}
                      color={flags.includes(key) ? C.bg : C.textSecondary}
                    />
                    <Text style={[styles.flagText, flags.includes(key) && styles.flagTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.navRow}>
                <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('parties')}>
                  <Ionicons name="arrow-back" size={18} color={C.textSecondary} />
                  <Text style={styles.ghostBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleGenerateStructure}>
                  <Ionicons name="sparkles-outline" size={18} color={C.bg} />
                  <Text style={styles.primaryBtnText}>Plan Structure</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 4: Questions */}
          {step === 'questions' && structure && (
            <View style={styles.stepContent}>
              <View style={styles.structureHeader}>
                <View style={[GlassCard, styles.structureInfo]}>
                  <Text style={styles.structureTitle}>{structure.documentTitle}</Text>
                  <Text style={styles.structureMeta}>
                    {structure.sections.length} sections · ~{structure.estimatedClauses} clauses
                  </Text>
                </View>
              </View>

              <Text style={styles.stepTitle}>Finalise Details</Text>
              <Text style={styles.stepSubtitle}>Answer these questions to complete the draft</Text>

              {structure.questions.map((q) => (
                <View key={q.id} style={styles.questionBlock}>
                  <Text style={styles.questionText}>{q.question}</Text>
                  <TextInput
                    style={[styles.input, styles.questionInput]}
                    placeholder={q.placeholder}
                    placeholderTextColor={C.textMuted}
                    value={answers[q.id] ?? ''}
                    onChangeText={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                    multiline
                  />
                </View>
              ))}

              <TouchableOpacity style={[styles.primaryBtn, styles.draftBtn]} onPress={handleDraftDocument}>
                <Ionicons name="document-text-outline" size={20} color={C.bg} />
                <Text style={styles.primaryBtnText}>Draft Document</Text>
              </TouchableOpacity>
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
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 40,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  headerCenter: { alignItems: 'center', gap: 2 },
  wordmark: { fontSize: 11, fontWeight: '800', letterSpacing: 4, color: C.gold },
  featureName: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 0,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { borderColor: C.gold, backgroundColor: C.goldGlow },
  stepDotDone: { backgroundColor: C.gold, borderColor: C.gold },
  stepNum: { fontSize: 11, fontWeight: '700', color: C.textMuted },
  stepNumActive: { color: C.gold },
  stepLine: { width: 40, height: 1, backgroundColor: C.border },
  stepLineDone: { backgroundColor: C.gold },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(229,62,62,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(229,62,62,0.3)',
    borderRadius: Radius.button,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: C.highRisk },
  stepContent: { gap: 16 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: C.textPrimary },
  stepSubtitle: { fontSize: 14, color: C.textSecondary, marginTop: -8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.button,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  typeCardActive: { backgroundColor: C.goldGlow, borderColor: C.gold },
  typeText: { fontSize: 13, fontWeight: '500', color: C.textSecondary },
  typeTextActive: { color: C.gold, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary, letterSpacing: 0.5 },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.button,
    padding: 14,
    color: C.textPrimary,
    fontSize: 14,
  },
  textArea: { minHeight: 100, lineHeight: 22 },
  partyCard: { padding: 16, gap: 10 },
  partyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partyNum: { fontSize: 12, fontWeight: '700', color: C.gold, letterSpacing: 1 },
  typeToggleRow: { flexDirection: 'row', gap: 8 },
  typeToggle: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  typeToggleActive: { backgroundColor: C.goldGlow, borderColor: C.gold },
  typeToggleText: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },
  typeToggleTextActive: { color: C.gold, fontWeight: '700' },
  addPartyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.goldBorder,
    borderRadius: Radius.button,
    borderStyle: 'dashed',
  },
  addPartyText: { fontSize: 14, color: C.gold, fontWeight: '600' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  flagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  flagChipActive: { backgroundColor: C.gold, borderColor: C.gold },
  flagText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  flagTextActive: { color: C.bg },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.gold,
    paddingVertical: 16,
    borderRadius: Radius.button,
    shadowColor: C.gold,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: C.bg },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: C.border,
  },
  ghostBtnText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  structureHeader: { marginBottom: 4 },
  structureInfo: { padding: 16 },
  structureTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  structureMeta: { fontSize: 12, color: C.gold, marginTop: 4 },
  questionBlock: { gap: 8 },
  questionText: { fontSize: 14, fontWeight: '600', color: C.textPrimary, lineHeight: 20 },
  questionInput: { minHeight: 56 },
  draftBtn: { marginTop: 8 },
});
