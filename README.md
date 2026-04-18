# ReadyRight

ReadyRight is a localhost web app (UI + backend APIs) that helps users:
- browse government schemes
- run an eligibility check (guided question flow)
- get a checklist of documents + next steps
- see trust badges (official/verified/suspicious)
- submit reviews and community reports
- receive simulated real-time notifications (SSE)

## Run on localhost

1) Install dependencies

```bash
npm install
```

2) Start the server

```bash
npm start
```

3) Open the app

- App: http://localhost:8080/
- Health: http://localhost:8080/api/health

VS Code: you can use the Chrome launch config in `.vscode/launch.json`.

## What’s working

- Home: schemes list (search + category filter), trending/recommended rows
- Profile: stored in session; persisted only if consent is checked
- Eligibility: Home → Questions → Result → Checklist (all API-driven)
- Scheme details: expandable details + official link + reviews + report
- Voice: text-to-speech for questions/results; speech-to-text for search and answers (browser dependent)
- Notifications: SSE stream emits toast notifications every ~15s

## Project structure

- Backend: `server/index.js`
- Frontend: `index.html`, `styles.css`, `script.js`
- Local JSON DB: `server/data/db.json`

## Notes

- Port defaults to `8080` (set `PORT` env var to change).
- This is a prototype-style implementation: data is stored locally (JSON file) and sessions are cookie-based.
