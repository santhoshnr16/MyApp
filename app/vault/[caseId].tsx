import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { getStoredVaultSession } from '@/services/vaultAuth';
import {
  addCaseMember,
  createRequest,
  deleteDocument,
  documentViewUrl,
  getCase,
  getCaseMembers,
  getDocuments,
  getMessages,
  getRequests,
  removeCaseMember,
  searchUser,
  sendMessage,
  updateCase,
  updateRequestStatus,
  uploadDocument,
} from '@/services/vaultService';
import type {
  VaultCase,
  VaultDocument,
  VaultMember,
  VaultMemberRole,
  VaultMessage,
  VaultRequest,
  VaultUser,
  VaultUserRole,
  VaultUserSearchResult,
} from '@/types/vault';

// ─── Constants ────────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'documents' | 'chat' | 'requests' | 'team';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview',  label: 'Overview',  icon: 'information-circle-outline' },
  { key: 'documents', label: 'Docs',      icon: 'document-text-outline' },
  { key: 'chat',      label: 'Chat',      icon: 'chatbubbles-outline' },
  { key: 'requests',  label: 'Requests',  icon: 'list-outline' },
  { key: 'team',      label: 'Team',      icon: 'people-outline' },
];

const MEMBER_ROLE_OPTIONS: { key: VaultMemberRole; label: string }[] = [
  { key: 'advocate', label: 'Advocate' },
  { key: 'junior',   label: 'Junior' },
  { key: 'client',   label: 'Client' },
];

const ROLE_COLORS: Record<VaultMemberRole, string> = {
  owner:    C.ink,
  advocate: '#4A6A9A',
  junior:   '#6A8A5A',
  client:   C.gold,
};

const STATUS_OPTIONS: VaultCase['status'][] = ['active', 'pending', 'closed', 'archived'];

const REQUEST_TYPES: { key: VaultRequest['requestType']; label: string }[] = [
  { key: 'document_upload', label: 'Document Upload' },
  { key: 'status_update',   label: 'Status Update' },
  { key: 'meeting',         label: 'Meeting' },
  { key: 'query',           label: 'Query' },
  { key: 'other',           label: 'Other' },
];

const PRIORITY_OPTIONS: VaultRequest['priority'][] = ['urgent', 'high', 'normal', 'low'];

const REQUEST_STATUS_NEXT: Record<VaultRequest['status'], VaultRequest['status'] | null> = {
  open: 'in_progress',
  in_progress: 'resolved',
  resolved: 'closed',
  closed: null,
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function statusColor(status: VaultCase['status']) {
  return status === 'active' ? C.lowRisk : status === 'pending' ? C.gold : C.textMuted;
}

function priorityColor(p: VaultRequest['priority']) {
  return p === 'urgent' ? C.highRisk : p === 'high' ? '#E07C2A' : p === 'normal' ? C.gold : C.textMuted;
}

function reqStatusColor(s: VaultRequest['status']) {
  return s === 'open' ? C.gold : s === 'in_progress' ? '#4A90D9' : s === 'resolved' ? C.lowRisk : C.textMuted;
}

// ─── Session hook ─────────────────────────────────────────────────────────────

function useVaultSession() {
  const [session, setSession] = useState<{ token: string; user: VaultUser } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getStoredVaultSession()
      .then(setSession)
      .finally(() => setLoading(false));
  }, []);
  return { session, loading };
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ caseData, token, myRole, onUpdated, onSwitchTab }: {
  caseData: VaultCase;
  token: string;
  myRole: VaultMemberRole;
  onUpdated: (c: VaultCase) => void;
  onSwitchTab: (tab: TabKey) => void;
}) {
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const isAdvocate = myRole === 'owner' || myRole === 'advocate';
  const isClient = myRole === 'client';

  const handleStatusChange = async (s: VaultCase['status']) => {
    setShowStatusPicker(false);
    setSaving(true);
    try {
      const updated = await updateCase(token, caseData.id, { status: s });
      onUpdated(updated);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const sc = statusColor(caseData.status);

  if (isClient) {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={d.tabScroll}>
        {/* Client portal header */}
        <View style={[GlassCard, d.clientHeroCard]}>
          <View style={d.clientHeroTop}>
            <View style={d.clientHeroIcon}>
              <Ionicons name="briefcase-outline" size={20} color={C.gold} />
            </View>
            <View style={[d.statusPill, { backgroundColor: `${sc}15`, borderColor: `${sc}40` }]}>
              <Text style={[d.statusPillText, { color: sc }]}>{caseData.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={d.clientHeroTitle}>{caseData.title}</Text>
          <Text style={d.clientHeroSub}>{caseData.caseType}</Text>
        </View>

        {/* Next hearing — prominent for client */}
        {caseData.nextHearing && (
          <View style={[GlassCard, d.hearingCard]}>
            <View style={d.hearingCardLeft}>
              <Ionicons name="calendar" size={20} color={C.gold} />
              <View>
                <Text style={d.hearingLabel}>NEXT HEARING</Text>
                <Text style={d.hearingDate}>{caseData.nextHearing}</Text>
              </View>
            </View>
            <View style={d.hearingBadge}>
              <Text style={d.hearingBadgeText}>Upcoming</Text>
            </View>
          </View>
        )}

        {/* Advocate contact */}
        {caseData.advocateName && (
          <View style={[GlassCard, d.infoCard]}>
            <Text style={d.infoCardLabel}>YOUR LEGAL TEAM</Text>
            <View style={d.advocateRow}>
              <View style={d.advocateAvatar}>
                <Text style={d.advocateAvatarText}>{caseData.advocateName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={d.advocateInfo}>
                <Text style={d.advocateName}>{caseData.advocateName}</Text>
                <Text style={d.advocateRole}>Advocate</Text>
              </View>
              <TouchableOpacity style={d.advocateMsgBtn} onPress={() => onSwitchTab('chat')}>
                <Ionicons name="chatbubble-outline" size={14} color={C.elevated} />
                <Text style={d.advocateMsgBtnText}>Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick actions */}
        <View style={[GlassCard, d.infoCard]}>
          <Text style={d.infoCardLabel}>QUICK ACTIONS</Text>
          <View style={d.quickActionsRow}>
            <TouchableOpacity style={d.quickActionBtn} onPress={() => onSwitchTab('chat')}>
              <View style={d.quickActionIcon}><Ionicons name="chatbubbles-outline" size={20} color={C.gold} /></View>
              <Text style={d.quickActionLabel}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={d.quickActionBtn} onPress={() => onSwitchTab('requests')}>
              <View style={d.quickActionIcon}><Ionicons name="list-outline" size={20} color={C.gold} /></View>
              <Text style={d.quickActionLabel}>Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={d.quickActionBtn} onPress={() => onSwitchTab('documents')}>
              <View style={d.quickActionIcon}><Ionicons name="document-text-outline" size={20} color={C.gold} /></View>
              <Text style={d.quickActionLabel}>Documents</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Case info (minimal for client) */}
        <View style={[GlassCard, d.infoCard]}>
          <Text style={d.infoCardLabel}>CASE DETAILS</Text>
          <InfoRow icon="briefcase-outline" label="Type"   value={caseData.caseType} />
          {caseData.court       && <InfoRow icon="business-outline" label="Court"  value={caseData.court} />}
          {caseData.caseNumber  && <InfoRow icon="barcode-outline"  label="No."    value={caseData.caseNumber} />}
          <InfoRow icon="time-outline" label="Filed" value={new Date(caseData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
        </View>
      </ScrollView>
    );
  }

  // ── Advocate / Junior view ──────────────────────────────────────────────────
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={d.tabScroll}>
      <View style={[GlassCard, d.infoCard]}>
        <Text style={d.infoCardLabel}>CASE DETAILS</Text>
        <InfoRow icon="briefcase-outline"  label="Type"    value={caseData.caseType} />
        <InfoRow icon="person-outline"     label="Client"  value={caseData.clientName} />
        {caseData.advocateName && <InfoRow icon="scale-outline"    label="Advocate" value={caseData.advocateName} />}
        {caseData.caseNumber   && <InfoRow icon="barcode-outline"  label="Case No." value={caseData.caseNumber} />}
        {caseData.court        && <InfoRow icon="business-outline" label="Court"    value={caseData.court} />}
        {caseData.nextHearing  && <InfoRow icon="calendar-outline" label="Hearing"  value={caseData.nextHearing} gold />}
        <InfoRow icon="time-outline" label="Filed" value={new Date(caseData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
      </View>

      <View style={[GlassCard, d.infoCard]}>
        <Text style={d.infoCardLabel}>STATUS</Text>
        <View style={d.statusRow}>
          <View style={[d.statusPill, { backgroundColor: `${sc}15`, borderColor: `${sc}40` }]}>
            <Text style={[d.statusPillText, { color: sc }]}>{caseData.status.toUpperCase()}</Text>
          </View>
          {isAdvocate && (
            <TouchableOpacity style={d.changeStatusBtn} onPress={() => setShowStatusPicker(true)} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={C.gold} />
                : <Text style={d.changeStatusBtnText}>Change</Text>}
            </TouchableOpacity>
          )}
          {myRole === 'junior' && (
            <Text style={d.readOnlyHint}>View only — contact advocate to change</Text>
          )}
        </View>
      </View>

      <View style={[GlassCard, d.infoCard]}>
        <Text style={d.infoCardLabel}>VAULT STATS</Text>
        <View style={d.statsRow}>
          <StatBox icon="document-text-outline" value={String(caseData.documentCount)} label="Documents" />
          <StatBox icon="people-outline"         value={String(caseData.memberCount ?? 0)} label="Members" />
          <StatBox icon="notifications-outline"  value={String(caseData.unreadCount)}   label="Unread" />
        </View>
      </View>

      <Modal visible={showStatusPicker} transparent animationType="fade">
        <TouchableOpacity style={d.pickerOverlay} onPress={() => setShowStatusPicker(false)} activeOpacity={1}>
          <View style={[GlassCard, d.pickerCard]}>
            <Text style={d.pickerTitle}>Change Status</Text>
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[d.pickerItem, caseData.status === s && d.pickerItemActive]}
                onPress={() => handleStatusChange(s)}>
                <Text style={[d.pickerItemText, caseData.status === s && d.pickerItemTextActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
                {caseData.status === s && <Ionicons name="checkmark" size={16} color={C.gold} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, gold }: { icon: string; label: string; value: string; gold?: boolean }) {
  return (
    <View style={d.infoRow}>
      <Ionicons name={icon as any} size={14} color={gold ? C.gold : C.textMuted} />
      <Text style={d.infoLabel}>{label}</Text>
      <Text style={[d.infoValue, gold && { color: C.gold, fontWeight: '600' }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function StatBox({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={d.statBox}>
      <Ionicons name={icon as any} size={18} color={C.gold} />
      <Text style={d.statValue}>{value}</Text>
      <Text style={d.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ caseId, token, userId, myRole }: {
  caseId: string; token: string; userId: string; myRole: VaultMemberRole;
}) {
  const [docs, setDocs] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getDocuments(token, caseId)
      .then(setDocs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, caseId]);

  const handleUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const doc = await uploadDocument(token, caseId, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? undefined,
      });
      setDocs((prev) => [doc, ...prev]);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (doc: VaultDocument) => {
    const url = documentViewUrl(token, doc.id);
    await WebBrowser.openBrowserAsync(url);
  };

  const handleDelete = (doc: VaultDocument) => {
    Alert.alert('Delete document', `Remove "${doc.originalName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument(token, caseId, doc.id);
            setDocs((prev) => prev.filter((d) => d.id !== doc.id));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  if (loading) return <View style={d.centerBox}><ActivityIndicator color={C.gold} /></View>;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={d.tabScroll}>
        {docs.length === 0 ? (
          <View style={d.emptyState}>
            <View style={d.emptyIconBox}><Ionicons name="document-text-outline" size={26} color={C.gold} /></View>
            <Text style={d.emptyTitle}>No documents yet</Text>
            <Text style={d.emptySub}>Upload the first document for this case</Text>
          </View>
        ) : (
          docs.map((doc) => (
            <View key={doc.id} style={[GlassCard, d.docCard]}>
              <View style={d.docCardLeft}>
                <View style={d.docIconBox}>
                  <Ionicons name="document-text" size={18} color={C.gold} />
                </View>
                <View style={d.docInfo}>
                  <Text style={d.docName} numberOfLines={1}>{doc.originalName}</Text>
                  <Text style={d.docMeta}>{formatBytes(doc.fileSize)}  ·  {doc.uploaderName}  ·  {relativeTime(doc.uploadedAt)}</Text>
                </View>
              </View>
              <View style={d.docActions}>
                <TouchableOpacity style={d.docBtn} onPress={() => handleView(doc)}>
                  <Ionicons name="eye-outline" size={16} color={C.gold} />
                </TouchableOpacity>
                {/* Client can only delete their own uploads; junior same; advocate can delete any */}
                {(myRole === 'owner' || myRole === 'advocate' || doc.uploadedBy === userId) && (
                  <TouchableOpacity style={d.docBtn} onPress={() => handleDelete(doc)}>
                    <Ionicons name="trash-outline" size={16} color={C.highRisk} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={d.docUploadBar}>
        <TouchableOpacity style={[d.uploadBtn, uploading && { opacity: 0.5 }]} onPress={handleUpload} disabled={uploading}>
          {uploading
            ? <ActivityIndicator size="small" color={C.elevated} />
            : <><Ionicons name="cloud-upload-outline" size={16} color={C.elevated} /><Text style={d.uploadBtnText}>Upload Document</Text></>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({ caseId, token, user, myRole }: {
  caseId: string; token: string; user: VaultUser; myRole: VaultMemberRole;
}) {
  const [msgs, setMsgs] = useState<VaultMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const isLegal = myRole !== 'client'; // junior + advocate can send internal

  useEffect(() => {
    getMessages(token, caseId)
      .then(setMsgs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, caseId]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const msg = await sendMessage(token, caseId, text.trim(), isLegal && isInternal);
      setMsgs((prev) => [...prev, msg]);
      setText('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSending(false);
    }
  };

  const roleColor = (role: VaultUserRole) =>
    role === 'advocate' ? C.ink : role === 'junior' ? '#4A6A9A' : C.gold;

  if (loading) return <View style={d.centerBox}><ActivityIndicator color={C.gold} /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={120}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={d.chatScroll}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
        {msgs.length === 0 ? (
          <View style={d.emptyState}>
            <View style={d.emptyIconBox}><Ionicons name="chatbubbles-outline" size={26} color={C.gold} /></View>
            <Text style={d.emptyTitle}>No messages yet</Text>
            <Text style={d.emptySub}>Start the case conversation</Text>
          </View>
        ) : (
          msgs.map((msg) => {
            const mine = msg.senderId === user.id;
            return (
              <View key={msg.id} style={[d.msgRow, mine && d.msgRowMine]}>
                {!mine && (
                  <View style={[d.msgAvatar, { backgroundColor: `${roleColor(msg.senderRole)}20` }]}>
                    <Text style={[d.msgAvatarText, { color: roleColor(msg.senderRole) }]}>
                      {msg.senderName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={[d.msgBubble, mine ? d.msgBubbleMine : d.msgBubbleOther]}>
                  {!mine && (
                    <Text style={[d.msgSender, { color: roleColor(msg.senderRole) }]}>
                      {msg.senderName}{msg.isInternal ? '  · internal' : ''}
                    </Text>
                  )}
                  <Text style={[d.msgText, mine && d.msgTextMine]}>{msg.body}</Text>
                  <Text style={[d.msgTime, mine && d.msgTimeMine]}>{relativeTime(msg.sentAt)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={d.chatInputBar}>
        {isLegal && (
          <TouchableOpacity style={[d.internalToggle, isInternal && d.internalToggleActive]} onPress={() => setIsInternal((v) => !v)}>
            <Ionicons name={isInternal ? 'lock-closed' : 'lock-open-outline'} size={14} color={isInternal ? C.elevated : C.textMuted} />
          </TouchableOpacity>
        )}
        <TextInput
          style={d.chatInput}
          value={text}
          onChangeText={setText}
          placeholder={
            isInternal ? 'Internal note — team only…'
            : myRole === 'client' ? 'Message your legal team…'
            : 'Message case team…'
          }
          placeholderTextColor={C.textMuted}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[d.sendBtn, (!text.trim() || sending) && d.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}>
          {sending
            ? <ActivityIndicator size="small" color={C.elevated} />
            : <Ionicons name="arrow-up" size={16} color={C.elevated} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Requests Tab ─────────────────────────────────────────────────────────────

function RequestsTab({ caseId, token, myRole, onSwitchTab }: {
  caseId: string; token: string; myRole: VaultMemberRole; onSwitchTab: (tab: TabKey) => void;
}) {
  const [reqs, setReqs] = useState<VaultRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [reqType, setReqType] = useState<VaultRequest['requestType']>('query');
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqPriority, setReqPriority] = useState<VaultRequest['priority']>('normal');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getRequests(token, caseId)
      .then(setReqs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, caseId]);

  const handleCreate = async () => {
    if (!reqTitle.trim()) return;
    setSubmitting(true);
    try {
      const r = await createRequest(token, caseId, {
        requestType: reqType,
        title: reqTitle.trim(),
        description: reqDesc.trim() || undefined,
        priority: reqPriority,
      });
      setReqs((prev) => [r, ...prev]);
      setShowNew(false);
      setReqTitle(''); setReqDesc('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvance = async (r: VaultRequest) => {
    const next = REQUEST_STATUS_NEXT[r.status];
    if (!next) return;
    try {
      const updated = await updateRequestStatus(token, caseId, r.id, next);
      setReqs((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading) return <View style={d.centerBox}><ActivityIndicator color={C.gold} /></View>;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={d.tabScroll}>
        {reqs.length === 0 ? (
          <View style={d.emptyState}>
            <View style={d.emptyIconBox}><Ionicons name="list-outline" size={26} color={C.gold} /></View>
            <Text style={d.emptyTitle}>No requests yet</Text>
            <Text style={d.emptySub}>Submit a request for documents, meetings, or queries</Text>
          </View>
        ) : (
          reqs.map((r) => {
            const pc = priorityColor(r.priority);
            const sc = reqStatusColor(r.status);
            const next = REQUEST_STATUS_NEXT[r.status];
            const isAdvocate = myRole !== 'client';
            return (
              <View key={r.id} style={[GlassCard, d.reqCard]}>
                <View style={d.reqCardTop}>
                  <View style={[d.reqPriorityDot, { backgroundColor: pc }]} />
                  <Text style={d.reqType}>{REQUEST_TYPES.find((t) => t.key === r.requestType)?.label ?? r.requestType}</Text>
                  <View style={[d.reqStatusBadge, { backgroundColor: `${sc}15`, borderColor: `${sc}40` }]}>
                    <Text style={[d.reqStatusText, { color: sc }]}>{r.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={d.reqTitle}>{r.title}</Text>
                {r.description && <Text style={d.reqDesc}>{r.description}</Text>}
                <View style={d.reqFooter}>
                  <Text style={d.reqMeta}>{r.requesterName}  ·  {relativeTime(r.createdAt)}</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {/* Show docs link once request is accepted */}
                    {r.status !== 'open' && (
                      <TouchableOpacity style={d.docsLinkBtn} onPress={() => onSwitchTab('documents')}>
                        <Ionicons name="document-text-outline" size={12} color={C.gold} />
                        <Text style={d.docsLinkText}>Docs</Text>
                      </TouchableOpacity>
                    )}
                    {isAdvocate && next && (
                      <TouchableOpacity style={d.advanceBtn} onPress={() => handleAdvance(r)}>
                        <Text style={d.advanceBtnText}>Mark {next.replace('_', ' ')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={d.docUploadBar}>
        <TouchableOpacity style={d.uploadBtn} onPress={() => setShowNew(true)}>
          <Ionicons name="add" size={16} color={C.elevated} />
          <Text style={d.uploadBtnText}>New Request</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showNew} transparent animationType="slide">
        <KeyboardAvoidingView style={d.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[GlassCard, d.modalCard]}>
            <View style={d.modalHeader}>
              <Text style={d.modalTitle}>New Request</Text>
              <TouchableOpacity onPress={() => setShowNew(false)}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <View style={d.fieldGroup}>
                <Text style={d.fieldLabel}>TYPE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 2 }}>
                  {REQUEST_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.key}
                      style={[d.pill, reqType === t.key && d.pillActive]}
                      onPress={() => setReqType(t.key)}>
                      <Text style={[d.pillText, reqType === t.key && d.pillTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={d.fieldGroup}>
                <Text style={d.fieldLabel}>TITLE *</Text>
                <TextInput style={d.input} value={reqTitle} onChangeText={setReqTitle} placeholder="Brief description" placeholderTextColor={C.textMuted} />
              </View>
              <View style={d.fieldGroup}>
                <Text style={d.fieldLabel}>DETAILS</Text>
                <TextInput style={[d.input, { height: 80, textAlignVertical: 'top' }]} value={reqDesc} onChangeText={setReqDesc} placeholder="Additional context (optional)" placeholderTextColor={C.textMuted} multiline />
              </View>
              <View style={d.fieldGroup}>
                <Text style={d.fieldLabel}>PRIORITY</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {PRIORITY_OPTIONS.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[d.pill, reqPriority === p && d.pillActive]}
                      onPress={() => setReqPriority(p)}>
                      <Text style={[d.pillText, reqPriority === p && d.pillTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[d.submitBtn, (submitting || !reqTitle.trim()) && d.submitBtnDisabled]}
              onPress={handleCreate}
              disabled={submitting || !reqTitle.trim()}>
              {submitting
                ? <ActivityIndicator size="small" color={C.elevated} />
                : <Text style={d.submitBtnText}>Submit Request</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Team Tab ────────────────────────────────────────────────────────────────

function TeamTab({ caseId, token, user, myRole }: {
  caseId: string; token: string; user: VaultUser; myRole: VaultMemberRole;
}) {
  const [members, setMembers] = useState<VaultMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<VaultUserSearchResult | null | undefined>(undefined);
  const [newRole, setNewRole] = useState<VaultMemberRole>('junior');
  const [adding, setAdding] = useState(false);
  const canManage = myRole === 'owner' || myRole === 'advocate';

  useEffect(() => {
    getCaseMembers(token, caseId)
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, caseId]);

  const handleSearch = async () => {
    if (!email.trim()) return;
    setSearching(true);
    setFound(undefined);
    try {
      const result = await searchUser(token, email.trim().toLowerCase());
      setFound(result);
      if (result) {
        // Auto-suggest their global role as the case role
        const suggested: VaultMemberRole =
          result.role === 'advocate' ? 'advocate'
          : result.role === 'client' ? 'client'
          : 'junior';
        setNewRole(suggested);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!found) return;
    setAdding(true);
    try {
      const member = await addCaseMember(token, caseId, found.id, newRole);
      setMembers((prev) => [...prev, member]);
      setEmail('');
      setFound(undefined);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = (m: VaultMember) => {
    Alert.alert('Remove member', `Remove ${m.name} from this case?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await removeCaseMember(token, caseId, m.userId);
            setMembers((prev) => prev.filter((x) => x.userId !== m.userId));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  if (loading) return <View style={d.centerBox}><ActivityIndicator color={C.gold} /></View>;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={d.tabScroll}>
      {/* Members list */}
      <View style={[GlassCard, d.infoCard]}>
        <Text style={d.infoCardLabel}>CASE TEAM  ·  {members.length}</Text>
        {members.map((m) => {
          const rc = ROLE_COLORS[m.role] || C.textMuted;
          const isMe = m.userId === user.id;
          return (
            <View key={m.userId} style={d.memberRow}>
              <View style={[d.memberAvatar, { backgroundColor: `${rc}18` }]}>
                <Text style={[d.memberAvatarText, { color: rc }]}>
                  {m.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={d.memberInfo}>
                <Text style={d.memberName}>{m.name}{isMe ? '  (you)' : ''}</Text>
                <Text style={d.memberEmail}>{m.email}</Text>
              </View>
              <View style={[d.memberRoleBadge, { backgroundColor: `${rc}15`, borderColor: `${rc}35` }]}>
                <Text style={[d.memberRoleText, { color: rc }]}>
                  {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                </Text>
              </View>
              {canManage && !isMe && m.role !== 'owner' && (
                <TouchableOpacity style={d.removeMemberBtn} onPress={() => handleRemove(m)}>
                  <Ionicons name="close" size={14} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* Add member section — advocates only */}
      {canManage && (
        <View style={[GlassCard, d.infoCard]}>
          <Text style={d.infoCardLabel}>ADD MEMBER</Text>

          <View style={d.addMemberRow}>
            <TextInput
              style={[d.input, { flex: 1 }]}
              value={email}
              onChangeText={(t) => { setEmail(t); setFound(undefined); }}
              placeholder="Search by email"
              placeholderTextColor={C.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[d.searchBtn, searching && { opacity: 0.5 }]}
              onPress={handleSearch}
              disabled={searching}>
              {searching
                ? <ActivityIndicator size="small" color={C.elevated} />
                : <Ionicons name="search" size={16} color={C.elevated} />}
            </TouchableOpacity>
          </View>

          {found === null && (
            <View style={d.searchResult}>
              <Ionicons name="alert-circle-outline" size={14} color={C.textMuted} />
              <Text style={d.searchResultText}>No user found with that email</Text>
            </View>
          )}

          {found && (
            <>
              <View style={d.searchResult}>
                <View style={d.memberAvatar}>
                  <Text style={d.memberAvatarText}>{found.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={d.memberName}>{found.name}</Text>
                  <Text style={d.memberEmail}>{found.email}  ·  {found.role}</Text>
                </View>
              </View>

              <View style={d.fieldGroup}>
                <Text style={d.fieldLabel}>ASSIGN ROLE</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {MEMBER_ROLE_OPTIONS.map((r) => (
                    <TouchableOpacity
                      key={r.key}
                      style={[d.pill, newRole === r.key && d.pillActive]}
                      onPress={() => setNewRole(r.key)}>
                      <Text style={[d.pillText, newRole === r.key && d.pillTextActive]}>{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[d.submitBtn, adding && d.submitBtnDisabled]}
                onPress={handleAdd}
                disabled={adding}>
                {adding
                  ? <ActivityIndicator size="small" color={C.elevated} />
                  : <Text style={d.submitBtnText}>Add {found.name.split(' ')[0]} to Case</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {!canManage && (
        <View style={d.emptyState}>
          <View style={d.emptyIconBox}><Ionicons name="people-outline" size={26} color={C.gold} /></View>
          <Text style={d.emptyTitle}>Case Team</Text>
          <Text style={d.emptySub}>Contact your advocate to add or remove team members</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Root Screen ──────────────────────────────────────────────────────────────

export default function CaseDetailScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const router = useRouter();
  const { session, loading: sessionLoading } = useVaultSession();
  const [caseData, setCaseData] = useState<VaultCase | null>(null);
  const [caseLoading, setCaseLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    if (!session || !caseId) return;
    getCase(session.token, caseId)
      .then(setCaseData)
      .catch(() => router.back())
      .finally(() => setCaseLoading(false));
  }, [session, caseId, router]);

  const isLoading = sessionLoading || caseLoading;
  const myRole: VaultMemberRole = (caseData?.myRole ?? 'client') as VaultMemberRole;
  const isClient = myRole === 'client';

  // Clients don't see the Team tab
  const visibleTabs = isClient ? TABS.filter((t) => t.key !== 'team') : TABS;

  const roleBgColor: Record<VaultMemberRole, string> = {
    owner: C.ink, advocate: '#4A6A9A', junior: '#6A8A5A', client: C.gold,
  };
  const roleLabel: Record<VaultMemberRole, string> = {
    owner: 'Owner', advocate: 'Advocate', junior: 'Junior', client: 'Client',
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: caseData?.title ?? 'Case Detail',
          headerBackTitle: 'Vault',
          headerTitleStyle: { fontFamily: Serif, fontSize: 15, color: C.ink },
          headerStyle: { backgroundColor: C.surface },
          headerShadowVisible: false,
          headerTintColor: C.ink,
        }}
      />
      <SafeAreaView style={d.container} edges={['bottom']}>
        {isLoading || !caseData || !session ? (
          <View style={d.centerBox}><ActivityIndicator color={C.gold} size="large" /></View>
        ) : (
          <>
            {/* Case title block */}
            <View style={d.caseHeader}>
              <View style={d.caseHeaderLeft}>
                <Text style={d.caseHeaderTitle} numberOfLines={1}>{caseData.title}</Text>
                <Text style={d.caseHeaderSub}>{caseData.caseType}  ·  {caseData.clientName}</Text>
              </View>
              <View style={d.caseHeaderRight}>
                {caseData.caseNumber && (
                  <View style={d.caseNumBadge}>
                    <Text style={d.caseNumText}>{caseData.caseNumber}</Text>
                  </View>
                )}
                <View style={[d.myRoleBadge, { backgroundColor: `${roleBgColor[myRole]}18`, borderColor: `${roleBgColor[myRole]}40` }]}>
                  <Text style={[d.myRoleText, { color: roleBgColor[myRole] }]}>{roleLabel[myRole]}</Text>
                </View>
              </View>
            </View>

            {/* Tab bar */}
            <View style={d.tabBar}>
              {visibleTabs.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[d.tabItem, activeTab === t.key && d.tabItemActive]}
                  onPress={() => setActiveTab(t.key)}>
                  <Ionicons
                    name={t.icon as any}
                    size={16}
                    color={activeTab === t.key ? C.ink : C.textMuted}
                  />
                  <Text style={[d.tabLabel, activeTab === t.key && d.tabLabelActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tab content */}
            <View style={{ flex: 1 }}>
              {activeTab === 'overview' && (
                <OverviewTab
                  caseData={caseData}
                  token={session.token}
                  myRole={myRole}
                  onUpdated={setCaseData}
                  onSwitchTab={setActiveTab}
                />
              )}
              {activeTab === 'documents' && (
                <DocumentsTab
                  caseId={caseData.id}
                  token={session.token}
                  userId={session.user.id}
                  myRole={myRole}
                />
              )}
              {activeTab === 'chat' && (
                <ChatTab caseId={caseData.id} token={session.token} user={session.user} myRole={myRole} />
              )}
              {activeTab === 'requests' && (
                <RequestsTab caseId={caseData.id} token={session.token} myRole={myRole} onSwitchTab={setActiveTab} />
              )}
              {activeTab === 'team' && (
                <TeamTab
                  caseId={caseData.id}
                  token={session.token}
                  user={session.user}
                  myRole={myRole}
                />
              )}
            </View>
          </>
        )}
      </SafeAreaView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const d = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  caseHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  caseHeaderLeft: { flex: 1, gap: 2 },
  caseHeaderTitle: { fontFamily: Serif, fontSize: 16, color: C.ink },
  caseHeaderSub: { fontSize: 12, color: C.textSecondary },
  caseNumBadge: {
    marginLeft: 8, paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: C.goldSoft, borderRadius: Radius.pill, borderWidth: 1, borderColor: C.goldBorder,
  },
  caseNumText: { fontSize: 10, fontWeight: '600', color: C.gold },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: C.ink },
  tabLabel: { fontSize: 11, fontWeight: '500', color: C.textMuted },
  tabLabelActive: { color: C.ink, fontWeight: '700' },

  // Shared scroll padding
  tabScroll: { padding: 16, gap: 12, paddingBottom: 80 },

  // Overview
  infoCard: { padding: 16, gap: 10 },
  infoCardLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: C.gold, marginBottom: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 12, color: C.textMuted, width: 64 },
  infoValue: { flex: 1, fontSize: 13, color: C.textPrimary, fontWeight: '500' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusPill: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  changeStatusBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 1, borderColor: C.goldBorder, backgroundColor: C.goldSoft },
  changeStatusBtnText: { fontSize: 12, fontWeight: '600', color: C.gold },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, alignItems: 'center', gap: 4, padding: 12, backgroundColor: C.bg, borderRadius: Radius.button },
  statValue: { fontFamily: Serif, fontSize: 22, color: C.ink },
  statLabel: { fontSize: 10, color: C.textMuted, letterSpacing: 0.5 },

  // Status picker modal
  pickerOverlay: { flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', padding: 32 },
  pickerCard: { width: '100%', padding: 20, gap: 4 },
  pickerTitle: { fontFamily: Serif, fontSize: 18, color: C.ink, marginBottom: 8 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  pickerItemActive: { backgroundColor: C.goldSoft, borderRadius: Radius.button, paddingHorizontal: 10 },
  pickerItemText: { fontSize: 15, color: C.textPrimary },
  pickerItemTextActive: { color: C.gold, fontWeight: '600' },

  // Documents
  docCard: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  docCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  docIconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center' },
  docInfo: { flex: 1, gap: 3 },
  docName: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  docMeta: { fontSize: 11, color: C.textMuted },
  docActions: { flexDirection: 'row', gap: 4 },
  docBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  docUploadBar: { padding: 12, paddingBottom: Platform.OS === 'ios' ? 20 : 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, backgroundColor: C.ink, borderRadius: Radius.button },
  uploadBtnText: { fontSize: 14, fontWeight: '600', color: C.elevated },

  // Chat
  chatScroll: { padding: 16, gap: 10, paddingBottom: 20 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMine: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  msgAvatarText: { fontSize: 12, fontWeight: '700' },
  msgBubble: { maxWidth: '75%', padding: 10, borderRadius: 14, gap: 4 },
  msgBubbleOther: { backgroundColor: C.elevated, borderBottomLeftRadius: 4 },
  msgBubbleMine: { backgroundColor: C.ink, borderBottomRightRadius: 4 },
  msgSender: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  msgText: { fontSize: 14, color: C.textPrimary, lineHeight: 20 },
  msgTextMine: { color: C.elevated },
  msgTime: { fontSize: 10, color: C.textMuted, alignSelf: 'flex-end' },
  msgTimeMine: { color: 'rgba(253,250,245,0.5)' },
  chatInputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
  },
  internalToggle: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  internalToggleActive: { backgroundColor: C.ink, borderColor: C.ink },
  chatInput: {
    flex: 1, minHeight: 38, maxHeight: 100, backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: C.textPrimary,
  },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: C.border },

  // Requests
  reqCard: { padding: 14, gap: 6 },
  reqCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqPriorityDot: { width: 8, height: 8, borderRadius: 4 },
  reqType: { flex: 1, fontSize: 11, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  reqStatusBadge: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  reqStatusText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  reqTitle: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  reqDesc: { fontSize: 13, color: C.textSecondary, lineHeight: 19 },
  reqFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  reqMeta: { fontSize: 11, color: C.textMuted },
  advanceBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.goldBorder },
  advanceBtnText: { fontSize: 11, fontWeight: '600', color: C.gold },
  docsLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  docsLinkText: { fontSize: 11, fontWeight: '600', color: C.gold },

  // Empty state
  emptyState: { alignItems: 'center', padding: 40, gap: 10 },
  emptyIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: Serif, fontSize: 18, color: C.ink },
  emptySub: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19, maxWidth: 240 },

  // Shared form
  fieldGroup: { gap: 6, marginBottom: 10 },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: C.gold },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: Radius.button, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: C.textPrimary,
  },
  pill:         { borderWidth: 1, borderColor: C.border, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: C.elevated },
  pillActive:   { backgroundColor: C.gold, borderColor: C.gold },
  pillText:     { fontSize: 12, fontWeight: '500', color: C.textSecondary },
  pillTextActive: { color: C.elevated, fontWeight: '600' },
  submitBtn:    { height: 48, backgroundColor: C.ink, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: C.elevated },

  // Modal
  modalBg:    { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end', padding: 12, paddingBottom: 0 },
  modalCard:  { padding: 20, gap: 12, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontFamily: Serif, fontSize: 20, color: C.ink },

  // Team tab
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  memberAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: `${C.gold}20`, alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 14, fontWeight: '700', color: C.gold },
  memberInfo: { flex: 1, gap: 1 },
  memberName: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  memberEmail: { fontSize: 11, color: C.textMuted },
  memberRoleBadge: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  memberRoleText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  removeMemberBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  addMemberRow: { flexDirection: 'row', gap: 8 },
  searchBtn: {
    width: 44, height: 44, borderRadius: Radius.button,
    backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center',
  },
  searchResult: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 4, backgroundColor: C.bg, borderRadius: Radius.button },
  searchResultText: { fontSize: 13, color: C.textMuted },

  // Case header right cluster
  caseHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8, flexShrink: 0 },
  myRoleBadge: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  myRoleText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Client portal — hero card
  clientHeroCard: { padding: 18, gap: 8 },
  clientHeroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientHeroIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center' },
  clientHeroTitle: { fontFamily: Serif, fontSize: 20, color: C.ink, lineHeight: 26 },
  clientHeroSub: { fontSize: 12, color: C.textMuted, letterSpacing: 0.3 },

  // Hearing card
  hearingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  hearingCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hearingLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: C.gold, marginBottom: 2 },
  hearingDate: { fontSize: 14, fontWeight: '600', color: C.ink },
  hearingBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: `${C.lowRisk}18`, borderWidth: 1, borderColor: `${C.lowRisk}40` },
  hearingBadgeText: { fontSize: 11, fontWeight: '600', color: C.lowRisk },

  // Advocate contact row
  advocateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  advocateAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: `${'#4A6A9A'}20`, alignItems: 'center', justifyContent: 'center' },
  advocateAvatarText: { fontSize: 15, fontWeight: '700', color: '#4A6A9A' },
  advocateInfo: { flex: 1, gap: 2 },
  advocateName: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  advocateRole: { fontSize: 11, color: C.textMuted },
  advocateMsgBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, backgroundColor: C.ink },
  advocateMsgBtnText: { fontSize: 12, fontWeight: '600', color: C.elevated },

  // Quick actions
  quickActionsRow: { flexDirection: 'row', gap: 10 },
  quickActionBtn: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, backgroundColor: C.bg, borderRadius: Radius.button },
  quickActionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontSize: 11, fontWeight: '600', color: C.textSecondary },

  // Junior read-only hint
  readOnlyHint: { flex: 1, fontSize: 11, color: C.textMuted, fontStyle: 'italic' },
});
