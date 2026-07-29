import type { DocumentStructure, DraftDetails } from '@/types/draft';

export function buildStructurePrompt(details: DraftDetails): string {
  const flagDescriptions: Record<string, string> = {
    HAS_DATA_SHARING: 'data sharing/privacy clauses',
    HAS_IP: 'intellectual property ownership',
    INTERNATIONAL_PARTIES: 'cross-border jurisdiction',
    HAS_EQUITY: 'equity/shareholding',
    HAS_NON_COMPETE: 'non-compete restrictions',
    HAS_SLA: 'service level agreements',
    HAS_ARBITRATION: 'arbitration dispute resolution',
    IS_STARTUP: 'startup-friendly terms',
    IS_ENTERPRISE: 'enterprise compliance requirements',
  };

  const flags = Array.isArray(details?.flags) ? details.flags : [];
  const activeFlags = flags.map((f) => flagDescriptions[f] ?? f).join(', ');

  const parties = Array.isArray(details?.parties) ? details.parties : [];
  const partiesList = parties.length > 0
    ? parties.map((p) => `${p?.name || 'Party'} (${p?.role || 'Party'}, ${p?.type || 'entity'})`).join(', ')
    : 'Party A, Party B';

  const docType = details?.documentType || 'AGREEMENT';
  const title = details?.title || `${docType} Agreement`;

  return `You are LexAI DraftCounsel. Return ONLY a JSON object. No markdown. No explanation. No extra text before or after.

TYPE: ${docType}
PARTIES: ${partiesList}
JURISDICTION: ${details?.jurisdiction || 'India'}
FLAGS: ${activeFlags || 'none'}

JSON (fill in the values, keep descriptions under 10 words):
{"documentTitle":"${title}","sections":[{"id":"sec1","title":"Parties and Recitals","description":"Names, addresses and background","required":true},{"id":"sec2","title":"Term and Duration","description":"Start date and duration","required":true},{"id":"sec3","title":"Rights and Obligations","description":"What each party must do","required":true},{"id":"sec4","title":"Confidentiality","description":"Information protection terms","required":true},{"id":"sec5","title":"Termination","description":"How agreement can end","required":true},{"id":"sec6","title":"Governing Law","description":"Jurisdiction and dispute resolution","required":true}],"questions":[{"id":"q1","question":"What is the start date and duration of this agreement?","sectionId":"sec2","placeholder":"e.g. 1 year from 1 June 2025"},{"id":"q2","question":"What are the key obligations of each party?","sectionId":"sec3","placeholder":"e.g. Party A provides services, Party B pays monthly"},{"id":"q3","question":"What is the payment amount and schedule?","sectionId":"sec3","placeholder":"e.g. Rs. 50,000 per month, paid by 5th"},{"id":"q4","question":"What are the grounds for early termination?","sectionId":"sec5","placeholder":"e.g. 30 days notice, material breach"}],"estimatedClauses":8}

Return that JSON with values filled in for this ${docType}. ONLY JSON, nothing else.`;
}

export function buildFormattingPrompt(documentText: string): string {
  return `You are a professional legal document formatter at a top-tier Indian law firm. A document has already been drafted. Your ONLY job is to reformat the raw legal text into a perfectly structured, print-ready legal document exactly as it would appear on white paper when prepared by a senior advocate.

DO NOT change any legal content, clauses, or wording.
DO NOT add or remove any clause.
ONLY reformat, restructure, and apply correct legal document presentation standards.

═══════════════════════════════════════════
RAW DOCUMENT INPUT
═══════════════════════════════════════════
${documentText}

═══════════════════════════════════════════
FORMATTING RULES
═══════════════════════════════════════════

1. Center the document title in CAPS at the top, followed by a horizontal rule
2. Right-align document metadata (Agreement No., Date, Place of Execution)
3. Format parties with formal THIS AGREEMENT block — BETWEEN ... AND
4. Add WHEREAS recitals block before operative clauses
5. Number each clause as: 1. CLAUSE TITLE IN CAPS, with sub-clauses as 1.1, 1.2 etc.
6. List items use (a), (b), (c) indent format
7. Separate major clauses with:    * * *
8. Signature block at end: two-column format for both parties with witness lines
9. Footer disclaimer after signature block

TYPOGRAPHY:
- Document title: ALL CAPS, centered
- Section titles: ALL CAPS, bold, numbered
- Defined terms: "Quoted" first use, Capitalised thereafter
- Act references: italicised
- Dates: written in full — 1st day of July, 2026
- Numbers: words then digits — two (2) years

Apply ALL formatting rules above. Begin the formatted document immediately after the marker below. Do not write any explanation or preamble.

---FORMATTED_DOCUMENT_START---`;
}

export function buildDraftingPrompt(
  details: DraftDetails,
  structure: DocumentStructure,
  answers: Record<string, string>
): string {
  const docType = details?.documentType || 'AGREEMENT';
  const docTypeUpper = docType.toUpperCase();
  const parties = Array.isArray(details?.parties) ? details.parties : [];
  const partiesList = parties.length > 0
    ? parties.map((p) => `${p?.name || 'Party'} (${p?.role || 'Party'})`).join(' and ')
    : 'Party A and Party B';
  const partiesFormatted = parties.length > 0
    ? parties.map((p) => `${p?.name || 'Party'} ("${p?.role || 'Party'}")`).join(' and ')
    : 'Party A ("First Party") and Party B ("Second Party")';

  const sections = Array.isArray(structure?.sections) ? structure.sections : [];
  const sectionTitles = sections.map((s) => `- ${s?.title || 'Section'}: ${s?.description || ''}`).join('\n');

  const questions = Array.isArray(structure?.questions) ? structure.questions : [];
  const answeredQuestions = questions
    .map((q) => `${q?.question || 'Question'}: ${(answers && answers[q?.id]) ?? 'Not specified'}`)
    .join('\n');

  const flags = Array.isArray(details?.flags) ? details.flags : [];
  const flagsStr = flags.join(', ') || 'none';

  return `You are LexAI DraftCounsel. Draft a complete Indian legal document and analysis. Output ONLY the three sections below with their exact delimiters.

DOCUMENT TYPE: ${docType}
TITLE: ${structure?.documentTitle || details?.title || docType}
PARTIES: ${partiesList}
JURISDICTION: ${details?.jurisdiction || 'India'}
CONTEXT: ${details?.context || 'Commercial agreement under Indian Law'}
FLAGS: ${flagsStr}

REQUIRED SECTIONS:
${sectionTitles}

ADDITIONAL DETAILS FROM DRAFTING QUESTIONS:
${answeredQuestions}

Output format (use these exact delimiters, no text outside them):

---DOCUMENT_START---
THIS ${docTypeUpper} ("Agreement") is entered into on [DATE] between ${partiesFormatted}.

[Draft all required sections with proper Indian legal language. Include clause numbers. End with signature blocks.]
---DOCUMENT_END---
---COMPLIANCE_REPORT_START---
{"acts":[{"name":"act name","applicability":"why it applies"}],"issues":[{"severity":"high|medium|low","description":"issue description"}],"overallCompliance":"compliant|partial|review_needed"}
---COMPLIANCE_REPORT_END---
---RISK_ANALYSIS_START---
{"risks":[{"title":"risk title","description":"risk description","level":"high|medium|low","mitigation":"what to do"}],"overallRisk":50,"recommendation":"overall recommendation"}
---RISK_ANALYSIS_END---`;
}
