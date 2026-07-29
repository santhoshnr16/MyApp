import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
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

import { C, Radius, Serif } from '@/constants/colors';
import { SUGGESTED_QUESTIONS } from '@/constants/prompts';
import { useDocumentContext } from '@/context/document-context';
import { useChat } from '@/hooks/useChat';
import type { ChatMessage } from '@/types/chat';

function Bubble({
  message,
  onSelectSuggestion,
}: {
  message: ChatMessage;
  onSelectSuggestion?: (s: string) => void;
}) {
  const isUser = message.sender === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.bubbleWrap, isUser ? styles.bubbleRight : styles.bubbleLeft]}>
      {!isUser && <Text style={styles.aiLabel}>LexAI</Text>}
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble,
        ]}>
        <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
          {message.message}
        </Text>
        {!isUser && message.sources && message.sources.length > 0 && (
          <View style={styles.sourcesBox}>
            <View style={styles.sourcesHeader}>
              <Ionicons name="document-text-outline" size={13} color={C.gold} />
              <Text style={styles.sourcesHeaderTitle}>Document Excerpts (RAG Context)</Text>
            </View>
            {message.sources.map((src, idx) => (
              <Text key={idx} style={styles.sourceText} numberOfLines={3}>
                • {src}
              </Text>
            ))}
          </View>
        )}
        {!isUser && message.disclaimer && (
          <Text style={styles.disclaimer}>{message.disclaimer}</Text>
        )}
      </View>
      {!isUser && message.followUpSuggestions && message.followUpSuggestions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestions}>
          {message.followUpSuggestions.map((s) => (
            <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => onSelectSuggestion?.(s)}>
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <Text style={styles.timeLabel}>{time}</Text>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={styles.typingRow}>
      <Text style={styles.typingLabel}>LexAI</Text>
      <View style={styles.typingBubble}>
        <View style={styles.typingDot} />
        <View style={[styles.typingDot, styles.typingDotMid]} />
        <View style={styles.typingDot} />
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const { state } = useDocumentContext();
  const activeDocumentId = typeof documentId === 'string' ? documentId : '';
  const [inputValue, setInputValue] = useState('');

  const document = activeDocumentId ? state.documents[activeDocumentId] : undefined;
  const { messages, isChatting, sendMessage, clearMessages } = useChat(activeDocumentId);

  const suggestedQuestions = useMemo(() => {
    const docType = document?.analysis?.documentType?.toLowerCase() ?? 'default';
    const list = (SUGGESTED_QUESTIONS as unknown as Record<string, string[]>)[docType];
    return list ?? SUGGESTED_QUESTIONS.default;
  }, [document?.analysis?.documentType]);

  if (!activeDocumentId) return null;

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue('');
  };

  const QUICK_ACTIONS = ['Summarize', 'Find Risks', 'Deadlines', 'Explain Clause', 'Simplify'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {document?.filename ?? 'Document Chat'}
          </Text>
          <Text style={styles.headerSub}>AI LEGAL ASSISTANT</Text>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={clearMessages}>
          <Ionicons name="trash-outline" size={16} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Context Banner */}
      <View style={styles.contextBanner}>
        <View style={styles.contextBorderLeft} />
        <Text style={styles.contextText}>
          Answering based on: <Text style={styles.contextFileName}>{document?.filename ?? 'your document'}</Text>. Not legal advice.
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 96, android: 0 })}>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <Bubble message={item} onSelectSuggestion={sendMessage} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={C.gold} />
              <Text style={styles.emptyTitle}>Ask about your document</Text>
              <Text style={styles.emptyBody}>
                I have read your document. Ask anything in plain language.
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestedRow}>
                {suggestedQuestions.slice(0, 4).map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={styles.suggestedChip}
                    onPress={() => sendMessage(q)}>
                    <Text style={styles.suggestedChipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          }
          ListFooterComponent={isChatting ? <TypingIndicator /> : null}
        />

        {state.errors.chat && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={14} color={C.highRisk} />
            <Text style={styles.errorText}>{state.errors.chat}</Text>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputArea}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a}
                onPress={() => {
                  sendMessage(a);
                }}
                style={styles.quickChip}>
                <Text style={styles.quickChipText}>{a}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <TextInput
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Ask anything about your document..."
                placeholderTextColor={C.textMuted}
                multiline
                maxLength={500}
                style={styles.input}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                blurOnSubmit
              />
              {inputValue.length > 200 && (
                <Text style={styles.charCount}>{inputValue.length}/500</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputValue.trim() || isChatting}
              style={[
                styles.sendBtn,
                (!inputValue.trim() || isChatting) && styles.sendBtnDisabled,
              ]}>
              <Ionicons
                name="arrow-up"
                size={18}
                color={inputValue.trim() && !isChatting ? C.bg : C.textMuted}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
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
  headerCenter: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
    fontFamily: Serif,
  },
  headerSub: {
    fontSize: 9,
    color: C.gold,
    fontWeight: '700',
    letterSpacing: 2,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  contextBanner: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    paddingVertical: 10,
    paddingRight: 16,
    paddingLeft: 0,
    gap: 10,
    alignItems: 'center',
  },
  contextBorderLeft: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: C.gold,
    borderRadius: 2,
    marginLeft: 16,
  },
  contextText: {
    flex: 1,
    fontSize: 11,
    color: C.textMuted,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  contextFileName: {
    color: C.gold,
    fontStyle: 'normal',
    fontWeight: '600',
  },
  chatArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 8,
  },
  bubbleWrap: {
    marginVertical: 6,
    gap: 4,
  },
  bubbleRight: {
    alignItems: 'flex-end',
  },
  bubbleLeft: {
    alignItems: 'flex-start',
  },
  aiLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: C.gold,
    marginLeft: 2,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: Radius.bubble,
    padding: 14,
  },
  userBubble: {
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
    borderTopRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderTopLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    color: C.bodyText,
    lineHeight: 21,
  },
  userBubbleText: {
    color: C.textPrimary,
  },
  disclaimer: {
    fontSize: 10,
    color: C.textMuted,
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  suggestions: {
    gap: 6,
    paddingTop: 2,
  },
  suggestionChip: {
    borderWidth: 1,
    borderColor: C.goldBorder,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: C.goldGlow,
  },
  suggestionText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.gold,
  },
  timeLabel: {
    fontSize: 10,
    color: C.textMuted,
    marginHorizontal: 2,
  },
  typingRow: {
    marginVertical: 6,
    alignItems: 'flex-start',
    gap: 4,
    paddingHorizontal: 16,
  },
  typingLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: C.gold,
    marginLeft: 2,
  },
  typingBubble: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: C.surface,
    borderRadius: Radius.bubble,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.gold,
    opacity: 0.6,
  },
  typingDotMid: {
    opacity: 1,
  },
  emptyState: {
    paddingTop: 48,
    gap: 12,
    paddingHorizontal: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  emptyBody: {
    fontSize: 13,
    color: C.textMuted,
    lineHeight: 20,
  },
  suggestedRow: {
    gap: 8,
    marginTop: 4,
  },
  suggestedChip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.surface,
  },
  suggestedChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
  },
  errorRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  errorText: {
    fontSize: 12,
    color: C.highRisk,
    fontWeight: '500',
  },
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  quickRow: {
    gap: 8,
  },
  quickChip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: C.elevated,
  },
  quickChipText: {
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
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 42,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
    color: C.textPrimary,
    maxHeight: 100,
    lineHeight: 20,
  },
  charCount: {
    fontSize: 10,
    color: C.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.gold,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  sourcesBox: {
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    borderRadius: Radius.button,
    padding: 10,
    marginTop: 8,
    gap: 4,
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourcesHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sourceText: {
    fontSize: 11,
    color: C.textSecondary,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
