import axios from 'axios';

import type { BNSS479EligibilityResult, PrisonerRecordPayload } from '@/types/undertrialBail';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export async function evaluateUndertrialBailEligibility(searchParams: {
  prisonerId?: string;
  firNumber?: string;
  name?: string;
  jurisdiction?: string;
  chargeInput?: string;
  daysIncarcerated?: number;
  isFirstOffender?: boolean;
}): Promise<{ record: PrisonerRecordPayload; evaluation: BNSS479EligibilityResult }> {
  const response = await apiClient.post<{
    record: PrisonerRecordPayload;
    evaluation: BNSS479EligibilityResult;
  }>('/api/v1/undertrial/eligibility', searchParams);

  return response.data;
}

export async function ingestDLSAWebhookPayload(payload: Partial<PrisonerRecordPayload>): Promise<{
  message: string;
  record: PrisonerRecordPayload;
  evaluation: BNSS479EligibilityResult;
}> {
  const response = await apiClient.post('/api/v1/webhook/prison-intake', payload);
  return response.data;
}
