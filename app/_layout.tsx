import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { C } from '@/constants/colors';
import { DocumentProvider } from '@/context/document-context';

const LexTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: C.bg,
    card: C.surface,
    border: C.border,
    text: C.textPrimary,
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemeProvider value={LexTheme}>
      <DocumentProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="summary/[documentId]" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[documentId]" options={{ headerShown: false }} />
          <Stack.Screen name="moot/[documentId]" options={{ headerShown: false }} />
          <Stack.Screen name="moot/verdict/[documentId]" options={{ headerShown: false }} />
          <Stack.Screen name="draft/new" options={{ headerShown: false }} />
          <Stack.Screen name="draft/[draftId]" options={{ headerShown: false }} />
          <Stack.Screen name="negotiate/[documentId]" options={{ headerShown: false }} />
          <Stack.Screen name="assist/[documentId]" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      </DocumentProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
