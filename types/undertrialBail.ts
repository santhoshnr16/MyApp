export type OffenderCategory = 'FIRST_TIME_OFFENDER' | 'REPEAT_OFFENDER';
export type BailEligibilityStatus = 'ELIGIBLE_ONE_THIRD' | 'ELIGIBLE_ONE_HALF' | 'NOT_ELIGIBLE' | 'EXCLUDED_OFFENSE';

export interface BNSCharge {
  section: string; // e.g., "BNS 303(2) / IPC 379"
  description: string; // e.g., "Theft"
  maxSentenceMonths: number; // e.g., 36 months (3 years)
  isDeathOrLifePunishable: boolean;
}

export interface PrisonerRecordPayload {
  prisonerId: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  prisonLocation: string; // e.g., "Tihar Jail No. 3, New Delhi"
  districtLegalServicesAuthority: string; // e.g., "DLSA Central, Delhi"
  firNumber: string;
  caseType: string; // e.g., "Bail Application / Undertrial Review"
  incarcerationDate: string; // ISO String, e.g., "2024-01-15T00:00:00Z"
  isFirstOffender: boolean;
  hasMultipleCases: boolean;
  charges: BNSCharge[];
  metadata?: {
    source: 'LIVE_THIRD_PARTY_API' | 'DLSA_WEBHOOK' | 'SIMULATION_MODE';
    fetchedAt: string;
  };
}

export interface BNSS479EligibilityResult {
  prisonerId: string;
  fullName: string;
  incarcerationDate: string;
  daysIncarcerated: number;
  monthsIncarcerated: number;
  offenderCategory: OffenderCategory;
  primaryCharge: BNSCharge;
  maxSentenceMonths: number;
  requiredSentenceMonthsForBail: number; // 1/3 max for first time, 1/2 max for repeat
  requiredDetentionPercentage: '33.3%' | '50.0%';
  eligibilityStatus: BailEligibilityStatus;
  isEligibleForBail: boolean;
  daysRemainingForEligibility: number;
  eligibleFromDate: string;
  legalSummary: string;
  bnssReference: string;
}
