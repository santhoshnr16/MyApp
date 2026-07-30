import axios from 'axios';

import type { ChatApiResponse, ChatHistoryItem, ChatMessage } from '@/types/chat';
import type { AnalysisOptions, DocumentFile, SummaryResponse, UploadResponse } from '@/types/document';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

export async function uploadAndAnalyze(
  file: DocumentFile,
  options: AnalysisOptions,
  signal?: AbortSignal
) {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);
  formData.append('options', JSON.stringify(options));

  const response = await apiClient.post<UploadResponse>('/api/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    signal,
  });

  return response.data;
}

export async function sendChatMessage(
  documentId: string,
  message: string,
  history: ChatMessage[]
) {
  const conversationHistory: ChatHistoryItem[] = history.map((item) => ({
    sender: item.sender,
    message: item.message,
  }));

  const response = await apiClient.post<ChatApiResponse>('/api/chat/message', {
    documentId,
    message,
    conversationHistory,
  });

  return response.data;
}

export async function getSummary(documentId: string) {
  const response = await apiClient.get<SummaryResponse>(`/api/documents/${documentId}/summary`);
  return response.data;
}
