import assert from 'node:assert/strict';

const VAULT_URL = process.env.E2E_VAULT_URL ?? 'http://localhost:3002';

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { ok: response.ok, status: response.status, text, json };
}

async function registerUser(name, email, role, barNumber = null) {
  const res = await jsonRequest(`${VAULT_URL}/vault/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      password: 'SecurePassword123!',
      role,
      barNumber: role === 'advocate' ? (barNumber ?? 'BAR-SEC-100') : undefined,
    }),
  });
  assert.equal(res.ok, true, `Registration failed for ${role}: ${res.text}`);
  return res.json;
}

async function runSecurityTests() {
  console.log('🔒 Running Lexi AI Vulnerability & Security QA Test Suite...');

  // 1. Setup Users (Advocate, Unassigned Junior, Client)
  const timestamp = Date.now();
  const advocate = await registerUser('Senior Advocate', `advocate_${timestamp}@lexiai.com`, 'advocate', 'BAR-SEC-999');
  const unassignedJunior = await registerUser('Unassigned Junior', `junior_${timestamp}@lexiai.com`, 'junior');
  const client = await registerUser('Client User', `client_${timestamp}@lexiai.com`, 'client');

  // SEC-001: Unauthenticated Endpoint Protection
  console.log('  [SEC-001] Checking unauthenticated requests return 401...');
  const noTokenRes = await jsonRequest(`${VAULT_URL}/vault/cases`);
  assert.equal(noTokenRes.status, 401, 'Unauthenticated request to /vault/cases must return HTTP 401');

  // SEC-002: Tampered JWT Token Rejection
  console.log('  [SEC-002] Checking tampered JWT tokens return 401...');
  const tamperedTokenRes = await jsonRequest(`${VAULT_URL}/vault/cases`, {
    headers: { Authorization: `Bearer ${advocate.token}invalid` },
  });
  assert.equal(tamperedTokenRes.status, 401, 'Tampered token request must return HTTP 401');

  // SEC-003: Advocate Creates Private Case
  console.log('  [SEC-003] Advocate creates private legal case...');
  const caseRes = await jsonRequest(`${VAULT_URL}/vault/cases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${advocate.token}`,
    },
    body: JSON.stringify({
      title: 'Confidential M&A and NDA Review',
      caseType: 'corporate',
      clientName: 'Enterprise Client',
    }),
  });
  assert.equal(caseRes.ok, true, 'Advocate must be able to create case');
  const createdCaseId = caseRes.json.case.id;

  // SEC-004: IDOR Protection - Unassigned Junior tries to access Advocate case
  console.log('  [SEC-004] IDOR Test: Unassigned Junior attempts case access...');
  const idorRes = await jsonRequest(`${VAULT_URL}/vault/cases/${createdCaseId}`, {
    headers: { Authorization: `Bearer ${unassignedJunior.token}` },
  });
  assert.equal(idorRes.status, 403, 'Unassigned junior must receive HTTP 403 Access Denied');

  // SEC-005: Privilege Escalation - Client attempts to update Case details reserved for Advocate
  console.log('  [SEC-005] Privilege Escalation Test: Client attempts case PATCH...');
  const patchRes = await jsonRequest(`${VAULT_URL}/vault/cases/${createdCaseId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${client.token}`,
    },
    body: JSON.stringify({ title: 'Hacked Case Title' }),
  });
  assert.equal(patchRes.status, 403, 'Client updating case details must receive HTTP 403 Forbidden');

  // SEC-006: Invalid Role Registration Shield
  console.log('  [SEC-006] Role Injection Test: Registering with invalid role...');
  const invalidRoleRes = await jsonRequest(`${VAULT_URL}/vault/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Hacker',
      email: `hacker_${timestamp}@lexiai.com`,
      password: 'SecurePassword123!',
      role: 'superadmin',
    }),
  });
  assert.equal(invalidRoleRes.status, 400, 'Registration with unknown role must return HTTP 400');

  console.log('✅ ALL Security & Vulnerability QA Test Cases Passed Successfully!\n');
}

runSecurityTests().catch((err) => {
  console.error('❌ Security Test Suite Failed:', err);
  process.exit(1);
});
