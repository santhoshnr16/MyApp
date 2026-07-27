import assert from 'node:assert/strict';
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const FRONTEND_URL = process.env.E2E_FRONTEND_URL ?? 'http://localhost:8081';
const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:3001';
const VAULT_URL = process.env.E2E_VAULT_URL ?? 'http://localhost:3002';

async function waitForHealth(url) {
  const response = await fetch(url);
  assert.equal(response.ok, true, `Expected ${url} to return 200`);
  return response.json();
}

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
  return { ok: response.ok, status: response.status, text };
}

async function main() {
  const backendHealth = await waitForHealth(`${BACKEND_URL}/health`);
  assert.equal(backendHealth.status, 'ok');

  const driver = await buildDriver();
  try {
    await driver.get(FRONTEND_URL);
    await driver.wait(until.elementLocated(By.css('body')), 30000);

    const pageSource = await driver.getPageSource();
    assert.match(pageSource, /LexAI|LexVault|MyApp/i, 'Expected the Expo web app to render a visible shell');

    const bodyText = await driver.executeScript('return document.body.innerText || ""');
    assert.ok(bodyText.trim().length > 0, 'Expected the web app to render visible body content');

    const email = `selenium-${Date.now()}@example.com`;
    const register = await jsonRequest(`${VAULT_URL}/vault/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Selenium User',
        email,
        password: 'password123',
        role: 'advocate',
        barNumber: 'BAR-SEL-001',
      }),
    });
    assert.equal(register.ok, true, `Expected vault register to succeed: ${register.text}`);

    const login = await jsonRequest(`${VAULT_URL}/vault/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    });
    assert.equal(login.ok, true, `Expected vault login to succeed: ${login.text}`);

    const loginData = JSON.parse(login.text);
    assert.ok(loginData.token, 'Expected login to return a token');

    const createCase = await jsonRequest(`${VAULT_URL}/vault/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginData.token}`,
      },
      body: JSON.stringify({
        title: 'Selenium Smoke Case',
        caseType: 'civil',
        clientName: 'Client Smoke',
      }),
    });
    assert.equal(createCase.ok, true, `Expected vault case creation to succeed: ${createCase.text}`);

    const caseData = JSON.parse(createCase.text);
    assert.equal(caseData.case.title, 'Selenium Smoke Case');

    console.log('Selenium smoke passed');
  } finally {
    await driver.quit();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});