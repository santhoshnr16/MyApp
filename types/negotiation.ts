export type CounterpartyType = 'individual' | 'SME' | 'MNC' | 'startup' | 'government';
export type DealDuration = 'one-time' | 'ongoing' | 'recurring';
export type MarketContext = "buyer's market" | "seller's market" | 'balanced';
export type NegotiationPriority = 'get deal done' | 'maximize leverage' | 'minimize risk' | 'balanced';
export type NegotiationStage = 'initial review' | 'second draft' | 'final round';
export type PowerDynamic = 'counterparty stronger' | 'balanced' | 'we are stronger';
export type NegotiationPosture = 'AGGRESSIVE' | 'BALANCED' | 'COLLABORATIVE' | 'DEFENSIVE';

export type NegotiationContext = {
  contractType: string;
  counterpartyName: string;
  counterpartyType: CounterpartyType;
  yourCompanyName: string;
  yourType: CounterpartyType;
  dealValue: string;
  dealDuration: DealDuration;
  industry: string;
  jurisdiction: string;
  marketContext: MarketContext;
  priority: NegotiationPriority;
  stage: NegotiationStage;
  powerDynamic: PowerDynamic;
  counterpartyContact?: string;
};

export type ClauseIssue = {
  clauseName: string;
  risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'STANDARD';
  issue: string;
  counter: string;
};

export type NegotiationAnalysis = {
  posture: NegotiationPosture;
  verdict: string;
  riskScore: number;
  clauseIssues: ClauseIssue[];
  dealBreakers: string[];
  quickWins: string[];
  priorityActions: string[];
  emailDraft: string;
  finalRecommendation: string;
  rawAnalysis: string;
};
