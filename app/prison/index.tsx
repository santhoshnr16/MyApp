import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UndertrialCaseDetail } from '@/components/prison/UndertrialCaseDetail';
import { UndertrialDashboard } from '@/components/prison/UndertrialDashboard';
import { C } from '@/constants/colors';
import {
  confirmAndInitiateBailProcess,
  fetchAllUndertrialCases,
  fetchUndertrialCaseDetail,
  submitRemandClockAdjustment,
  submitStaffManualOverride,
  triggerDailyCronEligibilityCheck,
} from '@/services/undertrialBailAI';
import type { AuditLogEntry, BNSS479EligibilityResult, PrisonerRecordPayload } from '@/types/undertrialBail';

export default function PrisonBailScreen() {
  const router = useRouter();

  const [cases, setCases] = useState<Array<{ record: PrisonerRecordPayload; evaluation: BNSS479EligibilityResult }>>([]);
  const [loading, setLoading] = useState(false);
  const [cronRunning, setCronRunning] = useState(false);

  // Active view: Dashboard vs Case Detail
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<PrisonerRecordPayload | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<BNSS479EligibilityResult | null>(null);
  const [selectedAuditLogs, setSelectedAuditLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    setLoading(true);
    try {
      const data = await fetchAllUndertrialCases();
      setCases(data.cases || []);
    } catch (err) {
      console.warn('Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectCase(record: PrisonerRecordPayload, evaluation: BNSS479EligibilityResult) {
    setSelectedCaseId(record.prisonerId);
    setSelectedRecord(record);
    setSelectedEvaluation(evaluation);
    setLoading(true);

    try {
      const detail = await fetchUndertrialCaseDetail(record.prisonerId);
      setSelectedRecord(detail.record);
      setSelectedEvaluation(detail.evaluation);
      setSelectedAuditLogs(detail.auditLogs || []);
    } catch (err) {
      console.warn('Failed loading case detail:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunCronCheck() {
    setCronRunning(true);
    try {
      const res = await triggerDailyCronEligibilityCheck();
      Alert.alert(
        'Cron Job Executed',
        `Evaluated ${res.summary.totalEvaluated} cases. Status flips and webhooks dispatches processed.`
      );
      await loadCases();
    } catch (err) {
      Alert.alert('Cron Execution Failed', (err as Error).message);
    } finally {
      setCronRunning(false);
    }
  }

  async function handleConfirmBail(staffName: string, comments: string) {
    if (!selectedCaseId) return;
    setLoading(true);
    try {
      const res = await confirmAndInitiateBailProcess(selectedCaseId, { staffName, comments });
      setSelectedRecord(res.record);
      setSelectedEvaluation(res.evaluation);
      Alert.alert('Bail Process Kicked Off', 'Human checkpoint passed. Webhook notification fired to receiving system.');
      await loadCases();
      const updatedDetail = await fetchUndertrialCaseDetail(selectedCaseId);
      setSelectedAuditLogs(updatedDetail.auditLogs || []);
    } catch (err) {
      Alert.alert('Error Initiating Bail', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOverride(isOverridden: boolean, reason: string, staffName: string) {
    if (!selectedCaseId) return;
    setLoading(true);
    try {
      const res = await submitStaffManualOverride(selectedCaseId, { isOverridden, reason, staffName });
      setSelectedRecord(res.record);
      setSelectedEvaluation(res.evaluation);
      Alert.alert('Manual Override Saved', isOverridden ? 'Prisoner marked ineligible.' : 'Override removed.');
      await loadCases();
      const updatedDetail = await fetchUndertrialCaseDetail(selectedCaseId);
      setSelectedAuditLogs(updatedDetail.auditLogs || []);
    } catch (err) {
      Alert.alert('Override Error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemandAdjust(pauseDays: number, reason: string, recordedBy: string) {
    if (!selectedCaseId) return;
    setLoading(true);
    try {
      const res = await submitRemandClockAdjustment(selectedCaseId, { pauseDays, reason, recordedBy });
      setSelectedRecord(res.record);
      setSelectedEvaluation(res.evaluation);
      Alert.alert('Remand Adjustment Recorded', `Custody clock adjusted by ${pauseDays} days.`);
      await loadCases();
      const updatedDetail = await fetchUndertrialCaseDetail(selectedCaseId);
      setSelectedAuditLogs(updatedDetail.auditLogs || []);
    } catch (err) {
      Alert.alert('Adjustment Error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Navigation Header Bar */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.wordmark}>LEXAI • SIH1282</Text>
            <Text style={styles.featureName}>Undertrial Prisoner Bail Tracker</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.mainContent}>
          {selectedRecord && selectedEvaluation ? (
            <UndertrialCaseDetail
              record={selectedRecord}
              evaluation={selectedEvaluation}
              auditLogs={selectedAuditLogs}
              onBack={() => {
                setSelectedCaseId(null);
                setSelectedRecord(null);
                setSelectedEvaluation(null);
              }}
              onConfirmBail={handleConfirmBail}
              onOverride={handleOverride}
              onRemandAdjust={handleRemandAdjust}
              loading={loading}
            />
          ) : (
            <UndertrialDashboard
              cases={cases}
              loading={loading}
              onRefresh={loadCases}
              onSelectCase={handleSelectCase}
              onRunCronCheck={handleRunCronCheck}
              cronRunning={cronRunning}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: C.borderSubtle,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 1 },
  wordmark: { fontSize: 9, fontWeight: '800', letterSpacing: 2.5, color: C.gold },
  featureName: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  mainContent: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
});
