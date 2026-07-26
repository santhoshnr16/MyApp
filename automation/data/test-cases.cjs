const { repoSlug } = require('../config.cjs');

const SELENIUM_PAGES = [
  { module: 'Home', path: '/', anchor: 'Smart counsel for every document.', checks: ['LEXAI', 'DraftCounsel', 'Upload PDF'] },
  { module: 'Upload', path: '/upload', anchor: 'Analyse Document', checks: ['DOCUMENT ANALYSIS', 'Browse Files', 'Analyse Document'] },
  { module: 'Vault', path: '/vault', anchor: 'LexVault', checks: ['Secure document vault for legal professionals', 'Sign In', 'Create Account'] },
  { module: 'Moot', path: '/moot', anchor: 'LexAI Moot', checks: ['AI Moot Court Simulator', 'CHOOSE A DOCUMENT TO ARGUE', 'Upload Document'] },
  { module: 'Explore', path: '/explore', anchor: 'Explore', checks: ['File-based routing', 'Android, iOS, and web support', 'Learn more'] },
];

const VIEWPORTS = [
  { label: 'desktop-xl', width: 1600, height: 1200 },
  { label: 'desktop-lg', width: 1440, height: 1024 },
  { label: 'desktop-md', width: 1280, height: 960 },
  { label: 'tablet-landscape', width: 1024, height: 768 },
  { label: 'tablet-portrait', width: 820, height: 1180 },
  { label: 'mobile-large', width: 430, height: 932 },
];

function makeCaseId(prefix, index) {
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

function createCaseRecord({ suite, id, module, title, route, priority, viewport, assertion, preconditions, steps, expectedResult, status }) {
  return {
    suite,
    testCaseId: id,
    module,
    title,
    route,
    priority,
    viewport,
    assertion,
    preconditions,
    steps,
    expectedResult,
    actualResult: '',
    status,
    repository: repoSlug(),
  };
}

function createSeleniumCases() {
  const cases = [];
  let index = 1;
  for (const page of SELENIUM_PAGES) {
    for (let variant = 1; variant <= 60; variant += 1) {
      const viewport = VIEWPORTS[(variant + index) % VIEWPORTS.length];
      const check = page.checks[variant % page.checks.length];
      const assertion = variant % 4 === 0 ? 'console-clean' : variant % 3 === 0 ? 'visibility' : variant % 2 === 0 ? 'text-presence' : 'navigation';
      cases.push(createCaseRecord({
        suite: 'selenium',
        id: makeCaseId('SEL', index),
        module: page.module,
        title: `${page.module} ${assertion} check ${variant}`,
        route: page.path,
        priority: variant <= 10 ? 'P1' : variant <= 30 ? 'P2' : 'P3',
        viewport,
        assertion,
        preconditions: 'The live GitHub Pages deployment is reachable via BASE_URL.',
        steps: [
          `Open the live route ${page.path} using BASE_URL.`,
          `Verify the page anchor text ${page.anchor}.`,
          `Confirm the expected UI cue ${check}.`,
        ],
        expectedResult: `The ${page.module} page renders correctly at ${viewport.label} and shows ${check}.`,
        status: 'NOT_RUN',
      }));
      index += 1;
    }
  }
  return cases;
}

function createPlannedCases(prefix, suite, modules, perModule) {
  const cases = [];
  let index = 1;
  for (const module of modules) {
    for (let variant = 1; variant <= perModule; variant += 1) {
      const action = variant % 4 === 0 ? 'negative-path' : variant % 3 === 0 ? 'boundary' : variant % 2 === 0 ? 'smoke' : 'workflow';
      cases.push(createCaseRecord({
        suite,
        id: makeCaseId(prefix, index),
        module,
        title: `${module} ${action} scenario ${variant}`,
        route: '/',
        priority: variant <= 10 ? 'P1' : variant <= 30 ? 'P2' : 'P3',
        viewport: VIEWPORTS[variant % VIEWPORTS.length],
        assertion: action,
        preconditions: `Representative ${suite} coverage against the live deployment baseline.`,
        steps: [
          `Review the ${module} scenario.`,
          `Execute the ${action} check.`,
          'Capture evidence and store the outcome.',
        ],
        expectedResult: `The ${module} ${action} scenario completes with an auditable result record.`,
        status: 'PLANNED',
      }));
      index += 1;
    }
  }
  return cases;
}

function createAllTestCases() {
  return {
    selenium: createSeleniumCases(),
    appium: createPlannedCases('APP', 'appium', ['Authentication', 'Authorization', 'Navigation', 'UI Validation', 'Forms', 'CRUD Operations'], 50),
    vulnerability: createPlannedCases('VUL', 'vulnerability', ['OWASP Top 10', 'Authentication', 'Authorization', 'Input Validation', 'Session Management', 'Transport Security'], 50),
    load: createPlannedCases('LOAD', 'load', ['Baseline', 'Ramp Up', 'Peak', 'Spike', 'Stress', 'Endurance'], 50),
  };
}

module.exports = {
  SELENIUM_PAGES,
  VIEWPORTS,
  createSeleniumCases,
  createPlannedCases,
  createAllTestCases,
};
