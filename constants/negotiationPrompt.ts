import type { NegotiationContext } from '@/types/negotiation';

export function buildNegotiationPrompt(ctx: NegotiationContext, documentText: string): string {
  const truncated = documentText.slice(0, 4000);

  return `You are a senior Indian corporate lawyer with 25 years of experience in commercial negotiations. Analyse this contract and provide strategic negotiation advice.

HEURISTIC CONSTRAINTS & FIELD WEIGHTS:
- DEAL VALUE: ${ctx.dealValue} [HEURISTIC SCORE: 100/100 — Highest Commercial Stakes]
- DEAL DURATION: ${ctx.dealDuration} [HEURISTIC SCORE: 90/100 — Highest Time Horizon & Commitment Risk]
- NEGOTIATION PRIORITY: ${ctx.priority} [HEURISTIC SCORE: 80/100]
- POWER DYNAMIC: ${ctx.powerDynamic} [HEURISTIC SCORE: 75/100]
- MARKET CONTEXT: ${ctx.marketContext} [HEURISTIC SCORE: 65/100]
- NEGOTIATION STAGE: ${ctx.stage} [HEURISTIC SCORE: 55/100]
- COUNTERPARTY: ${ctx.counterpartyName} (${ctx.counterpartyType}) [HEURISTIC SCORE: 45/100]
- YOUR COMPANY: ${ctx.yourCompanyName} (${ctx.yourType}) [HEURISTIC SCORE: 35/100]
- CONTRACT TYPE: ${ctx.contractType} [HEURISTIC SCORE: 40/100]
- JURISDICTION: ${ctx.jurisdiction} [HEURISTIC SCORE: 30/100]
- INDUSTRY: ${ctx.industry} [HEURISTIC SCORE: 25/100]

CONTRACT TEXT:
${truncated}

Provide negotiation analysis in this EXACT format. Start immediately after the marker.

---NEGOTIATION_START---
POSTURE: [AGGRESSIVE or BALANCED or COLLABORATIVE or DEFENSIVE]
VERDICT: [YES with changes / NO walk away / MAYBE pending revisions]
RISK_SCORE: [0-100]

CLAUSE ISSUES:
1. [Clause Name] | Risk: HIGH/MEDIUM/LOW
   Issue: [What is wrong and why it matters]
   Counter: [Exact replacement language to propose]

2. [Clause Name] | Risk: HIGH/MEDIUM/LOW
   Issue: [What is wrong]
   Counter: [Counter-language]

3. [Clause Name] | Risk: HIGH/MEDIUM/LOW
   Issue: [What is wrong]
   Counter: [Counter-language]

DEAL_BREAKERS:
- [Issue that cannot be accepted]
- [Second deal-breaker]
- [Third deal-breaker if any]

QUICK_WINS:
- [Easy clause to push back on]
- [Second quick win]
- [Third quick win]

PRIORITY_ACTIONS:
1. [Most critical change — clause name and specific ask]
2. [Second priority]
3. [Third priority]

EMAIL_DRAFT:
Subject: ${ctx.contractType} — Review Comments and Proposed Revisions

Dear ${ctx.counterpartyContact || 'Team'},

Thank you for sharing the draft ${ctx.contractType}. We have completed our review.

[Write 3-5 specific revision requests based on the clause issues above, in professional tone]

We look forward to discussing these points. Please let us know your availability.

Best regards,
${ctx.yourCompanyName}

FINAL_RECOMMENDATION:
[One clear paragraph: is this deal worth doing, what are the 2-3 must-change items, and what is the overall negotiation approach]
---NEGOTIATION_END---`;
}

export function parseNegotiationAnalysis(raw: string) {
  const after = raw.split('---NEGOTIATION_START---').pop() ?? raw;
  const body = after.replace(/---NEGOTIATION_END---[\s\S]*$/, '').trim();

  const get = (key: string) =>
    body.match(new RegExp(`${key}:\\s*([^\\n]+)`))?.[1]?.trim() ?? '';

  const getBlock = (startKey: string, endKey: string) => {
    const match = body.match(new RegExp(`${startKey}:[\\s\\S]*?(?=${endKey}:|---NEGOTIATION_END---)`));
    return match?.[0]?.replace(`${startKey}:`, '').trim() ?? '';
  };

  const postureRaw = get('POSTURE') as string;
  const posture = (['AGGRESSIVE', 'BALANCED', 'COLLABORATIVE', 'DEFENSIVE'].includes(postureRaw)
    ? postureRaw
    : 'BALANCED') as import('@/types/negotiation').NegotiationPosture;

  const riskRaw = parseInt(get('RISK_SCORE'), 10);
  const riskScore = isNaN(riskRaw) ? 50 : Math.min(100, Math.max(0, riskRaw));

  // Parse clause issues
  const clauseBlock = getBlock('CLAUSE ISSUES', 'DEAL_BREAKERS');
  const clauseIssues: import('@/types/negotiation').ClauseIssue[] = [];
  const clauseRegex = /\d+\.\s*(.+?)\s*\|\s*Risk:\s*(HIGH|MEDIUM|LOW|STANDARD)\s*\n\s*Issue:\s*(.+?)\n\s*Counter:\s*(.+?)(?=\n\d+\.|\n[A-Z_]+:|$)/gs;
  let cm;
  while ((cm = clauseRegex.exec(clauseBlock)) !== null) {
    clauseIssues.push({
      clauseName: cm[1].trim(),
      risk: cm[2].trim() as import('@/types/negotiation').ClauseIssue['risk'],
      issue: cm[3].trim(),
      counter: cm[4].trim(),
    });
  }

  const parseList = (block: string) =>
    block.split('\n')
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter((l) => l.length > 10);

  const dealBreakersBlock = getBlock('DEAL_BREAKERS', 'QUICK_WINS');
  const quickWinsBlock = getBlock('QUICK_WINS', 'PRIORITY_ACTIONS');
  const priorityBlock = getBlock('PRIORITY_ACTIONS', 'EMAIL_DRAFT');
  const emailBlock = getBlock('EMAIL_DRAFT', 'FINAL_RECOMMENDATION');
  const finalBlock = body.match(/FINAL_RECOMMENDATION:\s*([\s\S]*?)(?:---NEGOTIATION_END---|$)/)?.[1]?.trim() ?? '';

  return {
    posture,
    verdict: get('VERDICT') || 'Analysis complete',
    riskScore,
    clauseIssues: clauseIssues.length > 0 ? clauseIssues : [],
    dealBreakers: parseList(dealBreakersBlock),
    quickWins: parseList(quickWinsBlock),
    priorityActions: priorityBlock.split('\n').map((l) => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean),
    emailDraft: emailBlock,
    finalRecommendation: finalBlock,
    rawAnalysis: body,
  };
}
