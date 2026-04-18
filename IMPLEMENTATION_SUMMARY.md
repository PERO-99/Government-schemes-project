# ReadyRight — Implementation Summary

## Architecture

- Backend: Node.js + Express server serving both static UI assets and JSON APIs.
- Frontend: vanilla SPA (HTML/CSS/JS) that calls the backend APIs.
- Storage: local JSON file DB for this prototype (`server/data/db.json`).
- Sessions: cookie-based sessions via `express-session`.
- Real-time simulation: Server-Sent Events (SSE) via `/api/stream`.

## Run

```bash
npm install
npm start
```

Open: http://localhost:8080/

## Key backend routes

- `GET /api/health`
- `GET /api/config`
- `GET /api/profile`, `PUT /api/profile`
- `GET /api/schemes`
- `GET /api/schemes/trending`
- `GET /api/schemes/recommended`
- `GET /api/schemes/:id`
- `GET /api/schemes/:id/reviews`, `POST /api/schemes/:id/reviews`
- `POST /api/schemes/:id/report`
- `POST /api/eligibility/sessions`
- `POST /api/eligibility/sessions/:id/answer`
- `GET /api/stream` (SSE)

## Frontend flow

- Home screen loads config + schemes lists and renders cards.
- “Details” expands inline to show official link, reviews, and report UI.
- “Check eligibility” starts a backend eligibility session, then steps through questions.
- Result screen shows status + confidence + reasons.
- Checklist screen shows docs + steps + official link.

_Last updated: April 2026_
