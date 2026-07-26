# Automation Bundle

This folder contains the live-deployment testing and reporting bundle for the Expo web export.

## What it does

- Builds the app for GitHub Pages.
- Verifies that the deployed Pages site responds with HTTP 200 and loads CSS/JS assets.
- Runs Selenium E2E tests only against the live Pages deployment.
- Generates Selenium, Appium, Vulnerability, and Load report bundles with 300 unique cases per suite.
- Writes Excel, HTML, JSON, log, screenshot, and Markdown evidence files.

## Environment

- `BASE_URL` is required and must point to the live GitHub Pages deployment.
- `BASE_URL` must not use `localhost` or any local development host.
- The workflow computes `BASE_URL` from the GitHub repository owner and repository name.

## Local execution

```bash
cd front-end/MyApp
npm ci
BASE_URL=https://username.github.io/repository-name/ npm run automation:verify
BASE_URL=https://username.github.io/repository-name/ npm run automation:selenium
BASE_URL=https://username.github.io/repository-name/ npm run automation:reports
```

## CI/CD execution

- Pushes to `main` and `master` build the static Expo web export.
- GitHub Pages deployment runs on non-PR events.
- Live Selenium runs only after deployment verification succeeds.
- Artifacts are uploaded for 30 days.
- Repository settings must have GitHub Pages enabled with source set to GitHub Actions, or the deploy step will fail with HTTP 404.
- If Pages is not already enabled, add a repository secret named `PAGES_ENABLEMENT_TOKEN` containing a PAT with `repo` scope so `actions/configure-pages` can enable the site automatically.

## Troubleshooting

- If deployment verification fails, confirm the Pages source branch and build output path.
- If Selenium fails immediately, confirm Chrome is installed in the runner and `BASE_URL` is correct.
- If reports are empty, make sure `automation:selenium` completed before `automation:reports`.
