import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppColors, Radius } from '@/constants/colors';
import type { ChatMessage } from '@/types/chat';
import { useColorScheme } from '@/hooks/use-color-scheme';

type MessageBubbleProps = {
  message: ChatMessage;
  onSuggestionPress?: (suggestion: string) => void;
};

export function MessageBubble({ message, onSuggestionPress }: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];
  const isUser = message.sender === 'user';
  const timeLabel = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.container, isUser ? styles.alignRight : styles.alignLeft]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? palette.primary : palette.surface,
            borderColor: isUser ? palette.primary : palette.border,
          },
          isUser ? styles.userBubble : styles.aiBubble,
        ]}>
        {!isUser && (
          <Text style={[styles.aiLabel, { color: palette.textMuted }]}>LexAI - Legal AI</Text>
        )}
        <Text style={[styles.messageText, { color: isUser ? palette.surface : palette.textPrimary }]}> 
          {message.message}
        </Text>
        {message.quotedClause && (
          <View
            style={[
              styles.quoteBlock,
              { backgroundColor: palette.accentSoft, borderLeftColor: palette.accent },
            ]}>
            <Text style={[styles.quoteText, { color: palette.textSecondary }]}> 
              From your document: {message.quotedClause}
            </Text>
          </View>
        )}
        {!isUser && message.disclaimer && (
          <View style={[styles.disclaimerRow, { borderColor: palette.border }]}> 
            <Text style={[styles.disclaimerText, { color: palette.textMuted }]}> 
              {message.disclaimer}
            </Text>
          </View>
        )}
        {!isUser && message.followUpSuggestions && message.followUpSuggestions.length > 0 && (
          <View style={styles.suggestionsRow}>
            {message.followUpSuggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion}
                onPress={() => onSuggestionPress?.(suggestion)}
                style={[styles.suggestionChip, { borderColor: palette.border }]}>
                <Text style={[styles.suggestionText, { color: palette.primary }]}>
                  {suggestion}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <Text
        style={[
          styles.timestamp,
          { color: palette.textMuted, textAlign: isUser ? 'right' : 'left' },
        ]}>
        {timeLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  alignLeft: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  userBubble: {
    borderTopLeftRadius: Radius.bubble,
    borderTopRightRadius: Radius.bubble,
    borderBottomLeftRadius: Radius.bubble,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderTopLeftRadius: Radius.bubble,
    borderTopRightRadius: Radius.bubble,
    borderBottomRightRadius: Radius.bubble,
    borderBottomLeftRadius: 4,
  },
  aiLabel: {
    fontSize: 10,
    marginBottom: 6,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
  },
  quoteBlock: {
    borderLeftWidth: 3,
    borderLeftColor: '#E0B84E',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  quoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  disclaimerRow: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 6,
  },
  disclaimerText: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  suggestionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
});
