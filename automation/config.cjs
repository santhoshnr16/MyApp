const path = require('node:path');

function workspaceRoot() {
  return path.resolve(__dirname, '..');
}

function requiredBaseUrl() {
  const raw = (process.env.BASE_URL || '').trim();
  if (!raw) {
    throw new Error('BASE_URL is required and must point to the live GitHub Pages deployment.');
  }
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(raw)) {
    throw new Error('BASE_URL must not use localhost or any local development server.');
  }
  return raw.endsWith('/') ? raw : `${raw}/`;
}

function repoSlug() {
  return process.env.GITHUB_REPOSITORY || 'local/myapp';
}

function runStamp() {
  return (
    process.env.GITHUB_RUN_ID ||
    process.env.GITHUB_RUN_NUMBER ||
    new Date().toISOString().replace(/[:.]/g, '-')
  );
}

function reportsRoot() {
  return path.join(workspaceRoot(), 'automation', 'reports');
}

function screenshotsRoot() {
  return path.join(workspaceRoot(), 'automation', 'screenshots');
}

function logsRoot() {
  return path.join(workspaceRoot(), 'automation', 'logs');
}

module.exports = {
  workspaceRoot,
  requiredBaseUrl,
  repoSlug,
  runStamp,
  reportsRoot,
  screenshotsRoot,
  logsRoot,
};
