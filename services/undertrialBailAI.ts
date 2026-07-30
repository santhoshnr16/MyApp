import axios from 'axios';

import type {
  AuditLogEntry,
  BNSS479EligibilityResult,
  PrisonerRecordPayload,
} from '@/types/undertrialBail';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';

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

export async function fetchAllUndertrialCases(): Promise<{
  cases: Array<{ record: PrisonerRecordPayload; evaluation: BNSS479EligibilityResult }>;
}> {
  const response = await apiClient.get('/api/v1/undertrial/cases');
  return response.data;
}

export async function fetchUndertrialCaseDetail(prisonerId: string): Promise<{
  record: PrisonerRecordPayload;
  evaluation: BNSS479EligibilityResult;
  auditLogs: AuditLogEntry[];
}> {
  const response = await apiClient.get(`/api/v1/undertrial/cases/${prisonerId}`);
  return response.data;
}

export async function submitStaffManualOverride(
  prisonerId: string,
  params: { isOverridden: boolean; reason: string; staffName?: string }
): Promise<{ record: PrisonerRecordPayload; evaluation: BNSS479EligibilityResult }> {
  const response = await apiClient.post(`/api/v1/undertrial/cases/${prisonerId}/override`, params);
  return response.data;
}

export async function submitRemandClockAdjustment(
  prisonerId: string,
  params: { pauseDays: number; reason: string; recordedBy?: string }
): Promise<{ record: PrisonerRecordPayload; evaluation: BNSS479EligibilityResult }> {
  const response = await apiClient.post(`/api/v1/undertrial/cases/${prisonerId}/remand-adjust`, params);
  return response.data;
}

export async function confirmAndInitiateBailProcess(
  prisonerId: string,
  params: { staffName: string; comments?: string; targetWebhookUrl?: string }
): Promise<{
  record: PrisonerRecordPayload;
  evaluation: BNSS479EligibilityResult;
  webhookResult: any;
}> {
  const response = await apiClient.post(`/api/v1/undertrial/cases/${prisonerId}/confirm-bail`, params);
  return response.data;
}

export async function triggerDailyCronEligibilityCheck(): Promise<{
  message: string;
  summary: any;
}> {
  const response = await apiClient.post('/api/v1/undertrial/cron/run-daily-check');
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
