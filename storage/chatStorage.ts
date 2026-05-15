import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ChatMessage } from '@/types/chat';

const chatKey = (documentId: string) => `chat:${documentId}`;

export async function loadChatMessages(documentId: string): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(chatKey(documentId));
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

export async function saveChatMessages(documentId: string, messages: ChatMessage[]) {
  await AsyncStorage.setItem(chatKey(documentId), JSON.stringify(messages));
}

export async function clearChatMessages(documentId: string) {
  await AsyncStorage.removeItem(chatKey(documentId));
}
