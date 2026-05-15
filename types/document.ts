export type DocumentLanguage =
  | 'English'
  | 'Hindi'
  | 'Marathi'
  | 'Tamil'
  | 'Telugu'
  | 'Bengali'
  | 'Gujarati';

export type RiskLevel = 'high' | 'medium' | 'low';

export type KeyPointImportance = 'critical' | 'important' | 'note';

export type AnalysisOptions = {
  fullSummary: boolean;
  riskAnalysis: boolean;
  enableChat: boolean;
  translateSummary: boolean;
  language: DocumentLanguage;
};

export type DocumentFile = {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
};

export type DocumentRisk = {
  id: string;
  title: string;
  description: string;
  recommendation?: string;
  level: RiskLevel;
};

export type KeyPoint = {
  id: string;
  text: string;
  importance: KeyPointImportance;
};

export type Obligation = {
  id: string;
  action: string;
  deadline?: string;
  urgency?: RiskLevel;
};

export type DocumentAnalysis = {
  summary: string;
  keyPoints: KeyPoint[];
  risks: DocumentRisk[];
  obligations: Obligation[];
  riskScore?: number;
  documentType?: string;
};

export type DocumentRecord = {
  documentId: string;
  filename: string;
  language: DocumentLanguage;
  uploadedAt: string;
  pages?: number;
  location?: string;
  analysis?: DocumentAnalysis;
};

export type UploadResponse = {
  documentId: string;
  summary: string;
  risks: DocumentRisk[];
  keyPoints: KeyPoint[];
  obligations: Obligation[];
  riskScore?: number;
  documentType?: string;
};

export type SummaryResponse = {
  summary: string;
  keyPoints: KeyPoint[];
  risks: DocumentRisk[];
  obligations: Obligation[];
  riskScore?: number;
  documentType?: string;
};
