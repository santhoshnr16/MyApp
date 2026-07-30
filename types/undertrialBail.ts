export type OffenderCategory = 'FIRST_TIME_OFFENDER' | 'REPEAT_OFFENDER';
export type BailEligibilityStatus = 'ELIGIBLE_ONE_THIRD' | 'ELIGIBLE_ONE_HALF' | 'NOT_ELIGIBLE' | 'EXCLUDED_OFFENSE';
export type CustodyStatus = 'IN_CUSTODY' | 'ELIGIBLE' | 'BAIL_PROCESS_STARTED' | 'INELIGIBLE_OVERRIDDEN';

export interface BNSCharge {
  section: string; // e.g., "BNS 303(2) / IPC 379"
  description: string; // e.g., "Theft"
  maxSentenceMonths: number; // e.g., 36 months (3 years)
  isDeathOrLifePunishable: boolean;
}

export interface RemandAdjustment {
  id: string;
  adjustmentDate: string;
  pauseDays: number;
  reason: string;
  recordedBy: string;
}

export interface ManualOverrideInfo {
  isOverridden: boolean;
  reason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
}

export interface AuditLogEntry {
  id: string;
  prisonerId: string;
  timestamp: string;
  eventType: 
    | 'AUTOMATED_ELIGIBILITY_EVALUATION'
    | 'STATUS_FLIPPED_ELIGIBLE'
    | 'WEBHOOK_AUTOMATED_FIRE'
    | 'HUMAN_CONFIRMED_BAIL_INITIATION'
    | 'STAFF_MANUAL_OVERRIDE'
    | 'REMAND_CLOCK_ADJUSTED';
  actor: 'SYSTEM_CRON' | 'DLSA_WEBHOOK' | 'JAIL_STAFF' | 'COURT_CLERK' | 'LEGAL_AID_OFFICER';
  description: string;
  metadata?: Record<string, any>;
}

export interface WebhookNotificationPayload {
  eventId: string;
  eventType: 'UNDERTRIAL_BAIL_ELIGIBILITY_FLIPPED' | 'BAIL_PROCESS_HUMAN_CONFIRMED';
  timestamp: string;
  prisonerId: string;
  fullName: string;
  firNumber: string;
  prisonLocation: string;
  districtLegalServicesAuthority: string;
  primaryCharge: BNSCharge;
  daysServed: number;
  thresholdDaysRequired: number;
  eligibleFromDate: string;
  custodyStatus: CustodyStatus;
  hmacSignature: string;
}

export interface PrisonerRecordPayload {
  prisonerId: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  prisonLocation: string;
  districtLegalServicesAuthority: string;
  firNumber: string;
  caseType: string;
  incarcerationDate: string; // ISO String
  isFirstOffender: boolean;
  hasMultipleCases: boolean;
  custodyStatus: CustodyStatus;
  charges: BNSCharge[];
  remandPauseDays?: number;
  remandAdjustments?: RemandAdjustment[];
  manualOverride?: ManualOverrideInfo;
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
  effectiveDaysServed: number;
  remandPauseDays: number;
  monthsIncarcerated: number;
  offenderCategory: OffenderCategory;
  primaryCharge: BNSCharge;
  maxSentenceMonths: number;
  requiredSentenceMonthsForBail: number;
  requiredDetentionPercentage: '33.3%' | '50.0%';
  eligibilityStatus: BailEligibilityStatus;
  custodyStatus: CustodyStatus;
  isEligibleForBail: boolean;
  isOverridden: boolean;
  daysRemainingForEligibility: number;
  eligibleFromDate: string;
  legalSummary: string;
  bnssReference: string;
}
