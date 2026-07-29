import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, GlassCard, Radius, Serif } from '@/constants/colors';
import { useDocumentContext } from '@/context/document-context';

export default function HomeScreen() {
  const router = useRouter();
  const { state } = useDocumentContext();

  const documents = Object.values(state.documents);
  const totalRisks = documents.reduce(
    (sum, doc) => sum + (doc.analysis?.risks?.length ?? 0),
    0
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.wordmark}>LEXAI</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => {}}>
            <Ionicons name="settings-outline" size={20} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Eyebrow */}
        <Text style={styles.eyebrow}>LEGAL INTELLIGENCE</Text>

        {/* Hero heading */}
        <Text style={styles.heroHeading}>
          {'Smart counsel for every\n'}
          <Text style={styles.heroAccent}>document.</Text>
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[GlassCard, styles.statCard]}>
            <Text style={styles.statValue}>{documents.length}</Text>
            <Text style={styles.statLabel}>DOCUMENTS</Text>
          </View>
          <View style={[GlassCard, styles.statCard]}>
            <Text style={styles.statValue}>{totalRisks}</Text>
            <Text style={styles.statLabel}>RISKS FOUND</Text>
          </View>
          <View style={[GlassCard, styles.statCard]}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>MOOTS</Text>
          </View>
        </View>

        {/* DraftCounsel CTA */}
        <TouchableOpacity
          style={styles.draftCta}
          onPress={() => router.push('/draft/new' as Href)}>
          <View style={styles.draftCtaLeft}>
            <View style={styles.draftCtaIcon}>
              <Ionicons name="create-outline" size={20} color={C.elevated} />
            </View>
            <View>
              <Text style={styles.draftCtaTitle}>DraftCounsel</Text>
              <Text style={styles.draftCtaSub}>AI-generated legal documents</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>

        {/* e-Prisons / BNSS 479 Undertrial Bail Engine CTA */}
        <TouchableOpacity
          style={[styles.draftCta, { marginBottom: 28, borderColor: C.goldBorder }]}
          onPress={() => router.push('/prison' as Href)}>
          <View style={styles.draftCtaLeft}>
            <View style={[styles.draftCtaIcon, { backgroundColor: C.gold }]}>
              <Ionicons name="key-outline" size={20} color={C.bg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.draftCtaTitle}>e-Prisons & BNSS 479 Engine</Text>
              <Text style={styles.draftCtaSub}>Undertrial prisoner bail calculator (Sec 479)</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.gold} />
        </TouchableOpacity>

        {/* Recent section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENT</Text>
            <TouchableOpacity onPress={() => router.push('/upload' as Href)}>
              <Text style={styles.sectionLink}>+ Upload</Text>
            </TouchableOpacity>
          </View>

          {documents.length === 0 ? (
            <View style={[GlassCard, styles.emptyCard]}>
              <Ionicons name="document-text-outline" size={32} color={C.textMuted} />
              <Text style={styles.emptyTitle}>No documents yet</Text>
              <Text style={styles.emptySubtitle}>Upload a PDF to get started</Text>
              <TouchableOpacity
                style={styles.uploadCta}
                onPress={() => router.push('/upload' as Href)}>
                <Text style={styles.uploadCtaText}>Upload PDF</Text>
              </TouchableOpacity>
            </View>
          ) : (
            documents.map((doc) => {
              const riskScore = doc.analysis?.riskScore ?? 0;
              const riskColor =
                riskScore >= 70 ? C.highRisk : riskScore >= 40 ? C.mediumRisk : C.lowRisk;
              return (
                <TouchableOpacity
                  key={doc.documentId}
                  onPress={() =>
                    router.push({
                      pathname: '/summary/[documentId]',
                      params: { documentId: doc.documentId },
                    } as unknown as Href)
                  }
                  style={[GlassCard, styles.docCard]}>
                  <View style={styles.goldLeftBorder} />
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
                      <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/upload' as Href)}>
        <Ionicons name="add" size={28} color={C.elevated} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    paddingHorizontal: 22,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
  },
  wordmark: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 5,
    color: C.ink,
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
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    color: C.gold,
    marginBottom: 10,
  },
  heroHeading: {
    fontFamily: Serif,
    fontSize: 36,
    color: C.ink,
    lineHeight: 44,
    marginBottom: 24,
  },
  heroAccent: {
    fontFamily: Serif,
    fontSize: 36,
    color: C.gold,
    fontStyle: 'italic',
    lineHeight: 44,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: C.ink,
    fontFamily: Serif,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.textMuted,
    textAlign: 'center',
  },
  draftCta: {
    ...GlassCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 28,
  },
  draftCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  draftCtaIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftCtaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: -0.2,
  },
  draftCtaSub: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 1,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    color: C.textSecondary,
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
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: C.textMuted,
  },
  uploadCta: {
    marginTop: 8,
    backgroundColor: C.ink,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: Radius.button,
  },
  uploadCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.elevated,
    letterSpacing: 0.5,
  },
  docCard: {
    overflow: 'hidden',
    paddingLeft: 0,
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
    paddingLeft: 18,
  },
  docInfo: {
    flex: 1,
    gap: 5,
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
    gap: 6,
  },
  riskCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  riskScore: {
    fontSize: 13,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
