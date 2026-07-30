import axios from 'axios';

import { parseNegotiationAnalysis } from '@/constants/negotiationPrompt';
import type {
  FieldConstraint,
  FieldHeuristicScore,
  NegotiationAnalysis,
  NegotiationContext,
  NegotiationFieldKey,
  NegotiationHeuristicAnalysis,
  NegotiationValidationResult,
} from '@/types/negotiation';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000,
});

/**
 * Negotiation Field Constraints and Heuristic Scores Definition.
 *
 * Priority & Heuristic Value System:
 * 1. Deal Value (Score: 100) - HIGHEST HEURISTIC PRIORITY (Commercial stake & financial risk)
 * 2. Deal Duration (Score: 90) - 2ND HIGHEST HEURISTIC PRIORITY (Time horizon & commitment risk)
 * 3. Negotiation Priority (Score: 80) - Strategic objective positioning
 * 4. Power Dynamic (Score: 75) - Bargaining power imbalance
 * 5. Market Context (Score: 65) - Macroeconomic & market environment
 * 6. Negotiation Stage (Score: 55) - Stage timing & flexibility
 * 7. Counterparty Type (Score: 45) - Counterparty scale & resource imbalance
 * 8. Counterparty Name (Score: 45) - Counterparty identity
 * 9. Contract Type (Score: 40) - Legal framework complexity
 * 10. Your Company Type (Score: 35) - Internal organization scale
 * 11. Your Company Name (Score: 35) - Internal identity
 * 12. Jurisdiction (Score: 30) - Governing law & forum
 * 13. Industry (Score: 25) - Sector compliance nuances
 * 14. Counterparty Contact (Score: 15) - Contact metadata
 */
export const NEGOTIATION_FIELD_CONSTRAINTS: Record<NegotiationFieldKey, FieldConstraint> = {
  dealValue: {
    key: 'dealValue',
    label: 'Deal Value',
    heuristicScore: 100, // HIGHEST HEURISTIC WEIGHT
    priorityRank: 1,
    isRequired: true,
    minLength: 1,
    maxLength: 100,
    description: 'Financial value of the deal. Carries highest commercial heuristic priority.',
    validate: (val) => {
      if (typeof val !== 'string' || !val.trim()) {
        return { valid: false, error: 'Deal Value is required (e.g. ₹50 Lakhs, USD 100K).' };
      }
      if (val.trim().length > 100) {
        return { valid: false, error: 'Deal Value must be under 100 characters.' };
      }
      return { valid: true };
    },
  },
  dealDuration: {
    key: 'dealDuration',
    label: 'Deal Duration (Time Horizon)',
    heuristicScore: 90, // 2ND HIGHEST HEURISTIC WEIGHT (TIME)
    priorityRank: 2,
    isRequired: true,
    allowedValues: ['one-time', 'ongoing', 'recurring'] as const,
    description: 'Time horizon of the deal. Carries 2nd highest heuristic weight for commitment risk.',
    validate: (val) => {
      const allowed = ['one-time', 'ongoing', 'recurring'];
      if (!val || typeof val !== 'string' || !allowed.includes(val)) {
        return { valid: false, error: 'Deal Duration must be one of: one-time, ongoing, recurring.' };
      }
      return { valid: true };
    },
  },
  priority: {
    key: 'priority',
    label: 'Negotiation Priority',
    heuristicScore: 80,
    priorityRank: 3,
    isRequired: true,
    allowedValues: ['get deal done', 'maximize leverage', 'minimize risk', 'balanced'] as const,
    description: 'Strategic objective guiding posture and concessions.',
    validate: (val) => {
      const allowed = ['get deal done', 'maximize leverage', 'minimize risk', 'balanced'];
      if (!val || typeof val !== 'string' || !allowed.includes(val)) {
        return { valid: false, error: 'Priority must be one of: get deal done, maximize leverage, minimize risk, balanced.' };
      }
      return { valid: true };
    },
  },
  powerDynamic: {
    key: 'powerDynamic',
    label: 'Power Dynamic',
    heuristicScore: 75,
    priorityRank: 4,
    isRequired: true,
    allowedValues: ['counterparty stronger', 'balanced', 'we are stronger'] as const,
    description: 'Relative bargaining power between parties.',
    validate: (val) => {
      const allowed = ['counterparty stronger', 'balanced', 'we are stronger'];
      if (!val || typeof val !== 'string' || !allowed.includes(val)) {
        return { valid: false, error: 'Power Dynamic must be one of: counterparty stronger, balanced, we are stronger.' };
      }
      return { valid: true };
    },
  },
  marketContext: {
    key: 'marketContext',
    label: 'Market Context',
    heuristicScore: 65,
    priorityRank: 5,
    isRequired: true,
    allowedValues: ["buyer's market", "seller's market", 'balanced'] as const,
    description: 'Prevailing market conditions impacting leverage.',
    validate: (val) => {
      const allowed = ["buyer's market", "seller's market", 'balanced'];
      if (!val || typeof val !== 'string' || !allowed.includes(val)) {
        return { valid: false, error: "Market Context must be one of: buyer's market, seller's market, balanced." };
      }
      return { valid: true };
    },
  },
  stage: {
    key: 'stage',
    label: 'Negotiation Stage',
    heuristicScore: 55,
    priorityRank: 6,
    isRequired: true,
    allowedValues: ['initial review', 'second draft', 'final round'] as const,
    description: 'Current negotiation stage and timing flexibility.',
    validate: (val) => {
      const allowed = ['initial review', 'second draft', 'final round'];
      if (!val || typeof val !== 'string' || !allowed.includes(val)) {
        return { valid: false, error: 'Negotiation Stage must be one of: initial review, second draft, final round.' };
      }
      return { valid: true };
    },
  },
  counterpartyType: {
    key: 'counterpartyType',
    label: 'Counterparty Type',
    heuristicScore: 45,
    priorityRank: 7,
    isRequired: true,
    allowedValues: ['individual', 'SME', 'MNC', 'startup', 'government'] as const,
    description: 'Entity scale and organization profile of counterparty.',
    validate: (val) => {
      const allowed = ['individual', 'SME', 'MNC', 'startup', 'government'];
      if (!val || typeof val !== 'string' || !allowed.includes(val)) {
        return { valid: false, error: 'Counterparty Type must be one of: individual, SME, MNC, startup, government.' };
      }
      return { valid: true };
    },
  },
  counterpartyName: {
    key: 'counterpartyName',
    label: 'Counterparty Name',
    heuristicScore: 45,
    priorityRank: 8,
    isRequired: true,
    minLength: 1,
    maxLength: 120,
    description: 'Official name of the counterparty entity.',
    validate: (val) => {
      if (typeof val !== 'string' || !val.trim()) {
        return { valid: false, error: 'Counterparty Name is required.' };
      }
      return { valid: true };
    },
  },
  contractType: {
    key: 'contractType',
    label: 'Contract Type',
    heuristicScore: 40,
    priorityRank: 9,
    isRequired: true,
    minLength: 1,
    maxLength: 100,
    description: 'Legal nature of agreement (e.g. Service Agreement, NDA).',
    validate: (val) => {
      if (typeof val !== 'string' || !val.trim()) {
        return { valid: false, error: 'Contract Type is required.' };
      }
      return { valid: true };
    },
  },
  yourType: {
    key: 'yourType',
    label: 'Your Company Type',
    heuristicScore: 35,
    priorityRank: 10,
    isRequired: true,
    allowedValues: ['individual', 'SME', 'MNC', 'startup', 'government'] as const,
    description: 'Entity scale and organization profile of your company.',
    validate: (val) => {
      const allowed = ['individual', 'SME', 'MNC', 'startup', 'government'];
      if (!val || typeof val !== 'string' || !allowed.includes(val)) {
        return { valid: false, error: 'Your Type must be one of: individual, SME, MNC, startup, government.' };
      }
      return { valid: true };
    },
  },
  yourCompanyName: {
    key: 'yourCompanyName',
    label: 'Your Company Name',
    heuristicScore: 35,
    priorityRank: 11,
    isRequired: true,
    minLength: 1,
    maxLength: 120,
    description: 'Official name of your company or organization.',
    validate: (val) => {
      if (typeof val !== 'string' || !val.trim()) {
        return { valid: false, error: 'Your Company Name is required.' };
      }
      return { valid: true };
    },
  },
  jurisdiction: {
    key: 'jurisdiction',
    label: 'Jurisdiction',
    heuristicScore: 30,
    priorityRank: 12,
    isRequired: true,
    minLength: 1,
    maxLength: 80,
    description: 'Governing legal jurisdiction and forum.',
    validate: (val) => {
      if (typeof val !== 'string' || !val.trim()) {
        return { valid: false, error: 'Jurisdiction is required.' };
      }
      return { valid: true };
    },
  },
  industry: {
    key: 'industry',
    label: 'Industry Sector',
    heuristicScore: 25,
    priorityRank: 13,
    isRequired: true,
    minLength: 1,
    maxLength: 80,
    description: 'Industry domain for regulatory and market standard checks.',
    validate: (val) => {
      if (typeof val !== 'string' || !val.trim()) {
        return { valid: false, error: 'Industry is required.' };
      }
      return { valid: true };
    },
  },
  counterpartyContact: {
    key: 'counterpartyContact',
    label: 'Counterparty Contact',
    heuristicScore: 15,
    priorityRank: 14,
    isRequired: false,
    maxLength: 150,
    description: 'Contact person or department for drafting correspondence.',
    validate: (val) => {
      if (val !== undefined && val !== null && typeof val === 'string' && val.length > 150) {
        return { valid: false, error: 'Counterparty Contact must be under 150 characters.' };
      }
      return { valid: true };
    },
  },
};

/**
 * Validates a NegotiationContext against set field constraints.
 */
export function validateNegotiationConstraints(context: NegotiationContext): NegotiationValidationResult {
  const errors: Partial<Record<NegotiationFieldKey, string>> = {};

  for (const [key, constraint] of Object.entries(NEGOTIATION_FIELD_CONSTRAINTS)) {
    const fieldKey = key as NegotiationFieldKey;
    const value = context[fieldKey];
    const result = constraint.validate(value);

    if (!result.valid && result.error) {
      errors[fieldKey] = result.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Calculates relative field heuristic risk/priority score breakdown.
 * Gives dealValue (100) and dealDuration (90 - time horizon) the highest scores.
 */
export function calculateNegotiationHeuristicScore(context: NegotiationContext): NegotiationHeuristicAnalysis {
  const fieldScores: FieldHeuristicScore[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const [key, constraint] of Object.entries(NEGOTIATION_FIELD_CONSTRAINTS)) {
    const fieldKey = key as NegotiationFieldKey;
    const val = context[fieldKey];
    const weight = constraint.heuristicScore;

    // Compute relative risk impact (0-100) per field value
    let computedImpact = 50;
    let explanation = `${constraint.label} weighted at heuristic score ${weight}.`;

    if (fieldKey === 'dealValue') {
      computedImpact = 100;
      explanation = `[HIGHEST HEURISTIC PRIORITY] Deal Value (${val}) defines primary financial exposure and strategic importance.`;
    } else if (fieldKey === 'dealDuration') {
      computedImpact = val === 'ongoing' ? 95 : val === 'recurring' ? 85 : 60;
      explanation = `[2ND HIGHEST HEURISTIC PRIORITY - TIME] Duration (${val}) sets long-term liability window and time commitment risk.`;
    } else if (fieldKey === 'priority') {
      computedImpact = val === 'minimize risk' ? 90 : val === 'maximize leverage' ? 80 : val === 'get deal done' ? 70 : 50;
      explanation = `Chosen negotiation priority '${val}' shapes tactical posture and risk tolerance.`;
    } else if (fieldKey === 'powerDynamic') {
      computedImpact = val === 'counterparty stronger' ? 90 : val === 'balanced' ? 50 : 30;
      explanation = `Bargaining power dynamic (${val}) determines negotiation leverage.`;
    } else if (fieldKey === 'marketContext') {
      computedImpact = val === "seller's market" ? 80 : val === "buyer's market" ? 40 : 50;
      explanation = `Market conditions (${val}) influence flexibility on key terms.`;
    } else if (fieldKey === 'counterpartyType') {
      computedImpact = val === 'MNC' || val === 'government' ? 85 : val === 'startup' ? 65 : 50;
      explanation = `Counterparty scale (${val}) affects legal resources and contract rigidity.`;
    }

    totalWeightedScore += computedImpact * weight;
    totalWeight += weight;

    fieldScores.push({
      field: fieldKey,
      label: constraint.label,
      heuristicWeight: weight,
      priorityRank: constraint.priorityRank,
      computedRiskImpact: Math.round(computedImpact),
      explanation,
    });
  }

  const overallHeuristicScore = Math.round(totalWeightedScore / totalWeight);
  const sortedByPriority = [...fieldScores].sort((a, b) => b.heuristicWeight - a.heuristicWeight);

  return {
    overallHeuristicScore,
    totalWeight,
    highestHeuristicFactor: 'Deal Value & Time (Duration)',
    fieldScores,
    sortedByPriority,
  };
}

/**
 * Returns field constraints sorted by heuristic weight (highest to lowest priority).
 */
export function getSortedFieldConstraints(): FieldConstraint[] {
  return Object.values(NEGOTIATION_FIELD_CONSTRAINTS).sort((a, b) => b.heuristicScore - a.heuristicScore);
}

export async function analyseForNegotiation(
  documentId: string,
  context: NegotiationContext
): Promise<NegotiationAnalysis> {
  // 1. Enforce constraints check before analysis
  const validation = validateNegotiationConstraints(context);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(`Invalid Negotiation Context Constraints: ${firstError}`);
  }

  // 2. Compute heuristic scores (Deal Value & Deal Duration (Time) prioritized)
  const heuristicAnalysis = calculateNegotiationHeuristicScore(context);

  // 3. Post to backend with validated context and heuristic metadata
  const response = await apiClient.post<{
    result: string;
    adaptiveData?: {
      posture: import('@/types/negotiation').NegotiationPosture;
      postureRewardEstimate: number;
      rankedClauseIssues: import('@/types/negotiation').ClauseIssue[];
      stats: {
        totalClusters: number;
        pendingCurationCount: number;
        confidenceLogsCount: number;
      };
    };
  }>('/api/negotiate/analyse', {
    documentId,
    context,
    heuristicAnalysis,
  });

  const raw = response.data.result;
  const parsed = parseNegotiationAnalysis(raw);

  if (response.data.adaptiveData) {
    const ad = response.data.adaptiveData;
    parsed.posture = ad.posture || parsed.posture;
    parsed.postureRewardEstimate = ad.postureRewardEstimate;
    if (ad.rankedClauseIssues && ad.rankedClauseIssues.length > 0) {
      parsed.clauseIssues = ad.rankedClauseIssues;
    }
    parsed.adaptiveStats = ad.stats;
  }

  return parsed;
}

export async function recordNegotiationFeedback(payload: import('@/types/negotiation').FeedbackPayload) {
  const response = await apiClient.post('/api/negotiate/feedback', payload);
  return response.data;
}

export async function fetchCurationQueue() {
  const response = await apiClient.get<{ queue: import('@/types/negotiation').CurationQueueItem[] }>('/api/negotiate/curation-queue');
  return response.data;
}

export async function resolveCurationItem(queueId: string, precedentText: string, clusterName: string) {
  const response = await apiClient.post('/api/negotiate/curation-queue/resolve', { queueId, precedentText, clusterName });
  return response.data;
}
