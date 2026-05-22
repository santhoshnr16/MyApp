import axios from 'axios';

import { parseNegotiationAnalysis } from '@/constants/negotiationPrompt';
import type { NegotiationContext, NegotiationAnalysis } from '@/types/negotiation';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000,
});

export async function analyseForNegotiation(
  documentId: string,
  context: NegotiationContext
): Promise<NegotiationAnalysis> {
  const response = await apiClient.post<{ result: string }>('/api/negotiate/analyse', {
    documentId,
    context,
  });

  const raw = response.data.result;
  return parseNegotiationAnalysis(raw);
}
