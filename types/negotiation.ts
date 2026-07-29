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

export type ReviewSignal = 'READY' | 'REVIEW_SUGGESTED' | 'FLAG_FOR_LAWYER';
export type FeedbackAction = 'COPY_UNEDITED' | 'COPY_EDITED' | 'VIEW_ONLY' | 'REJECT';

export type ClauseIssue = {
  id?: string;
  clauseName: string;
  risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'STANDARD';
  issue: string;
  counter: string;
  clusterId?: string;
  clusterName?: string;
  isNovel?: boolean;
  noveltyScore?: number;
  calibratedConfidence?: number;
  reviewSignal?: ReviewSignal;
  reviewSignalLabel?: string;
  badgeColor?: string;
  rankingScore?: number;
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
  postureRewardEstimate?: number;
  curationQueueCount?: number;
  adaptiveStats?: {
    totalClusters: number;
    pendingCurationCount: number;
    confidenceLogsCount: number;
  };
};

export type FeedbackPayload = {
  postureArm?: NegotiationPosture;
  actionType: FeedbackAction;
  context: NegotiationContext;
  rawConfidence?: number;
  clauseId?: string;
};

export type CurationQueueItem = {
  id: string;
  text: string;
  minDistance: number;
  status: string;
  timestamp: string;
  precedentText?: string;
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
