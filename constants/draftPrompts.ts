import type { DraftDetails, DocumentStructure } from '@/types/draft';

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

  const activeFlags = details.flags.map((f) => flagDescriptions[f] ?? f).join(', ');
  const partiesList = details.parties.map((p) => `${p.name} (${p.role}, ${p.type})`).join(', ');

  return `You are LexAI DraftCounsel. Return ONLY a JSON object. No markdown. No explanation. No extra text before or after.

TYPE: ${details.documentType}
PARTIES: ${partiesList}
JURISDICTION: ${details.jurisdiction}
FLAGS: ${activeFlags || 'none'}

JSON (fill in the values, keep descriptions under 10 words):
{"documentTitle":"${details.title || details.documentType + ' Agreement'}","sections":[{"id":"sec1","title":"Parties and Recitals","description":"Names, addresses and background","required":true},{"id":"sec2","title":"Term and Duration","description":"Start date and duration","required":true},{"id":"sec3","title":"Rights and Obligations","description":"What each party must do","required":true},{"id":"sec4","title":"Confidentiality","description":"Information protection terms","required":true},{"id":"sec5","title":"Termination","description":"How agreement can end","required":true},{"id":"sec6","title":"Governing Law","description":"Jurisdiction and dispute resolution","required":true}],"questions":[{"id":"q1","question":"What is the start date and duration of this agreement?","sectionId":"sec2","placeholder":"e.g. 1 year from 1 June 2025"},{"id":"q2","question":"What are the key obligations of each party?","sectionId":"sec3","placeholder":"e.g. Party A provides services, Party B pays monthly"},{"id":"q3","question":"What is the payment amount and schedule?","sectionId":"sec3","placeholder":"e.g. Rs. 50,000 per month, paid by 5th"},{"id":"q4","question":"What are the grounds for early termination?","sectionId":"sec5","placeholder":"e.g. 30 days notice, material breach"}],"estimatedClauses":8}

Return that JSON with values filled in for this ${details.documentType}. ONLY JSON, nothing else.`;
}

export function buildDraftingPrompt(
  details: DraftDetails,
  structure: DocumentStructure,
  answers: Record<string, string>
): string {
  const partiesList = details.parties.map((p) => `${p.name} (${p.role})`).join(' and ');
  const sectionTitles = structure.sections.map((s) => `- ${s.title}: ${s.description}`).join('\n');
  const answeredQuestions = structure.questions
    .map((q) => `${q.question}: ${answers[q.id] ?? 'Not specified'}`)
    .join('\n');

  return `You are LexAI DraftCounsel. Draft a complete Indian legal document and analysis. Output ONLY the three sections below with their exact delimiters.

DOCUMENT TYPE: ${details.documentType}
TITLE: ${details.documentTitle || details.title}
PARTIES: ${partiesList}
JURISDICTION: ${details.jurisdiction}
CONTEXT: ${details.context}
FLAGS: ${details.flags.join(', ') || 'none'}

REQUIRED SECTIONS:
${sectionTitles}

ADDITIONAL DETAILS FROM DRAFTING QUESTIONS:
${answeredQuestions}

Output format (use these exact delimiters, no text outside them):

---DOCUMENT_START---
THIS ${details.documentType.toUpperCase()} ("Agreement") is entered into on [DATE] between ${details.parties.map((p) => `${p.name} ("${p.role}")`).join(' and ')}.

[Draft all required sections with proper Indian legal language. Include clause numbers. End with signature blocks.]
---DOCUMENT_END---
---COMPLIANCE_REPORT_START---
{"acts":[{"name":"act name","applicability":"why it applies"}],"issues":[{"severity":"high|medium|low","description":"issue description"}],"overallCompliance":"compliant|partial|review_needed"}
---COMPLIANCE_REPORT_END---
---RISK_ANALYSIS_START---
{"risks":[{"title":"risk title","description":"risk description","level":"high|medium|low","mitigation":"what to do"}],"overallRisk":50,"recommendation":"overall recommendation"}
---RISK_ANALYSIS_END---`;
}
