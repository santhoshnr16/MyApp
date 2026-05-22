import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { DocumentProvider } from '@/context/document-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <DocumentProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="summary/[documentId]" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[documentId]" options={{ headerShown: false }} />
          <Stack.Screen name="moot/[documentId]" options={{ headerShown: false }} />
          <Stack.Screen name="moot/verdict/[documentId]" options={{ headerShown: false }} />
          <Stack.Screen name="draft/new" options={{ headerShown: false }} />
          <Stack.Screen name="draft/[draftId]" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      </DocumentProvider>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
