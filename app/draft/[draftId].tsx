import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, GlassCard, Radius, RiskLevelColors } from '@/constants/colors';
import { exportContractToDocx } from '@/services/docxExporter';
import { loadDraft } from '@/storage/draftStorage';
import type { DraftRecord, ComplianceIssue, DraftRisk } from '@/types/draft';

type ViewTab = 'document' | 'compliance' | 'risk';

const COMPLIANCE_STATUS_COLOR: Record<string, string> = {
  compliant: C.lowRisk,
  partial: C.mediumRisk,
  review_needed: C.highRisk,
};

const COMPLIANCE_STATUS_LABEL: Record<string, string> = {
  compliant: 'Compliant',
  partial: 'Partial',
  review_needed: 'Review Needed',
};

function RiskScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? C.highRisk : score >= 40 ? C.mediumRisk : C.lowRisk;
  return (
    <View style={[styles.riskRing, { borderColor: color }]}>
      <Text style={[styles.riskRingScore, { color }]}>{score}</Text>
      <Text style={styles.riskRingLabel}>RISK</Text>
    </View>
  );
}

function IssueItem({ issue }: { issue: ComplianceIssue }) {
  const color = RiskLevelColors[issue.severity];
  return (
    <View style={[styles.issueItem, { borderLeftColor: color }]}>
      <View style={[styles.issueBadge, { backgroundColor: `${color}22` }]}>
        <Text style={[styles.issueBadgeText, { color }]}>{issue.severity.toUpperCase()}</Text>
      </View>
      <Text style={styles.issueText}>{issue.description}</Text>
    </View>
  );
}

function RiskItem({ risk }: { risk: DraftRisk }) {
  const color = RiskLevelColors[risk.level];
  return (
    <View style={[GlassCard, styles.riskItem]}>
      <View style={styles.riskItemHeader}>
        <Text style={styles.riskItemTitle}>{risk.title}</Text>
        <View style={[styles.riskBadge, { backgroundColor: `${color}22`, borderColor: `${color}44` }]}>
          <Text style={[styles.riskBadgeText, { color }]}>{risk.level.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.riskDesc}>{risk.description}</Text>
      <View style={styles.mitigationBlock}>
        <Ionicons name="shield-checkmark-outline" size={14} color={C.lowRisk} />
        <Text style={styles.mitigationText}>{risk.mitigation}</Text>
      </View>
    </View>
  );
}

export default function DraftViewerScreen() {
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  const router = useRouter();

  const [draft, setDraft] = useState<DraftRecord | null>(null);
  const [tab, setTab] = useState<ViewTab>('document');
  const [tabBarWidth, setTabBarWidth] = useState(360);
  const [isExporting, setIsExporting] = useState(false);
  const tabIndicator = useRef(new Animated.Value(0)).current;

  const TAB_NAMES: ViewTab[] = ['document', 'compliance', 'risk'];
  const TAB_LABELS = ['Document', 'Compliance', 'Risk'];
  const TAB_ICONS = ['document-text-outline', 'checkmark-circle-outline', 'warning-outline'] as const;

  useEffect(() => {
    if (draftId) {
      loadDraft(draftId).then((d) => { if (d) setDraft(d); });
    }
  }, [draftId]);

  function switchTab(newTab: ViewTab) {
    const idx = TAB_NAMES.indexOf(newTab);
    Animated.spring(tabIndicator, {
      toValue: idx,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
    setTab(newTab);
  }

  async function handleShareText() {
    if (!draft) return;
    await Share.share({
      message: draft.documentText,
      title: draft.structure.documentTitle || draft.details.title,
    });
  }

  async function handleDownloadWordDoc() {
    if (!draft) return;
    setIsExporting(true);
    try {
      const docTitle = draft.structure.documentTitle || draft.details.title || 'Contract_Document';
      await exportContractToDocx(docTitle, draft.documentText);
    } catch (err) {
      Alert.alert('Export Failed', (err as Error).message ?? 'Could not generate Word document');
    } finally {
      setIsExporting(false);
    }
  }

  if (!draft) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={40} color={C.textMuted} />
          <Text style={styles.emptyText}>Loading draft…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tabW = tabBarWidth / 3;
  const tabTranslateX = tabIndicator.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, tabW, tabW * 2],
  });

  const overallCompliance = draft.complianceReport.overallCompliance;
  const complianceColor = COMPLIANCE_STATUS_COLOR[overallCompliance] ?? C.textSecondary;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.wordmark}>LEXAI</Text>
          <Text style={styles.docTitle} numberOfLines={1}>
            {draft.structure.documentTitle || draft.details.title}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDownloadWordDoc} style={styles.backBtn} disabled={isExporting}>
          {isExporting ? (
            <ActivityIndicator size="small" color={C.gold} />
          ) : (
            <Ionicons name="download-outline" size={20} color={C.gold} />
          )}
        </TouchableOpacity>
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        <View style={styles.metaBadge}>
          <Text style={styles.metaBadgeText}>{draft.details.documentType}</Text>
        </View>
        <View style={[styles.metaBadge, { borderColor: `${complianceColor}44`, backgroundColor: `${complianceColor}11` }]}>
          <Text style={[styles.metaBadgeText, { color: complianceColor }]}>
            {COMPLIANCE_STATUS_LABEL[overallCompliance]}
          </Text>
        </View>
        <Text style={styles.metaDate}>
          {new Date(draft.createdAt).toLocaleDateString()}
        </Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar} onLayout={(e) => setTabBarWidth(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.tabIndicator, { transform: [{ translateX: tabTranslateX }] }]} />
        {TAB_NAMES.map((t, i) => (
          <TouchableOpacity
            key={t}
            style={styles.tabItem}
            onPress={() => switchTab(t)}>
            <Ionicons
              name={TAB_ICONS[i]}
              size={16}
              color={tab === t ? C.gold : C.textMuted}
            />
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {TAB_LABELS[i]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>

        {/* Document tab */}
        {tab === 'document' && (
          <View style={styles.documentContainer}>
            <TouchableOpacity
              style={styles.downloadDocxBtn}
              onPress={handleDownloadWordDoc}
              disabled={isExporting}
              activeOpacity={0.8}>
              {isExporting ? (
                <ActivityIndicator color={C.bg} size="small" />
              ) : (
                <>
                  <Ionicons name="document-text" size={18} color={C.bg} />
                  <Text style={styles.downloadDocxBtnText}>Download & Share Word Document (.docx)</Text>
                  <Ionicons name="share-outline" size={18} color={C.bg} />
                </>
              )}
            </TouchableOpacity>

            <View style={[GlassCard, styles.documentCard]}>
              <Text style={styles.documentText}>{draft.documentText}</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.shareTextBtn} onPress={handleShareText}>
                <Ionicons name="copy-outline" size={16} color={C.textPrimary} />
                <Text style={styles.shareTextBtnText}>Share Raw Text</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.disclaimer}>
              <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
              <Text style={styles.disclaimerText}>
                AI-generated draft. Review with a qualified lawyer before use.
              </Text>
            </View>
          </View>
        )}

        {/* Compliance tab */}
        {tab === 'compliance' && (
          <View style={styles.tabContent}>
            <View style={[GlassCard, styles.complianceSummary]}>
              <View style={styles.complianceSummaryLeft}>
                <Text style={styles.complianceSummaryLabel}>Overall Status</Text>
                <Text style={[styles.complianceSummaryValue, { color: complianceColor }]}>
                  {COMPLIANCE_STATUS_LABEL[overallCompliance]}
                </Text>
              </View>
              <Ionicons
                name={overallCompliance === 'compliant' ? 'checkmark-circle' : 'alert-circle'}
                size={32}
                color={complianceColor}
              />
            </View>

            {draft.complianceReport.acts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Applicable Acts</Text>
                {draft.complianceReport.acts.map((act, i) => (
                  <View key={i} style={[GlassCard, styles.actCard]}>
                    <Text style={styles.actName}>{act.name}</Text>
                    <Text style={styles.actApplicability}>{act.applicability}</Text>
                  </View>
                ))}
              </View>
            )}

            {draft.complianceReport.issues.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Issues Found</Text>
                {draft.complianceReport.issues.map((issue, i) => (
                  <IssueItem key={i} issue={issue} />
                ))}
              </View>
            )}

            {draft.complianceReport.issues.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={36} color={C.lowRisk} />
                <Text style={styles.emptyStateText}>No compliance issues found</Text>
              </View>
            )}
          </View>
        )}

        {/* Risk tab */}
        {tab === 'risk' && (
          <View style={styles.tabContent}>
            <View style={[GlassCard, styles.riskSummaryCard]}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.riskSummaryLabel}>Overall Risk Score</Text>
                <Text style={styles.riskRecommendation}>
                  {draft.riskAnalysis.recommendation}
                </Text>
              </View>
              <RiskScoreRing score={draft.riskAnalysis.overallRisk} />
            </View>

            {draft.riskAnalysis.risks.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Risk Factors</Text>
                {draft.riskAnalysis.risks.map((risk, i) => (
                  <RiskItem key={i} risk={risk} />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="shield-checkmark-outline" size={36} color={C.lowRisk} />
                <Text style={styles.emptyStateText}>No significant risks identified</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: C.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
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
  headerCenter: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 12 },
  wordmark: { fontSize: 10, fontWeight: '800', letterSpacing: 3, color: C.gold },
  docTitle: { fontSize: 13, fontWeight: '600', color: C.textPrimary, textAlign: 'center' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  metaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: C.goldGlow,
    borderWidth: 1,
    borderColor: C.goldBorder,
  },
  metaBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.gold },
  metaDate: { fontSize: 11, color: C.textMuted, marginLeft: 'auto' },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: C.surface,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
    height: 46,
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '33.333%',
    backgroundColor: C.goldGlow,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: C.goldBorder,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    zIndex: 1,
  },
  tabLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  tabLabelActive: { color: C.gold },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  documentContainer: { gap: 12 },
  downloadDocxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.gold,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: Radius.button,
    shadowColor: C.gold,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 4,
  },
  downloadDocxBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.bg,
  },
  documentCard: { padding: 20 },
  documentText: {
    fontSize: 13,
    color: C.legalText,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  shareTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.button,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  shareTextBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textPrimary,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: C.surface,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: C.border,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: C.textMuted, lineHeight: 16 },
  tabContent: { gap: 16 },
  complianceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  complianceSummaryLeft: { gap: 4 },
  complianceSummaryLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  complianceSummaryValue: { fontSize: 22, fontWeight: '700' },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  actCard: { padding: 14, gap: 4 },
  actName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  actApplicability: { fontSize: 12, color: C.textSecondary, lineHeight: 18 },
  issueItem: {
    padding: 14,
    borderLeftWidth: 3,
    backgroundColor: C.surface,
    borderRadius: Radius.button,
    gap: 6,
  },
  issueBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  issueBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  issueText: { fontSize: 13, color: C.textPrimary, lineHeight: 18 },
  emptyState: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyStateText: { fontSize: 15, color: C.textSecondary, fontWeight: '600' },
  riskSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  riskSummaryLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  riskRecommendation: { fontSize: 13, color: C.textPrimary, lineHeight: 18 },
  riskRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    gap: 0,
  },
  riskRingScore: { fontSize: 18, fontWeight: '800' },
  riskRingLabel: { fontSize: 8, fontWeight: '700', color: C.textMuted, letterSpacing: 1 },
  riskItem: { padding: 16, gap: 8 },
  riskItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  riskItemTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: C.textPrimary, marginRight: 8 },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  riskBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  riskDesc: { fontSize: 13, color: C.bodyText, lineHeight: 18 },
  mitigationBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: C.glassBorder,
  },
  mitigationText: { flex: 1, fontSize: 12, color: C.lowRisk, lineHeight: 17 },
});
