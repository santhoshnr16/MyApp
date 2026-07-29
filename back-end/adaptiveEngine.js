const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, 'storage');
const STATE_FILE = path.join(STORAGE_DIR, 'adaptive_engine_state.json');

// Posture arms
const POSTURES = ['DEFENSIVE', 'BALANCED', 'AGGRESSIVE', 'COLLABORATIVE'];

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate synthetic embedding vector from text using TF-IDF / character n-gram hashing
 * when full neural vector embeddings are unavailable or offline.
 */
function generateFallbackEmbedding(text, dim = 64) {
  const vec = new Array(dim).fill(0);
  const words = (text || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return vec;

  words.forEach((word) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    vec[idx] += 1;
  });

  // Normalize
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vec.map((v) => v / norm);
}

/**
 * Feature Extractor for Contextual Bandit & Pairwise Ranker
 */
function extractContextFeatures(context, dim = 16) {
  const features = new Array(dim).fill(0);

  // Contract Type mapping
  const cType = (context?.contractType || '').toLowerCase();
  features[0] = cType.includes('service') ? 1.0 : cType.includes('nda') ? 0.8 : 0.5;

  // Jurisdiction
  const jur = (context?.jurisdiction || '').toLowerCase();
  features[1] = jur.includes('india') ? 1.0 : 0.6;

  // Power Dynamic
  const power = (context?.powerDynamic || '').toLowerCase();
  features[2] = power.includes('we are stronger') ? 1.0 : power.includes('balanced') ? 0.5 : 0.1;

  // Market Context
  const market = (context?.marketContext || '').toLowerCase();
  features[3] = market.includes("buyer's") ? 0.9 : market.includes("seller's") ? 0.2 : 0.5;

  // Priority
  const prio = (context?.priority || '').toLowerCase();
  features[4] = prio.includes('minimize risk') ? 0.9 : prio.includes('maximize leverage') ? 0.8 : 0.5;

  // Deal Value numerical feature
  const valueMatch = (context?.dealValue || '').match(/\d+/);
  const val = valueMatch ? parseInt(valueMatch[0], 10) : 50;
  features[5] = Math.min(1.0, val / 1000);

  // Normalization
  const norm = Math.sqrt(features.reduce((s, v) => s + v * v, 0)) || 1;
  return features.map((f) => f / norm);
}

/**
 * Matrix multiplication helper: A (m x n) * x (n x 1) -> y (m x 1)
 */
function multiplyMatrixVector(mat, vec) {
  return mat.map((row) => row.reduce((sum, val, j) => sum + val * (vec[j] || 0), 0));
}

/**
 * Gaussian random sample using Box-Muller transform
 */
function sampleGaussian(mean = 0, std = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * std;
}

class AdaptiveRiskEngine {
  constructor() {
    this.featureDim = 16;
    this.clusters = []; // { id, name, centroid, frequency, precedentCount }
    this.curationQueue = []; // { id, text, distance, timestamp, status }
    this.banditParams = {}; // posture -> { mu: number[], covDiag: number[], totalObservations: number }
    this.confidenceLogs = []; // { raw: number, outcome: number, timestamp: string }
    this.noveltyDistanceThreshold = 0.42;

    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }

      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        const data = JSON.parse(raw);
        this.clusters = data.clusters || [];
        this.curationQueue = data.curationQueue || [];
        this.banditParams = data.banditParams || {};
        this.confidenceLogs = data.confidenceLogs || [];
      }

      // Initialize default seed clusters if empty
      if (this.clusters.length === 0) {
        this.seedClusters();
      }

      // Initialize Bandit parameters for postures if empty
      POSTURES.forEach((p) => {
        if (!this.banditParams[p]) {
          // Weak prior favoring BALANCED / COLLABORATIVE
          const initialMu = new Array(this.featureDim).fill(0.1);
          if (p === 'BALANCED') initialMu[0] = 0.5;
          if (p === 'COLLABORATIVE') initialMu[1] = 0.4;
          this.banditParams[p] = {
            mu: initialMu,
            covDiag: new Array(this.featureDim).fill(1.0), // Variance diagonal
            totalObservations: 0,
          };
        }
      });

      console.log(`[AdaptiveEngine] Initialized with ${this.clusters.length} risk clusters and ${this.curationQueue.length} queue items.`);
    } catch (err) {
      console.error('[AdaptiveEngine] Initialization error:', err.message);
    }
  }

  seedClusters() {
    const defaultCategories = [
      { id: 'c_indemnity_uncapped', name: 'Uncapped Liability & Indemnity', text: 'Indemnify against all losses without liability cap' },
      { id: 'c_termination_convenience', name: 'Termination for Convenience', text: 'Terminate contract without cause with short notice' },
      { id: 'c_ip_assignment', name: 'Broad IP Assignment', text: 'Assign all intellectual property rights created during term' },
      { id: 'c_payment_delay', name: 'Delayed Payment Penalty', text: 'No interest on late payments or 90 day credit term' },
      { id: 'c_jurisdiction_foreign', name: 'Foreign Jurisdiction & Arbitration', text: 'Governed by foreign courts or offshore seat' },
    ];

    this.clusters = defaultCategories.map((c) => ({
      id: c.id,
      name: c.name,
      centroid: generateFallbackEmbedding(c.text, 64),
      frequency: 1,
      precedentCount: 1,
    }));
    this.saveState();
  }

  saveState() {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      const data = {
        clusters: this.clusters,
        curationQueue: this.curationQueue,
        banditParams: this.banditParams,
        confidenceLogs: this.confidenceLogs.slice(-1000), // Keep latest 1000 logs
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('[AdaptiveEngine] Save state error:', err.message);
    }
  }

  /**
   * Step 1: Embedding-Native Risk Clustering & Novelty Routing
   */
  vectorizeAndClusterRisk(riskText, externalEmbedding = null) {
    const vec = externalEmbedding || generateFallbackEmbedding(riskText, 64);
    let minDistance = 1.0;
    let closestCluster = null;

    for (const cluster of this.clusters) {
      const sim = cosineSimilarity(vec, cluster.centroid);
      const dist = 1.0 - sim;
      if (dist < minDistance) {
        minDistance = dist;
        closestCluster = cluster;
      }
    }

    const isNovel = minDistance > this.noveltyDistanceThreshold;

    if (isNovel) {
      // Route to Human Curation Queue
      const queueItem = {
        id: `cq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        text: riskText,
        minDistance: Number(minDistance.toFixed(3)),
        status: 'PENDING_LAWYER_REVIEW',
        timestamp: new Date().toISOString(),
      };

      // Check if duplicate queue item exists
      const exists = this.curationQueue.some((q) => q.text.toLowerCase() === riskText.toLowerCase());
      if (!exists) {
        this.curationQueue.unshift(queueItem);
        this.saveState();
      }

      return {
        clusterId: 'c_novel_unclassified',
        clusterName: 'Novel Unclassified Risk (Flagged for Lawyer Review)',
        isNovel: true,
        noveltyScore: minDistance,
        curationQueueId: queueItem.id,
      };
    }

    // Increment cluster frequency
    if (closestCluster) {
      closestCluster.frequency += 1;
      this.saveState();
    }

    return {
      clusterId: closestCluster ? closestCluster.id : 'c_general',
      clusterName: closestCluster ? closestCluster.name : 'General Risk',
      isNovel: false,
      noveltyScore: minDistance,
    };
  }

  /**
   * Step 2: Contextual Bandit Posture Selection (Thompson Sampling)
   */
  selectPostureContextualBandit(context) {
    const x = extractContextFeatures(context, this.featureDim);
    let maxSampledReward = -Infinity;
    let chosenPosture = 'BALANCED';

    POSTURES.forEach((p) => {
      const params = this.banditParams[p] || {
        mu: new Array(this.featureDim).fill(0.1),
        covDiag: new Array(this.featureDim).fill(1.0),
      };

      // Sample weight vector theta from Gaussian N(mu, diag(covDiag))
      const thetaSample = params.mu.map((m, idx) => {
        const std = Math.sqrt(Math.max(0.01, params.covDiag[idx]));
        return sampleGaussian(m, std);
      });

      // Compute dot product x * theta_sample
      const predictedReward = x.reduce((sum, val, idx) => sum + val * thetaSample[idx], 0);

      if (predictedReward > maxSampledReward) {
        maxSampledReward = predictedReward;
        chosenPosture = p;
      }
    });

    return {
      posture: chosenPosture,
      postureRewardEstimate: Number(maxSampledReward.toFixed(3)),
    };
  }

  /**
   * Update Thompson Sampling bandit weights on user feedback reward
   */
  updateBanditReward(postureArm, context, reward) {
    if (!POSTURES.includes(postureArm)) return;
    const x = extractContextFeatures(context, this.featureDim);
    const params = this.banditParams[postureArm];

    if (!params) return;

    const learningRate = 0.15;
    // Bayesian online update step
    for (let i = 0; i < this.featureDim; i++) {
      const featureVal = x[i];
      // Update mean estimate towards observed reward
      params.mu[i] += learningRate * (reward * featureVal - params.mu[i] * 0.05);
      // Reduce variance/uncertainty diagonal as observations accumulate
      params.covDiag[i] = Math.max(0.05, params.covDiag[i] * 0.95);
    }

    params.totalObservations += 1;
    this.saveState();
  }

  /**
   * Step 3: Confidence Calibration
   */
  calibrateConfidence(rawConfidence = 0.75) {
    let calibratedConfidence = rawConfidence;

    // Apply isotonic regression approximation if we have historical confidence logs
    if (this.confidenceLogs.length >= 10) {
      const logs = this.confidenceLogs;
      // Filter logs close to raw confidence (+- 0.15)
      const nearbyLogs = logs.filter((l) => Math.abs(l.raw - rawConfidence) <= 0.15);
      if (nearbyLogs.length >= 5) {
        const empiricalPositives = nearbyLogs.reduce((sum, l) => sum + l.outcome, 0);
        const empiricalRate = empiricalPositives / nearbyLogs.length;
        // Blend raw float (40%) with empirical rate (60%)
        calibratedConfidence = rawConfidence * 0.4 + empiricalRate * 0.6;
      }
    }

    calibratedConfidence = Math.max(0.1, Math.min(0.99, calibratedConfidence));

    // Determine UI review signal
    let reviewSignal = 'REVIEW_SUGGESTED';
    let reviewSignalLabel = 'Review Suggested';
    let badgeColor = '#D4AF37'; // Gold

    if (calibratedConfidence > 0.82) {
      reviewSignal = 'READY';
      reviewSignalLabel = 'Ready to Use';
      badgeColor = '#2E7D32'; // Green
    } else if (calibratedConfidence < 0.50) {
      reviewSignal = 'FLAG_FOR_LAWYER';
      reviewSignalLabel = 'Flag for Lawyer';
      badgeColor = '#B83232'; // Red
    }

    return {
      rawConfidence,
      calibratedConfidence: Number(calibratedConfidence.toFixed(2)),
      reviewSignal,
      reviewSignalLabel,
      badgeColor,
    };
  }

  /**
   * Step 4: Pairwise Action Card Ranker
   */
  rankActionCards(clauseIssues, context, banditRewardEstimate = 0.5) {
    if (!Array.isArray(clauseIssues)) return [];

    const ranked = clauseIssues.map((item, idx) => {
      // 1. Severity weight
      const severityScore = item.risk === 'HIGH' ? 1.0 : item.risk === 'MEDIUM' ? 0.6 : 0.3;

      // 2. Vector Clustering
      const clusterResult = this.vectorizeAndClusterRisk(`${item.clauseName} ${item.issue}`);

      // 3. Calibrated Confidence
      const rawConf = item.risk === 'HIGH' ? 0.88 : item.risk === 'MEDIUM' ? 0.72 : 0.60;
      const confResult = this.calibrateConfidence(rawConf);

      // 4. Composite Pairwise Rank Score
      // Score = 0.35 * severity + 0.25 * calibratedConfidence + 0.20 * banditReward + 0.20 * (1 - noveltyScore)
      const rankScore =
        0.35 * severityScore +
        0.25 * confResult.calibratedConfidence +
        0.20 * banditRewardEstimate +
        0.20 * (1.0 - (clusterResult.noveltyScore || 0));

      return {
        ...item,
        id: `clause_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        clusterId: clusterResult.clusterId,
        clusterName: clusterResult.clusterName,
        isNovel: clusterResult.isNovel,
        noveltyScore: clusterResult.noveltyScore,
        calibratedConfidence: confResult.calibratedConfidence,
        reviewSignal: confResult.reviewSignal,
        reviewSignalLabel: confResult.reviewSignalLabel,
        badgeColor: confResult.badgeColor,
        rankingScore: Number(rankScore.toFixed(3)),
      };
    });

    // Sort descending by adaptive ranking score
    ranked.sort((a, b) => b.rankingScore - a.rankingScore);
    return ranked;
  }

  /**
   * Log user feedback event (Copy, Edit, Reject) to feed Thompson Sampling & Calibration
   */
  recordFeedback({ postureArm, actionType, context, rawConfidence = 0.75 }) {
    // Reward mappings
    const rewardMap = {
      COPY_UNEDITED: 1.0,
      COPY_EDITED: 0.5,
      VIEW_ONLY: 0.0,
      REJECT: -0.5,
    };

    const reward = rewardMap[actionType] !== undefined ? rewardMap[actionType] : 0.0;

    // 1. Update Bandit
    if (postureArm) {
      this.updateBanditReward(postureArm, context, reward);
    }

    // 2. Log Confidence outcome (1 for accept without edit, 0 otherwise)
    const outcome = actionType === 'COPY_UNEDITED' ? 1.0 : 0.0;
    this.confidenceLogs.push({
      raw: rawConfidence,
      outcome,
      timestamp: new Date().toISOString(),
    });

    this.saveState();
    return { success: true, reward, feedbackCount: this.confidenceLogs.length };
  }

  /**
   * Resolve item in Curation Queue
   */
  resolveCurationItem(queueId, precedentText, clusterName) {
    const idx = this.curationQueue.findIndex((q) => q.id === queueId);
    if (idx !== -1) {
      const item = this.curationQueue[idx];
      item.status = 'RESOLVED';
      item.resolvedAt = new Date().toISOString();
      item.precedentText = precedentText;

      // Add as new Cluster Centroid
      const newCluster = {
        id: `c_custom_${Date.now()}`,
        name: clusterName || 'Custom Lawyer Precedent Cluster',
        centroid: generateFallbackEmbedding(precedentText || item.text, 64),
        frequency: 1,
        precedentCount: 1,
      };
      this.clusters.push(newCluster);
      this.saveState();
      return { success: true, newCluster };
    }
    return { success: false, error: 'Queue item not found' };
  }

  getCurationQueue() {
    return this.curationQueue.filter((q) => q.status === 'PENDING_LAWYER_REVIEW');
  }

  getEngineStats() {
    return {
      totalClusters: this.clusters.length,
      pendingCurationCount: this.getCurationQueue().length,
      confidenceLogsCount: this.confidenceLogs.length,
      banditObservations: Object.fromEntries(
        Object.entries(this.banditParams).map(([k, v]) => [k, v.totalObservations])
      ),
    };
  }
}

const adaptiveEngine = new AdaptiveRiskEngine();
module.exports = adaptiveEngine;
