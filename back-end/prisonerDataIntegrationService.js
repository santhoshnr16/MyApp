const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b-instruct-q4_K_M';
const WEBHOOK_SECRET = process.env.DLSA_WEBHOOK_SECRET || 'sih1282-secret-key-dlsa-2026';

const STORAGE_PATH = path.join(__dirname, 'storage', 'undertrial_prisoners.json');
const AUDIT_LOG_PATH = path.join(__dirname, 'storage', 'undertrial_audit_log.json');

if (!fs.existsSync(path.dirname(STORAGE_PATH))) {
  fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
}

class PrisonerDataIntegrationService {
  constructor() {
    this.useMockData = process.env.USE_MOCK_DATA === 'true' || process.env.NODE_ENV !== 'production';
    this.thirdPartyApiBase = process.env.LEGAL_AGGREGATOR_API_URL || 'https://api.surepass.io/v1/ecourts';
    this.thirdPartyApiKey = process.env.LEGAL_AGGREGATOR_API_KEY || 'mock-api-key';
    this.prisonerStore = new Map();
    this.auditLogs = [];
    this.loadPersistedRecords();
    this.loadAuditLogs();
    this.seedSampleDataIfEmpty();
  }

  loadPersistedRecords() {
    try {
      if (fs.existsSync(STORAGE_PATH)) {
        const raw = fs.readFileSync(STORAGE_PATH, 'utf8');
        const data = JSON.parse(raw);
        Object.entries(data).forEach(([id, rec]) => this.prisonerStore.set(id, rec));
      }
    } catch (err) {
      console.warn('Failed loading prisoner storage:', err.message);
    }
  }

  savePersistedRecords() {
    try {
      const obj = Object.fromEntries(this.prisonerStore.entries());
      fs.writeFileSync(STORAGE_PATH, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed saving prisoner storage:', err);
    }
  }

  loadAuditLogs() {
    try {
      if (fs.existsSync(AUDIT_LOG_PATH)) {
        const raw = fs.readFileSync(AUDIT_LOG_PATH, 'utf8');
        this.auditLogs = JSON.parse(raw);
      }
    } catch (err) {
      this.auditLogs = [];
    }
  }

  saveAuditLogs() {
    try {
      fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(this.auditLogs, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed saving audit logs:', err);
    }
  }

  recordAuditEntry({ prisonerId, eventType, actor, description, metadata = {} }) {
    const entry = {
      id: `AUDIT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      prisonerId,
      timestamp: new Date().toISOString(),
      eventType,
      actor,
      description,
      metadata,
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 500) this.auditLogs = this.auditLogs.slice(0, 500);
    this.saveAuditLogs();
    return entry;
  }

  getAuditLogsForPrisoner(prisonerId) {
    if (!prisonerId) return this.auditLogs;
    return this.auditLogs.filter((log) => log.prisonerId === prisonerId);
  }

  seedSampleDataIfEmpty() {
    if (this.prisonerStore.size > 0) return;

    const sampleCases = [
      {
        prisonerId: 'UTP-DLSA-10291',
        fullName: 'Ramesh Kumar',
        gender: 'MALE',
        age: 28,
        prisonLocation: 'Tihar Jail No. 3, New Delhi',
        districtLegalServicesAuthority: 'DLSA Central, Delhi',
        firNumber: 'FIR-1092/2024',
        caseType: 'Undertrial Review',
        incarcerationDate: new Date(Date.now() - 410 * 86400000).toISOString(), // 410 days ago
        isFirstOffender: true,
        hasMultipleCases: false,
        custodyStatus: 'ELIGIBLE',
        remandPauseDays: 10,
        remandAdjustments: [
          {
            id: 'RM-1',
            adjustmentDate: new Date(Date.now() - 100 * 86400000).toISOString(),
            pauseDays: 10,
            reason: 'Forensic delay / custody stay extension granted',
            recordedBy: 'Jail Admin (Court Order #812)',
          },
        ],
        manualOverride: { isOverridden: false },
        charges: [
          {
            section: 'BNS 303(2) / IPC 379',
            description: 'Theft of property',
            maxSentenceMonths: 36, // 3 years -> 1/3 is 12 mos = 365 days
            isDeathOrLifePunishable: false,
          },
        ],
      },
      {
        prisonerId: 'UTP-DLSA-10292',
        fullName: 'Sunita Devi',
        gender: 'FEMALE',
        age: 32,
        prisonLocation: 'Arthur Road Jail, Mumbai',
        districtLegalServicesAuthority: 'DLSA South Mumbai',
        firNumber: 'FIR-402/2024',
        caseType: 'Undertrial Review',
        incarcerationDate: new Date(Date.now() - 600 * 86400000).toISOString(),
        isFirstOffender: false,
        hasMultipleCases: false,
        custodyStatus: 'BAIL_PROCESS_STARTED',
        remandPauseDays: 0,
        manualOverride: { isOverridden: false },
        charges: [
          {
            section: 'BNS 318(4) / IPC 420',
            description: 'Cheating and dishonestly inducing delivery of property',
            maxSentenceMonths: 84, // 7 years -> 1/2 is 3.5 yrs (42 mos)
            isDeathOrLifePunishable: false,
          },
        ],
      },
      {
        prisonerId: 'UTP-DLSA-10293',
        fullName: 'Vikram Singh',
        gender: 'MALE',
        age: 35,
        prisonLocation: 'Yerwada Central Jail, Pune',
        districtLegalServicesAuthority: 'DLSA Pune',
        firNumber: 'FIR-881/2025',
        caseType: 'Undertrial Review',
        incarcerationDate: new Date(Date.now() - 120 * 86400000).toISOString(),
        isFirstOffender: true,
        hasMultipleCases: false,
        custodyStatus: 'IN_CUSTODY',
        remandPauseDays: 0,
        manualOverride: { isOverridden: false },
        charges: [
          {
            section: 'BNS 305 / IPC 380',
            description: 'Theft in dwelling house',
            maxSentenceMonths: 84, // 7 years -> 1/3 is 28 mos
            isDeathOrLifePunishable: false,
          },
        ],
      },
      {
        prisonerId: 'UTP-DLSA-10294',
        fullName: 'Mohd. Salim',
        gender: 'MALE',
        age: 41,
        prisonLocation: 'Alipore Jail, Kolkata',
        districtLegalServicesAuthority: 'DLSA Kolkata',
        firNumber: 'FIR-511/2023',
        caseType: 'Undertrial Review',
        incarcerationDate: new Date(Date.now() - 520 * 86400000).toISOString(),
        isFirstOffender: true,
        hasMultipleCases: true, // Multiple cases -> excluded unless overridden
        custodyStatus: 'INELIGIBLE_OVERRIDDEN',
        remandPauseDays: 0,
        manualOverride: {
          isOverridden: true,
          reason: 'Multiple pending production warrants across states (CrPC 436A Bar)',
          overriddenBy: 'Superintendent Office',
          overriddenAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        },
        charges: [
          {
            section: 'BNS 310(2) / IPC 395',
            description: 'Dacoity',
            maxSentenceMonths: 120,
            isDeathOrLifePunishable: false,
          },
        ],
      },
    ];

    sampleCases.forEach((c) => {
      this.prisonerStore.set(c.prisonerId, c);
      this.recordAuditEntry({
        prisonerId: c.prisonerId,
        eventType: 'AUTOMATED_ELIGIBILITY_EVALUATION',
        actor: 'SYSTEM_CRON',
        description: `Initial system intake record created for prisoner ${c.fullName}`,
      });
    });
    this.savePersistedRecords();
  }

  /**
   * Dynamically analyzes any BNS / IPC charge using Ollama
   */
  async analyzeChargeWithOllama(chargeInput) {
    if (!chargeInput || !chargeInput.trim()) {
      return {
        section: 'BNS 303(2) / IPC 379',
        description: 'Theft of property',
        maxSentenceMonths: 36,
        isDeathOrLifePunishable: false,
      };
    }

    try {
      const prompt = `You are an expert Indian Criminal Law AI specialized in Bharatiya Nyaya Sanhita (BNS), 2023 and Indian Penal Code (IPC).
Analyze this legal charge / offense query: "${chargeInput}".

Determine the statutory penalty under Indian Criminal Law and return ONLY a valid JSON object in this exact format:
{
  "section": "Exact BNS section and corresponding IPC section if applicable, e.g., BNS 105 / IPC 304",
  "description": "Concise official offense description",
  "maxSentenceMonths": integer (maximum imprisonment term prescribed by law in months. Use 1200 for Life Imprisonment),
  "isDeathOrLifePunishable": boolean (true ONLY if the offense is punishable by death or life imprisonment, otherwise false)
}

DO NOT include markdown wrappers, explanations, or extraneous text. Return raw JSON only.`;

      const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          options: { temperature: 0.1, num_predict: 500 },
        }),
      });

      if (!response.ok) throw new Error(`Ollama HTTP error ${response.status}`);
      const data = await response.json();
      const content = (data.message?.content || '').trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          section: parsed.section || chargeInput,
          description: parsed.description || 'Offense under Indian Penal Statutes',
          maxSentenceMonths: typeof parsed.maxSentenceMonths === 'number' ? parsed.maxSentenceMonths : 36,
          isDeathOrLifePunishable: Boolean(parsed.isDeathOrLifePunishable),
        };
      }
    } catch (err) {
      console.warn(`[Ollama BNS Analysis Fallback for "${chargeInput}"]:`, err.message);
    }

    const isLifeOrDeath = /death|life|murder|rape|302|103|376|64/i.test(chargeInput);
    return {
      section: chargeInput.toUpperCase(),
      description: `Offense under BNS / IPC (${chargeInput})`,
      maxSentenceMonths: isLifeOrDeath ? 1200 : 36,
      isDeathOrLifePunishable: isLifeOrDeath,
    };
  }

  async getAllPrisonerCases() {
    const list = Array.from(this.prisonerStore.values());
    return list.map((record) => {
      const evaluation = this.evaluateBNSS479Eligibility(record);
      return { record, evaluation };
    });
  }

  async getPrisonerRecord(searchParams) {
    const { prisonerId, firNumber, name, chargeInput, daysIncarcerated, isFirstOffender } = searchParams;

    if (prisonerId && this.prisonerStore.has(prisonerId)) {
      const existing = this.prisonerStore.get(prisonerId);
      if (chargeInput) {
        const dynamicCharge = await this.analyzeChargeWithOllama(chargeInput);
        existing.charges = [dynamicCharge];
      }
      return existing;
    }

    if (this.useMockData) {
      return await this.generateDynamicPrisoner(searchParams);
    }

    return await this.fetchFromThirdPartyAggregator(searchParams);
  }

  async processWebhookIntakePayload(payload) {
    if (!payload.prisonerId || !payload.incarcerationDate) {
      throw new Error('Invalid Webhook Payload: prisonerId and incarcerationDate are required');
    }

    let parsedCharges = [];
    if (Array.isArray(payload.charges) && payload.charges.length > 0) {
      for (const c of payload.charges) {
        const analyzed = await this.analyzeChargeWithOllama(c.section || c.description || JSON.stringify(c));
        parsedCharges.push(analyzed);
      }
    } else {
      const analyzed = await this.analyzeChargeWithOllama(payload.chargeInput || 'BNS 303(2)');
      parsedCharges.push(analyzed);
    }

    const record = {
      prisonerId: payload.prisonerId,
      fullName: payload.fullName || 'Undertrial Prisoner',
      gender: payload.gender || 'MALE',
      age: payload.age || 30,
      prisonLocation: payload.prisonLocation || 'State Prison',
      districtLegalServicesAuthority: payload.districtLegalServicesAuthority || 'DLSA Headquarters',
      firNumber: payload.firNumber || `FIR-${Date.now().toString().slice(-6)}`,
      caseType: payload.caseType || 'Undertrial Intake',
      incarcerationDate: payload.incarcerationDate,
      isFirstOffender: Boolean(payload.isFirstOffender ?? true),
      hasMultipleCases: Boolean(payload.hasMultipleCases ?? false),
      custodyStatus: 'IN_CUSTODY',
      remandPauseDays: 0,
      remandAdjustments: [],
      manualOverride: { isOverridden: false },
      charges: parsedCharges,
      metadata: {
        source: 'DLSA_WEBHOOK',
        fetchedAt: new Date().toISOString(),
      },
    };

    this.prisonerStore.set(record.prisonerId, record);
    this.savePersistedRecords();

    this.recordAuditEntry({
      prisonerId: record.prisonerId,
      eventType: 'AUTOMATED_ELIGIBILITY_EVALUATION',
      actor: 'DLSA_WEBHOOK',
      description: `Intake webhook processed for prisoner ${record.fullName}`,
    });

    return record;
  }

  async generateDynamicPrisoner(searchParams) {
    const { prisonerId, firNumber, name, chargeInput, daysIncarcerated, isFirstOffender } = searchParams || {};

    const sampleNames = ['Ramesh Kumar', 'Sunita Devi', 'Vikram Singh', 'Mohd. Salim', 'Anand Verma'];
    const samplePrisons = [
      'Tihar Jail No. 3, New Delhi',
      'Yerwada Central Jail, Pune',
      'Arthur Road Jail, Mumbai',
      'Alipore Central Jail, Kolkata',
    ];

    const targetChargeInput = chargeInput || firNumber || 'BNS Section 303(2) / IPC 379 Theft';
    const dynamicCharge = await this.analyzeChargeWithOllama(targetChargeInput);

    const actualDays = typeof daysIncarcerated === 'number' && daysIncarcerated > 0
      ? daysIncarcerated
      : Math.floor(250 + Math.random() * 450);

    const incDate = new Date(Date.now() - actualDays * 86400000).toISOString();
    const pid = prisonerId || `UTP-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const synthetic = {
      prisonerId: pid,
      fullName: name || sampleNames[Math.floor(Math.random() * sampleNames.length)],
      gender: 'MALE',
      age: Math.floor(22 + Math.random() * 25),
      prisonLocation: samplePrisons[Math.floor(Math.random() * samplePrisons.length)],
      districtLegalServicesAuthority: 'DLSA Central District',
      firNumber: firNumber || `FIR-${Math.floor(1000 + Math.random() * 9000)}/2024`,
      caseType: 'Undertrial Review Under BNSS Sec 479',
      incarcerationDate: incDate,
      isFirstOffender: isFirstOffender !== undefined ? Boolean(isFirstOffender) : true,
      hasMultipleCases: false,
      custodyStatus: 'IN_CUSTODY',
      remandPauseDays: 0,
      manualOverride: { isOverridden: false },
      charges: [dynamicCharge],
      metadata: {
        source: 'SIMULATION_MODE',
        fetchedAt: new Date().toISOString(),
      },
    };

    this.prisonerStore.set(synthetic.prisonerId, synthetic);
    this.savePersistedRecords();
    return synthetic;
  }

  /**
   * Section 436A CrPC / Sec 479 BNSS Legal Calculation Engine
   * Multi-charge rule: uses most restrictive charge threshold (highest required sentence),
   * and excludes if ANY charge carries death/life imprisonment or multiple pending cases.
   */
  evaluateBNSS479Eligibility(record) {
    const incDate = new Date(record.incarcerationDate);
    const now = new Date();

    const rawDays = Math.floor(Math.abs(now - incDate) / (1000 * 60 * 60 * 24));
    const pauseDays = record.remandPauseDays || 0;
    const effectiveDaysServed = Math.max(0, rawDays - pauseDays);
    const monthsIncarcerated = Number((effectiveDaysServed / 30.4375).toFixed(1));

    // Handle multi-charge selection: most restrictive threshold (highest max sentence)
    const chargesList = Array.isArray(record.charges) && record.charges.length > 0 ? record.charges : [
      { section: 'BNS Section 303(2)', description: 'General Offense', maxSentenceMonths: 36, isDeathOrLifePunishable: false },
    ];

    const hasDeathOrLifeCharge = chargesList.some((c) => c.isDeathOrLifePunishable);
    const primaryCharge = chargesList.reduce(
      (max, c) => (c.maxSentenceMonths > max.maxSentenceMonths ? c : max),
      chargesList[0]
    );

    const maxSentenceMonths = primaryCharge.maxSentenceMonths;
    const isExcludedByLaw = hasDeathOrLifeCharge || record.hasMultipleCases;

    const isFirstOffender = Boolean(record.isFirstOffender);
    const offenderCategory = isFirstOffender ? 'FIRST_TIME_OFFENDER' : 'REPEAT_OFFENDER';

    const requiredFraction = isFirstOffender ? 1 / 3 : 1 / 2;
    const requiredDetentionPercentage = isFirstOffender ? '33.3%' : '50.0%';
    const requiredSentenceMonthsForBail = Number((maxSentenceMonths * requiredFraction).toFixed(1));
    const requiredDaysForBail = Math.ceil(requiredSentenceMonthsForBail * 30.4375);

    const isOverridden = Boolean(record.manualOverride?.isOverridden);

    let isEligibleForBail = false;
    let eligibilityStatus = 'NOT_ELIGIBLE';

    if (isOverridden) {
      eligibilityStatus = 'EXCLUDED_OFFENSE';
      isEligibleForBail = false;
    } else if (isExcludedByLaw) {
      eligibilityStatus = 'EXCLUDED_OFFENSE';
      isEligibleForBail = false;
    } else if (effectiveDaysServed >= requiredDaysForBail) {
      isEligibleForBail = true;
      eligibilityStatus = isFirstOffender ? 'ELIGIBLE_ONE_THIRD' : 'ELIGIBLE_ONE_HALF';
    } else {
      isEligibleForBail = false;
      eligibilityStatus = 'NOT_ELIGIBLE';
    }

    const daysRemainingForEligibility = Math.max(0, requiredDaysForBail - effectiveDaysServed);
    const eligibleFromTimestamp = new Date(incDate.getTime() + (requiredDaysForBail + pauseDays) * 86400000);
    const eligibleFromDate = eligibleFromTimestamp.toISOString().split('T')[0];

    // Custody status evaluation
    let currentCustodyStatus = record.custodyStatus || 'IN_CUSTODY';
    if (isOverridden) {
      currentCustodyStatus = 'INELIGIBLE_OVERRIDDEN';
    } else if (isEligibleForBail && currentCustodyStatus === 'IN_CUSTODY') {
      currentCustodyStatus = 'ELIGIBLE';
    }

    let legalSummary = '';
    if (isOverridden) {
      legalSummary = `MANUALLY OVERRIDDEN: ${record.manualOverride.reason || 'Staff marked case ineligible'}. (Overridden by ${record.manualOverride.overriddenBy || 'Staff'})`;
    } else if (isExcludedByLaw) {
      legalSummary = `INELIGIBLE under BNSS Sec. 479(2): Charge carries Death / Life Imprisonment or prisoner has multiple pending cases.`;
    } else if (isEligibleForBail) {
      legalSummary = `ELIGIBLE FOR MANDATORY BAIL under BNSS Sec. 479(1). Undertrial has served ${effectiveDaysServed} effective days (${monthsIncarcerated} mos), satisfying the ${requiredDetentionPercentage} statutory threshold of ${requiredSentenceMonthsForBail} months for ${primaryCharge.section}.`;
    } else {
      legalSummary = `Served ${effectiveDaysServed} days (${monthsIncarcerated} mos) out of required ${requiredDaysForBail} days under BNSS Sec 479. ${daysRemainingForEligibility} days remaining until ${eligibleFromDate}.`;
    }

    return {
      prisonerId: record.prisonerId,
      fullName: record.fullName,
      incarcerationDate: record.incarcerationDate,
      daysIncarcerated: rawDays,
      effectiveDaysServed,
      remandPauseDays: pauseDays,
      monthsIncarcerated,
      offenderCategory,
      primaryCharge,
      maxSentenceMonths,
      requiredSentenceMonthsForBail,
      requiredDetentionPercentage,
      eligibilityStatus,
      custodyStatus: currentCustodyStatus,
      isEligibleForBail,
      isOverridden,
      daysRemainingForEligibility,
      eligibleFromDate,
      legalSummary,
      bnssReference: `Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 - Section 479 / CrPC 436A`,
    };
  }

  /**
   * Action 1: Staff Manual Override
   */
  setManualOverride(prisonerId, { isOverridden, reason, staffName }) {
    const record = this.prisonerStore.get(prisonerId);
    if (!record) throw new Error(`Prisoner record ${prisonerId} not found`);

    record.manualOverride = {
      isOverridden,
      reason: reason || 'Staff marked case ineligible',
      overriddenBy: staffName || 'Jail Superintendent',
      overriddenAt: new Date().toISOString(),
    };

    record.custodyStatus = isOverridden ? 'INELIGIBLE_OVERRIDDEN' : 'IN_CUSTODY';
    this.prisonerStore.set(prisonerId, record);
    this.savePersistedRecords();

    this.recordAuditEntry({
      prisonerId,
      eventType: 'STAFF_MANUAL_OVERRIDE',
      actor: 'JAIL_STAFF',
      description: isOverridden
        ? `Manual override APPLIED by ${staffName}: ${reason}`
        : `Manual override REMOVED by ${staffName}`,
      metadata: { isOverridden, reason, staffName },
    });

    return { record, evaluation: this.evaluateBNSS479Eligibility(record) };
  }

  /**
   * Action 2: Remand Clock Adjustment (Pause / Resume / Extension)
   */
  addRemandAdjustment(prisonerId, { pauseDays, reason, recordedBy }) {
    const record = this.prisonerStore.get(prisonerId);
    if (!record) throw new Error(`Prisoner record ${prisonerId} not found`);

    const adjDays = Number(pauseDays) || 0;
    record.remandPauseDays = (record.remandPauseDays || 0) + adjDays;
    if (!record.remandAdjustments) record.remandAdjustments = [];

    const newAdj = {
      id: `RM-${Date.now()}`,
      adjustmentDate: new Date().toISOString(),
      pauseDays: adjDays,
      reason: reason || 'Remand extension / clock stay',
      recordedBy: recordedBy || 'Jail Officer',
    };

    record.remandAdjustments.unshift(newAdj);
    this.prisonerStore.set(prisonerId, record);
    this.savePersistedRecords();

    this.recordAuditEntry({
      prisonerId,
      eventType: 'REMAND_CLOCK_ADJUSTED',
      actor: 'JAIL_STAFF',
      description: `Remand clock adjusted by ${adjDays} days. Total pause days: ${record.remandPauseDays}. Reason: ${reason}`,
      metadata: newAdj,
    });

    return { record, evaluation: this.evaluateBNSS479Eligibility(record) };
  }

  /**
   * Action 3: Human-in-the-Loop Confirmation to kick off bail notification
   */
  async confirmAndInitiateBailProcess(prisonerId, { staffName, comments, targetWebhookUrl }) {
    const record = this.prisonerStore.get(prisonerId);
    if (!record) throw new Error(`Prisoner record ${prisonerId} not found`);

    const evalResult = this.evaluateBNSS479Eligibility(record);
    if (!evalResult.isEligibleForBail) {
      throw new Error(`Prisoner ${prisonerId} is not legally eligible for bail at this time.`);
    }

    record.custodyStatus = 'BAIL_PROCESS_STARTED';
    this.prisonerStore.set(prisonerId, record);
    this.savePersistedRecords();

    // Log human confirmation audit
    this.recordAuditEntry({
      prisonerId,
      eventType: 'HUMAN_CONFIRMED_BAIL_INITIATION',
      actor: 'LEGAL_AID_OFFICER',
      description: `Human checkpoint confirmed by ${staffName || 'Officer'}. Bail application process kicked off. Comments: ${comments || 'None'}`,
      metadata: { staffName, comments },
    });

    // Fire Outbound Webhook to Legal Aid / Court Clerk receiving system
    const webhookResult = await this.fireOutboundWebhook(record, evalResult, 'BAIL_PROCESS_HUMAN_CONFIRMED', targetWebhookUrl);

    return { record, evaluation: evalResult, webhookResult };
  }

  /**
   * Automated Webhook Dispatching logic (HMAC signed payload)
   */
  async fireOutboundWebhook(record, evaluation, eventType = 'UNDERTRIAL_BAIL_ELIGIBILITY_FLIPPED', customUrl) {
    const webhookUrl = customUrl || process.env.DLSA_OUTBOUND_WEBHOOK_URL || 'https://dlsa.gov.in/api/v1/undertrial-bail-events';

    const payload = {
      eventId: `EVT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      eventType,
      timestamp: new Date().toISOString(),
      prisonerId: record.prisonerId,
      fullName: record.fullName,
      firNumber: record.firNumber,
      prisonLocation: record.prisonLocation,
      districtLegalServicesAuthority: record.districtLegalServicesAuthority,
      primaryCharge: evaluation.primaryCharge,
      daysServed: evaluation.effectiveDaysServed,
      thresholdDaysRequired: Math.ceil(evaluation.requiredSentenceMonthsForBail * 30.4375),
      eligibleFromDate: evaluation.eligibleFromDate,
      custodyStatus: record.custodyStatus,
      hmacSignature: '',
    };

    // Calculate HMAC SHA256 Signature for payload authenticity
    const payloadStr = JSON.stringify(payload);
    payload.hmacSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payloadStr).digest('hex');

    this.recordAuditEntry({
      prisonerId: record.prisonerId,
      eventType: 'WEBHOOK_AUTOMATED_FIRE',
      actor: 'SYSTEM_CRON',
      description: `Outbound webhook [${eventType}] fired to ${webhookUrl}`,
      metadata: { eventId: payload.eventId, webhookUrl, hmacSignature: payload.hmacSignature },
    });

    try {
      if (process.env.NODE_ENV === 'production' && !customUrl) {
        await axios.post(webhookUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-DLSA-Signature': payload.hmacSignature,
          },
          timeout: 5000,
        });
      }
      return { success: true, payload, url: webhookUrl, delivery: 'DELIVERED_SIMULATED' };
    } catch (err) {
      console.warn(`Webhook POST failed to ${webhookUrl}: ${err.message}`);
      return { success: false, payload, error: err.message, delivery: 'QUEUED_FOR_RETRY' };
    }
  }

  /**
   * Background Scheduled Job (Daily Batch Run)
   * Idempotent & safe to re-run: evaluates all records, detects status flips, fires webhooks, records audit logs.
   */
  async runScheduledEligibilityCheck() {
    const cases = Array.from(this.prisonerStore.values());
    const results = [];

    for (const record of cases) {
      const prevStatus = record.custodyStatus || 'IN_CUSTODY';
      const evaluation = this.evaluateBNSS479Eligibility(record);

      let statusFlipped = false;

      // Status Flip Detection: IN_CUSTODY -> ELIGIBLE
      if (prevStatus === 'IN_CUSTODY' && evaluation.isEligibleForBail && !evaluation.isOverridden) {
        record.custodyStatus = 'ELIGIBLE';
        statusFlipped = true;
        this.prisonerStore.set(record.prisonerId, record);

        // Audit Log for status flip
        this.recordAuditEntry({
          prisonerId: record.prisonerId,
          eventType: 'STATUS_FLIPPED_ELIGIBLE',
          actor: 'SYSTEM_CRON',
          description: `AUTOMATED RULE FLIP: Prisoner ${record.fullName} reached threshold (${evaluation.effectiveDaysServed} days served >= ${evaluation.requiredSentenceMonthsForBail} mos required). Status changed to ELIGIBLE.`,
          metadata: { prevStatus, newStatus: 'ELIGIBLE', daysServed: evaluation.effectiveDaysServed },
        });

        // Automatically fire webhook on status flip!
        await this.fireOutboundWebhook(record, evaluation, 'UNDERTRIAL_BAIL_ELIGIBILITY_FLIPPED');
      }

      // Always record automated evaluation audit entry
      this.recordAuditEntry({
        prisonerId: record.prisonerId,
        eventType: 'AUTOMATED_ELIGIBILITY_EVALUATION',
        actor: 'SYSTEM_CRON',
        description: `Daily cron evaluation completed. Status: ${record.custodyStatus}, Effective Days: ${evaluation.effectiveDaysServed}/${evaluation.daysRemainingForEligibility + evaluation.effectiveDaysServed}`,
        metadata: { isEligible: evaluation.isEligibleForBail, custodyStatus: record.custodyStatus },
      });

      results.push({ prisonerId: record.prisonerId, statusFlipped, custodyStatus: record.custodyStatus });
    }

    this.savePersistedRecords();
    return { timestamp: new Date().toISOString(), totalEvaluated: cases.length, results };
  }
}

module.exports = new PrisonerDataIntegrationService();
