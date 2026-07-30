import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { C, GlassCard, Radius } from '@/constants/colors';
import type { AuditLogEntry, BNSS479EligibilityResult, PrisonerRecordPayload } from '@/types/undertrialBail';

interface UndertrialCaseDetailProps {
  record: PrisonerRecordPayload;
  evaluation: BNSS479EligibilityResult;
  auditLogs: AuditLogEntry[];
  onBack: () => void;
  onConfirmBail: (staffName: string, comments: string) => Promise<void>;
  onOverride: (isOverridden: boolean, reason: string, staffName: string) => Promise<void>;
  onRemandAdjust: (pauseDays: number, reason: string, recordedBy: string) => Promise<void>;
  loading: boolean;
}

export const UndertrialCaseDetail: React.FC<UndertrialCaseDetailProps> = ({
  record,
  evaluation,
  auditLogs,
  onBack,
  onConfirmBail,
  onOverride,
  onRemandAdjust,
  loading,
}) => {
  // Modal states
  const [showBailModal, setShowBailModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showRemandModal, setShowRemandModal] = useState(false);

  // Form inputs
  const [staffName, setStaffName] = useState('Superintendent / Court Clerk');
  const [bailComments, setBailComments] = useState('Pre-verified by DLSA Legal Aid Counsel.');
  const [overrideReason, setOverrideReason] = useState('Multiple pending production warrants across districts.');
  const [remandPauseDaysInput, setRemandPauseDaysInput] = useState('14');
  const [remandReason, setRemandReason] = useState('Forensic stay / mental health evaluation stay granted.');

  const requiredDays = Math.ceil(evaluation.requiredSentenceMonthsForBail * 30.4375);
  const progress = Math.min(1.0, evaluation.effectiveDaysServed / requiredDays);

  const isEligible = evaluation.isEligibleForBail;
  const isBailStarted = evaluation.custodyStatus === 'BAIL_PROCESS_STARTED';
  const isOverridden = evaluation.isOverridden;

  async function handleExecuteConfirmBail() {
    if (!staffName.trim()) {
      Alert.alert('Validation Error', 'Please specify responsible person / officer name.');
      return;
    }
    setShowBailModal(false);
    await onConfirmBail(staffName.trim(), bailComments.trim());
  }

  async function handleExecuteOverride(setOverridden: boolean) {
    if (setOverridden && !overrideReason.trim()) {
      Alert.alert('Validation Error', 'Please provide a reason for manual override.');
      return;
    }
    setShowOverrideModal(false);
    await onOverride(setOverridden, overrideReason.trim(), staffName.trim());
  }

  async function handleExecuteRemandAdjust() {
    const daysNum = parseInt(remandPauseDaysInput, 10);
    if (isNaN(daysNum) || daysNum === 0) {
      Alert.alert('Validation Error', 'Please enter a valid number of days.');
      return;
    }
    setShowRemandModal(false);
    await onRemandAdjust(daysNum, remandReason.trim(), staffName.trim());
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header Navigation */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
          <Text style={styles.backText}>Case Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Case #{record.prisonerId}</Text>
      </View>

      {/* Primary Hero Banner */}
      <View
        style={[
          styles.heroBanner,
          {
            borderColor: isOverridden
              ? `${C.highRisk}55`
              : isEligible
              ? `${C.lowRisk}55`
              : isBailStarted
              ? 'rgba(42, 122, 175, 0.55)'
              : `${C.gold}55`,
            backgroundColor: isOverridden
              ? `${C.highRisk}12`
              : isEligible
              ? `${C.lowRisk}12`
              : isBailStarted
              ? 'rgba(42, 122, 175, 0.12)'
              : `${C.gold}12`,
          },
        ]}>
        <View style={styles.heroHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{record.fullName}</Text>
            <Text style={styles.heroMeta}>
              FIR: {record.firNumber} • Gender: {record.gender} ({record.age} yrs)
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              {
                borderColor: isOverridden ? C.highRisk : isEligible ? C.lowRisk : isBailStarted ? '#2A7AAF' : C.gold,
                backgroundColor: isOverridden ? `${C.highRisk}22` : isEligible ? `${C.lowRisk}22` : isBailStarted ? 'rgba(42, 122, 175, 0.22)' : `${C.gold}22`,
              },
            ]}>
            <Text
              style={[
                styles.statusPillText,
                { color: isOverridden ? C.highRisk : isEligible ? C.lowRisk : isBailStarted ? '#2A7AAF' : C.gold },
              ]}>
              {evaluation.custodyStatus.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <Text style={styles.legalSummaryText}>{evaluation.legalSummary}</Text>
      </View>

      {/* Human-in-the-Loop Checkpoint Action Banner */}
      {isEligible && !isBailStarted && !isOverridden && (
        <View style={[GlassCard, styles.checkpointCard]}>
          <View style={styles.checkpointIconWrap}>
            <Ionicons name="shield-checkmark" size={24} color={C.lowRisk} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.checkpointTitle}>HUMAN-IN-THE-LOOP CHECKPOINT</Text>
            <Text style={styles.checkpointDesc}>
              This prisoner meets Section 436A / BNSS 479 eligibility. Surfaces for confirmation by legal aid / staff before firing bail webhook to receiving court clerk system.
            </Text>

            <TouchableOpacity style={styles.confirmBailBtn} onPress={() => setShowBailModal(true)}>
              <Ionicons name="paper-plane" size={16} color={C.bg} />
              <Text style={styles.confirmBailBtnText}>Confirm & Initiate Bail Notification</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isBailStarted && (
        <View style={[GlassCard, styles.bailStartedBanner]}>
          <Ionicons name="checkmark-done-circle" size={22} color="#2A7AAF" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#2A7AAF' }}>Bail Process Kicked Off</Text>
            <Text style={{ fontSize: 11, color: C.textSecondary }}>
              Webhook notification delivered to DLSA / Court Clerk receiving authority.
            </Text>
          </View>
        </View>
      )}

      {/* Calculation & Progress Section */}
      <View style={[GlassCard, styles.sectionCard]}>
        <Text style={styles.sectionHeading}>STATUTORY THRESHOLD CALCULATION</Text>

        <View style={styles.calcGrid}>
          <View style={styles.calcItem}>
            <Text style={styles.calcLabel}>ADMISSION DATE</Text>
            <Text style={styles.calcValue}>{record.incarcerationDate.split('T')[0]}</Text>
          </View>
          <View style={styles.calcItem}>
            <Text style={styles.calcLabel}>RAW DAYS IN CUSTODY</Text>
            <Text style={styles.calcValue}>{evaluation.daysIncarcerated} Days</Text>
          </View>
          <View style={styles.calcItem}>
            <Text style={styles.calcLabel}>REMAND PAUSE DEDUCTION</Text>
            <Text style={[styles.calcValue, { color: evaluation.remandPauseDays > 0 ? C.mediumRisk : C.textPrimary }]}>
              -{evaluation.remandPauseDays} Days
            </Text>
          </View>
          <View style={styles.calcItem}>
            <Text style={styles.calcLabel}>EFFECTIVE DAYS SERVED</Text>
            <Text style={[styles.calcValue, { color: C.lowRisk }]}>{evaluation.effectiveDaysServed} Days</Text>
          </View>
        </View>

        {/* Visual Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressTitle}>
              Progress to {evaluation.requiredDetentionPercentage} Legal Threshold:
            </Text>
            <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: isEligible ? C.lowRisk : C.gold },
              ]}
            />
          </View>

          <Text style={styles.progressFooterNote}>
            Required: <Text style={{ fontWeight: '700', color: C.gold }}>{requiredDays} Days</Text> ({evaluation.requiredSentenceMonthsForBail} Months) • Rule: {record.isFirstOffender ? '1/3rd Max (First Offender)' : '1/2 Max (Repeat Offender)'}
          </Text>
        </View>
      </View>

      {/* Charges & Offense Breakdown */}
      <View style={[GlassCard, styles.sectionCard]}>
        <Text style={styles.sectionHeading}>CHARGE BREAKDOWN & RULE SELECTION</Text>
        <Text style={styles.sectionSubText}>
          System evaluates all charges and applies the most restrictive legal threshold.
        </Text>

        {record.charges.map((charge, idx) => (
          <View key={idx} style={styles.chargeBox}>
            <View style={styles.chargeTop}>
              <Text style={styles.chargeSectionText}>{charge.section}</Text>
              <Text style={styles.chargeSentenceText}>Max: {charge.maxSentenceMonths} Mos</Text>
            </View>
            <Text style={styles.chargeDescText}>{charge.description}</Text>

            <View style={styles.chargeTagRow}>
              {charge.section === evaluation.primaryCharge.section && (
                <View style={styles.restrictiveTag}>
                  <Text style={styles.restrictiveTagText}>Most Restrictive Rule Applied</Text>
                </View>
              )}
              {charge.isDeathOrLifePunishable && (
                <View style={styles.dangerTag}>
                  <Text style={styles.dangerTagText}>Death/Life Penalty (Excluded)</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Staff Actions Panel: Manual Override & Remand Adjustment */}
      <View style={[GlassCard, styles.sectionCard]}>
        <Text style={styles.sectionHeading}>STAFF OVERRIDE & REMAND CLOCK</Text>

        <View style={styles.staffActionRow}>
          <TouchableOpacity
            style={[styles.staffBtn, isOverridden ? styles.staffBtnActiveDanger : styles.staffBtnOutline]}
            onPress={() => setShowOverrideModal(true)}>
            <Ionicons name="hand-right-outline" size={16} color={isOverridden ? C.highRisk : C.textPrimary} />
            <Text style={[styles.staffBtnText, isOverridden && { color: C.highRisk }]}>
              {isOverridden ? 'Edit Manual Override' : 'Staff Manual Override'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.staffBtn, styles.staffBtnOutline]} onPress={() => setShowRemandModal(true)}>
            <Ionicons name="timer-outline" size={16} color={C.gold} />
            <Text style={[styles.staffBtnText, { color: C.gold }]}>Adjust Remand Clock</Text>
          </TouchableOpacity>
        </View>

        {isOverridden && (
          <View style={styles.overrideDetailBox}>
            <Text style={styles.overrideDetailTitle}>ACTIVE MANUAL OVERRIDE</Text>
            <Text style={styles.overrideDetailText}>Reason: {record.manualOverride?.reason}</Text>
            <Text style={styles.overrideDetailMeta}>
              By: {record.manualOverride?.overriddenBy || 'Staff'} • {record.manualOverride?.overriddenAt?.split('T')[0]}
            </Text>
          </View>
        )}
      </View>

      {/* Audit Log Timeline */}
      <View style={[GlassCard, styles.sectionCard]}>
        <View style={styles.auditHeader}>
          <Ionicons name="shield-checkmark-outline" size={16} color={C.gold} />
          <Text style={styles.sectionHeading}>COMPLIANCE AUDIT TRAIL</Text>
        </View>

        {auditLogs.length === 0 ? (
          <Text style={styles.emptyAuditText}>No audit entries recorded for this prisoner.</Text>
        ) : (
          auditLogs.map((log) => (
            <View key={log.id} style={styles.auditItem}>
              <View style={styles.auditDot} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.auditRow}>
                  <Text style={styles.auditType}>{log.eventType}</Text>
                  <Text style={styles.auditTime}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
                </View>
                <Text style={styles.auditDesc}>{log.description}</Text>
                <Text style={styles.auditActor}>Actor: {log.actor}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Modal 1: Human Checkpoint Confirm Bail */}
      <Modal visible={showBailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[GlassCard, styles.modalCard]}>
            <Text style={styles.modalTitle}>Confirm & Initiate Bail Notification</Text>
            <Text style={styles.modalSub}>
              Confirm that undertrial prisoner {record.fullName} meets Section 436A / BNSS 479 eligibility requirements.
            </Text>

            <Text style={styles.inputLabel}>Responsible Person / Officer Name</Text>
            <TextInput
              style={styles.modalInput}
              value={staffName}
              onChangeText={setStaffName}
              placeholder="e.g. Legal Aid Counsel / Superintendent"
              placeholderTextColor={C.textMuted}
            />

            <Text style={styles.inputLabel}>Verification Comments</Text>
            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              multiline
              value={bailComments}
              onChangeText={setBailComments}
              placeholder="Add optional notes..."
              placeholderTextColor={C.textMuted}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBailModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleExecuteConfirmBail}>
                <Ionicons name="send" size={14} color={C.bg} />
                <Text style={styles.submitBtnText}>Confirm & Fire Webhook</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Staff Manual Override */}
      <Modal visible={showOverrideModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[GlassCard, styles.modalCard]}>
            <Text style={styles.modalTitle}>Staff Manual Override</Text>
            <Text style={styles.modalSub}>
              Manually mark this prisoner ineligible for bail. Overrides automated eligibility rule engine.
            </Text>

            <Text style={styles.inputLabel}>Staff Officer Name</Text>
            <TextInput
              style={styles.modalInput}
              value={staffName}
              onChangeText={setStaffName}
              placeholder="Staff Name"
              placeholderTextColor={C.textMuted}
            />

            <Text style={styles.inputLabel}>Reason for Ineligibility Override</Text>
            <TextInput
              style={[styles.modalInput, { height: 70 }]}
              multiline
              value={overrideReason}
              onChangeText={setOverrideReason}
              placeholder="e.g. Multiple pending production warrants, flight risk order..."
              placeholderTextColor={C.textMuted}
            />

            <View style={styles.modalActions}>
              {isOverridden && (
                <TouchableOpacity style={styles.removeOverrideBtn} onPress={() => handleExecuteOverride(false)}>
                  <Text style={styles.removeOverrideText}>Remove Override</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowOverrideModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerSubmitBtn} onPress={() => handleExecuteOverride(true)}>
                <Text style={styles.submitBtnText}>Apply Override</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 3: Remand Clock Adjustment */}
      <Modal visible={showRemandModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[GlassCard, styles.modalCard]}>
            <Text style={styles.modalTitle}>Adjust Remand Clock</Text>
            <Text style={styles.modalSub}>
              Pause or add extension days to custody clock (e.g. forensic delay, stay order, stay in hospital).
            </Text>

            <Text style={styles.inputLabel}>Pause / Extension Days to Deduct</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={remandPauseDaysInput}
              onChangeText={setRemandPauseDaysInput}
              placeholder="e.g. 14"
              placeholderTextColor={C.textMuted}
            />

            <Text style={styles.inputLabel}>Justification / Court Order Ref</Text>
            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              multiline
              value={remandReason}
              onChangeText={setRemandReason}
              placeholder="e.g. Hospital stay / Stay order by High Court..."
              placeholderTextColor={C.textMuted}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRemandModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleExecuteRemandAdjust}>
                <Text style={styles.submitBtnText}>Save Clock Adjustment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 60, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 13, color: C.textPrimary, fontWeight: '600' },
  headerTitle: { fontSize: 12, fontWeight: '700', color: C.textMuted },
  heroBanner: { padding: 16, borderRadius: Radius.card, borderWidth: 1, gap: 10 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroName: { fontSize: 20, fontWeight: '800', color: C.textPrimary },
  heroMeta: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 1 },
  statusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  legalSummaryText: { fontSize: 13, color: C.textPrimary, lineHeight: 19 },
  checkpointCard: {
    padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: `${C.lowRisk}10`, borderColor: `${C.lowRisk}44`,
  },
  checkpointIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: `${C.lowRisk}20`,
    alignItems: 'center', justifyContent: 'center',
  },
  checkpointTitle: { fontSize: 10, fontWeight: '800', color: C.lowRisk, letterSpacing: 1 },
  checkpointDesc: { fontSize: 12, color: C.textPrimary, lineHeight: 17 },
  confirmBailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.lowRisk, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: Radius.button, marginTop: 8,
  },
  confirmBailBtnText: { fontSize: 12, fontWeight: '700', color: C.bg },
  bailStartedBanner: {
    padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: 'rgba(42, 122, 175, 0.1)', borderColor: 'rgba(42, 122, 175, 0.3)',
  },
  sectionCard: { padding: 14, gap: 10 },
  sectionHeading: { fontSize: 10, fontWeight: '800', color: C.gold, letterSpacing: 1.2 },
  sectionSubText: { fontSize: 11, color: C.textMuted },
  calcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  calcItem: {
    width: '48%', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    padding: 10, borderRadius: Radius.button, gap: 2,
  },
  calcLabel: { fontSize: 8, fontWeight: '800', color: C.textMuted, letterSpacing: 0.6 },
  calcValue: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  progressContainer: { gap: 6, marginTop: 4 },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressTitle: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
  progressPct: { fontSize: 12, fontWeight: '800', color: C.gold },
  progressBarTrack: { height: 10, backgroundColor: C.borderSubtle, borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  progressFooterNote: { fontSize: 10, color: C.textMuted },
  chargeBox: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: Radius.button, padding: 10, gap: 4,
  },
  chargeTop: { flexDirection: 'row', justifyContent: 'space-between' },
  chargeSectionText: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  chargeSentenceText: { fontSize: 11, fontWeight: '700', color: C.gold },
  chargeDescText: { fontSize: 12, color: C.textSecondary },
  chargeTagRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  restrictiveTag: { backgroundColor: C.goldGlow, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill, borderWidth: 1, borderColor: C.goldBorder },
  restrictiveTagText: { fontSize: 9, fontWeight: '700', color: C.gold },
  dangerTag: { backgroundColor: `${C.highRisk}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill, borderWidth: 1, borderColor: `${C.highRisk}44` },
  dangerTagText: { fontSize: 9, fontWeight: '700', color: C.highRisk },
  staffActionRow: { flexDirection: 'row', gap: 8 },
  staffBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: Radius.button, borderWidth: 1,
  },
  staffBtnOutline: { backgroundColor: C.surface, borderColor: C.border },
  staffBtnActiveDanger: { backgroundColor: `${C.highRisk}15`, borderColor: C.highRisk },
  staffBtnText: { fontSize: 11, fontWeight: '700', color: C.textPrimary },
  overrideDetailBox: {
    backgroundColor: `${C.highRisk}10`, borderWidth: 1, borderColor: `${C.highRisk}33`,
    padding: 10, borderRadius: Radius.button, gap: 2,
  },
  overrideDetailTitle: { fontSize: 9, fontWeight: '800', color: C.highRisk, letterSpacing: 0.8 },
  overrideDetailText: { fontSize: 12, color: C.textPrimary },
  overrideDetailMeta: { fontSize: 10, color: C.textMuted },
  auditHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emptyAuditText: { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },
  auditItem: { flexDirection: 'row', gap: 10, paddingTop: 6, borderBottomWidth: 1, borderBottomColor: C.borderSubtle, paddingBottom: 8 },
  auditDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.gold, marginTop: 4 },
  auditRow: { flexDirection: 'row', justifyContent: 'space-between' },
  auditType: { fontSize: 10, fontWeight: '800', color: C.gold, letterSpacing: 0.6 },
  auditTime: { fontSize: 10, color: C.textMuted },
  auditDesc: { fontSize: 12, color: C.textPrimary },
  auditActor: { fontSize: 10, color: C.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { padding: 18, gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary },
  modalSub: { fontSize: 12, color: C.textSecondary, lineHeight: 17 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: C.textSecondary, marginTop: 4 },
  modalInput: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: Radius.button, padding: 10, fontSize: 12, color: C.textPrimary,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.button, backgroundColor: C.surface },
  cancelBtnText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.button, backgroundColor: C.gold },
  dangerSubmitBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.button, backgroundColor: C.highRisk },
  removeOverrideBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.button, backgroundColor: `${C.highRisk}15` },
  removeOverrideText: { fontSize: 12, color: C.highRisk, fontWeight: '700' },
  submitBtnText: { fontSize: 12, color: C.bg, fontWeight: '700' },
});
