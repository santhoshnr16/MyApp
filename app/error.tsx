import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { AppColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const palette = AppColors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.title, { color: palette.textPrimary }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: palette.textMuted }]}>{error.message}</Text>
      <Button label="Try again" onPress={retry} />
      <Button label="Go home" onPress={() => router.replace('/')} variant="ghost" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  message: {
    fontSize: 12,
    textAlign: 'center',
  },
});
