# Playbook: Alexa_KI

## Purpose
This repository powers the Alexa skill “K.I.” plus the supporting web app,
admin panel, and background tooling.

## Architecture Overview
- `src/server.js`: Main HTTP server (Alexa skill endpoint + web app + OAuth)
- `postgres` (Docker): User data, usage, event logs
- `caddy` (Docker): HTTPS proxy
- `scripts/`: Scheduled maintenance + daily log report
- `skill-package/`: Alexa interaction model + metadata

## Services (Docker)
Defined in `docker-compose.yml`:
- `app`: Node.js server
- `db`: Postgres 15
- `proxy`: Caddy

Start/stop:
```bash
docker compose up -d
docker compose down
```

Rebuild:
```bash
docker compose up -d --build
```

## Environments & Secrets
Never commit secrets.
- `.env`: local runtime config (ignored)
- `.env.example`: template
- `.env.production.example`: production template

Key variables (examples; see `.env.example`):
- Alexa: `ALEXA_CLIENT_ID`, `ALEXA_CLIENT_SECRET`, `ALEXA_REDIRECT_URI(S)`
- LLM: `STRAICO_API_KEY`, `PERPLEXITY_API_KEY`
- SMTP: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`

## Alexa Skill Flow
1) User invokes skill  
2) Skill routes request to LLM (Straico / Perplexity)  
3) If long response: skill asks “Möchtest du warten?” and resumes async reply  

## Web App & OAuth
- `/login`: user login
- `/oauth/authorize`: account linking flow
- `/admin`: admin dashboard

## Logging & Reports
Daily report script:
```bash
node scripts/daily-log-report.js
```
Writes to `logs/daily-log-report-YYYYMMDD.txt` and emails summary.

## Ops Checklists
### If “No response / timeout”
- Check `logs/` for `LLM timeout` and `Straico request failed`
- Verify LLM timeouts are below Alexa response budget
- Ensure pending response flow returns “Möchtest du warten?”

### If Account Linking fails
- Check `ALEXA_CLIENT_ID/SECRET/REDIRECT_URI`
- Check login errors in logs (`Authorize invalid credentials`)

### If Perplexity live data fails
- Check `PERPLEXITY_API_KEY`
- Verify `PERPLEXITY_TIMEOUT_MS`

## Release Checklist
- Update `.env` (secrets) on server
- `docker compose up -d --build`
- Smoke test: Alexa invocation, account linking, weather/news, admin login

## Data & Privacy
- No secrets or user data in repo
- `data/` and `logs/` are local only and ignored by git
