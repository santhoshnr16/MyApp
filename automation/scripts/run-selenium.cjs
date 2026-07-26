const fs = require('node:fs/promises');
const path = require('node:path');
const { logging } = require('selenium-webdriver');
const { requiredBaseUrl, reportsRoot, screenshotsRoot, logsRoot, runStamp } = require('../config.cjs');
const { createSeleniumCases } = require('../data/test-cases.cjs');
const { HomePage, UploadPage, VaultPage, MootPage, ExplorePage } = require('../pages.cjs');
const { ensureAutomationDirs, createChromeDriver, writeJson, writeText } = require('../utils.cjs');

function pageFor(route, driver, baseUrl) {
  const map = {
    '/': new HomePage(driver, baseUrl),
    '/upload': new UploadPage(driver, baseUrl),
    '/vault': new VaultPage(driver, baseUrl),
    '/moot': new MootPage(driver, baseUrl),
    '/explore': new ExplorePage(driver, baseUrl),
  };
  return map[route] || new HomePage(driver, baseUrl);
}

async function collectConsoleLogs(driver) {
  const entries = await driver.manage().logs().get(logging.Type.BROWSER).catch(() => []);
  return entries.map((entry) => ({ level: entry.level.name, message: entry.message, timestamp: entry.timestamp }));
}

async function runCase(driver, baseUrl, testCase) {
  const page = pageFor(testCase.route, driver, baseUrl);
  const start = Date.now();
  const result = {
    ...testCase,
    status: 'FAILED',
    actualResult: '',
    failureReason: '',
    executionTimeMs: 0,
    screenshotFile: '',
    consoleLogs: [],
    stackTrace: '',
  };

  try {
    await driver.manage().window().setRect({ width: testCase.viewport.width, height: testCase.viewport.height, x: 0, y: 0 });
    await page.open(testCase.route);
    await page.verify();

    result.status = 'PASSED';
    result.actualResult = `Verified ${testCase.module} on ${testCase.viewport.label}.`;
    return result;
  } catch (error) {
    result.failureReason = error.message;
    result.stackTrace = error.stack;
    const screenshotDir = path.join(screenshotsRoot(), 'selenium');
    await fs.mkdir(screenshotDir, { recursive: true });
    result.screenshotFile = path.join(screenshotDir, `${testCase.testCaseId}.png`);
    try {
      await page.takeScreenshot(result.screenshotFile);
    } catch {
      result.screenshotFile = '';
    }
    result.consoleLogs = await collectConsoleLogs(driver);
    result.actualResult = `Captured failure evidence for ${testCase.testCaseId}.`;
    return result;
  } finally {
    result.executionTimeMs = Date.now() - start;
  }
}

async function main() {
  await ensureAutomationDirs();
  const baseUrl = requiredBaseUrl();
  const driver = createChromeDriver();
  const tests = createSeleniumCases();
  const results = [];
  const logsDir = path.join(logsRoot(), 'selenium');
  await fs.mkdir(logsDir, { recursive: true });

  try {
    for (const testCase of tests) {
      const result = await runCase(driver, baseUrl, testCase);
      results.push(result);
      console.log(`${result.testCaseId}: ${result.status}`);
    }
  } finally {
    const browserLogs = await collectConsoleLogs(driver).catch(() => []);
    await driver.quit().catch(() => {});
    await writeJson(path.join(reportsRoot(), 'selenium', 'execution-results.json'), {
      suite: 'selenium',
      baseUrl,
      runStamp: runStamp(),
      results,
      browserLogs,
    });
    await writeText(path.join(logsDir, 'selenium-run.log'), results.map((row) => `${row.testCaseId},${row.status},${row.executionTimeMs}`).join('\n'));
  }

  const failedCount = results.filter((row) => row.status === 'FAILED').length;
  const executedCount = results.length;
  const passRate = executedCount ? ((executedCount - failedCount) / executedCount) * 100 : 0;
  if (failedCount > Math.floor(executedCount * 0.05)) {
    throw new Error(`Selenium pass rate ${passRate.toFixed(2)}% fell below the 95% threshold.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
