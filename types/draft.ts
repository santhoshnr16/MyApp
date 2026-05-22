export type DocumentType =
  | 'NDA'
  | 'Service Agreement'
  | 'Employment Contract'
  | 'Freelance Contract'
  | 'MOU'
  | 'Partnership Deed'
  | 'Lease Agreement'
  | 'Loan Agreement'
  | 'Share Purchase Agreement'
  | 'Founders Agreement';

export type TriggerFlag =
  | 'HAS_DATA_SHARING'
  | 'HAS_IP'
  | 'INTERNATIONAL_PARTIES'
  | 'HAS_EQUITY'
  | 'HAS_NON_COMPETE'
  | 'HAS_SLA'
  | 'HAS_ARBITRATION'
  | 'IS_STARTUP'
  | 'IS_ENTERPRISE';

export type Party = {
  name: string;
  role: string;
  type: 'individual' | 'company';
};

export type DraftDetails = {
  documentType: DocumentType;
  title: string;
  parties: Party[];
  jurisdiction: string;
  context: string;
  flags: TriggerFlag[];
};

export type DocumentSection = {
  id: string;
  title: string;
  description: string;
  required: boolean;
};

export type StructureQuestion = {
  id: string;
  question: string;
  sectionId: string;
  placeholder: string;
};

export type DocumentStructure = {
  documentTitle: string;
  sections: DocumentSection[];
  questions: StructureQuestion[];
  estimatedClauses: number;
};

export type ComplianceAct = {
  name: string;
  applicability: string;
};

export type ComplianceIssue = {
  severity: 'high' | 'medium' | 'low';
  description: string;
};

export type ComplianceReport = {
  acts: ComplianceAct[];
  issues: ComplianceIssue[];
  overallCompliance: 'compliant' | 'partial' | 'review_needed';
};

export type DraftRisk = {
  title: string;
  description: string;
  level: 'high' | 'medium' | 'low';
  mitigation: string;
};

export type RiskAnalysis = {
  risks: DraftRisk[];
  overallRisk: number;
  recommendation: string;
};

export type DraftRecord = {
  draftId: string;
  details: DraftDetails;
  structure: DocumentStructure;
  documentText: string;
  complianceReport: ComplianceReport;
  riskAnalysis: RiskAnalysis;
  createdAt: string;
};
