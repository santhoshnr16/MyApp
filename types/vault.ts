export type VaultUserRole = 'advocate' | 'client' | 'junior';

export interface VaultUser {
  id: string;
  name: string;
  email: string;
  role: VaultUserRole;
  barNumber: string | null;
  enrolledAt: string;
}

export interface VaultCase {
  id: string;
  title: string;
  caseNumber: string | null;
  court: string | null;
  caseType: string;
  status: 'active' | 'pending' | 'closed' | 'archived';
  clientName: string;
  advocateName: string | null;
  createdAt: string;
  nextHearing: string | null;
  documentCount: number;
  unreadCount: number;
  myRole?: VaultMemberRole;
  memberCount?: number;
}

export type VaultMemberRole = 'owner' | 'advocate' | 'junior' | 'client';

export interface VaultMember {
  userId: string;
  name: string;
  email: string;
  role: VaultMemberRole;
  addedAt: string;
  addedBy: string;
}

export interface VaultUserSearchResult {
  id: string;
  name: string;
  email: string;
  role: VaultUserRole;
}

export interface VaultAuthState {
  user: VaultUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface NewCasePayload {
  title: string;
  caseNumber?: string;
  court?: string;
  caseType: string;
  clientName: string;
  nextHearing?: string;
}

export interface VaultDocument {
  id: string;
  caseId: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  documentType: string | null;
  description: string | null;
  uploadedBy: string;
  uploaderName: string;
  uploaderRole: VaultUserRole;
  uploadedAt: string;
}

export interface VaultMessage {
  id: string;
  caseId: string;
  senderId: string;
  senderName: string;
  senderRole: VaultUserRole;
  body: string;
  isInternal: boolean;
  sentAt: string;
}

export interface VaultRequest {
  id: string;
  caseId: string;
  requestedBy: string;
  requesterName: string;
  requesterRole: VaultUserRole;
  requestType: 'document_upload' | 'status_update' | 'meeting' | 'query' | 'other';
  title: string;
  description: string | null;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  resolvedAt: string | null;
}
