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

export type NegotiationFieldKey = keyof NegotiationContext;

export type FieldConstraint = {
  key: NegotiationFieldKey;
  label: string;
  heuristicScore: number;
  priorityRank: number;
  isRequired: boolean;
  allowedValues?: readonly string[];
  minLength?: number;
  maxLength?: number;
  description: string;
  validate: (value: unknown) => { valid: boolean; error?: string };
};

export type FieldHeuristicScore = {
  field: NegotiationFieldKey;
  label: string;
  heuristicWeight: number;
  priorityRank: number;
  computedRiskImpact: number;
  explanation: string;
};

export type NegotiationHeuristicAnalysis = {
  overallHeuristicScore: number;
  totalWeight: number;
  highestHeuristicFactor: string;
  fieldScores: FieldHeuristicScore[];
  sortedByPriority: FieldHeuristicScore[];
};

export type NegotiationValidationResult = {
  isValid: boolean;
  errors: Partial<Record<NegotiationFieldKey, string>>;
};

