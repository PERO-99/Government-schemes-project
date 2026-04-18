# ✅ ReadyRight — Current Status

## Localhost

- App: http://localhost:8080/
- Health check: http://localhost:8080/api/health

Run:

```bash
npm install
npm start
```

## Confirmed working (localhost)

- Static serving from backend: `/`, `/styles.css`, `/script.js` return `200`
- API health: `/api/health` returns `{ ok: true, time: ... }`
- Schemes: `/api/schemes`, `/api/schemes/trending`, `/api/schemes/recommended`
- Eligibility flow: create session → answer questions → result + checklist
- Reviews: list + submit review per scheme
- Reports: flag scheme as suspicious (trust badge updates)
- Notifications: SSE stream (`/api/stream`) emits periodic notifications

## Data + privacy (prototype)

- Profile is stored in the session by default.
- Profile is persisted only if `consentToSave` is checked.
- Reviews/reports/seed schemes are stored in a local JSON file (`server/data/db.json`).

## VS Code

A Chrome debug/launch config already points to `http://localhost:8080` in `.vscode/launch.json`.

_Last updated: April 2026_
