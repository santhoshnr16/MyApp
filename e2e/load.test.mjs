import assert from 'node:assert/strict';

const VAULT_URL = process.env.E2E_VAULT_URL ?? 'http://localhost:3002';
const CONCURRENT_USERS = parseInt(process.env.LOAD_CONCURRENT_USERS || '25', 10);
const ITERATIONS_PER_USER = parseInt(process.env.LOAD_ITERATIONS || '5', 10);

async function jsonRequest(url, options = {}) {
  const start = Date.now();
  try {
    const response = await fetch(url, options);
    const durationMs = Date.now() - start;
    const text = await response.text();
    return { ok: response.ok, status: response.status, durationMs, text };
  } catch (err) {
    return { ok: false, status: 0, durationMs: Date.now() - start, text: err.message };
  }
}

async function simulateWorker(workerId) {
  const metrics = { requests: 0, errors: 0, totalDurationMs: 0, maxDurationMs: 0 };
  const userEmail = `load_worker_${workerId}_${Date.now()}@lexi.com`;

  // 1. Register User
  const reg = await jsonRequest(`${VAULT_URL}/vault/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Load Worker ${workerId}`,
      email: userEmail,
      password: 'LoadPassword123!',
      role: workerId % 2 === 0 ? 'advocate' : 'client',
      barNumber: workerId % 2 === 0 ? `BAR-LOAD-${workerId}` : undefined,
    }),
  });
  
  metrics.requests++;
  metrics.totalDurationMs += reg.durationMs;
  if (!reg.ok) metrics.errors++;

  if (!reg.ok || !reg.text.includes('token')) return metrics;

  const token = JSON.parse(reg.text).token;

  // 2. Perform repeated API operations
  for (let i = 0; i < ITERATIONS_PER_USER; i++) {
    // Case query load
    const caseReq = await jsonRequest(`${VAULT_URL}/vault/cases`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    metrics.requests++;
    metrics.totalDurationMs += caseReq.durationMs;
    metrics.maxDurationMs = Math.max(metrics.maxDurationMs, caseReq.durationMs);
    if (!caseReq.ok) metrics.errors++;

    // Health check load
    const healthReq = await jsonRequest(`${VAULT_URL}/vault/health`);
    metrics.requests++;
    metrics.totalDurationMs += healthReq.durationMs;
    metrics.maxDurationMs = Math.max(metrics.maxDurationMs, healthReq.durationMs);
    if (!healthReq.ok) metrics.errors++;
  }

  return metrics;
}

async function runLoadTests() {
  console.log(`⚡ Running Lexi AI Load & Stress Test Suite...`);
  console.log(`   Simulating ${CONCURRENT_USERS} concurrent users x ${ITERATIONS_PER_USER} iterations...`);

  const startTime = Date.now();
  const workerPromises = [];

  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    workerPromises.push(simulateWorker(i));
  }

  const results = await Promise.all(workerPromises);
  const totalExecutionTimeMs = Date.now() - startTime;

  let totalRequests = 0;
  let totalErrors = 0;
  let aggregateDurationMs = 0;
  let peakResponseTimeMs = 0;

  for (const res of results) {
    totalRequests += res.requests;
    totalErrors += res.errors;
    aggregateDurationMs += res.totalDurationMs;
    peakResponseTimeMs = Math.max(peakResponseTimeMs, res.maxDurationMs);
  }

  const avgLatencyMs = (aggregateDurationMs / (totalRequests || 1)).toFixed(2);
  const throughputRps = ((totalRequests / (totalExecutionTimeMs || 1)) * 1000).toFixed(2);
  const errorRatePercent = ((totalErrors / (totalRequests || 1)) * 100).toFixed(2);

  console.log('\n📊 --- Load Test Performance Summary ---');
  console.log(`  Total Requests Executed : ${totalRequests}`);
  console.log(`  Total Execution Time   : ${totalExecutionTimeMs} ms`);
  console.log(`  Average Latency        : ${avgLatencyMs} ms`);
  console.log(`  Peak Latency           : ${peakResponseTimeMs} ms`);
  console.log(`  Throughput             : ${throughputRps} req/sec`);
  console.log(`  Error Rate             : ${errorRatePercent}%`);

  assert.ok(parseFloat(errorRatePercent) < 5.0, `Error rate must be under 5% (Actual: ${errorRatePercent}%)`);
  assert.ok(parseFloat(avgLatencyMs) < 1500, `Average latency must be under 1500ms (Actual: ${avgLatencyMs}ms)`);

  console.log('✅ Load Test Benchmarks Satisfied Successfully!\n');
}

runLoadTests().catch((err) => {
  console.error('❌ Load Test Suite Failed:', err);
  process.exit(1);
});
