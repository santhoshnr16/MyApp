import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatInput } from '@/components/chat/ChatInput';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { SuggestedQuestions } from '@/components/chat/SuggestedQuestions';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { AppColors } from '@/constants/colors';
import { SUGGESTED_QUESTIONS } from '@/constants/prompts';
import { useDocumentContext } from '@/context/document-context';
import { useChat } from '@/hooks/useChat';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ChatScreen() {
  const router = useRouter();
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];
  const { state } = useDocumentContext();
  const chatError = state.errors.chat;

  if (!documentId) {
    return null;
  }

  const document = state.documents[documentId];
  const { messages, isChatting, sendMessage, clearMessages } = useChat(documentId);

  const suggestedQuestions = useMemo(() => {
    const docType = document?.analysis?.documentType?.toLowerCase() ?? 'default';
    const list = (SUGGESTED_QUESTIONS as Record<string, string[]>)[docType];
    return list ?? SUGGESTED_QUESTIONS.default;
  }, [document?.analysis?.documentType]);

  return (
    <SafeAreaView
      className="flex-1"
      style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.primary }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={20} color={palette.surface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: palette.surface }]} numberOfLines={1}>
            {document?.filename ?? 'Document Chat'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: palette.accent }]}>AI Legal Assistant</Text>
        </View>
        <TouchableOpacity onPress={clearMessages} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={16} color={palette.surface} />
          <Text style={[styles.clearText, { color: palette.surface }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.banner, { backgroundColor: palette.accentSoft, borderLeftColor: palette.accent }]}> 
        <Ionicons name="information-circle" size={18} color={palette.primary} />
        <Text style={[styles.bannerText, { color: palette.primary }]}>
          I am answering based on your uploaded document: {document?.filename ?? 'this file'}.
          Ask me anything about it.
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 92, android: 0 })}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              onSuggestionPress={(suggestion) => sendMessage(suggestion)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses" size={56} color={palette.primary} />
              <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Ask about your document</Text>
              <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}> 
                I have read your document. Ask me anything in plain language.
              </Text>
              <SuggestedQuestions questions={suggestedQuestions} onSelect={sendMessage} />
            </View>
          }
          ListFooterComponent={isChatting ? <TypingIndicator /> : null}
        />
        {chatError && (
          <View style={styles.errorRow}>
            <Text style={[styles.errorText, { color: palette.danger }]}>{chatError}</Text>
          </View>
        )}
        <ChatInput
          onSend={sendMessage}
          onAttach={() => router.push({ pathname: '/upload' })}
          quickActions={['Summarize', 'Find Risks', 'Deadlines', 'Explain Clause', 'Simplify']}
        />
      </KeyboardAvoidingView>
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
    paddingVertical: 12,
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  clearText: {
    fontSize: 11,
    fontWeight: '600',
  },
  banner: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderLeftWidth: 3,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  chatArea: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 0,
  },
  emptyState: {
    alignItems: 'flex-start',
    paddingTop: 48,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'left',
  },
  errorRow: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
