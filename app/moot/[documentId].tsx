import { Ionicons } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, GlassCard, Radius } from '@/constants/colors';
import { ARGUMENT_STARTERS, MAX_EXCHANGES } from '@/constants/mootPrompt';
import { useDocumentContext } from '@/context/document-context';
import { saveVerdict, sendMootArgument } from '@/services/mootAI';
import type { ArgumentStrength, MootMessage, MootPhase, MootRole } from '@/types/moot';

const COUNSEL_NAME = 'Sr. Adv. Rajan Iyer';

function ScalesAnimation() {
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 1600, useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [sway]);

  const rotate = sway.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-6deg', '0deg', '6deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Ionicons name="scale" size={52} color={C.gold} />
    </Animated.View>
  );
}

// ─── Role Selection ───────────────────────────────────────────────────────────

interface RoleSelectionProps {
  documentName: string;
  documentType: string;
  selectedRole: MootRole | null;
  onSelectRole: (role: MootRole) => void;
  onEnter: () => void;
}

function RoleSelection({
  documentName,
  documentType,
  selectedRole,
  onSelectRole,
  onEnter,
}: RoleSelectionProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.selectionScroll}
      showsVerticalScrollIndicator={false}>
      {/* Scales */}
      <View style={styles.scalesCenter}>
        <ScalesAnimation />
      </View>

      {/* Title */}
      <Text style={styles.mootTitle}>LexAI Moot</Text>
      <Text style={styles.mootSubtitle}>AI Moot Court Simulator</Text>

      {/* Document Context Card */}
      <View style={[GlassCard, styles.docContextCard]}>
        <View style={styles.docContextTop}>
          <Ionicons name="document-text" size={16} color={C.gold} />
          <Text style={styles.docContextLabel}>DOCUMENT BEING ARGUED</Text>
        </View>
        <Text style={styles.docContextName} numberOfLines={2}>{documentName}</Text>
        {documentType && (
          <View style={styles.docContextBadge}>
            <Text style={styles.docContextBadgeText}>{documentType.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>CHOOSE YOUR SIDE</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Role Cards */}
      <View style={styles.roleRow}>
        <TouchableOpacity
          style={[
            styles.roleCard,
            styles.roleCardLeft,
            selectedRole === 'petitioner' && styles.roleCardSelected,
          ]}
          onPress={() => onSelectRole('petitioner')}
          activeOpacity={0.8}>
          <Text style={styles.roleIcon}>⚖️</Text>
          <Text style={[styles.roleTitle, { color: '#6BAAFF' }]}>PETITIONER</Text>
          <Text style={styles.roleDesc}>You filed the case. Argue for relief.</Text>
          {selectedRole === 'petitioner' && (
            <View style={styles.roleSelectedDot} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleCard,
            styles.roleCardRight,
            selectedRole === 'respondent' && styles.roleCardSelected,
          ]}
          onPress={() => onSelectRole('respondent')}
          activeOpacity={0.8}>
          <Text style={styles.roleIcon}>🛡️</Text>
          <Text style={[styles.roleTitle, { color: '#FF8080' }]}>RESPONDENT</Text>
          <Text style={styles.roleDesc}>You defend. Argue against the claim.</Text>
          {selectedRole === 'respondent' && (
            <View style={styles.roleSelectedDot} />
          )}
        </TouchableOpacity>
      </View>

      {/* Enter Courtroom */}
      <TouchableOpacity
        style={[styles.enterBtn, !selectedRole && styles.enterBtnDisabled]}
        onPress={onEnter}
        disabled={!selectedRole}
        activeOpacity={0.85}>
        <Ionicons name="scale" size={18} color={selectedRole ? C.bg : C.textMuted} />
        <Text style={[styles.enterBtnText, !selectedRole && styles.enterBtnTextDisabled]}>
          Enter Courtroom
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Argument Strength Bar ────────────────────────────────────────────────────

function StrengthBar({ strength }: { strength: ArgumentStrength }) {
  const studentPct = `${strength.student}%`;
  const counselPct = `${strength.counsel}%`;
  return (
    <View style={styles.strengthBarWrap}>
      <Text style={styles.strengthLabelNavy}>YOU</Text>
      <View style={styles.strengthTrack}>
        <View style={[styles.strengthFillNavy, { width: studentPct as `${number}%` }]} />
        <View style={[styles.strengthFillRed, { width: counselPct as `${number}%` }]} />
      </View>
      <Text style={styles.strengthLabelRed}>ADV.</Text>
    </View>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function CounselTyping() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );
    Animated.parallel([anim(dot1, 0), anim(dot2, 200), anim(dot3, 400)]).start();
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.counselTypingRow}>
      <Text style={styles.counselTypingLabel}>{COUNSEL_NAME} is responding...</Text>
      <View style={styles.counselTypingDots}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.counselDot, { opacity: dot }]} />
        ))}
      </View>
    </View>
  );
}

// ─── Message Item ─────────────────────────────────────────────────────────────

function MessageItem({
  msg,
  studentRole,
  prevExchange,
}: {
  msg: MootMessage;
  studentRole: MootRole;
  prevExchange: number | null;
}) {
  const isStudent = msg.sender === 'student';
  const showDivider = prevExchange !== null && msg.exchange !== prevExchange;

  return (
    <>
      {showDivider && (
        <View style={styles.exchangeDivider}>
          <View style={styles.exchangeDividerLine} />
          <Text style={styles.exchangeDividerText}>Exchange {msg.exchange}</Text>
          <View style={styles.exchangeDividerLine} />
        </View>
      )}
      <View style={[styles.msgWrap, isStudent ? styles.msgRight : styles.msgLeft]}>
        <Text style={isStudent ? styles.studentLabel : styles.counselLabel}>
          {isStudent
            ? `You (${studentRole.charAt(0).toUpperCase() + studentRole.slice(1)})`
            : COUNSEL_NAME}
        </Text>
        <View style={[styles.msgBubble, isStudent ? styles.studentBubble : styles.counselBubble]}>
          <Text style={[styles.msgText, !isStudent && styles.counselMsgText]}>{msg.text}</Text>
        </View>
      </View>
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MootScreen() {
  const router = useRouter();
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const { state } = useDocumentContext();

  if (!documentId) return null;

  const document = state.documents[documentId];
  const documentName = document?.filename ?? 'Unknown Document';
  const documentType = document?.analysis?.documentType ?? 'Legal Document';
  const documentSummary =
    document?.analysis?.summary ?? 'No summary available. Argue based on general legal principles.';

  const [phase, setPhase] = useState<MootPhase>('selection');
  const [selectedRole, setSelectedRole] = useState<MootRole | null>(null);
  const [messages, setMessages] = useState<MootMessage[]>([]);
  const [exchange, setExchange] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [strength, setStrength] = useState<ArgumentStrength>({ student: 50, counsel: 50 });

  const listRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleEnterCourtroom = () => {
    if (!selectedRole) return;
    setPhase('courtroom');
  };

  const handleSendArgument = async () => {
    if (!inputValue.trim() || isResponding || !selectedRole) return;

    const studentMsg: MootMessage = {
      id: `${Date.now()}-s`,
      sender: 'student',
      text: inputValue.trim(),
      exchange,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, studentMsg];
    setMessages(updatedMessages);
    setInputValue('');
    setIsResponding(true);
    scrollToBottom();

    try {
      const result = await sendMootArgument({
        documentId,
        documentSummary,
        documentType,
        jurisdiction: 'India',
        studentRole: selectedRole,
        opposingRole: selectedRole === 'petitioner' ? 'respondent' : 'petitioner',
        exchangeNumber: exchange,
        sessionMessages: updatedMessages,
        studentArgument: studentMsg.text,
      });

      if (result.isVerdict) {
        await saveVerdict(documentId, result.verdict);
        router.replace({
          pathname: '/moot/verdict/[documentId]',
          params: { documentId },
        } as unknown as Href);
        return;
      }

      const counselMsg: MootMessage = {
        id: `${Date.now()}-c`,
        sender: 'counsel',
        text: result.text,
        exchange,
        timestamp: new Date().toISOString(),
      };

      const nextMessages = [...updatedMessages, counselMsg];
      setMessages(nextMessages);

      const nextExchange = exchange + 1;
      setExchange(nextExchange);

      const studentScore = Math.min(100, strength.student + Math.floor(Math.random() * 8 - 2));
      const counselScore = Math.max(0, Math.min(100, 100 - studentScore));
      setStrength({ student: studentScore, counsel: counselScore });

      scrollToBottom();
    } catch {
      const errMsg: MootMessage = {
        id: `${Date.now()}-err`,
        sender: 'counsel',
        text: 'Connection error. Please check your Ollama server and try again.',
        exchange,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsResponding(false);
    }
  };

  if (phase === 'selection') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.selectionHeader}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
          </TouchableOpacity>
        </View>
        <RoleSelection
          documentName={documentName}
          documentType={documentType}
          selectedRole={selectedRole}
          onSelectRole={setSelectedRole}
          onEnter={handleEnterCourtroom}
        />
      </SafeAreaView>
    );
  }

  const opposingRole = selectedRole === 'petitioner' ? 'respondent' : 'petitioner';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.courtroomHeader}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setPhase('selection')}>
          <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.courtroomHeaderCenter}>
          <Text style={styles.courtroomHeaderTitle}>LexAI Moot</Text>
          <Text style={styles.courtroomHeaderDoc} numberOfLines={1}>{documentName}</Text>
        </View>
        <View style={styles.exchangePill}>
          <Text style={styles.exchangePillText}>{exchange} / {MAX_EXCHANGES}</Text>
        </View>
      </View>

      {/* Role Banner */}
      <View style={styles.roleBanner}>
        <Text style={styles.roleBannerStudent}>
          You: <Text style={styles.roleBannerStudentRole}>
            {selectedRole!.toUpperCase()}
          </Text>
        </Text>
        <Text style={styles.roleBannerDot}> · </Text>
        <Text style={styles.roleBannerCounsel}>
          AI: <Text style={styles.roleBannerCounselRole}>
            {opposingRole.toUpperCase()}
          </Text>
        </Text>
      </View>

      {/* Strength Bar */}
      <StrengthBar strength={strength} />

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.courtroomBody}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 160, android: 0 })}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item, index }) => (
            <MessageItem
              msg={item}
              studentRole={selectedRole!}
              prevExchange={index > 0 ? messages[index - 1].exchange : null}
            />
          )}
          ListEmptyComponent={
            <View style={styles.courtEmptyState}>
              <Ionicons name="scale-outline" size={40} color={C.textMuted} />
              <Text style={styles.courtEmptyTitle}>Court is in session</Text>
              <Text style={styles.courtEmptyBody}>
                State your opening argument as {selectedRole?.toUpperCase()}.
              </Text>
            </View>
          }
          ListFooterComponent={isResponding ? <CounselTyping /> : null}
          onContentSizeChange={scrollToBottom}
        />

        {/* Input Area */}
        <View style={styles.courtroomInput}>
          {/* Quick argument starters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.startersRow}>
            {ARGUMENT_STARTERS.map((starter) => (
              <TouchableOpacity
                key={starter}
                onPress={() => setInputValue(starter)}
                style={styles.starterChip}>
                <Text style={styles.starterChipText}>{starter}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <TextInput
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="State your argument, counsel..."
                placeholderTextColor={C.textMuted}
                multiline
                maxLength={600}
                style={styles.input}
              />
              <Text style={styles.charCount}>{inputValue.length}/600</Text>
            </View>
            <TouchableOpacity
              onPress={handleSendArgument}
              disabled={!inputValue.trim() || isResponding}
              style={[
                styles.courtSendBtn,
                (!inputValue.trim() || isResponding) && styles.courtSendBtnDisabled,
              ]}>
              <Ionicons
                name="scale"
                size={18}
                color={inputValue.trim() && !isResponding ? C.textPrimary : C.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Selection Phase
  selectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectionScroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 16,
  },
  scalesCenter: {
    marginTop: 8,
    marginBottom: 4,
  },
  mootTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: -0.5,
  },
  mootSubtitle: {
    fontSize: 14,
    color: C.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: -8,
  },
  docContextCard: {
    width: '100%',
    gap: 8,
  },
  docContextTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docContextLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: C.gold,
  },
  docContextName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
    lineHeight: 22,
  },
  docContextBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.goldGlow,
    borderWidth: 1,
    borderColor: C.goldBorder,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  docContextBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: C.gold,
  },
  dividerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 3,
    color: C.textMuted,
  },
  roleRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  roleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.card,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.glass,
    position: 'relative',
  },
  roleCardLeft: {
    borderColor: C.mootNavyBorder,
  },
  roleCardRight: {
    borderColor: C.mootRedBorder,
  },
  roleCardSelected: {
    borderColor: C.gold,
    borderWidth: 2,
    backgroundColor: C.goldGlow,
  },
  roleIcon: {
    fontSize: 28,
  },
  roleTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  roleDesc: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  roleSelectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.gold,
    marginTop: 4,
  },
  enterBtn: {
    width: '100%',
    height: 52,
    backgroundColor: C.gold,
    borderRadius: Radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: C.gold,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  enterBtnDisabled: {
    backgroundColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  enterBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.bg,
  },
  enterBtnTextDisabled: {
    color: C.textMuted,
  },

  // Courtroom Phase
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  courtroomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  courtroomHeaderCenter: {
    flex: 1,
    gap: 1,
  },
  courtroomHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.gold,
    letterSpacing: 0.3,
  },
  courtroomHeaderDoc: {
    fontSize: 11,
    color: C.textMuted,
  },
  exchangePill: {
    backgroundColor: C.goldGlow,
    borderWidth: 1,
    borderColor: C.goldBorder,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  exchangePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.gold,
  },
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  roleBannerStudent: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '500',
  },
  roleBannerStudentRole: {
    color: '#6BAAFF',
    fontWeight: '700',
  },
  roleBannerDot: {
    color: C.border,
    fontWeight: '700',
  },
  roleBannerCounsel: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '500',
  },
  roleBannerCounselRole: {
    color: '#FF8080',
    fontWeight: '700',
  },
  strengthBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 8,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  strengthLabelNavy: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6BAAFF',
    letterSpacing: 1,
    width: 28,
  },
  strengthTrack: {
    flex: 1,
    height: 5,
    backgroundColor: C.border,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  strengthFillNavy: {
    height: '100%',
    backgroundColor: C.mootNavy,
    borderRadius: 3,
  },
  strengthFillRed: {
    height: '100%',
    backgroundColor: C.mootRed,
    borderRadius: 3,
  },
  strengthLabelRed: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF8080',
    letterSpacing: 1,
    width: 28,
    textAlign: 'right',
  },
  courtroomBody: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  msgWrap: {
    marginVertical: 6,
    gap: 4,
  },
  msgRight: {
    alignItems: 'flex-end',
  },
  msgLeft: {
    alignItems: 'flex-start',
  },
  studentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6BAAFF',
    letterSpacing: 0.5,
    marginRight: 4,
  },
  counselLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF8080',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  msgBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: Radius.bubble,
  },
  studentBubble: {
    backgroundColor: C.mootNavy,
    borderTopRightRadius: 4,
  },
  counselBubble: {
    backgroundColor: C.mootRedBubble,
    borderTopLeftRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: C.gold,
  },
  msgText: {
    fontSize: 14,
    color: C.textPrimary,
    lineHeight: 21,
  },
  counselMsgText: {
    color: C.mootRedText,
  },
  exchangeDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  exchangeDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  exchangeDividerText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: C.textMuted,
  },
  counselTypingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  counselTypingLabel: {
    fontSize: 11,
    color: '#FF8080',
    fontStyle: 'italic',
  },
  counselTypingDots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  counselDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FF8080',
  },
  courtEmptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  courtEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  courtEmptyBody: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  courtroomInput: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  startersRow: {
    gap: 8,
  },
  starterChip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: C.elevated,
  },
  starterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 4,
  },
  input: {
    fontSize: 14,
    color: C.textPrimary,
    maxHeight: 100,
    lineHeight: 20,
  },
  charCount: {
    fontSize: 9,
    color: C.textMuted,
    textAlign: 'right',
  },
  courtSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.mootNavy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.mootNavyBorder,
  },
  courtSendBtnDisabled: {
    backgroundColor: C.border,
    borderColor: C.border,
  },
});
