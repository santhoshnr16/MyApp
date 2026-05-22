import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
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
import { useDocumentContext } from '@/context/document-context';

const STAT_CARDS = [
  { label: 'DOCUMENTS', icon: 'document-text' as const, valueKey: 'docs' },
  { label: 'RISKS FOUND', icon: 'warning' as const, valueKey: 'risks' },
  { label: 'MOOT SESSIONS', icon: 'scale' as const, valueKey: 'moots' },
];

function GoldUnderline({ width }: { width: Animated.Value }) {
  return (
    <Animated.View
      style={[styles.goldUnderline, { width }]}
    />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { state } = useDocumentContext();

  const underlineWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(underlineWidth, {
      toValue: 220,
      duration: 900,
      delay: 300,
      useNativeDriver: false,
    }).start();
  }, [underlineWidth]);

  const documents = Object.values(state.documents);
  const totalRisks = documents.reduce(
    (sum, doc) => sum + (doc.analysis?.risks?.length ?? 0),
    0
  );
  const statValues = { docs: documents.length, risks: totalRisks, moots: 0 };


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.topBar}>
          <Text style={styles.wordmark}>LEXAI</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => {}}>
            <Ionicons name="settings-outline" size={20} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroHeading}>Your AI Legal{'\n'}Assistant</Text>
          <GoldUnderline width={underlineWidth} />
          <Text style={styles.heroSub}>Upload. Analyse. Understand.</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {STAT_CARDS.map((card) => (
            <View key={card.label} style={[GlassCard, styles.statCard]}>
              <Ionicons name={card.icon} size={18} color={C.gold} />
              <Text style={styles.statValue}>
                {String(statValues[card.valueKey as keyof typeof statValues])}
              </Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* DraftCounsel CTA */}
        <TouchableOpacity
          style={styles.draftCta}
          onPress={() => router.push('/draft/new' as Href)}>
          <View style={styles.draftCtaLeft}>
            <Ionicons name="create-outline" size={22} color={C.gold} />
            <View style={styles.draftCtaText}>
              <Text style={styles.draftCtaTitle}>DraftCounsel</Text>
              <Text style={styles.draftCtaSub}>AI-generated legal documents</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward-circle" size={22} color={C.gold} />
        </TouchableOpacity>

        {/* Recent Documents */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Documents</Text>
            <TouchableOpacity onPress={() => router.push('/upload' as Href)}>
              <Text style={styles.sectionLink}>+ Upload</Text>
            </TouchableOpacity>
          </View>

          {documents.length === 0 ? (
            <View style={[GlassCard, styles.emptyCard]}>
              <Ionicons name="document-text-outline" size={36} color={C.textMuted} />
              <Text style={styles.emptyTitle}>No documents yet</Text>
              <Text style={styles.emptySubtitle}>Upload a PDF to get started</Text>
              <TouchableOpacity
                style={styles.uploadCta}
                onPress={() => router.push('/upload' as Href)}>
                <Text style={styles.uploadCtaText}>Upload PDF</Text>
              </TouchableOpacity>
            </View>
          ) : (
            documents.map((doc, index) => {
              const riskScore = doc.analysis?.riskScore ?? 0;
              const riskColor =
                riskScore >= 70 ? C.highRisk : riskScore >= 40 ? C.mediumRisk : C.lowRisk;
              const isFirst = index === 0;
              return (
                <TouchableOpacity
                  key={doc.documentId}
                  onPress={() =>
                    router.push({
                      pathname: '/summary/[documentId]',
                      params: { documentId: doc.documentId },
                    } as unknown as Href)
                  }
                  style={[GlassCard, styles.docCard, isFirst && styles.docCardActive]}>
                  {isFirst && <View style={styles.goldLeftBorder} />}
                  <View style={styles.docCardInner}>
                    <View style={styles.docInfo}>
                      <Text style={styles.docName} numberOfLines={1}>
                        {doc.filename}
                      </Text>
                      {doc.analysis?.documentType && (
                        <View style={styles.docTypeBadge}>
                          <Text style={styles.docTypeBadgeText}>
                            {doc.analysis.documentType.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.docDate}>
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.docRight}>
                      <View style={[styles.riskCircle, { borderColor: riskColor }]}>
                        <Text style={[styles.riskScore, { color: riskColor }]}>
                          {riskScore}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
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
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  wordmark: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 4,
    color: C.gold,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  hero: {
    paddingTop: 28,
    paddingBottom: 32,
    gap: 12,
  },
  heroHeading: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: C.textPrimary,
    lineHeight: 40,
  },
  goldUnderline: {
    height: 2,
    backgroundColor: C.gold,
    borderRadius: 1,
    marginTop: -4,
  },
  heroSub: {
    fontSize: 15,
    color: C.textSecondary,
    fontWeight: '500',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: C.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.gold,
    textAlign: 'center',
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: C.gold,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: C.textMuted,
  },
  uploadCta: {
    marginTop: 8,
    backgroundColor: C.gold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.button,
  },
  uploadCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.bg,
  },
  docCard: {
    overflow: 'hidden',
    paddingLeft: 0,
  },
  docCardActive: {
    borderLeftColor: C.gold,
    borderLeftWidth: 2,
  },
  goldLeftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: C.gold,
    borderTopLeftRadius: Radius.card,
    borderBottomLeftRadius: Radius.card,
  },
  docCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  docInfo: {
    flex: 1,
    gap: 6,
    marginRight: 12,
  },
  docName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  docTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.goldGlow,
    borderWidth: 1,
    borderColor: C.goldBorder,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  docTypeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: C.gold,
  },
  docDate: {
    fontSize: 11,
    color: C.textMuted,
  },
  docRight: {
    alignItems: 'center',
    gap: 8,
  },
  riskCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  riskScore: {
    fontSize: 14,
    fontWeight: '700',
  },
  draftCta: {
    ...GlassCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 24,
  },
  draftCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  draftCtaText: {
    gap: 2,
  },
  draftCtaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
  },
  draftCtaSub: {
    fontSize: 12,
    color: C.textSecondary,
  },
});
