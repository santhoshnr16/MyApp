import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
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

import { C, GlassCard, Radius, Serif } from '@/constants/colors';
import { clientAssist } from '@/services/clientAssistAI';
import type {
  AnswerFAQResponse,
  AssistContext,
  AssistHistoryItem,
  AssistResponse,
  EducationLevel,
  EscalateResponse,
  ExplainTermResponse,
  StatusExplainResponse,
  TaskType,
  TranslateDocResponse,
} from '@/types/clientAssist';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const TASK_OPTIONS: { key: TaskType; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; placeholder: string }[] = [
  { key: 'EXPLAIN_TERM',   label: 'Explain Term',     icon: 'book-outline',            placeholder: 'e.g. What does "injunction" mean?' },
  { key: 'ANSWER_FAQ',     label: 'Ask Question',     icon: 'help-circle-outline',     placeholder: 'e.g. Why is my court date being postponed?' },
  { key: 'TRANSLATE_DOC',  label: 'Translate Clause', icon: 'document-text-outline',   placeholder: 'Paste a clause from your document…' },
  { key: 'STATUS_EXPLAIN', label: 'Case Status',      icon: 'pulse-outline',           placeholder: 'Paste hearing notes or order text…' },
  { key: 'ESCALATE',       label: 'Ask Lawyer',       icon: 'person-outline',          placeholder: 'What would you like to ask your lawyer?' },
];

const SENTIMENT_COLOR = { good: C.lowRisk, bad: C.highRisk, neutral: C.textSecondary, depends: C.mediumRisk };

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, valueColor }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={cardStyles.infoRow}>
      <Ionicons name={icon} size={15} color={C.gold} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={cardStyles.infoLabel}>{label}</Text>
        <Text style={[cardStyles.infoValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
      </View>
    </View>
  );
}

function TagList({ items, color }: { items: string[]; color: string }) {
  if (!items.length) return null;
  return (
    <View style={cardStyles.tagList}>
      {items.map((item, i) => (
        <View key={i} style={[cardStyles.tag, { borderColor: `${color}55`, backgroundColor: `${color}12` }]}>
          <Text style={[cardStyles.tagText, { color }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function LawyerBox({ label, subject, body }: { label: string; subject?: string; body: string }) {
  return (
    <View style={cardStyles.lawyerBox}>
      <View style={cardStyles.lawyerBoxHeader}>
        <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.gold} />
        <Text style={cardStyles.lawyerBoxLabel}>{label}</Text>
      </View>
      {subject && <Text style={cardStyles.lawyerBoxSubject}>{subject}</Text>}
      <Text style={cardStyles.lawyerBoxText}>{body}</Text>
      <TouchableOpacity
        style={cardStyles.copyBtn}
        onPress={() => Share.share({ message: subject ? `${subject}\n\n${body}` : body })}>
        <Ionicons name="share-outline" size={13} color={C.elevated} />
        <Text style={cardStyles.copyBtnText}>Share</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Response Cards ───────────────────────────────────────────────────────────

function ExplainTermCard({ data }: { data: ExplainTermResponse }) {
  const sentColor = SENTIMENT_COLOR[data.sentiment] ?? C.gold;
  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.cardTitleRow}>
        <Text style={cardStyles.termTitle} numberOfLines={2}>{data.term}</Text>
        <View style={[cardStyles.badge, { backgroundColor: `${sentColor}18`, borderColor: `${sentColor}44` }]}>
          <Text style={[cardStyles.badgeText, { color: sentColor }]}>{data.sentiment.toUpperCase()}</Text>
        </View>
      </View>
      <View style={cardStyles.divider} />
      <InfoRow icon="bulb-outline"          label="Simple Meaning"      value={data.simpleDefinition} />
      <InfoRow icon="swap-horizontal-outline" label="Think Of It Like"  value={data.analogy} />
      {data.inYourCase  && <InfoRow icon="document-text-outline" label="In Your Case" value={data.inYourCase} />}
      <InfoRow icon="arrow-forward-circle-outline" label="What Happens Next" value={data.whatNext} />
      {data.relatedTerms?.length > 0 && (
        <View style={cardStyles.section}>
          <Text style={cardStyles.sectionLabel}>RELATED TERMS</Text>
          <TagList items={data.relatedTerms} color={C.gold} />
        </View>
      )}
      <LawyerBox label="ASK YOUR LAWYER" body={data.questionForLawyer} />
      <Text style={cardStyles.reassurance}>{data.reassurance}</Text>
    </View>
  );
}

function FAQCard({ data }: { data: AnswerFAQResponse }) {
  const confColor = data.confidence === 'high' ? C.lowRisk : data.confidence === 'low' ? C.mediumRisk : C.gold;
  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.cardTitleRow}>
        <Text style={cardStyles.faqQuestion} numberOfLines={3}>{data.question}</Text>
        <View style={[cardStyles.badge, { backgroundColor: `${confColor}18` }]}>
          <Text style={[cardStyles.badgeText, { color: confColor }]}>{data.confidence.toUpperCase()}</Text>
        </View>
      </View>
      {data.isCommon && data.isCommonNote && (
        <View style={cardStyles.infoStrip}>
          <Ionicons name="people-outline" size={13} color={C.gold} />
          <Text style={cardStyles.infoStripText}>{data.isCommonNote}</Text>
        </View>
      )}
      <View style={cardStyles.divider} />
      <Text style={cardStyles.answerText}>{data.answer}</Text>
      {data.inYourSituation && (
        <View style={cardStyles.situationBox}>
          <Text style={cardStyles.sectionLabel}>IN YOUR SITUATION</Text>
          <Text style={cardStyles.situationText}>{data.inYourSituation}</Text>
        </View>
      )}
      {data.limitation && (
        <Text style={cardStyles.limitationText}>{data.limitation}</Text>
      )}
      <LawyerBox label="FORWARD TO YOUR LAWYER" body={data.askLawyerThis} />
      <Text style={cardStyles.reassurance}>{data.reassurance}</Text>
    </View>
  );
}

function TranslateCard({ data }: { data: TranslateDocResponse }) {
  const goodness = data.isItGoodForYou === true ? C.lowRisk : data.isItGoodForYou === false ? C.highRisk : C.textSecondary;
  const goodnessText = data.isItGoodForYou === true ? 'Favourable' : data.isItGoodForYou === false ? 'Unfavourable' : 'Neutral';
  return (
    <View style={cardStyles.container}>
      {data.shouldBeWorried && (
        <View style={cardStyles.warningBanner}>
          <Ionicons name="alert-circle" size={16} color={C.highRisk} />
          <Text style={cardStyles.warningText}>{data.worryReason}</Text>
        </View>
      )}
      <View style={[cardStyles.badge, { backgroundColor: `${goodness}18`, borderColor: `${goodness}44`, alignSelf: 'flex-start' }]}>
        <Text style={[cardStyles.badgeText, { color: goodness }]}>{goodnessText}</Text>
      </View>
      <View style={cardStyles.originalBox}>
        <Text style={cardStyles.sectionLabel}>ORIGINAL</Text>
        <Text style={cardStyles.originalText}>{data.originalText}</Text>
      </View>
      <View style={cardStyles.translatedBox}>
        <Text style={[cardStyles.sectionLabel, { color: C.lowRisk }]}>PLAIN ENGLISH</Text>
        <Text style={cardStyles.translatedText}>{data.plainEnglish}</Text>
      </View>
      {data.yourRights?.length > 0 && (
        <View style={cardStyles.section}>
          <Text style={[cardStyles.sectionLabel, { color: C.lowRisk }]}>YOUR RIGHTS</Text>
          <TagList items={data.yourRights} color={C.lowRisk} />
        </View>
      )}
      {data.yourObligations?.length > 0 && (
        <View style={cardStyles.section}>
          <Text style={[cardStyles.sectionLabel, { color: C.mediumRisk }]}>OBLIGATIONS</Text>
          <TagList items={data.yourObligations} color={C.mediumRisk} />
        </View>
      )}
      {data.restrictions?.length > 0 && (
        <View style={cardStyles.section}>
          <Text style={[cardStyles.sectionLabel, { color: C.highRisk }]}>RESTRICTIONS</Text>
          <TagList items={data.restrictions} color={C.highRisk} />
        </View>
      )}
      <View style={cardStyles.keyPointBox}>
        <Text style={cardStyles.sectionLabel}>KEY TAKEAWAY</Text>
        <Text style={cardStyles.keyPointText}>{data.keyPoint}</Text>
      </View>
      {data.shouldBeWorried && (
        <LawyerBox label="ASK YOUR LAWYER" body={data.askLawyerThis} />
      )}
    </View>
  );
}

function StatusCard({ data }: { data: StatusExplainResponse }) {
  const healthColor = data.caseHealth === 'on track' ? C.lowRisk : data.caseHealth === 'concerning' ? C.highRisk : C.mediumRisk;
  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.cardTitleRow}>
        <View style={{ flex: 1 }}>
          <Text style={cardStyles.sectionLabel}>STAGE {data.stageNumber} OF 10</Text>
          <Text style={cardStyles.stageName}>{data.currentStage}</Text>
        </View>
        <View style={[cardStyles.badge, { backgroundColor: `${healthColor}18`, borderColor: `${healthColor}44` }]}>
          <Text style={[cardStyles.badgeText, { color: healthColor }]}>{data.caseHealth.toUpperCase()}</Text>
        </View>
      </View>
      <View style={cardStyles.progressBar}>
        <View style={[cardStyles.progressFill, { width: `${data.stageNumber * 10}%` as `${number}%`, backgroundColor: healthColor }]} />
      </View>
      <View style={cardStyles.divider} />
      <InfoRow icon="calendar-outline"         label="What Happened"       value={data.whatHappened} />
      <InfoRow icon="arrow-forward-circle-outline" label="What Comes Next" value={data.whatComesNext} />
      <InfoRow icon="time-outline"             label="Est. Timeline"       value={data.estimatedTimeline} />
      {data.doesClientNeedToDo && data.clientAction && (
        <View style={cardStyles.actionBox}>
          <Ionicons name="alert-circle-outline" size={16} color={C.gold} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={cardStyles.sectionLabel}>
              ACTION REQUIRED{data.clientActionDeadline ? ` · ${data.clientActionDeadline}` : ''}
            </Text>
            <Text style={cardStyles.actionText}>{data.clientAction}</Text>
          </View>
        </View>
      )}
      <Text style={cardStyles.reassurance}>{data.reassurance}</Text>
    </View>
  );
}

function EscalateCard({ data }: { data: EscalateResponse }) {
  const urgColor = data.urgency === 'urgent' ? C.highRisk : data.urgency === 'soon' ? C.mediumRisk : C.textMuted;
  return (
    <View style={cardStyles.container}>
      <Text style={cardStyles.acknowledgement}>{data.acknowledgement}</Text>
      <View style={cardStyles.divider} />
      <InfoRow icon="information-circle-outline" label="General Background" value={data.generalAnswer} />
      <Text style={cardStyles.limitationText}>{data.whyCannotAnswerFully}</Text>
      <View style={[cardStyles.urgencyRow, { borderColor: `${urgColor}44`, backgroundColor: `${urgColor}0D` }]}>
        <View style={[cardStyles.urgencyDot, { backgroundColor: urgColor }]} />
        <Text style={[cardStyles.urgencyLabel, { color: urgColor }]}>{data.urgency.toUpperCase()}</Text>
        {data.urgencyReason && <Text style={cardStyles.urgencyReason} numberOfLines={2}>{data.urgencyReason}</Text>}
      </View>
      <LawyerBox label="SEND THIS TO YOUR LAWYER" subject={data.lawyerMessageSubject} body={data.lawyerMessageBody} />
      <Text style={cardStyles.reassurance}>{data.reassurance}</Text>
    </View>
  );
}

function ResponseCard({ response }: { response: AssistResponse }) {
  switch (response.taskType) {
    case 'EXPLAIN_TERM':   return <ExplainTermCard data={response.data as ExplainTermResponse} />;
    case 'ANSWER_FAQ':     return <FAQCard data={response.data as AnswerFAQResponse} />;
    case 'TRANSLATE_DOC':  return <TranslateCard data={response.data as TranslateDocResponse} />;
    case 'STATUS_EXPLAIN': return <StatusCard data={response.data as StatusExplainResponse} />;
    case 'ESCALATE':       return <EscalateCard data={response.data as EscalateResponse} />;
    default:
      return (
        <View style={cardStyles.container}>
          <Text style={{ color: C.textPrimary, fontSize: 14 }}>
            {(response.data as { response?: string })?.response ?? 'Processed'}
          </Text>
        </View>
      );
  }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ClientAssistScreen() {
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const router = useRouter();

  const [taskType, setTaskType] = useState<TaskType>('EXPLAIN_TERM');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AssistHistoryItem[]>([]);
  const [showContext, setShowContext] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const [ctx, setCtx] = useState<AssistContext>({
    clientName: '',
    lawyerName: '',
    caseType: '',
    caseSummary: '',
    preferredLanguage: 'English',
    educationLevel: 'intermediate',
  });

  const activeTask = TASK_OPTIONS.find((t) => t.key === taskType) ?? TASK_OPTIONS[0];

  async function handleSubmit() {
    if (!input.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const response = await clientAssist(taskType, input.trim(), ctx, documentId);
      const item: AssistHistoryItem = {
        id: generateId(),
        taskType,
        input: input.trim(),
        response,
        sources: response.sources,
        timestamp: new Date().toISOString(),
      };
      setHistory((prev) => [item, ...prev]);
      setInput('');
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
    } catch (err) {
      setError((err as Error).message ?? 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Client Assist</Text>
          <Text style={styles.headerSub}>AI LEGAL EXPLAINER</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, showContext && styles.iconBtnActive]}
          onPress={() => setShowContext((v) => !v)}>
          <Ionicons name="person-outline" size={19} color={showContext ? C.gold : C.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Context panel */}
      {showContext && (
        <View style={[GlassCard, styles.contextPanel]}>
          <Text style={styles.sectionLabel}>YOUR DETAILS</Text>
          <View style={styles.contextGrid}>
            {([
              { key: 'clientName',        label: 'Your Name',    ph: 'e.g. Ramesh Kumar' },
              { key: 'lawyerName',        label: "Lawyer's Name", ph: 'e.g. Adv. Sharma' },
              { key: 'caseType',          label: 'Case Type',    ph: 'e.g. Property dispute' },
              { key: 'preferredLanguage', label: 'Language',     ph: 'English / Hindi / Tamil' },
            ] as const).map(({ key, label, ph }) => (
              <View key={key} style={styles.contextField}>
                <Text style={styles.contextLabel}>{label}</Text>
                <TextInput
                  style={styles.contextInput}
                  placeholder={ph}
                  placeholderTextColor={C.textMuted}
                  value={ctx[key] as string}
                  onChangeText={(v) => setCtx((prev) => ({ ...prev, [key]: v }))}
                />
              </View>
            ))}
          </View>
          <View style={styles.eduRow}>
            {(['basic', 'intermediate', 'educated'] as EducationLevel[]).map((lvl) => (
              <TouchableOpacity
                key={lvl}
                style={[styles.eduChip, ctx.educationLevel === lvl && styles.eduChipActive]}
                onPress={() => setCtx((prev) => ({ ...prev, educationLevel: lvl }))}>
                <Text style={[styles.eduChipText, ctx.educationLevel === lvl && styles.eduChipTextActive]}>
                  {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Task chips */}
      <View style={styles.taskSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.taskScroll}>
          {TASK_OPTIONS.map((opt) => {
            const active = taskType === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.taskChip, active && styles.taskChipActive]}
                onPress={() => setTaskType(opt.key)}>
                <Ionicons name={opt.icon} size={13} color={active ? C.gold : C.textMuted} />
                <Text style={[styles.taskChipText, active && styles.taskChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={15} color={C.highRisk} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={C.gold} size="small" />
            <Text style={styles.loadingText}>Consulting legal knowledge…</Text>
          </View>
        )}

        {history.map((item) => (
          <View key={item.id} style={styles.historyItem}>
            {/* Question block */}
            <View style={styles.questionBlock}>
              <View style={styles.questionMeta}>
                <View style={styles.taskTypePill}>
                  <Text style={styles.taskTypePillText}>{item.taskType.replace(/_/g, ' ')}</Text>
                </View>
                <Text style={styles.questionTime}>
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={styles.questionText}>{item.input}</Text>
            </View>
            <ResponseCard response={item.response} />
            {item.sources && item.sources.length > 0 && (
              <View style={cardStyles.ragSourceBox}>
                <View style={cardStyles.ragSourceHeader}>
                  <Ionicons name="document-text-outline" size={13} color={C.gold} />
                  <Text style={cardStyles.ragSourceTitle}>RAG RETRIEVED PDF CONTEXT</Text>
                </View>
                {item.sources.map((src, i) => (
                  <Text key={i} style={cardStyles.ragSourceText}>• {src}</Text>
                ))}
              </View>
            )}
          </View>
        ))}

        {history.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={C.gold} />
            </View>
            <Text style={styles.emptyTitle}>Ask anything about your case</Text>
            <Text style={styles.emptySub}>Legal terms explained in plain language</Text>
            <View style={styles.emptyHints}>
              {TASK_OPTIONS.slice(0, 3).map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.emptyHintChip}
                  onPress={() => setTaskType(opt.key)}>
                  <Ionicons name={opt.icon} size={12} color={C.gold} />
                  <Text style={styles.emptyHintText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputArea}>
          <View style={styles.activeTaskRow}>
            <Ionicons name={activeTask.icon} size={12} color={C.gold} />
            <Text style={styles.activeTaskLabel}>{activeTask.label}</Text>
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={activeTask.placeholder}
              placeholderTextColor={C.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={handleSubmit}
              disabled={!input.trim() || loading}>
              {loading
                ? <ActivityIndicator size="small" color={C.elevated} />
                : <Ionicons name="arrow-up" size={18} color={C.elevated} />}
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>AI explanation only — not legal advice</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  iconBtnActive: { backgroundColor: C.goldSoft, borderColor: C.goldBorder },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { fontFamily: Serif, fontSize: 17, color: C.ink },
  headerSub: { fontSize: 8, fontWeight: '700', letterSpacing: 2.5, color: C.gold },

  contextPanel: { marginHorizontal: 14, marginTop: 10, padding: 14, gap: 10 },
  sectionLabel: { fontSize: 9, fontWeight: '800', color: C.gold, letterSpacing: 2 },
  contextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  contextField: { width: '47%', gap: 4 },
  contextLabel: { fontSize: 10, fontWeight: '600', color: C.textSecondary },
  contextInput: {
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    borderRadius: Radius.button, paddingHorizontal: 10, paddingVertical: 8,
    color: C.textPrimary, fontSize: 12,
  },
  eduRow: { flexDirection: 'row', gap: 8 },
  eduChip: {
    flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: Radius.pill,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  eduChipActive: { backgroundColor: C.goldSoft, borderColor: C.goldBorder },
  eduChipText: { fontSize: 11, fontWeight: '600', color: C.textMuted },
  eduChipTextActive: { color: C.gold, fontWeight: '700' },

  taskSection: {
    borderBottomWidth: 1, borderBottomColor: C.border,
    paddingVertical: 2,
  },
  taskScroll: { paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  taskChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: Radius.pill, backgroundColor: C.elevated,
    borderWidth: 1, borderColor: C.borderSubtle,
  },
  taskChipActive: { backgroundColor: C.goldSoft, borderColor: C.goldBorder },
  taskChipText: { fontSize: 12, fontWeight: '500', color: C.textMuted },
  taskChipTextActive: { color: C.gold, fontWeight: '700' },

  scroll: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 20 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(184,50,50,0.08)', borderWidth: 1,
    borderColor: 'rgba(184,50,50,0.2)', borderRadius: Radius.button,
    padding: 12, marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 12, color: C.highRisk },

  loadingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: Radius.button,
    padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.border,
  },
  loadingText: { fontSize: 13, color: C.textSecondary },

  historyItem: { marginBottom: 22, gap: 8 },
  questionBlock: {
    backgroundColor: C.surface, borderRadius: Radius.card,
    padding: 14, gap: 8, borderWidth: 1, borderColor: C.border,
    borderLeftWidth: 3, borderLeftColor: C.gold,
  },
  questionMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  taskTypePill: {
    backgroundColor: C.goldSoft, borderRadius: Radius.pill,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.goldBorder,
  },
  taskTypePillText: { fontSize: 9, fontWeight: '800', color: C.gold, letterSpacing: 1 },
  questionTime: { fontSize: 10, color: C.textMuted },
  questionText: { fontSize: 14, fontWeight: '500', color: C.textPrimary, lineHeight: 20 },

  emptyState: { alignItems: 'center', paddingVertical: 56, gap: 10 },
  emptyIconBox: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.goldBorder, marginBottom: 4,
  },
  emptyTitle: { fontFamily: Serif, fontSize: 17, color: C.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: 12, color: C.textMuted, textAlign: 'center' },
  emptyHints: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  emptyHintChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.pill, backgroundColor: C.elevated,
    borderWidth: 1, borderColor: C.border,
  },
  emptyHintText: { fontSize: 11, fontWeight: '600', color: C.textSecondary },

  inputArea: {
    borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6,
    gap: 6,
  },
  activeTaskRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  activeTaskLabel: { fontSize: 10, fontWeight: '700', color: C.gold, letterSpacing: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    color: C.textPrimary, fontSize: 14, maxHeight: 90, lineHeight: 20,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: C.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: C.border },
  disclaimer: { fontSize: 10, color: C.textMuted, textAlign: 'center', paddingBottom: 2 },
});

const cardStyles = StyleSheet.create({
  container: { ...GlassCard, padding: 16, gap: 12 },

  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  termTitle: { fontFamily: Serif, fontSize: 19, color: C.ink, flex: 1, lineHeight: 24 },
  faqQuestion: { fontSize: 15, fontWeight: '600', color: C.textPrimary, flex: 1, lineHeight: 22 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 1, borderColor: 'transparent' },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  divider: { height: 1, backgroundColor: C.borderSubtle },

  infoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoLabel: { fontSize: 9, fontWeight: '700', color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  infoValue: { fontSize: 13, color: C.bodyText, lineHeight: 19 },

  infoStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.goldSoft, borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: C.goldBorder,
  },
  infoStripText: { fontSize: 12, color: C.gold, fontStyle: 'italic', flex: 1 },

  section: { gap: 6 },
  sectionLabel: { fontSize: 9, fontWeight: '800', color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 1 },
  tagText: { fontSize: 11, fontWeight: '600' },

  lawyerBox: {
    backgroundColor: C.elevated, borderRadius: Radius.button,
    padding: 12, gap: 8, borderLeftWidth: 3, borderLeftColor: C.gold,
    borderWidth: 1, borderColor: C.border,
  },
  lawyerBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lawyerBoxLabel: { fontSize: 9, fontWeight: '800', color: C.gold, letterSpacing: 1.5 },
  lawyerBoxSubject: { fontSize: 12, fontWeight: '700', color: C.textSecondary },
  lawyerBoxText: { fontSize: 13, color: C.textPrimary, lineHeight: 19 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: C.ink, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill,
  },
  copyBtnText: { fontSize: 11, fontWeight: '700', color: C.elevated },

  reassurance: { fontSize: 12, color: C.lowRisk, fontStyle: 'italic', textAlign: 'center', lineHeight: 18 },

  answerText: { fontSize: 14, color: C.bodyText, lineHeight: 22 },
  situationBox: { backgroundColor: C.elevated, borderRadius: Radius.button, padding: 12, gap: 6, borderWidth: 1, borderColor: C.border },
  situationText: { fontSize: 13, color: C.bodyText, lineHeight: 19 },
  limitationText: { fontSize: 12, color: C.textMuted, fontStyle: 'italic', lineHeight: 18 },

  warningBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(184,50,50,0.08)', borderWidth: 1,
    borderColor: 'rgba(184,50,50,0.2)', borderRadius: Radius.button, padding: 12,
  },
  warningText: { flex: 1, fontSize: 13, color: C.highRisk, lineHeight: 18 },

  originalBox: { backgroundColor: C.surface, borderRadius: 10, padding: 12, gap: 5, borderWidth: 1, borderColor: C.border },
  originalText: { fontSize: 12, color: C.legalText, lineHeight: 18, fontStyle: 'italic' },
  translatedBox: {
    backgroundColor: C.elevated, borderRadius: 10, padding: 12, gap: 5,
    borderLeftWidth: 3, borderLeftColor: C.lowRisk, borderWidth: 1, borderColor: C.border,
  },
  translatedText: { fontSize: 13, color: C.textPrimary, lineHeight: 21 },
  keyPointBox: {
    backgroundColor: C.goldSoft, borderRadius: 10, padding: 12, gap: 5,
    borderWidth: 1, borderColor: C.goldBorder,
  },
  keyPointText: { fontSize: 13, color: C.ink, fontWeight: '600', lineHeight: 19 },

  stageName: { fontFamily: Serif, fontSize: 16, color: C.textPrimary, marginTop: 3 },
  progressBar: {
    height: 5, backgroundColor: C.borderSubtle, borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  actionBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: C.goldSoft, borderRadius: Radius.button, padding: 12,
    borderWidth: 1, borderColor: C.goldBorder,
  },
  actionText: { fontSize: 13, color: C.textPrimary, lineHeight: 19 },

  acknowledgement: { fontSize: 14, color: C.textPrimary, lineHeight: 22, fontWeight: '500' },
  urgencyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: Radius.button, padding: 10,
  },
  urgencyDot: { width: 7, height: 7, borderRadius: 3.5 },
  urgencyLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  urgencyReason: { flex: 1, fontSize: 12, color: C.textSecondary, lineHeight: 16 },

  ragSourceBox: {
    backgroundColor: C.surface,
    borderRadius: Radius.card,
    padding: 12,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  ragSourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ragSourceTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: 1.2,
  },
  ragSourceText: {
    fontSize: 11,
    color: C.textSecondary,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
