import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDocumentContext } from '@/context/document-context';
import { sendChatMessage } from '@/services/legalAI';
import { clearChatMessages, loadChatMessages, saveChatMessages } from '@/storage/chatStorage';
import type { ChatMessage } from '@/types/chat';
import { AI_DISCLAIMER, DEFAULT_FOLLOW_UPS } from '@/constants/prompts';

const createMessage = (partial: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage => ({
  ...partial,
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  timestamp: new Date().toISOString(),
});

export function useChat(documentId: string) {
  const { state, dispatch } = useDocumentContext();
  const [localLoading, setLocalLoading] = useState(false);

  const messages = useMemo(() => state.chatByDocument[documentId] ?? [], [state, documentId]);

  useEffect(() => {
    let mounted = true;
    loadChatMessages(documentId).then((stored) => {
      if (!mounted) {
        return;
      }
      dispatch({ type: 'SET_CHAT_HISTORY', payload: { documentId, messages: stored } });
    });
    return () => {
      mounted = false;
    };
  }, [dispatch, documentId]);

  const persist = useCallback(
    async (updatedMessages: ChatMessage[]) => {
      await saveChatMessages(documentId, updatedMessages);
    },
    [documentId]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        return;
      }

      const userMessage = createMessage({ sender: 'user', message: text.trim() });
      const nextMessages = [...messages, userMessage];
      dispatch({ type: 'SET_CHAT_HISTORY', payload: { documentId, messages: nextMessages } });
      persist(nextMessages);
      setLocalLoading(true);
      dispatch({ type: 'SET_LOADING', payload: { chatting: true } });
      dispatch({ type: 'CLEAR_ERROR', payload: 'chat' });

      try {
        const response = await sendChatMessage(documentId, text.trim(), [...messages, userMessage]);
        const aiMessage = createMessage({
          sender: 'ai',
          message: response.reply,
          sources: response.sources,
          followUpSuggestions: response.followUpSuggestions ?? DEFAULT_FOLLOW_UPS,
          disclaimer: response.disclaimer ?? AI_DISCLAIMER,
        });
        const finalMessages = [...nextMessages, aiMessage];
        dispatch({ type: 'SET_CHAT_HISTORY', payload: { documentId, messages: finalMessages } });
        persist(finalMessages);
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: { chat: 'Unable to reach LexAI. Please try again.' },
        });
      } finally {
        setLocalLoading(false);
        dispatch({ type: 'SET_LOADING', payload: { chatting: false } });
      }
    },
    [dispatch, documentId, messages, persist]
  );

  const clearMessages = useCallback(async () => {
    dispatch({ type: 'SET_CHAT_HISTORY', payload: { documentId, messages: [] } });
    await clearChatMessages(documentId);
  }, [dispatch, documentId]);

  return {
    messages,
    isChatting: localLoading || state.loading.chatting,
    sendMessage,
    clearMessages,
  };
}
