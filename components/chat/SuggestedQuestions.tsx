import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppColors, Radius } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SuggestedQuestionsProps = {
  questions: string[];
  onSelect: (question: string) => void;
};

export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      {questions.map((question) => (
        <TouchableOpacity
          key={question}
          onPress={() => onSelect(question)}
          style={[styles.chip, { borderColor: palette.primary, backgroundColor: palette.surface }]}>
          <Text style={[styles.text, { color: palette.primary }]}>{question}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
