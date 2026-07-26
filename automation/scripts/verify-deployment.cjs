const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { requiredBaseUrl, reportsRoot } = require('../config.cjs');
const { ensureAutomationDirs, writeJson, writeText } = require('../utils.cjs');

async function fetchWithTimeout(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

async function verifyOnce(baseUrl) {
  const response = await fetchWithTimeout(baseUrl);
  const html = await response.text();
  const cssUrls = [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["']/gi)].map((match) => match[1]);
  const jsUrls = [...html.matchAll(/<script[^>]+src=["']([^"']+\.js[^"']*)["']/gi)].map((match) => match[1]);

  const assetResults = [];
  for (const asset of [...cssUrls, ...jsUrls]) {
    const assetUrl = new URL(asset, baseUrl).toString();
    const assetResponse = await fetchWithTimeout(assetUrl);
    assetResults.push({ assetUrl, status: assetResponse.status, ok: assetResponse.ok });
  }

  const diagnostics = {
    baseUrl,
    status: response.status,
    ok: response.ok,
    htmlLength: html.length,
    cssAssets: cssUrls.length,
    jsAssets: jsUrls.length,
    assetResults,
    timestamp: new Date().toISOString(),
  };

  const deploymentLooksHealthy = response.ok && assetResults.every((asset) => asset.ok);
  return { diagnostics, deploymentLooksHealthy };
}

async function main() {
  await ensureAutomationDirs();
  const baseUrl = requiredBaseUrl();
  const waitMode = process.argv.includes('--wait');

  let attempt = 0;
  let result;
  do {
    attempt += 1;
    result = await verifyOnce(baseUrl);
    if (result.deploymentLooksHealthy) {
      break;
    }
    if (!waitMode || attempt >= 30) {
      break;
    }
    await delay(10000);
  } while (true);

  const reportDir = path.join(reportsRoot(), 'selenium');
  await writeJson(path.join(reportDir, 'deployment-diagnostics.json'), result.diagnostics);
  await writeText(path.join(reportDir, 'deployment-status.txt'), JSON.stringify(result.diagnostics, null, 2));

  if (!result.deploymentLooksHealthy) {
    throw new Error(`Deployment verification failed for ${baseUrl}`);
  }

  console.log(`Deployment verified at ${baseUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
