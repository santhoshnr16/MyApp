import axios from 'axios';

import { buildStructurePrompt, buildDraftingPrompt, buildFormattingPrompt } from '@/constants/draftPrompts';
import type {
  DraftDetails,
  DocumentStructure,
  ComplianceReport,
  RiskAnalysis,
} from '@/types/draft';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000,
});

export type StructureResult = DocumentStructure;

export type DraftResult = {
  documentText: string;
  complianceReport: ComplianceReport;
  riskAnalysis: RiskAnalysis;
};

function stripMarkdown(raw: string): string {
  return raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}

function extractJson(raw: string): string | null {
  const clean = stripMarkdown(raw);
  // Find outermost { ... }
  const start = clean.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < clean.length; i++) {
    if (clean[i] === '{') depth++;
    else if (clean[i] === '}') {
      depth--;
      if (depth === 0) return clean.slice(start, i + 1);
    }
  }
  // Truncated JSON — close all open structures
  const partial = clean.slice(start);
  return repairJson(partial);
}

function repairJson(partial: string): string {
  let s = partial.trimEnd();
  // Remove trailing comma before closing
  s = s.replace(/,\s*$/, '');
  // Count open brackets
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }
  // If we ended inside a string, close it
  if (inString) s += '"';
  s = s.replace(/,\s*$/, '');
  while (brackets > 0) { s += ']'; brackets--; }
  while (braces > 0) { s += '}'; braces--; }
  return s;
}

function defaultStructure(details: DraftDetails): DocumentStructure {
  return {
    documentTitle: `${details.title || details.documentType} Agreement`,
    sections: [
      { id: 'sec1', title: 'Parties and Recitals', description: 'Names and background', required: true },
      { id: 'sec2', title: 'Term and Duration', description: 'Start date and duration', required: true },
      { id: 'sec3', title: 'Rights and Obligations', description: 'What each party must do', required: true },
      { id: 'sec4', title: 'Confidentiality', description: 'Information protection', required: true },
      { id: 'sec5', title: 'Termination', description: 'How agreement can end', required: true },
      { id: 'sec6', title: 'Governing Law', description: 'Jurisdiction and disputes', required: true },
    ],
    questions: [
      { id: 'q1', question: 'What is the start date and duration?', sectionId: 'sec2', placeholder: 'e.g. 1 year from 1 June 2025' },
      { id: 'q2', question: 'What are the key obligations of each party?', sectionId: 'sec3', placeholder: 'e.g. Party A provides services, Party B pays monthly' },
      { id: 'q3', question: 'What is the payment amount and schedule?', sectionId: 'sec3', placeholder: 'e.g. Rs. 50,000 per month' },
      { id: 'q4', question: 'What are the grounds for early termination?', sectionId: 'sec5', placeholder: 'e.g. 30 days written notice' },
    ],
    estimatedClauses: 8,
  };
}

export async function generateStructure(details: DraftDetails): Promise<StructureResult> {
  const prompt = buildStructurePrompt(details);
  const response = await apiClient.post<{ result: string }>('/api/draft/structure', { prompt });
  const raw = response.data.result;

  const jsonStr = extractJson(raw);
  if (!jsonStr) return defaultStructure(details);

  try {
    const parsed = JSON.parse(jsonStr) as DocumentStructure;
    // Validate required fields exist
    if (!parsed.sections?.length || !parsed.questions?.length) {
      return defaultStructure(details);
    }
    return parsed;
  } catch {
    return defaultStructure(details);
  }
}

export async function generateDocument(
  details: DraftDetails,
  structure: DocumentStructure,
  answers: Record<string, string>
): Promise<DraftResult> {
  const prompt = buildDraftingPrompt(details, structure, answers);
  const response = await apiClient.post<{ result: string }>('/api/draft/document', { prompt });
  const raw = response.data.result;

  const docMatch = raw.match(/---DOCUMENT_START---([\s\S]*?)---DOCUMENT_END---/);
  const complianceMatch = raw.match(/---COMPLIANCE_REPORT_START---([\s\S]*?)---COMPLIANCE_REPORT_END---/);
  const riskMatch = raw.match(/---RISK_ANALYSIS_START---([\s\S]*?)---RISK_ANALYSIS_END---/);

  const documentText = docMatch?.[1]?.trim() ?? raw.trim();

  let complianceReport: ComplianceReport = {
    acts: [],
    issues: [],
    overallCompliance: 'review_needed',
  };
  if (complianceMatch?.[1]) {
    try {
      const jsonMatch = complianceMatch[1].match(/\{[\s\S]*\}/);
      if (jsonMatch) complianceReport = JSON.parse(jsonMatch[0]) as ComplianceReport;
    } catch {
      // use default
    }
  }

  let riskAnalysis: RiskAnalysis = {
    risks: [],
    overallRisk: 50,
    recommendation: 'Have this document reviewed by a qualified lawyer.',
  };
  if (riskMatch?.[1]) {
    try {
      const jsonMatch = riskMatch[1].match(/\{[\s\S]*\}/);
      if (jsonMatch) riskAnalysis = JSON.parse(jsonMatch[0]) as RiskAnalysis;
    } catch {
      // use default
    }
  }

  return { documentText, complianceReport, riskAnalysis };
}

export async function formatDocument(rawText: string): Promise<string> {
  const prompt = buildFormattingPrompt(rawText);
  try {
    const response = await apiClient.post<{ result: string }>('/api/draft/format', { prompt });
    const raw = response.data.result.trim();
    if (!raw) return rawText;

    // Model continues from the pre-seeded start delimiter — take everything after it
    const afterStart = raw.split('---FORMATTED_DOCUMENT_START---').pop();
    if (afterStart) {
      // Strip trailing end delimiter if present
      const cleaned = afterStart
        .replace(/---FORMATTED_DOCUMENT_END---[\s\S]*$/, '')
        .trim();
      if (cleaned.length > 100) return cleaned;
    }

    // Delimiter absent but model returned something — strip common preamble phrases
    const stripped = raw
      .replace(/^(here'?s?|below is|the following is)[^:]*:\s*/i, '')
      .replace(/^reformatted[^:]*:\s*/i, '')
      .trim();
    if (stripped.length > 100) return stripped;

    return rawText;
  } catch {
    return rawText;
  }
}
