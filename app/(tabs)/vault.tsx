import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, GlassCard, Radius, Serif } from '@/constants/colors';
import { VaultProvider, useVault } from '@/context/vault-context';
import { createCase, getCases } from '@/services/vaultService';
import type { NewCasePayload, VaultCase, VaultUserRole } from '@/types/vault';

const ROLE_OPTIONS: { key: VaultUserRole; label: string; icon: string }[] = [
  { key: 'advocate',  label: 'Advocate',       icon: 'scale-outline' },
  { key: 'client',    label: 'Client',          icon: 'person-outline' },
  { key: 'junior',    label: 'Junior Associate', icon: 'school-outline' },
];

const ROLE_LABELS: Record<VaultUserRole, string> = {
  advocate: 'Advocate',
  client:   'Client',
  junior:   'Junior Associate',
};

const CASE_TYPES = ['Civil', 'Criminal', 'Family', 'Property', 'Contract', 'Labour', 'Other'];

// ─── Auth Screen ──────────────────────────────────────────────────────────────

function AuthScreen() {
  const { login, register, isLoading, error, clearError } = useVault();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<VaultUserRole>('advocate');
  const [barNumber, setBarNumber] = useState('');

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    clearError();
  };

  const handleSubmit = async () => {
    if (mode === 'login') {
      await login(email.trim(), password).catch(() => {});
    } else {
      await register(name.trim(), email.trim(), password, role, barNumber.trim() || undefined).catch(() => {});
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.authScroll}
        keyboardShouldPersistTaps="handled">

        <View style={s.authHero}>
          <View style={s.vaultIconBox}>
            <Ionicons name="archive-outline" size={30} color={C.gold} />
          </View>
          <Text style={s.vaultTitle}>LexVault</Text>
          <Text style={s.vaultSub}>Secure document vault for legal professionals</Text>
        </View>

        <View style={[GlassCard, s.authCard]}>
          {/* Mode toggle */}
          <View style={s.modeRow}>
            {(['login', 'register'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[s.modeTab, mode === m && s.modeTabActive]}
                onPress={() => switchMode(m)}>
                <Text style={[s.modeTabText, mode === m && s.modeTabTextActive]}>
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'register' && (
            <>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>FULL NAME</Text>
                <TextInput
                  style={s.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your full name"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="words"
                />
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>ROLE</Text>
                <View style={s.roleRow}>
                  {ROLE_OPTIONS.map((r) => (
                    <TouchableOpacity
                      key={r.key}
                      style={[s.roleChip, role === r.key && s.roleChipActive]}
                      onPress={() => setRole(r.key)}>
                      <Ionicons
                        name={r.icon as any}
                        size={13}
                        color={role === r.key ? C.elevated : C.textMuted}
                      />
                      <Text style={[s.roleChipText, role === r.key && s.roleChipTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {role === 'advocate' && (
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>BAR ENROLMENT NUMBER</Text>
                  <TextInput
                    style={s.input}
                    value={barNumber}
                    onChangeText={setBarNumber}
                    placeholder="Optional"
                    placeholderTextColor={C.textMuted}
                    autoCapitalize="characters"
                  />
                </View>
              )}
            </>
          )}

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>EMAIL</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={C.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>PASSWORD</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••'}
              placeholderTextColor={C.textMuted}
              secureTextEntry
            />
          </View>

          {error && (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle" size={14} color={C.highRisk} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.submitBtn, isLoading && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}>
            {isLoading ? (
              <ActivityIndicator size="small" color={C.elevated} />
            ) : (
              <Text style={s.submitBtnText}>
                {mode === 'login' ? 'Sign In to Vault' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={s.authNote}>
          LexVault is separate from your LexAI account.{'\n'}Your documents are encrypted and access-controlled.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── New Case Modal ───────────────────────────────────────────────────────────

function NewCaseModal({ visible, token, onClose, onCreated }: {
  visible: boolean;
  token: string;
  onClose: () => void;
  onCreated: (c: VaultCase) => void;
}) {
  const [title, setTitle]           = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [court, setCourt]           = useState('');
  const [caseType, setCaseType]     = useState('Civil');
  const [clientName, setClientName] = useState('');
  const [nextHearing, setNextHearing] = useState('');
  const [loading, setLoading]       = useState(false);
  const [err, setErr]               = useState('');

  const reset = () => {
    setTitle(''); setCaseNumber(''); setCourt('');
    setCaseType('Civil'); setClientName(''); setNextHearing('');
    setErr('');
  };

  const handleCreate = async () => {
    if (!title.trim() || !clientName.trim()) {
      setErr('Case title and client name are required.');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      const payload: NewCasePayload = {
        title: title.trim(),
        caseType,
        clientName: clientName.trim(),
        caseNumber: caseNumber.trim() || undefined,
        court: court.trim() || undefined,
        nextHearing: nextHearing.trim() || undefined,
      };
      const newCase = await createCase(token, payload);
      reset();
      onCreated(newCase);
    } catch (e: any) {
      setErr(e.message || 'Failed to create case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.modalBg}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[GlassCard, s.modalCard]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Case</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}>
              <Ionicons name="close" size={22} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>CASE TITLE *</Text>
              <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. Property Dispute – Chennai" placeholderTextColor={C.textMuted} />
            </View>
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>CLIENT NAME *</Text>
              <TextInput style={s.input} value={clientName} onChangeText={setClientName} placeholder="Full name of client" placeholderTextColor={C.textMuted} autoCapitalize="words" />
            </View>
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>CASE TYPE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}>
                {CASE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.pill, caseType === t && s.pillActive]}
                    onPress={() => setCaseType(t)}>
                    <Text style={[s.pillText, caseType === t && s.pillTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>CASE NUMBER</Text>
              <TextInput style={s.input} value={caseNumber} onChangeText={setCaseNumber} placeholder="Optional" placeholderTextColor={C.textMuted} autoCapitalize="characters" />
            </View>
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>COURT</Text>
              <TextInput style={s.input} value={court} onChangeText={setCourt} placeholder="e.g. Madras High Court" placeholderTextColor={C.textMuted} autoCapitalize="words" />
            </View>
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>NEXT HEARING DATE</Text>
              <TextInput style={s.input} value={nextHearing} onChangeText={setNextHearing} placeholder="DD/MM/YYYY (optional)" placeholderTextColor={C.textMuted} keyboardType="numbers-and-punctuation" />
            </View>
          </ScrollView>

          {err ? (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle" size={14} color={C.highRisk} />
              <Text style={s.errorText}>{err}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.submitBtn, loading && s.submitBtnDisabled]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator size="small" color={C.elevated} />
              : <Text style={s.submitBtnText}>Create Case</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Case Card ────────────────────────────────────────────────────────────────

function CaseCard({ item }: { item: VaultCase }) {
  const router = useRouter();
  const statusColor = item.status === 'active' ? C.lowRisk : item.status === 'pending' ? C.gold : C.textMuted;
  const date = new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/vault/[caseId]' as any, params: { caseId: item.id } })}
      style={[GlassCard, s.caseCard]}>
      <View style={s.caseCardTop}>
        <View style={s.caseIconBox}>
          <Ionicons name="folder-outline" size={16} color={C.gold} />
        </View>
        <View style={[s.statusBadge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}40` }]}>
          <Text style={[s.statusText, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={s.caseTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={s.caseSub}>{item.caseType}  ·  {item.clientName}</Text>
      {item.court && <Text style={s.caseCourt} numberOfLines={1}>{item.court}</Text>}
      <View style={s.caseMeta}>
        <View style={s.caseMetaItem}>
          <Ionicons name="document-text-outline" size={11} color={C.textMuted} />
          <Text style={s.caseMetaText}>{item.documentCount} docs</Text>
        </View>
        {item.nextHearing && (
          <View style={s.caseMetaItem}>
            <Ionicons name="calendar-outline" size={11} color={C.gold} />
            <Text style={[s.caseMetaText, { color: C.gold }]}>{item.nextHearing}</Text>
          </View>
        )}
        <Text style={s.caseDate}>{date}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

function DashboardScreen() {
  const { user, token, logout } = useVault();
  const [casesList, setCasesList] = useState<VaultCase[]>([]);
  const [loading, setLoading]    = useState(true);
  const [showNew, setShowNew]    = useState(false);
  const [query, setQuery]        = useState('');
  const canCreateCase = user?.role !== 'client';

  useEffect(() => {
    if (!token) return;
    getCases(token)
      .then(setCasesList)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const handleCaseCreated = (c: VaultCase) => {
    setCasesList((prev) => [c, ...prev]);
    setShowNew(false);
  };

  const filtered = query.trim()
    ? casesList.filter((c) =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.clientName.toLowerCase().includes(query.toLowerCase()) ||
        (c.caseNumber ?? '').toLowerCase().includes(query.toLowerCase()) ||
        c.caseType.toLowerCase().includes(query.toLowerCase()),
      )
    : casesList;

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.dashScroll}>

        {/* Header */}
        <View style={s.dashHeader}>
          <View style={s.dashHeaderLeft}>
            <Text style={s.dashEyebrow}>LEXVAULT</Text>
            <Text style={s.dashName}>{user?.name}</Text>
            <View style={s.roleBadge}>
              <Text style={s.roleBadgeText}>{ROLE_LABELS[user!.role]}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={s.divider} />

        {/* Search */}
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={15} color={C.textMuted} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search cases, clients…"
            placeholderTextColor={C.textMuted}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Cases section */}
        <View style={s.sectionRow}>
          <Text style={s.sectionLabel}>MY CASES</Text>
          <Text style={s.sectionCount}>{filtered.length}{query ? ` of ${casesList.length}` : ''}</Text>
        </View>

        {loading ? (
          <View style={s.centerBox}>
            <ActivityIndicator color={C.gold} />
          </View>
        ) : casesList.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconBox}>
              <Ionicons name="archive-outline" size={26} color={C.gold} />
            </View>
            <Text style={s.emptyTitle}>No cases yet</Text>
            <Text style={s.emptySub}>
              {canCreateCase
                ? 'Create your first case to start organising documents'
                : 'Your advocate will add you to cases. Check back soon.'}
            </Text>
            {canCreateCase && (
              <TouchableOpacity style={s.newCaseBtn} onPress={() => setShowNew(true)}>
                <Ionicons name="add" size={16} color={C.elevated} />
                <Text style={s.newCaseBtnText}>New Case</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconBox}>
              <Ionicons name="search-outline" size={26} color={C.gold} />
            </View>
            <Text style={s.emptyTitle}>No matches</Text>
            <Text style={s.emptySub}>No cases match &quot;{query}&quot;</Text>
          </View>
        ) : (
          <View style={s.casesList}>
            {filtered.map((c) => <CaseCard key={c.id} item={c} />)}
          </View>
        )}
      </ScrollView>

      {/* FAB — advocates/juniors only */}
      {casesList.length > 0 && canCreateCase && (
        <TouchableOpacity style={s.fab} onPress={() => setShowNew(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={24} color={C.elevated} />
        </TouchableOpacity>
      )}

      {token && canCreateCase && (
        <NewCaseModal
          visible={showNew}
          token={token}
          onClose={() => setShowNew(false)}
          onCreated={handleCaseCreated}
        />
      )}
    </>
  );
}

// ─── Root Screen ──────────────────────────────────────────────────────────────

function VaultContent() {
  const { user, isLoading } = useVault();

  if (isLoading) {
    return (
      <View style={s.splashBox}>
        <View style={s.vaultIconBox}>
          <Ionicons name="archive-outline" size={28} color={C.gold} />
        </View>
        <ActivityIndicator color={C.gold} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return user ? <DashboardScreen /> : <AuthScreen />;
}

export default function VaultTab() {
  return (
    <VaultProvider>
      <Tabs.Screen
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={s.tabIconWrapper}>
              <Ionicons
                name={focused ? 'archive' : 'archive-outline'}
                size={22}
                color={focused ? C.ink : C.textMuted}
              />
              {focused && <View style={s.activeDot} />}
            </View>
          ),
          tabBarShowLabel: false,
        }}
      />
      <SafeAreaView style={s.container}>
        <VaultContent />
      </SafeAreaView>
    </VaultProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Tab icon
  tabIconWrapper: { alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 4 },
  activeDot:      { width: 4, height: 4, borderRadius: 2, backgroundColor: C.gold },

  // Splash
  splashBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  // Auth
  authScroll: { padding: 24, gap: 20, paddingBottom: 60 },
  authHero:   { alignItems: 'center', gap: 10, paddingTop: 20, paddingBottom: 8 },
  vaultIconBox: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center',
  },
  vaultTitle: { fontFamily: Serif, fontSize: 28, color: C.ink, letterSpacing: -0.5 },
  vaultSub:   { fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },
  authCard:   { padding: 20, gap: 16 },
  authNote:   { fontSize: 11, color: C.textMuted, textAlign: 'center', lineHeight: 17 },

  modeRow:         { flexDirection: 'row', backgroundColor: C.bg, borderRadius: Radius.button, padding: 3 },
  modeTab:         { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: Radius.button - 2 },
  modeTabActive:   { backgroundColor: C.elevated, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  modeTabText:     { fontSize: 13, fontWeight: '500', color: C.textMuted },
  modeTabTextActive: { color: C.ink, fontWeight: '600' },

  roleRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.elevated },
  roleChipActive:    { backgroundColor: C.ink, borderColor: C.ink },
  roleChipText:      { fontSize: 12, fontWeight: '500', color: C.textMuted },
  roleChipTextActive: { color: C.elevated },

  // Shared form
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: C.gold },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: Radius.button, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: C.textPrimary,
  },
  errorBanner: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: 'rgba(184,50,50,0.08)', borderWidth: 1,
    borderColor: 'rgba(184,50,50,0.25)', borderRadius: Radius.button, padding: 10,
  },
  errorText:  { flex: 1, fontSize: 12, color: C.highRisk, fontWeight: '500' },
  submitBtn:  { height: 50, backgroundColor: C.ink, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: C.elevated, letterSpacing: 0.3 },

  // Pills
  pillRow:     { gap: 8, paddingBottom: 2 },
  pill:        { borderWidth: 1, borderColor: C.border, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: C.elevated },
  pillActive:  { backgroundColor: C.gold, borderColor: C.gold },
  pillText:    { fontSize: 12, fontWeight: '500', color: C.textSecondary },
  pillTextActive: { color: C.elevated, fontWeight: '600' },

  // Dashboard
  dashScroll:  { paddingHorizontal: 20, paddingBottom: 100, gap: 16 },
  dashHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 20 },
  dashHeaderLeft: { gap: 4 },
  dashEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 3, color: C.gold },
  dashName:    { fontFamily: Serif, fontSize: 24, color: C.ink, lineHeight: 30 },
  roleBadge:   { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, backgroundColor: C.goldSoft, borderRadius: Radius.pill, borderWidth: 1, borderColor: C.goldBorder },
  roleBadgeText: { fontSize: 10, fontWeight: '600', color: C.gold, letterSpacing: 0.5 },
  logoutBtn:   { padding: 8 },
  divider:     { height: 1, backgroundColor: C.border, marginVertical: 4 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    borderRadius: Radius.button, paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.textPrimary, paddingVertical: 0 },

  sectionRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: C.gold },
  sectionCount: { fontSize: 12, fontWeight: '600', color: C.textMuted },

  // Cases list
  casesList:   { gap: 12 },
  caseCard:    { padding: 16, gap: 8 },
  caseCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caseIconBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  statusText:  { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  caseTitle:   { fontFamily: Serif, fontSize: 15, color: C.ink, lineHeight: 21 },
  caseSub:     { fontSize: 12, color: C.textSecondary },
  caseCourt:   { fontSize: 11, color: C.textMuted },
  caseMeta:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
  caseMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  caseMetaText: { fontSize: 11, color: C.textMuted },
  caseDate:    { marginLeft: 'auto', fontSize: 10, color: C.textMuted },

  // Empty state
  centerBox:   { padding: 40, alignItems: 'center' },
  emptyState:  { alignItems: 'center', padding: 32, gap: 10 },
  emptyIconBox: { width: 60, height: 60, borderRadius: 16, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:  { fontFamily: Serif, fontSize: 20, color: C.ink },
  emptySub:    { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19, maxWidth: 260 },
  newCaseBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: C.ink, borderRadius: Radius.button, paddingHorizontal: 20, paddingVertical: 10 },
  newCaseBtnText: { fontSize: 13, fontWeight: '600', color: C.elevated },

  // FAB
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.ink, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  // Modal
  modalBg:   { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end', padding: 12, paddingBottom: 0 },
  modalCard: { padding: 20, gap: 14, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontFamily: Serif, fontSize: 20, color: C.ink },
});
