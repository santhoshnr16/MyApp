# Selenium Smoke Tests

Run the app first, then execute the smoke test against the local servers.

## Defaults

- Frontend: `http://localhost:8081`
- Backend: `http://localhost:3001`

## Run

```bash
cd e2e
npm run smoke
```

## Optional overrides

- `E2E_FRONTEND_URL`
- `E2E_BACKEND_URL`