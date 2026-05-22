export type MootRole = 'petitioner' | 'respondent';

export type MootSender = 'student' | 'counsel';

export type MootMessage = {
  id: string;
  sender: MootSender;
  text: string;
  exchange: number;
  timestamp: string;
};

export type OllamaMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type VerdictScore = {
  petitioner: number;
  respondent: number;
};

export type VerdictData = {
  isVerdict: true;
  winner: MootRole;
  score: VerdictScore;
  studentStrengths: string[];
  studentWeaknesses: string[];
  missedArguments: string[];
  judgeRemarks: string;
  summary: string;
};

export type MootSession = {
  documentId: string;
  documentName: string;
  documentType: string;
  documentSummary: string;
  jurisdiction: string;
  studentRole: MootRole;
  opposingRole: MootRole;
  messages: MootMessage[];
  currentExchange: number;
  maxExchanges: number;
  isComplete: boolean;
  verdict?: VerdictData;
};

export type ArgumentStrength = {
  student: number;
  counsel: number;
};

export type MootPhase = 'selection' | 'courtroom';
