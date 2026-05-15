import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UploadCard } from '@/components/document/UploadCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AppColors, Radius } from '@/constants/colors';
import { useDocumentContext } from '@/context/document-context';
import { useDocumentAnalysis } from '@/hooks/useDocumentAnalysis';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AnalysisOptions, DocumentLanguage } from '@/types/document';

const languages: DocumentLanguage[] = [
  'English',
  'Hindi',
  'Marathi',
  'Tamil',
  'Telugu',
  'Bengali',
  'Gujarati',
];

const steps = [
  'Reading your document...',
  'Identifying document type...',
  'AI analyzing content...',
  'Detecting risks...',
  'Preparing your report...',
];

export default function UploadScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];
  const { state } = useDocumentContext();
  const { analyzeDocument, cancelAnalysis } = useDocumentAnalysis();
  const { file, error, isPicking, pickFile, removeFile, setError } = useFileUpload();
  const apiError = state.errors.upload;

  const [options, setOptions] = useState<AnalysisOptions>({
    fullSummary: true,
    riskAnalysis: true,
    enableChat: true,
    translateSummary: false,
    language: 'English',
  });

  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0.1);

  const isAnalyzing = state.loading.analyzing || state.loading.uploading;

  useEffect(() => {
    if (!isAnalyzing) {
      setActiveStep(0);
      setProgress(0.1);
      return;
    }

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      setActiveStep(Math.min(step, steps.length - 1));
      setProgress(Math.min(0.1 + step * 0.2, 0.9));
    }, 1200);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const canSubmit = !!file && !isAnalyzing && !isPicking;

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please select a PDF file first.');
      return;
    }

    const documentId = await analyzeDocument(file, options);
    if (documentId) {
      router.push({ pathname: '/summary/[documentId]', params: { documentId } });
    }
  };

  const optionRows = useMemo(
    () => [
      {
        key: 'fullSummary',
        title: 'Full Summary',
        subtitle: 'Plain English summary of entire document',
      },
      {
        key: 'riskAnalysis',
        title: 'Risk Analysis',
        subtitle: 'Find risky clauses and obligations',
      },
      {
        key: 'enableChat',
        title: 'Enable AI Chat',
        subtitle: 'Ask questions about this document',
      },
      {
        key: 'translateSummary',
        title: 'Translate Summary',
        subtitle: 'Get summary in your local language',
      },
    ],
    []
  );

  return (
    <SafeAreaView
      className="flex-1"
      style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.primary }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={palette.surface} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: palette.accent }]}>Legal Document AI</Text>
          <Text style={[styles.headerSubtitle, { color: palette.surface }]}>Upload and analyze</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <UploadCard file={file} onPick={pickFile} onRemove={removeFile} onCamera={pickFile} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: palette.accent }]} />
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Document Language</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
            {languages.map((language) => {
              const isSelected = options.language === language;
              return (
                <TouchableOpacity
                  key={language}
                  onPress={() => setOptions((prev) => ({ ...prev, language }))}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected ? palette.primary : palette.surface,
                      borderColor: palette.primary,
                    },
                  ]}>
                  <Text style={[styles.pillText, { color: isSelected ? palette.accent : palette.primary }]}> 
                    {language}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: palette.accent }]} />
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>What do you need?</Text>
          </View>
          {optionRows.map((row) => (
            <View key={row.key} style={styles.optionRow}>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: palette.textPrimary }]}>{row.title}</Text>
                <Text style={[styles.optionSubtitle, { color: palette.textMuted }]}>{row.subtitle}</Text>
              </View>
              <Switch
                value={options[row.key as keyof AnalysisOptions] as boolean}
                onValueChange={(value) =>
                  setOptions((prev) => ({ ...prev, [row.key]: value }))
                }
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={palette.accent}
              />
            </View>
          ))}
        </Card>

        {(error || apiError) && (
          <Card style={styles.errorCard}>
            <Text style={[styles.errorText, { color: palette.danger }]}>{error ?? apiError}</Text>
          </Card>
        )}

        <Button
          label={isAnalyzing ? 'Analyzing with AI...' : 'Analyze Document ->'}
          onPress={handleAnalyze}
          disabled={!canSubmit}
          loading={isAnalyzing}
          style={styles.ctaButton}
        />

        <Text style={[styles.securityText, { color: palette.textMuted }]}> 
          Your document is processed securely and never stored permanently.
        </Text>
      </ScrollView>

      <Modal visible={isAnalyzing} transparent animationType="fade">
        <View style={[styles.overlay, { backgroundColor: palette.overlay }]}> 
          <Card style={styles.overlayCard}>
            <Text style={[styles.overlayTitle, { color: palette.textPrimary }]}>Analyzing document</Text>
            {steps.map((step, index) => {
              const isDone = index < activeStep;
              const isActive = index === activeStep;
              return (
                <View key={step} style={styles.stepRow}>
                  <Ionicons
                    name={isDone ? 'checkmark-circle' : 'time-outline'}
                    size={18}
                    color={isDone ? palette.success : isActive ? palette.accent : palette.textMuted}
                  />
                  <Text
                    style={[
                      styles.stepText,
                      { color: isDone ? palette.textPrimary : palette.textMuted },
                    ]}>
                    {step}
                  </Text>
                </View>
              );
            })}
            <ProgressBar progress={progress} />
            <Button label="Cancel" onPress={cancelAnalysis} variant="ghost" />
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionAccent: {
    width: 6,
    height: 18,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  pillRow: {
    gap: 10,
    paddingBottom: 4,
  },
  pill: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionText: {
    flex: 1,
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  errorCard: {
    borderColor: '#C0392B',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ctaButton: {
    height: 54,
  },
  securityText: {
    fontSize: 11,
    textAlign: 'left',
    marginTop: 12,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  overlayCard: {
    width: '100%',
  },
  overlayTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stepText: {
    fontSize: 12,
  },
});
