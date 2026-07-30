import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { C, GlassCard, Radius } from '@/constants/colors';
import type { BNSS479EligibilityResult, CustodyStatus, PrisonerRecordPayload } from '@/types/undertrialBail';

interface UndertrialDashboardProps {
  cases: Array<{ record: PrisonerRecordPayload; evaluation: BNSS479EligibilityResult }>;
  loading: boolean;
  onRefresh: () => void;
  onSelectCase: (record: PrisonerRecordPayload, evaluation: BNSS479EligibilityResult) => void;
  onRunCronCheck: () => void;
  cronRunning: boolean;
}

type FilterTab = 'ALL' | 'ELIGIBLE' | 'BAIL_STARTED' | 'IN_CUSTODY' | 'OVERRIDDEN';

export const UndertrialDashboard: React.FC<UndertrialDashboardProps> = ({
  cases,
  loading,
  onRefresh,
  onSelectCase,
  onRunCronCheck,
  cronRunning,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  const filteredCases = cases.filter(({ record, evaluation }) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      record.fullName.toLowerCase().includes(query) ||
      record.prisonerId.toLowerCase().includes(query) ||
      record.firNumber.toLowerCase().includes(query) ||
      evaluation.primaryCharge.section.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (activeFilter === 'ELIGIBLE') return evaluation.custodyStatus === 'ELIGIBLE';
    if (activeFilter === 'BAIL_STARTED') return evaluation.custodyStatus === 'BAIL_PROCESS_STARTED';
    if (activeFilter === 'IN_CUSTODY') return evaluation.custodyStatus === 'IN_CUSTODY';
    if (activeFilter === 'OVERRIDDEN') return evaluation.custodyStatus === 'INELIGIBLE_OVERRIDDEN';

    return true;
  });

  const countEligible = cases.filter((c) => c.evaluation.custodyStatus === 'ELIGIBLE').length;
  const countBailStarted = cases.filter((c) => c.evaluation.custodyStatus === 'BAIL_PROCESS_STARTED').length;

  return (
    <View style={styles.container}>
      {/* Metrics Banner */}
      <View style={styles.metricsRow}>
        <View style={[GlassCard, styles.metricBox]}>
          <Text style={styles.metricLabel}>TOTAL TRACKED</Text>
          <Text style={styles.metricValue}>{cases.length}</Text>
        </View>

        <View style={[GlassCard, styles.metricBox, { borderColor: `${C.lowRisk}44`, backgroundColor: `${C.lowRisk}10` }]}>
          <Text style={[styles.metricLabel, { color: C.lowRisk }]}>ELIGIBLE FOR BAIL</Text>
          <Text style={[styles.metricValue, { color: C.lowRisk }]}>{countEligible}</Text>
        </View>

        <View style={[GlassCard, styles.metricBox, { borderColor: `${C.gold}44`, backgroundColor: `${C.gold}10` }]}>
          <Text style={[styles.metricLabel, { color: C.gold }]}>BAIL PROCESS STARTED</Text>
          <Text style={[styles.metricValue, { color: C.gold }]}>{countBailStarted}</Text>
        </View>
      </View>

      {/* Action Header */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={16} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by prisoner name, ID, FIR, charge..."
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.cronBtn, cronRunning && styles.cronBtnDisabled]}
          onPress={onRunCronCheck}
          disabled={cronRunning}>
          {cronRunning ? (
            <ActivityIndicator size="small" color={C.bg} />
          ) : (
            <>
              <Ionicons name="refresh-circle-outline" size={16} color={C.bg} />
              <Text style={styles.cronBtnText}>Run Cron Job</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'ELIGIBLE', 'BAIL_STARTED', 'IN_CUSTODY', 'OVERRIDDEN'] as FilterTab[]).map((tab) => {
          const isActive = activeFilter === tab;
          let label = tab.replace('_', ' ');
          if (tab === 'ALL') label = `All (${cases.length})`;
          if (tab === 'ELIGIBLE') label = `Eligible (${countEligible})`;
          if (tab === 'BAIL_STARTED') label = `Bail Started (${countBailStarted})`;

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(tab)}>
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Case List */}
      {loading && cases.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={styles.loadingText}>Evaluating Undertrial Records...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCases}
          keyExtractor={(item) => item.record.prisonerId}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={C.gold} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={40} color={C.textMuted} />
              <Text style={styles.emptyTitle}>No matching undertrial cases found</Text>
              <Text style={styles.emptySub}>Try clearing filters or search parameters.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const { record, evaluation } = item;
            const requiredDays = Math.ceil(evaluation.requiredSentenceMonthsForBail * 30.4375);
            const progress = Math.min(1.0, evaluation.effectiveDaysServed / requiredDays);

            let statusBg = `${C.gold}15`;
            let statusBorder = `${C.gold}44`;
            let statusText: string = C.gold;
            let statusIcon: keyof typeof Ionicons.glyphMap = 'time-outline';

            if (evaluation.custodyStatus === 'ELIGIBLE') {
              statusBg = `${C.lowRisk}15`;
              statusBorder = `${C.lowRisk}44`;
              statusText = C.lowRisk;
              statusIcon = 'checkmark-circle-outline';
            } else if (evaluation.custodyStatus === 'BAIL_PROCESS_STARTED') {
              statusBg = 'rgba(42, 122, 175, 0.15)';
              statusBorder = 'rgba(42, 122, 175, 0.4)';
              statusText = '#2A7AAF';
              statusIcon = 'paper-plane-outline';
            } else if (evaluation.custodyStatus === 'INELIGIBLE_OVERRIDDEN') {
              statusBg = `${C.highRisk}15`;
              statusBorder = `${C.highRisk}44`;
              statusText = C.highRisk;
              statusIcon = 'ban-outline';
            }

            return (
              <TouchableOpacity
                style={[GlassCard, styles.caseCard]}
                onPress={() => onSelectCase(record, evaluation)}
                activeOpacity={0.7}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prisonerName}>{record.fullName}</Text>
                    <Text style={styles.prisonerSub}>
                      ID: {record.prisonerId} • FIR: {record.firNumber}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: statusBg, borderColor: statusBorder }]}>
                    <Ionicons name={statusIcon} size={12} color={statusText} />
                    <Text style={[styles.badgeText, { color: statusText }]}>
                      {evaluation.custodyStatus.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>

                <View style={styles.chargeSection}>
                  <Text style={styles.chargeText}>
                    Charge: <Text style={styles.chargeHighlight}>{evaluation.primaryCharge.section}</Text> ({evaluation.primaryCharge.description})
                  </Text>
                  {record.charges.length > 1 && (
                    <Text style={styles.multiChargeTag}>+{record.charges.length - 1} additional charges</Text>
                  )}
                </View>

                {/* Progress Indicator Bar */}
                <View style={styles.progressWrap}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressLabel}>
                      Time Served: <Text style={{ color: C.textPrimary, fontWeight: '700' }}>{evaluation.effectiveDaysServed} days</Text>
                    </Text>
                    <Text style={styles.progressThreshold}>
                      Threshold ({evaluation.requiredDetentionPercentage}): <Text style={{ color: C.gold, fontWeight: '700' }}>{requiredDays} days</Text>
                    </Text>
                  </View>

                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.round(progress * 100)}%`,
                          backgroundColor: evaluation.isEligibleForBail ? C.lowRisk : C.gold,
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.facilityText}>Facility: {record.prisonLocation}</Text>
                  <View style={styles.actionLink}>
                    <Text style={styles.actionLinkText}>View Details</Text>
                    <Ionicons name="chevron-forward" size={14} color={C.gold} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metricBox: { flex: 1, padding: 10, borderRadius: Radius.button, gap: 4 },
  metricLabel: { fontSize: 8, fontWeight: '800', color: C.textMuted, letterSpacing: 0.8 },
  metricValue: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  searchBarRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: Radius.button, paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, color: C.textPrimary, fontSize: 12 },
  cronBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.gold, paddingHorizontal: 12, height: 42,
    borderRadius: Radius.button, justifyContent: 'center',
  },
  cronBtnDisabled: { opacity: 0.6 },
  cronBtnText: { fontSize: 11, fontWeight: '700', color: C.bg },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  filterChipActive: { backgroundColor: C.goldGlow, borderColor: C.gold },
  filterChipText: { fontSize: 10, fontWeight: '600', color: C.textSecondary },
  filterChipTextActive: { color: C.gold, fontWeight: '800' },
  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  listContent: { gap: 12, paddingBottom: 40 },
  emptyState: { padding: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  emptySub: { fontSize: 12, color: C.textMuted },
  caseCard: { padding: 14, gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  prisonerName: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  prisonerSub: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 1,
  },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  chargeSection: { gap: 2 },
  chargeText: { fontSize: 12, color: C.textSecondary },
  chargeHighlight: { fontWeight: '700', color: C.textPrimary },
  multiChargeTag: { fontSize: 10, color: C.gold, fontWeight: '600' },
  progressWrap: { gap: 6, marginTop: 2 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 11, color: C.textSecondary },
  progressThreshold: { fontSize: 11, color: C.textSecondary },
  progressBarTrack: {
    height: 8, backgroundColor: C.borderSubtle, borderRadius: 4, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: C.borderSubtle,
  },
  facilityText: { fontSize: 10, color: C.textMuted },
  actionLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionLinkText: { fontSize: 11, fontWeight: '700', color: C.gold },
});
