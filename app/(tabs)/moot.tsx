import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, GlassCard, Radius } from '@/constants/colors';
import { useDocumentContext } from '@/context/document-context';

export default function MootTab() {
  const router = useRouter();
  const { state } = useDocumentContext();
  const documents = Object.values(state.documents);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="scale" size={22} color={C.gold} />
          <View style={styles.headerText}>
            <Text style={styles.heading}>LexAI Moot</Text>
            <Text style={styles.subheading}>AI Moot Court Simulator</Text>
          </View>
        </View>

        {/* Info banner */}
        <View style={[GlassCard, styles.infoBanner]}>
          <Text style={styles.infoText}>
            Argue real legal documents against Senior Advocate Rajan Iyer — 8 exchanges, live
            counter-arguments, and a detailed verdict.
          </Text>
        </View>

        {/* Document list */}
        <Text style={styles.sectionLabel}>CHOOSE A DOCUMENT TO ARGUE</Text>

        {documents.length === 0 ? (
          <View style={[GlassCard, styles.emptyCard]}>
            <Ionicons name="document-text-outline" size={40} color={C.textMuted} />
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptyBody}>
              Upload and analyse a document first, then return here to start a Moot session.
            </Text>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => router.push('/upload' as Href)}>
              <Text style={styles.uploadBtnText}>Upload Document</Text>
            </TouchableOpacity>
          </View>
        ) : (
          documents.map((doc) => {
            const riskScore = doc.analysis?.riskScore ?? 0;
            const riskColor =
              riskScore >= 70 ? C.highRisk : riskScore >= 40 ? C.mediumRisk : C.lowRisk;
            return (
              <View key={doc.documentId} style={[GlassCard, styles.docCard]}>
                <View style={styles.docTop}>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName} numberOfLines={2}>
                      {doc.filename}
                    </Text>
                    {doc.analysis?.documentType && (
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>
                          {doc.analysis.documentType.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.riskCircle, { borderColor: riskColor }]}>
                    <Text style={[styles.riskScore, { color: riskColor }]}>{riskScore}</Text>
                    <Text style={styles.riskLabel}>RISK</Text>
                  </View>
                </View>

                {doc.analysis?.summary && (
                  <Text style={styles.docSummary} numberOfLines={2}>
                    {doc.analysis.summary}
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.mootBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/moot/[documentId]',
                      params: { documentId: doc.documentId },
                    } as unknown as Href)
                  }>
                  <Ionicons name="scale" size={16} color={C.bg} />
                  <Text style={styles.mootBtnText}>Enter Courtroom</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
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
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 20,
  },
  headerText: {
    gap: 2,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: C.textPrimary,
  },
  subheading: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '500',
  },
  infoBanner: {
    padding: 14,
  },
  infoText: {
    fontSize: 13,
    color: C.bodyText,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: C.gold,
    marginTop: 4,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 44,
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
  },
  emptyBody: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  uploadBtn: {
    marginTop: 8,
    backgroundColor: C.gold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.button,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.bg,
  },
  docCard: {
    gap: 12,
  },
  docTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  docInfo: {
    flex: 1,
    gap: 6,
  },
  docName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
    lineHeight: 20,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.goldGlow,
    borderWidth: 1,
    borderColor: C.goldBorder,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: C.gold,
  },
  riskCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    gap: 0,
  },
  riskScore: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  riskLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.5,
  },
  docSummary: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 18,
  },
  mootBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.gold,
    borderRadius: Radius.button,
    paddingVertical: 12,
    shadowColor: C.gold,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  mootBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.bg,
  },
});
