import { Ionicons } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, GlassCard, Radius, Serif } from '@/constants/colors';
import { useDocumentContext } from '@/context/document-context';
import { getSummary } from '@/services/legalAI';
import type { DocumentAnalysis, RiskLevel } from '@/types/document';

const TABS = ['Summary', 'Key Points', 'Risks', 'Obligations'] as const;
type Tab = (typeof TABS)[number];

const mapRiskLevel = (score?: number): RiskLevel => {
  if (typeof score !== 'number') return 'medium';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

const RISK_COLOR: Record<RiskLevel, string> = {
  high: C.highRisk,
  medium: C.mediumRisk,
  low: C.lowRisk,
};

const IMPORTANCE_COLOR: Record<string, string> = {
  critical: C.highRisk,
  important: C.gold,
  note: C.textSecondary,
};

export default function SummaryScreen() {
  const router = useRouter();
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const { state, dispatch } = useDocumentContext();
  const activeDocumentId = typeof documentId === 'string' ? documentId : '';
  const [activeTab, setActiveTab] = useState<Tab>('Summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const document = activeDocumentId ? state.documents[activeDocumentId] : undefined;

  useEffect(() => {
    if (!activeDocumentId) return;
    if (document?.analysis) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const summary = await getSummary(activeDocumentId);
        const analysis: DocumentAnalysis = {
          summary: summary.summary,
          keyPoints: summary.keyPoints,
          risks: summary.risks,
          obligations: summary.obligations,
          riskScore: summary.riskScore,
          documentType: summary.documentType,
        };
        dispatch({ type: 'SET_DOCUMENT_ANALYSIS', payload: { documentId: activeDocumentId, analysis } });
      } catch {
        setError('Unable to load summary. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dispatch, document?.analysis, activeDocumentId]);

  if (!activeDocumentId) return null;

  const analysis = document?.analysis;
  const riskLevel = mapRiskLevel(analysis?.riskScore);
  const riskColor = RISK_COLOR[riskLevel];

  const handleShare = async () => {
    if (!analysis?.summary) return;
    await Share.share({ message: `${document?.filename ?? 'Document'}\n\n${analysis.summary}` });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {document?.filename ?? 'Document Summary'}
          </Text>
          <Text style={styles.headerSub}>AI LEGAL SUMMARY</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={C.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero Card */}
        <View style={[GlassCard, styles.heroCard]}>
          <View style={styles.heroTop}>
            {analysis?.documentType && (
              <View style={styles.docTypeBadge}>
                <Text style={styles.docTypeBadgeText}>
                  {analysis.documentType.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.riskGauge, { borderColor: riskColor }]}>
              <Text style={[styles.riskGaugeNumber, { color: riskColor }]}>
                {analysis?.riskScore ?? '--'}
              </Text>
              <Text style={styles.riskGaugeLabel}>RISK</Text>
            </View>
          </View>
          {analysis?.summary && (
            <Text style={styles.heroSummary} numberOfLines={2}>{analysis.summary}</Text>
          )}
        </View>

        {/* Action Grid — 2×2 */}
        <View style={styles.actionGrid}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnHalf]} onPress={handleShare}>
            <Ionicons name="copy-outline" size={15} color={C.textSecondary} />
            <Text style={styles.actionBtnText}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnHalf, styles.actionBtnGold]}
            onPress={() => router.push({ pathname: '/moot/[documentId]', params: { documentId: activeDocumentId } } as unknown as Href)}>
            <Ionicons name="scale-outline" size={15} color={C.elevated} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextGold]}>Start Moot</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnHalf]}
            onPress={() => router.push({ pathname: '/negotiate/[documentId]', params: { documentId: activeDocumentId } } as unknown as Href)}>
            <Ionicons name="briefcase-outline" size={15} color={C.textSecondary} />
            <Text style={styles.actionBtnText}>Negotiate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnHalf]}
            onPress={() => router.push({ pathname: '/assist/[documentId]', params: { documentId: activeDocumentId } } as unknown as Href)}>
            <Ionicons name="chatbubble-outline" size={15} color={C.textSecondary} />
            <Text style={styles.actionBtnText}>Explain</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                style={styles.tabBtn}
                onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab}</Text>
                {active && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Loading / Error */}
        {loading && (
          <View style={[GlassCard, styles.stateCard]}>
            <Text style={styles.stateText}>Loading summary...</Text>
          </View>
        )}
        {error && (
          <View style={[GlassCard, styles.stateCard]}>
            <Text style={[styles.stateText, { color: C.highRisk }]}>{error}</Text>
          </View>
        )}

        {/* Summary Tab */}
        {!loading && analysis && activeTab === 'Summary' && (
          <View style={styles.tabContent}>
            <View style={[GlassCard, styles.contentCard]}>
              <Text style={styles.contentTitle}>AI Summary</Text>
              <Text style={styles.contentBody}>{analysis.summary}</Text>
            </View>
          </View>
        )}

        {/* Key Points Tab */}
        {!loading && analysis && activeTab === 'Key Points' && (
          <View style={styles.tabContent}>
            {analysis.keyPoints.map((point, i) => (
              <View key={point.id} style={[GlassCard, styles.contentCard]}>
                <View style={styles.keyPointRow}>
                  <View
                    style={[
                      styles.importanceDot,
                      { backgroundColor: IMPORTANCE_COLOR[point.importance] ?? C.textMuted },
                    ]}
                  />
                  <Text style={styles.keyPointNum}>{String(i + 1).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.keyPointText}>{point.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Risks Tab */}
        {!loading && analysis && activeTab === 'Risks' && (
          <View style={styles.tabContent}>
            {analysis.risks.map((risk) => {
              const rc = RISK_COLOR[risk.level];
              return (
                <View key={risk.id} style={[GlassCard, styles.contentCard, styles.riskCard]}>
                  <View style={[styles.riskLeftBorder, { backgroundColor: rc }]} />
                  <View style={styles.riskCardInner}>
                    <View style={styles.riskCardTop}>
                      <Text style={styles.riskTitle}>{risk.title}</Text>
                      <View style={[styles.riskLevelBadge, { borderColor: rc }]}>
                        <Text style={[styles.riskLevelText, { color: rc }]}>
                          {risk.level.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.riskDesc}>{risk.description}</Text>
                    {risk.recommendation && (
                      <View style={styles.riskRec}>
                        <Ionicons name="bulb-outline" size={14} color={C.gold} />
                        <Text style={styles.riskRecText}>{risk.recommendation}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Obligations Tab */}
        {!loading && analysis && activeTab === 'Obligations' && (
          <View style={styles.tabContent}>
            {analysis.obligations.map((ob) => {
              const urgencyColor =
                ob.urgency === 'high'
                  ? C.highRisk
                  : ob.urgency === 'medium'
                  ? C.mediumRisk
                  : C.textMuted;
              return (
                <View key={ob.id} style={[GlassCard, styles.contentCard]}>
                  <View style={styles.obligationRow}>
                    <View style={[styles.obCheckbox, { borderColor: urgencyColor }]}>
                      <Ionicons name="checkmark" size={10} color={urgencyColor} />
                    </View>
                    <View style={styles.obText}>
                      <Text style={styles.obAction}>{ob.action}</Text>
                      {ob.deadline && (
                        <View style={styles.obDeadlineRow}>
                          <Ionicons name="calendar-outline" size={12} color={urgencyColor} />
                          <Text style={[styles.obDeadline, { color: urgencyColor }]}>
                            Deadline: {ob.deadline}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB — Start Moot */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: '/moot/[documentId]',
            params: { documentId },
          } as unknown as Href)
        }>
        <Ionicons name="scale" size={20} color={C.bg} />
        <Text style={styles.fabText}>Moot</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  headerCenter: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
    fontFamily: Serif,
  },
  headerSub: {
    fontSize: 9,
    color: C.gold,
    fontWeight: '700',
    letterSpacing: 2,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 14,
    paddingTop: 14,
  },
  heroCard: {
    gap: 12,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docTypeBadge: {
    backgroundColor: C.goldGlow,
    borderWidth: 1,
    borderColor: C.goldBorder,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  docTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.gold,
  },
  riskGauge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  riskGaugeNumber: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  riskGaugeLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1,
  },
  heroSummary: {
    fontSize: 13,
    color: C.bodyText,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.button,
    paddingVertical: 13,
    backgroundColor: C.surface,
  },
  actionBtnHalf: {
    flex: 1,
    minWidth: '45%',
  },
  actionBtnGold: {
    borderColor: C.ink,
    backgroundColor: C.ink,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
  },
  actionBtnTextGold: {
    color: C.elevated,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textMuted,
  },
  tabTextActive: {
    color: C.textPrimary,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: '60%',
    backgroundColor: C.gold,
    borderRadius: 1,
  },
  stateCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  stateText: {
    fontSize: 13,
    color: C.textMuted,
  },
  tabContent: {
    gap: 10,
  },
  contentCard: {
    gap: 8,
  },
  contentTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.gold,
    textTransform: 'uppercase',
  },
  contentBody: {
    fontSize: 14,
    color: C.bodyText,
    lineHeight: 22,
  },
  keyPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  importanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  keyPointNum: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1,
  },
  keyPointText: {
    fontSize: 14,
    color: C.bodyText,
    lineHeight: 21,
  },
  riskCard: {
    padding: 0,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  riskLeftBorder: {
    width: 3,
    borderTopLeftRadius: Radius.card,
    borderBottomLeftRadius: Radius.card,
  },
  riskCardInner: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  riskCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  riskTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  riskLevelBadge: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  riskLevelText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  riskDesc: {
    fontSize: 13,
    color: C.bodyText,
    lineHeight: 20,
  },
  riskRec: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    backgroundColor: C.goldGlow,
    borderRadius: 8,
    padding: 8,
  },
  riskRecText: {
    flex: 1,
    fontSize: 12,
    color: C.gold,
    lineHeight: 18,
  },
  obligationRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  obCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  obText: {
    flex: 1,
    gap: 6,
  },
  obAction: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
    lineHeight: 20,
  },
  obDeadlineRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  obDeadline: {
    fontSize: 12,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.gold,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    shadowColor: C.gold,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.bg,
  },
});
