import { Ionicons } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyPointCard } from '@/components/document/KeyPointCard';
import { RiskCard } from '@/components/document/RiskCard';
import { SummaryCard } from '@/components/document/SummaryCard';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { AppColors, Radius } from '@/constants/colors';
import { useDocumentContext } from '@/context/document-context';
import { getSummary } from '@/services/legalAI';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { DocumentAnalysis, RiskLevel } from '@/types/document';

const tabs = ['Summary', 'Key Points', 'Risks', 'Obligations'] as const;

const mapRiskLevel = (score?: number): RiskLevel => {
  if (typeof score !== 'number') {
    return 'medium';
  }
  if (score >= 70) {
    return 'high';
  }
  if (score >= 40) {
    return 'medium';
  }
  return 'low';
};

export default function SummaryScreen() {
  const router = useRouter();
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];
  const { state, dispatch } = useDocumentContext();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!documentId) {
    return null;
  }

  const document = state.documents[documentId];

  useEffect(() => {
    if (document?.analysis) {
      return;
    }

    const loadSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const summary = await getSummary(documentId);
        const analysis: DocumentAnalysis = {
          summary: summary.summary,
          keyPoints: summary.keyPoints,
          risks: summary.risks,
          obligations: summary.obligations,
          riskScore: summary.riskScore,
          documentType: summary.documentType,
        };
        dispatch({ type: 'SET_DOCUMENT_ANALYSIS', payload: { documentId, analysis } });
      } catch (loadError) {
        setError('Unable to load summary. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [dispatch, document?.analysis, documentId]);

  const analysis = document?.analysis;
  const riskLevel = mapRiskLevel(analysis?.riskScore);

  const metadata = useMemo(
    () => [
      document?.pages ? `${document.pages} Pages` : 'PDF',
      'Uploaded today',
      document?.location ?? 'Mumbai Court',
    ],
    [document?.location, document?.pages]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.primary }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={20} color={palette.surface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: palette.surface }]} numberOfLines={1}>
            {document?.filename ?? 'Document summary'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: palette.accent }]}>AI Summary Report</Text>
        </View>
        <TouchableOpacity onPress={() => {}} style={styles.iconButton}>
          <Ionicons name="share-outline" size={18} color={palette.surface} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={[styles.iconBadge, { backgroundColor: palette.accentSoft }]}> 
              <Ionicons name="document-text" size={20} color={palette.primary} />
            </View>
            <View style={styles.infoCenter}>
              <Badge
                label={(analysis?.documentType ?? 'DOCUMENT').toUpperCase()}
                tone="accent"
              />
            </View>
            <RiskBadge level={riskLevel} score={analysis?.riskScore} />
          </View>
          <View style={styles.metaRow}>
            {metadata.map((item) => (
              <Badge key={item} label={item} />
            ))}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionRow}>
            {['Share', 'Chat', 'Copy', 'Export'].map((action) => (
              <TouchableOpacity
                key={action}
                onPress={() => {
                  if (action === 'Chat') {
                    router.push({ pathname: '/chat/[documentId]', params: { documentId } } as unknown as Href);
                  }
                }}
                style={[styles.actionButton, { borderColor: palette.border }]}> 
                <Text style={[styles.actionText, { color: palette.primary }]}>{action}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        <View style={[styles.tabBar, { borderBottomColor: palette.border }]}> 
          {tabs.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabButton}>
                <Text style={[styles.tabText, { color: isActive ? palette.primary : palette.textMuted }]}> 
                  {tab}
                </Text>
                {isActive && <View style={[styles.tabUnderline, { backgroundColor: palette.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {loading && (
          <Card>
            <Text style={[styles.loadingText, { color: palette.textMuted }]}>Loading summary...</Text>
          </Card>
        )}
        {error && (
          <Card>
            <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>
          </Card>
        )}

        {!loading && analysis && activeTab === 'Summary' && (
          <View>
            <SummaryCard summary={analysis.summary} />
            <Card>
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}> 
                What this means in simple terms
              </Text>
              {[
                'What is this document about?',
                'What action do you need to take?',
                'Important dates and deadlines',
                'Your rights in this situation',
              ].map((item) => (
                <View key={item} style={styles.accordionItem}>
                  <Text style={[styles.accordionTitle, { color: palette.textPrimary }]}>{item}</Text>
                  <Text style={[styles.accordionBody, { color: palette.textSecondary }]}> 
                    Explanation will appear here once the AI completes the detailed analysis.
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {!loading && analysis && activeTab === 'Key Points' && (
          <View>
            {analysis.keyPoints.map((point, index) => (
              <KeyPointCard key={point.id} point={point} index={index} />
            ))}
          </View>
        )}

        {!loading && analysis && activeTab === 'Risks' && (
          <View>
            {analysis.risks.map((risk) => (
              <RiskCard key={risk.id} risk={risk} />
            ))}
          </View>
        )}

        {!loading && analysis && activeTab === 'Obligations' && (
          <View>
            {analysis.obligations.map((obligation) => (
              <Card key={obligation.id} style={styles.obligationCard}>
                <View style={styles.obligationRow}>
                  <View style={[styles.checkbox, { borderColor: palette.border }]} />
                  <View style={styles.obligationText}>
                    <Text style={[styles.obligationTitle, { color: palette.textPrimary }]}>
                      {obligation.action}
                    </Text>
                    {obligation.deadline && (
                      <Text
                        style={[
                          styles.obligationDeadline,
                          { color: obligation.urgency === 'high' ? palette.danger : palette.textMuted },
                        ]}>
                        Deadline: {obligation.deadline}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity>
                    <Text style={[styles.calendarLink, { color: palette.primary }]}>Add to calendar</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: palette.primary }]}
        onPress={() =>
          router.push({ pathname: '/chat/[documentId]', params: { documentId } } as unknown as Href)
        }>
        <Ionicons name="chatbubble-ellipses" size={20} color={palette.accent} />
        <Text style={[styles.fabText, { color: palette.accent }]}>Ask AI</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  infoCard: {
    marginTop: -32,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCenter: {
    flex: 1,
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionRow: {
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: Radius.standard,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  tabButton: {
    paddingVertical: 10,
    flex: 1,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabUnderline: {
    height: 2,
    width: 40,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  accordionItem: {
    marginBottom: 12,
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  accordionBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  loadingText: {
    fontSize: 13,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  obligationCard: {
    marginBottom: 10,
  },
  obligationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
  obligationText: {
    flex: 1,
  },
  obligationTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  obligationDeadline: {
    fontSize: 11,
    marginTop: 4,
  },
  calendarLink: {
    fontSize: 11,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fabText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
