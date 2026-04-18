# ✅ ReadyRight — Fully Functional Guide (Localhost)

This guide matches the current backend-driven ReadyRight app.

## Start the app

```bash
npm install
npm start
```

Open: http://localhost:8080/

## Feature walkthrough

### 1) Home (schemes)

- Schemes load from the backend (`/api/schemes`).
- Search filters schemes as you type.
- Tap a category chip to filter.
- Trending/Recent/Recommended rows are clickable.

### 2) Scheme details (expandable)

- Tap “Details” on a scheme card.
- You’ll see:
  - benefits + eligibility summary
  - official link (when available)
  - reviews list
  - add review form
  - report suspicious scheme form

### 3) Profile (consent-based)

- Tap “Your profile”.
- Fill the profile fields.
- If you check “Save my profile on this device”, the backend persists it.
- If you don’t consent, the profile is stored in the session only.

### 4) Eligibility check

- Tap “Check eligibility”.
- Answer questions one by one.
- You’ll get:
  - status: `ready` / `needs_fix` / `not_eligible`
  - confidence
  - reasons / missing requirements (when applicable)
- Open “Checklist & guidance” for documents + next steps.

### 5) Notifications (simulated real-time)

- Leave the page open for ~15 seconds.
- Toast notifications appear from the SSE stream (`/api/stream`).

## Troubleshooting

- If the page is blank: ensure `npm start` is running and open http://localhost:8080/
- If eligibility answers return `Forbidden` in scripts: that’s because sessions require cookies (browser works normally).
- If voice features don’t work: Web Speech APIs depend on the browser (Chrome usually works best).

_Last updated: April 2026_
