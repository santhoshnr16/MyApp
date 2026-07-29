const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b-instruct-q4_K_M';

const STORAGE_PATH = path.join(__dirname, 'storage', 'undertrial_prisoners.json');
if (!fs.existsSync(path.dirname(STORAGE_PATH))) {
  fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
}

class PrisonerDataIntegrationService {
  constructor() {
    this.useMockData = process.env.USE_MOCK_DATA === 'true' || process.env.NODE_ENV !== 'production';
    this.thirdPartyApiBase = process.env.LEGAL_AGGREGATOR_API_URL || 'https://api.surepass.io/v1/ecourts';
    this.thirdPartyApiKey = process.env.LEGAL_AGGREGATOR_API_KEY || 'mock-api-key';
    this.prisonerStore = new Map();
    this.loadPersistedRecords();
  }

  loadPersistedRecords() {
    try {
      if (fs.existsSync(STORAGE_PATH)) {
        const raw = fs.readFileSync(STORAGE_PATH, 'utf8');
        const data = JSON.parse(raw);
        Object.entries(data).forEach(([id, rec]) => this.prisonerStore.set(id, rec));
      }
    } catch {
      // Fallback empty
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

  /**
   * Dynamically analyzes any BNS (Bharatiya Nagarik Suraksha Sanhita / Bharatiya Nyaya Sanhita) or IPC charge
   * using the local Ollama LLM model. No hardcoded or static sections!
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

    // Dynamic heuristic fallback if Ollama response parsing fails
    const isLifeOrDeath = /death|life|murder|rape|302|103|376|64/i.test(chargeInput);
    return {
      section: chargeInput.toUpperCase(),
      description: `Offense under BNS / IPC (${chargeInput})`,
      maxSentenceMonths: isLifeOrDeath ? 1200 : 36,
      isDeathOrLifePunishable: isLifeOrDeath,
    };
  }

  /**
   * Main entry point to fetch prisoner record (Simulation vs Live Mode)
   */
  async getPrisonerRecord(searchParams) {
    const { prisonerId, firNumber, name, chargeInput, daysIncarcerated, isFirstOffender } = searchParams;

    // Check in-memory store first if explicit ID passed
    if (prisonerId && this.prisonerStore.has(prisonerId)) {
      const existing = this.prisonerStore.get(prisonerId);
      if (chargeInput) {
        const dynamicCharge = await this.analyzeChargeWithOllama(chargeInput);
        existing.charges = [dynamicCharge];
      }
      return existing;
    }

    if (this.useMockData) {
      console.log(`[Simulation Mode] Dynamic prisoner record evaluation for search:`, searchParams);
      return await this.generateDynamicPrisoner(searchParams);
    }

    return await this.fetchFromThirdPartyAggregator(searchParams);
  }

  /**
   * Approach A: Third-Party Legal Data Aggregator Integration (Surepass/eCourts KYC)
   */
  async fetchFromThirdPartyAggregator(searchParams) {
    try {
      const response = await axios.post(
        `${this.thirdPartyApiBase}/prisoner-search`,
        {
          search_query: searchParams.firNumber || searchParams.name || searchParams.prisonerId || searchParams.chargeInput,
          jurisdiction: searchParams.jurisdiction || 'India',
        },
        {
          headers: {
            Authorization: `Bearer ${this.thirdPartyApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const raw = response.data;

      // Dynamically analyze returned charge via Ollama
      const chargeText = raw.charge_description || raw.section || searchParams.chargeInput || 'BNS Section 303(2) Theft';
      const dynamicCharge = await this.analyzeChargeWithOllama(chargeText);

      const normalized = {
        prisonerId: raw.prisoner_id || `UTP-${Math.floor(100000 + Math.random() * 900000)}`,
        fullName: raw.full_name || searchParams.name || 'Undertrial Prisoner',
        gender: raw.gender || 'MALE',
        age: raw.age || 29,
        prisonLocation: raw.prison_name || 'Central Jail, Tihar, New Delhi',
        districtLegalServicesAuthority: raw.dlsa_name || 'DLSA New Delhi',
        firNumber: raw.fir_no || searchParams.firNumber || 'FIR-2024-99182',
        caseType: raw.case_type || 'Undertrial Bail Application',
        incarcerationDate: raw.admission_date || new Date(Date.now() - 380 * 86400000).toISOString(),
        isFirstOffender: raw.is_first_offender ?? true,
        hasMultipleCases: raw.has_multiple_cases ?? false,
        charges: [dynamicCharge],
        metadata: {
          source: 'LIVE_THIRD_PARTY_API',
          fetchedAt: new Date().toISOString(),
        },
      };

      this.prisonerStore.set(normalized.prisonerId, normalized);
      this.savePersistedRecords();
      return normalized;
    } catch (err) {
      console.warn(`Third-party API failed (${err.message}). Falling back to Simulation Mode.`);
      return await this.generateDynamicPrisoner(searchParams);
    }
  }

  /**
   * Approach B: Webhook Intake Event from partnered DLSA / Prison Authority
   */
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
      districtLegalServicesAuthority: payload.districtLegalServicesAuthority || 'DLSA State Headquarters',
      firNumber: payload.firNumber || `FIR-${Date.now().toString().slice(-6)}`,
      caseType: payload.caseType || 'Undertrial Intake',
      incarcerationDate: payload.incarcerationDate,
      isFirstOffender: Boolean(payload.isFirstOffender ?? true),
      hasMultipleCases: Boolean(payload.hasMultipleCases ?? false),
      charges: parsedCharges,
      metadata: {
        source: 'DLSA_WEBHOOK',
        fetchedAt: new Date().toISOString(),
      },
    };

    this.prisonerStore.set(record.prisonerId, record);
    this.savePersistedRecords();
    return record;
  }

  /**
   * Simulation Mode: Dynamic Synthetic Generator for Development & Demo.
   * Uses Ollama to analyze any custom charge passed by the user/tester!
   */
  async generateDynamicPrisoner(searchParams) {
    const { prisonerId, firNumber, name, chargeInput, daysIncarcerated, isFirstOffender } = searchParams || {};

    const sampleNames = ['Ramesh Kumar', 'Sunita Devi', 'Vikram Singh', 'Mohd. Salim', 'Anand Verma'];
    const samplePrisons = [
      'Tihar Jail No. 3, New Delhi',
      'Yerwada Central Jail, Pune',
      'Arthur Road Jail, Mumbai',
      'Alipore Central Jail, Kolkata',
    ];

    // Dynamic Ollama Legal Analysis on chargeInput!
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
   * Core Engine: Evaluates undertrial bail eligibility under BNSS Section 479 (2023)
   */
  evaluateBNSS479Eligibility(prisonerRecord) {
    const incDate = new Date(prisonerRecord.incarcerationDate);
    const now = new Date();

    const diffTime = Math.abs(now - incDate);
    const daysIncarcerated = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const monthsIncarcerated = Number((daysIncarcerated / 30.4375).toFixed(1));

    // Find primary charge with maximum sentence
    const primaryCharge = prisonerRecord.charges.reduce(
      (max, c) => (c.maxSentenceMonths > max.maxSentenceMonths ? c : max),
      prisonerRecord.charges[0] || {
        section: 'BNS Section 303(2)',
        description: 'General Offense',
        maxSentenceMonths: 36,
        isDeathOrLifePunishable: false,
      }
    );

    const maxSentenceMonths = primaryCharge.maxSentenceMonths;
    const isExcluded = primaryCharge.isDeathOrLifePunishable || prisonerRecord.hasMultipleCases;

    const isFirstOffender = Boolean(prisonerRecord.isFirstOffender);
    const offenderCategory = isFirstOffender ? 'FIRST_TIME_OFFENDER' : 'REPEAT_OFFENDER';

    // BNSS 479 Rule: 1/3rd max sentence for First Offender; 1/2 max sentence for others
    const requiredFraction = isFirstOffender ? 1 / 3 : 1 / 2;
    const requiredDetentionPercentage = isFirstOffender ? '33.3%' : '50.0%';
    const requiredSentenceMonthsForBail = Number((maxSentenceMonths * requiredFraction).toFixed(1));

    const requiredDaysForBail = Math.ceil(requiredSentenceMonthsForBail * 30.4375);

    let isEligibleForBail = false;
    let eligibilityStatus = 'NOT_ELIGIBLE';

    if (isExcluded) {
      eligibilityStatus = 'EXCLUDED_OFFENSE';
      isEligibleForBail = false;
    } else if (daysIncarcerated >= requiredDaysForBail) {
      isEligibleForBail = true;
      eligibilityStatus = isFirstOffender ? 'ELIGIBLE_ONE_THIRD' : 'ELIGIBLE_ONE_HALF';
    } else {
      isEligibleForBail = false;
      eligibilityStatus = 'NOT_ELIGIBLE';
    }

    const daysRemainingForEligibility = Math.max(0, requiredDaysForBail - daysIncarcerated);

    const eligibleFromTimestamp = new Date(incDate.getTime() + requiredDaysForBail * 86400000);
    const eligibleFromDate = eligibleFromTimestamp.toISOString().split('T')[0];

    let legalSummary = '';
    if (isExcluded) {
      legalSummary = `INELIGIBLE under BNSS Sec. 479(2): Offense carries Death / Life Imprisonment penalty or prisoner has multiple pending warrants.`;
    } else if (isEligibleForBail) {
      legalSummary = `ELIGIBLE FOR MANDATORY BAIL under BNSS Sec. 479(1). Undertrial has completed ${monthsIncarcerated} months (${daysIncarcerated} days), satisfying the required ${requiredDetentionPercentage} statutory threshold of ${requiredSentenceMonthsForBail} months for ${primaryCharge.section} (${primaryCharge.description}).`;
    } else {
      legalSummary = `Detained for ${monthsIncarcerated} months out of required ${requiredSentenceMonthsForBail} months under BNSS Sec 479. Requires ${daysRemainingForEligibility} more days of detention to become eligible on ${eligibleFromDate}.`;
    }

    return {
      prisonerId: prisonerRecord.prisonerId,
      fullName: prisonerRecord.fullName,
      incarcerationDate: prisonerRecord.incarcerationDate,
      daysIncarcerated,
      monthsIncarcerated,
      offenderCategory,
      primaryCharge,
      maxSentenceMonths,
      requiredSentenceMonthsForBail,
      requiredDetentionPercentage,
      eligibilityStatus,
      isEligibleForBail,
      daysRemainingForEligibility,
      eligibleFromDate,
      legalSummary,
      bnssReference: `Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 - Section 479`,
    };
  }
}

module.exports = new PrisonerDataIntegrationService();
