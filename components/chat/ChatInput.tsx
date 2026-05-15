import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppColors, Radius } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ChatInputProps = {
  onSend: (message: string) => void;
  onAttach: () => void;
  quickActions: string[];
};

export function ChatInput({ onSend, onAttach, quickActions }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];

  const canSend = value.trim().length > 0;
  const isSingleLine = !value.includes('\n');
  const showCount = value.length > 200;
  const counterText = useMemo(() => `${value.length}/500`, [value.length]);

  const handleSend = () => {
    if (!canSend) {
      return;
    }
    onSend(value);
    setValue('');
  };

  return (
    <View style={[styles.container, { borderTopColor: palette.border, backgroundColor: palette.surface }]}> 
      {isFocused && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action}
              onPress={() => setValue(action)}
              style={[styles.quickChip, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
              <Text style={[styles.quickText, { color: palette.primary }]}>{action}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity onPress={onAttach} style={styles.iconButton}>
          <Ionicons name="attach" size={20} color={palette.primary} />
        </TouchableOpacity>
        <View style={[styles.inputWrapper, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
          <TextInput
            placeholder="Ask anything about your document..."
            placeholderTextColor={palette.textMuted}
            value={value}
            onChangeText={setValue}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            multiline
            maxLength={500}
            returnKeyType={isSingleLine ? 'send' : 'default'}
            blurOnSubmit={isSingleLine}
            onSubmitEditing={() => {
              if (isSingleLine) {
                handleSend();
              }
            }}
            style={[styles.input, { color: palette.textPrimary }]}
          />
        </View>
        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.sendButton, { backgroundColor: canSend ? palette.primary : palette.border }]}> 
          <Ionicons name="arrow-up" size={18} color={canSend ? palette.accent : palette.textMuted} />
        </TouchableOpacity>
      </View>
      {showCount && (
        <Text style={[styles.counter, { color: palette.textMuted }]}>{counterText}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 8,
  },
  quickRow: {
    gap: 8,
    marginBottom: 10,
  },
  quickChip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
  },
  input: {
    minHeight: 36,
    maxHeight: 120,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: 6,
    fontSize: 10,
  },
});
