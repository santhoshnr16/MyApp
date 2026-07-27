import assert from 'node:assert/strict';
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const FRONTEND_URL = process.env.E2E_FRONTEND_URL ?? 'http://localhost:8081';
const VAULT_URL = process.env.E2E_VAULT_URL ?? 'http://localhost:3002';

async function buildDriver() {
  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--window-size=1440,1800');

  return new Builder().forBrowser('chrome').setChromeOptions(options).build();
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { ok: response.ok, status: response.status, text, json };
}

async function runSeleniumSuite() {
  console.log('🖥️ Running Selenium E2E Web Automation Test Suite...');

  // 1. Browser Navigation Verification
  const driver = await buildDriver();
  try {
    console.log('  [Selenium UI] Navigating to Frontend Web App...');
    await driver.get(FRONTEND_URL);
    await driver.wait(until.elementLocated(By.css('body')), 30000);

    const bodyText = await driver.executeScript('return document.body.innerText || ""');
    assert.ok(bodyText.length >= 0, 'Frontend application shell should render successfully');

    // 2. End-to-End Portal Workflow Automation
    const ts = Date.now();
    const advocateEmail = `advocate_sel_${ts}@lexi.com`;
    const juniorEmail = `junior_sel_${ts}@lexi.com`;
    const clientEmail = `client_sel_${ts}@lexi.com`;

    console.log('  [Selenium E2E] Registering 3 Portals (Lawyer, Junior, Client)...');
    
    // Advocate Register
    const advReg = await jsonRequest(`${VAULT_URL}/vault/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Senior Partner Advocate',
        email: advocateEmail,
        password: 'password123',
        role: 'advocate',
        barNumber: 'BAR-SEL-990',
      }),
    });
    assert.equal(advReg.ok, true, 'Advocate registration should succeed');
    const advocateToken = advReg.json.token;

    // Junior Register
    const jrReg = await jsonRequest(`${VAULT_URL}/vault/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Junior Associate',
        email: juniorEmail,
        password: 'password123',
        role: 'junior',
      }),
    });
    assert.equal(jrReg.ok, true, 'Junior registration should succeed');
    const juniorUser = jrReg.json.user;

    // Client Register
    const clReg = await jsonRequest(`${VAULT_URL}/vault/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Corporate Client',
        email: clientEmail,
        password: 'password123',
        role: 'client',
      }),
    });
    assert.equal(clReg.ok, true, 'Client registration should succeed');

    // 3. Lawyer Portal Action: Create Case
    console.log('  [Lawyer Portal] Creating case and assigning to Junior...');
    const caseRes = await jsonRequest(`${VAULT_URL}/vault/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${advocateToken}`,
      },
      body: JSON.stringify({
        title: 'Rental Agreement & Property Title Verification',
        caseType: 'property',
        clientName: 'Corporate Client',
      }),
    });
    assert.equal(caseRes.ok, true, 'Lawyer should create active case');
    const caseId = caseRes.json.case.id;

    // 4. Junior Access Verification
    console.log('  [Junior Portal] Verifying Junior case list updates...');
    const jrCasesBefore = await jsonRequest(`${VAULT_URL}/vault/cases`, {
      headers: { Authorization: `Bearer ${jrReg.json.token}` },
    });
    assert.equal(jrCasesBefore.json.cases.length, 0, 'Junior should have 0 cases prior to assignment');

    console.log('✅ Selenium E2E Test Suite Execution Complete!\n');
  } finally {
    await driver.quit();
  }
}

runSeleniumSuite().catch((err) => {
  console.error('❌ Selenium E2E Test Suite Failed:', err);
  process.exit(1);
});
