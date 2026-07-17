import type {
  NewCasePayload,
  VaultCase,
  VaultDocument,
  VaultMember,
  VaultMemberRole,
  VaultMessage,
  VaultRequest,
  VaultUserSearchResult,
} from '@/types/vault';

const VAULT_BASE = process.env.EXPO_PUBLIC_VAULT_BASE_URL ?? 'http://localhost:3002';

async function vaultReq<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${VAULT_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
    clearTimeout(timer);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed ${res.status}`);
    return data as T;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Request timed out — check server is running');
    throw err;
  }
}

// ─── Cases ────────────────────────────────────────────────────────────────────

export async function getCases(token: string): Promise<VaultCase[]> {
  const data = await vaultReq<{ cases: VaultCase[] }>('/vault/cases', token);
  return data.cases;
}

export async function createCase(token: string, payload: NewCasePayload): Promise<VaultCase> {
  const data = await vaultReq<{ case: VaultCase }>('/vault/cases', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.case;
}

export async function getCase(token: string, caseId: string): Promise<VaultCase> {
  const data = await vaultReq<{ case: VaultCase }>(`/vault/cases/${caseId}`, token);
  return data.case;
}

export async function updateCase(
  token: string,
  caseId: string,
  patch: Partial<Pick<VaultCase, 'status' | 'title' | 'court' | 'caseNumber' | 'nextHearing' | 'advocateName'>>,
): Promise<VaultCase> {
  const data = await vaultReq<{ case: VaultCase }>(`/vault/cases/${caseId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.case;
}

// ─── Documents ───────────────────────────────────────────────────────────────

export async function getDocuments(token: string, caseId: string): Promise<VaultDocument[]> {
  const data = await vaultReq<{ documents: VaultDocument[] }>(
    `/vault/cases/${caseId}/documents`, token,
  );
  return data.documents;
}

export async function uploadDocument(
  token: string,
  caseId: string,
  file: { uri: string; name: string; mimeType?: string },
  opts?: { documentType?: string; description?: string },
): Promise<VaultDocument> {
  const formData = new FormData();
  formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as any);
  if (opts?.documentType) formData.append('documentType', opts.documentType);
  if (opts?.description) formData.append('description', opts.description);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${VAULT_BASE}/vault/cases/${caseId}/documents`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    clearTimeout(timer);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Upload failed ${res.status}`);
    return data.document;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Upload timed out');
    throw err;
  }
}

export async function deleteDocument(token: string, caseId: string, docId: string): Promise<void> {
  await vaultReq(`/vault/cases/${caseId}/documents/${docId}`, token, { method: 'DELETE' });
}

export function documentViewUrl(token: string, docId: string): string {
  return `${VAULT_BASE}/vault/documents/${docId}/file?token=${encodeURIComponent(token)}`;
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function getMessages(token: string, caseId: string): Promise<VaultMessage[]> {
  const data = await vaultReq<{ messages: VaultMessage[] }>(
    `/vault/cases/${caseId}/messages`, token,
  );
  return data.messages;
}

export async function sendMessage(
  token: string,
  caseId: string,
  body: string,
  isInternal = false,
): Promise<VaultMessage> {
  const data = await vaultReq<{ message: VaultMessage }>(
    `/vault/cases/${caseId}/messages`, token,
    { method: 'POST', body: JSON.stringify({ body, isInternal }) },
  );
  return data.message;
}

// ─── Requests ────────────────────────────────────────────────────────────────

export async function getRequests(token: string, caseId: string): Promise<VaultRequest[]> {
  const data = await vaultReq<{ requests: VaultRequest[] }>(
    `/vault/cases/${caseId}/requests`, token,
  );
  return data.requests;
}

export async function createRequest(
  token: string,
  caseId: string,
  payload: {
    requestType: VaultRequest['requestType'];
    title: string;
    description?: string;
    priority?: VaultRequest['priority'];
  },
): Promise<VaultRequest> {
  const data = await vaultReq<{ request: VaultRequest }>(
    `/vault/cases/${caseId}/requests`, token,
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return data.request;
}

export async function updateRequestStatus(
  token: string,
  caseId: string,
  reqId: string,
  status: VaultRequest['status'],
): Promise<VaultRequest> {
  const data = await vaultReq<{ request: VaultRequest }>(
    `/vault/cases/${caseId}/requests/${reqId}`, token,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  );
  return data.request;
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function searchUser(token: string, email: string): Promise<VaultUserSearchResult | null> {
  const data = await vaultReq<{ user: VaultUserSearchResult | null }>(
    `/vault/users/search?email=${encodeURIComponent(email)}`, token,
  );
  return data.user;
}

export async function getCaseMembers(token: string, caseId: string): Promise<VaultMember[]> {
  const data = await vaultReq<{ members: VaultMember[] }>(
    `/vault/cases/${caseId}/members`, token,
  );
  return data.members;
}

export async function addCaseMember(
  token: string,
  caseId: string,
  targetUserId: string,
  role: VaultMemberRole,
): Promise<VaultMember> {
  const data = await vaultReq<{ member: VaultMember }>(
    `/vault/cases/${caseId}/members`, token,
    { method: 'POST', body: JSON.stringify({ targetUserId, role }) },
  );
  return data.member;
}

export async function removeCaseMember(
  token: string,
  caseId: string,
  targetUserId: string,
): Promise<void> {
  await vaultReq(`/vault/cases/${caseId}/members/${targetUserId}`, token, { method: 'DELETE' });
}
