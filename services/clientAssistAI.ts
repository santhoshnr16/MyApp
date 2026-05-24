import axios from 'axios';

import type { AssistContext, AssistResponse, TaskType } from '@/types/clientAssist';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

export async function clientAssist(
  taskType: TaskType,
  input: string,
  context: AssistContext,
  documentId?: string
): Promise<AssistResponse> {
  const response = await apiClient.post<AssistResponse>('/api/client/assist', {
    taskType,
    input,
    context,
    documentId,
  });
  return response.data;
}
