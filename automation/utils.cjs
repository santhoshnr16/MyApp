const fs = require('node:fs/promises');
const path = require('node:path');
const { Builder, logging } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const ExcelJS = require('exceljs');
const { logsRoot, reportsRoot, screenshotsRoot, runStamp } = require('./config.cjs');

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
  return dirPath;
}

async function ensureAutomationDirs() {
  await Promise.all([
    ensureDir(reportsRoot()),
    ensureDir(screenshotsRoot()),
    ensureDir(logsRoot()),
  ]);
}

function createChromeDriver() {
  const options = new chrome.Options()
    .addArguments(
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,1200'
    );

  const prefs = new logging.Preferences();
  prefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);

  return new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .setLoggingPrefs(prefs)
    .build();
}

async function writeJson(filePath, payload) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function writeText(filePath, contents) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, contents, 'utf8');
}

async function writeExcel(filePath, cases, suiteName) {
  await ensureDir(path.dirname(filePath));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GitHub Copilot';
  workbook.created = new Date();

  const executed = workbook.addWorksheet('Executed Test Cases');
  executed.columns = [
    { header: 'Test ID', key: 'testCaseId', width: 16 },
    { header: 'Module', key: 'module', width: 24 },
    { header: 'Test Name', key: 'title', width: 36 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Execution Time', key: 'executionTimeMs', width: 18 },
    { header: 'Priority', key: 'priority', width: 12 },
  ];

  const passed = workbook.addWorksheet('Passed Tests');
  const failed = workbook.addWorksheet('Failed Tests');
  const skipped = workbook.addWorksheet('Skipped Tests');
  const metrics = workbook.addWorksheet('Execution Metrics');
  const defectSummary = workbook.addWorksheet('Defect Summary');

  for (const row of cases) {
    executed.addRow(row);
  }

  const statusBuckets = {
    PASSED: cases.filter((row) => row.status === 'PASSED'),
    FAILED: cases.filter((row) => row.status === 'FAILED'),
    SKIPPED: cases.filter((row) => row.status === 'SKIPPED'),
    PLANNED: cases.filter((row) => row.status === 'PLANNED'),
    NOT_RUN: cases.filter((row) => row.status === 'NOT_RUN'),
  };

  for (const sheet of [passed, failed, skipped]) {
    sheet.columns = executed.columns;
  }

  for (const row of statusBuckets.PASSED) passed.addRow(row);
  for (const row of statusBuckets.FAILED) failed.addRow(row);
  for (const row of statusBuckets.SKIPPED) skipped.addRow(row);

  const executedCount = cases.filter((row) => ['PASSED', 'FAILED', 'SKIPPED'].includes(row.status)).length;
  const passCount = statusBuckets.PASSED.length;
  const failCount = statusBuckets.FAILED.length;
  const skippedCount = statusBuckets.SKIPPED.length;
  const plannedCount = statusBuckets.PLANNED.length + statusBuckets.NOT_RUN.length;
  const passRate = executedCount ? ((passCount / executedCount) * 100).toFixed(2) : '0.00';

  metrics.columns = [
    { header: 'Metric', key: 'metric', width: 28 },
    { header: 'Value', key: 'value', width: 18 },
  ];
  metrics.addRows([
    { metric: 'Suite', value: suiteName },
    { metric: 'Run Stamp', value: runStamp() },
    { metric: 'Total Cases', value: cases.length },
    { metric: 'Executed', value: executedCount },
    { metric: 'Passed', value: passCount },
    { metric: 'Failed', value: failCount },
    { metric: 'Skipped', value: skippedCount },
    { metric: 'Planned or Not Run', value: plannedCount },
    { metric: 'Pass Percentage', value: `${passRate}%` },
  ]);

  defectSummary.columns = [
    { header: 'Module', key: 'module', width: 24 },
    { header: 'Failed Cases', key: 'failedCases', width: 18 },
    { header: 'Top Failure Reason', key: 'reason', width: 48 },
  ];

  const failureByModule = new Map();
  for (const row of cases.filter((caseRow) => caseRow.status === 'FAILED')) {
    const bucket = failureByModule.get(row.module) || { count: 0, reason: row.failureReason || 'Unknown' };
    bucket.count += 1;
    bucket.reason = row.failureReason || bucket.reason;
    failureByModule.set(row.module, bucket);
  }

  if (failureByModule.size === 0) {
    defectSummary.addRow({ module: 'None', failedCases: 0, reason: 'No failures captured for this run.' });
  } else {
    for (const [module, details] of failureByModule.entries()) {
      defectSummary.addRow({ module, failedCases: details.count, reason: details.reason });
    }
  }

  await workbook.xlsx.writeFile(filePath);
  return { executedCount, passCount, failCount, skippedCount, passRate };
}

async function writeHtml(filePath, { title, headline, metrics, cases, screenshots = [], notes = [] }) {
  await ensureDir(path.dirname(filePath));
  const tableRows = cases.map((row) => `
      <tr>
        <td>${row.testCaseId}</td>
        <td>${row.module}</td>
        <td>${row.title}</td>
        <td>${row.status}</td>
        <td>${row.priority}</td>
      </tr>`).join('');

  const screenshotList = screenshots.map((entry) => `<li><a href="${entry.file}">${entry.label}</a></li>`).join('');
  const noteList = notes.map((note) => `<li>${note}</li>`).join('');

  const body = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .card { background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: 0 8px 30px rgba(15,23,42,.08); }
    h1, h2 { margin-top: 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #e2e8f0; text-align: left; padding: 10px 8px; font-size: 14px; }
    th { background: #e0f2fe; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
    .metric { background: linear-gradient(180deg, #eff6ff, #ffffff); border: 1px solid #bfdbfe; border-radius: 14px; padding: 14px; }
    .metric span { display: block; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: .08em; }
    .metric strong { font-size: 22px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${headline}</h1>
    <div class="metrics">${Object.entries(metrics).map(([key, value]) => `<div class="metric"><span>${key}</span><strong>${value}</strong></div>`).join('')}</div>
  </div>
  <div class="card">
    <h2>Failure and Execution Notes</h2>
    <ul>${noteList}</ul>
  </div>
  <div class="card">
    <h2>Evidence</h2>
    <ul>${screenshotList}</ul>
  </div>
  <div class="card">
    <h2>Execution Table</h2>
    <table>
      <thead><tr><th>Test ID</th><th>Module</th><th>Test Name</th><th>Status</th><th>Priority</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>
</body>
</html>`;

  await fs.writeFile(filePath, body, 'utf8');
}

module.exports = {
  ensureDir,
  ensureAutomationDirs,
  createChromeDriver,
  writeJson,
  writeText,
  writeExcel,
  writeHtml,
};
