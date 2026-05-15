import { type Href, useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

const recentDocuments = [
  {
    id: 'doc_1',
    title: 'Affidavit - R. Sharma',
    subtitle: 'Uploaded today - 12 pages',
  },
  {
    id: 'doc_2',
    title: 'Contract - Vendor Agreement',
    subtitle: 'Uploaded yesterday - 18 pages',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.primary }]}> 
        <View style={[styles.headerGlow, { backgroundColor: palette.accent }]} />
        <Text style={[styles.headerTitle, { color: palette.accent }]}>LexAI</Text>
        <Text style={[styles.headerSubtitle, { color: palette.surface }]}>Legal Document AI</Text>
        <Text style={[styles.headerTagline, { color: palette.accentSoft }]}>
          AI-powered legal clarity for professionals.
        </Text>
      </View>

      <View style={styles.content}>
        <Card style={styles.heroCard}>
          <Text style={[styles.heroTitle, { color: palette.textPrimary }]}>
            Upload a document and get clarity in minutes.
          </Text>
          <Text style={[styles.heroSubtitle, { color: palette.textSecondary }]}>
            Summary, risks, obligations, and a document-aware chat assistant.
          </Text>
          <Button
            label="Upload PDF"
            onPress={() => router.push({ pathname: '/upload' } as unknown as Href)}
          />
        </Card>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionAccent, { backgroundColor: palette.accent }]} />
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Recent documents</Text>
          </View>
          <TouchableOpacity onPress={() => router.push({ pathname: '/upload' } as unknown as Href)}>
            <Text style={[styles.sectionLink, { color: palette.primary }]}>Upload new</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={recentDocuments}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Card style={styles.recentCard}>
              <Text style={[styles.recentTitle, { color: palette.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.recentSubtitle, { color: palette.textMuted }]}>{item.subtitle}</Text>
              <Button
                label="View summary"
                variant="ghost"
                onPress={() =>
                  router.push({
                    pathname: '/summary/[documentId]',
                    params: { documentId: item.id },
                  } as unknown as Href)
                }
              />
            </Card>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -80,
    right: -40,
    opacity: 0.22,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  headerTagline: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroCard: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionAccent: {
    width: 6,
    height: 18,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  recentCard: {
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  recentSubtitle: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
  },
});
