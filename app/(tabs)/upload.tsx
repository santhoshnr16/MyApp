import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, GlassCard, Radius } from '@/constants/colors';
import { useDocumentContext } from '@/context/document-context';
import { useDocumentAnalysis } from '@/hooks/useDocumentAnalysis';
import { useFileUpload } from '@/hooks/useFileUpload';
import type { AnalysisOptions, DocumentLanguage } from '@/types/document';

const LANGUAGES: DocumentLanguage[] = [
  'English',
  'Hindi',
  'Marathi',
  'Tamil',
  'Telugu',
  'Bengali',
  'Gujarati',
];

const STEPS = [
  'Reading your document...',
  'Identifying document type...',
  'AI analyzing content...',
  'Detecting risks...',
  'Preparing your report...',
];

const OPTION_ROWS = [
  { key: 'fullSummary', icon: 'document-text' as const, title: 'Full Summary', subtitle: 'Plain English summary of entire document' },
  { key: 'riskAnalysis', icon: 'warning' as const, title: 'Risk Analysis', subtitle: 'Find risky clauses and obligations' },
  { key: 'enableChat', icon: 'chatbubble-ellipses' as const, title: 'Enable AI Chat', subtitle: 'Ask questions about this document' },
  { key: 'translateSummary', icon: 'language' as const, title: 'Translate Summary', subtitle: 'Get summary in your local language' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function UploadScreen() {
  const router = useRouter();
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
  const [progressAnim] = useState(new Animated.Value(0));

  const isAnalyzing = state.loading.analyzing || state.loading.uploading;
  const canSubmit = !!file && !isAnalyzing && !isPicking;

  useEffect(() => {
    if (!isAnalyzing) {
      setActiveStep(0);
      Animated.timing(progressAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
      return;
    }
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      const next = Math.min(step, STEPS.length - 1);
      setActiveStep(next);
      Animated.timing(progressAnim, {
        toValue: Math.min(0.1 + step * 0.2, 0.9),
        duration: 800,
        useNativeDriver: false,
      }).start();
    }, 1200);
    return () => clearInterval(interval);
  }, [isAnalyzing, progressAnim]);

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

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const displayError = error ?? apiError;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Analyse Document</Text>
          <Text style={styles.subheading}>Upload a PDF to begin AI analysis</Text>
        </View>

        {/* Upload Zone */}
        <TouchableOpacity
          onPress={file ? undefined : pickFile}
          disabled={isPicking}
          activeOpacity={file ? 1 : 0.8}
          style={[styles.uploadZone, file && styles.uploadZoneFilled]}>
          {file ? (
            <View style={styles.filePreview}>
              <View style={styles.fileIconRow}>
                <Ionicons name="document" size={28} color={C.gold} />
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                  <Text style={styles.fileSize}>{formatBytes(file.size)}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color={C.lowRisk} />
              </View>
              <TouchableOpacity style={styles.removeBtn} onPress={removeFile}>
                <Ionicons name="close-circle" size={18} color={C.textMuted} />
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadPrompt}>
              <Ionicons name="scale" size={40} color={C.gold} style={styles.uploadIcon} />
              <Text style={styles.uploadTitle}>Drop PDF here or tap to browse</Text>
              <Text style={styles.uploadSub}>Supports PDF documents up to 50MB</Text>
              <View style={styles.browseBtn}>
                <Text style={styles.browseBtnText}>Browse Files</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Language Selector */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>DOCUMENT LANGUAGE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}>
            {LANGUAGES.map((lang) => {
              const active = options.language === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  onPress={() => setOptions((p) => ({ ...p, language: lang }))}
                  style={[styles.pill, active && styles.pillActive]}>
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{lang}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Analysis Options */}
        <View style={[GlassCard, styles.optionsCard]}>
          <Text style={styles.sectionLabel}>ANALYSIS OPTIONS</Text>
          {OPTION_ROWS.map((row, index) => (
            <View
              key={row.key}
              style={[styles.optionRow, index < OPTION_ROWS.length - 1 && styles.optionRowBorder]}>
              <View style={styles.optionIconBox}>
                <Ionicons name={row.icon} size={18} color={C.gold} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{row.title}</Text>
                <Text style={styles.optionSub}>{row.subtitle}</Text>
              </View>
              <Switch
                value={options[row.key as keyof AnalysisOptions] as boolean}
                onValueChange={(v) => setOptions((p) => ({ ...p, [row.key]: v }))}
                trackColor={{ false: C.border, true: C.goldGlow }}
                thumbColor={options[row.key as keyof AnalysisOptions] ? C.gold : C.textMuted}
                ios_backgroundColor={C.border}
              />
            </View>
          ))}
        </View>

        {/* Error */}
        {displayError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={C.highRisk} />
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          onPress={handleAnalyze}
          disabled={!canSubmit}
          activeOpacity={0.85}
          style={[styles.cta, !canSubmit && styles.ctaDisabled]}>
          <Text style={[styles.ctaText, !canSubmit && styles.ctaTextDisabled]}>
            {isAnalyzing ? 'Analysing with AI...' : 'Analyse Document'}
          </Text>
          {!isAnalyzing && canSubmit && (
            <Ionicons name="arrow-forward" size={18} color={C.bg} />
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Your document is processed securely and never stored permanently.
        </Text>
      </ScrollView>

      {/* Analysis Progress Overlay */}
      <Modal visible={isAnalyzing} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[GlassCard, styles.overlayCard]}>
            <Text style={styles.overlayTitle}>Analysing Document</Text>
            <Text style={styles.overlaySub}>AI is reading your file...</Text>

            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>

            {STEPS.map((step, i) => {
              const done = i < activeStep;
              const active = i === activeStep;
              return (
                <View key={step} style={styles.stepRow}>
                  <Ionicons
                    name={done ? 'checkmark-circle' : active ? 'ellipse' : 'ellipse-outline'}
                    size={16}
                    color={done ? C.lowRisk : active ? C.gold : C.textMuted}
                  />
                  <Text style={[styles.stepText, active && styles.stepTextActive]}>{step}</Text>
                </View>
              );
            })}

            <TouchableOpacity style={styles.cancelBtn} onPress={cancelAnalysis}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    gap: 20,
  },
  header: {
    paddingTop: 20,
    gap: 4,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: C.textPrimary,
  },
  subheading: {
    fontSize: 14,
    color: C.textSecondary,
  },
  uploadZone: {
    borderWidth: 1.5,
    borderColor: C.goldBorder,
    borderStyle: 'dashed',
    borderRadius: Radius.card,
    backgroundColor: C.glass,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadZoneFilled: {
    borderStyle: 'solid',
    borderColor: C.gold,
    borderWidth: 1,
  },
  uploadPrompt: {
    alignItems: 'center',
    padding: 32,
    gap: 10,
  },
  uploadIcon: {
    marginBottom: 4,
    opacity: 0.9,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
    textAlign: 'center',
  },
  uploadSub: {
    fontSize: 12,
    color: C.textMuted,
  },
  browseBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.goldBorder,
    borderRadius: Radius.button,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  browseBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.gold,
  },
  filePreview: {
    width: '100%',
    padding: 16,
    gap: 12,
  },
  fileIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileDetails: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  fileSize: {
    fontSize: 11,
    color: C.textMuted,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  removeBtnText: {
    fontSize: 12,
    color: C.textMuted,
  },
  sectionBlock: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: C.gold,
  },
  pillRow: {
    gap: 8,
    paddingBottom: 4,
  },
  pill: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.surface,
  },
  pillActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
  },
  pillTextActive: {
    color: C.bg,
  },
  optionsCard: {
    gap: 0,
    padding: 0,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  optionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.glassBorder,
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.goldGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  optionSub: {
    fontSize: 11,
    color: C.textMuted,
  },
  errorBanner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(229,62,62,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(229,62,62,0.3)',
    borderRadius: Radius.button,
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: C.highRisk,
    fontWeight: '500',
  },
  cta: {
    height: 52,
    backgroundColor: C.gold,
    borderRadius: Radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: C.gold,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  ctaDisabled: {
    backgroundColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.bg,
    letterSpacing: 0.2,
  },
  ctaTextDisabled: {
    color: C.textMuted,
  },
  disclaimer: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: C.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  overlayCard: {
    width: '100%',
    padding: 24,
    gap: 12,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  overlaySub: {
    fontSize: 13,
    color: C.textSecondary,
    marginTop: -6,
  },
  progressTrack: {
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.gold,
    borderRadius: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepText: {
    fontSize: 13,
    color: C.textMuted,
  },
  stepTextActive: {
    color: C.textPrimary,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelBtnText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '600',
  },
});
