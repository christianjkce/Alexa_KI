# Alexa_KI

[![Repository](https://img.shields.io/badge/repo-private-lightgrey)](https://github.com/christianjkce/Alexa_KI)
[![CI](https://github.com/christianjkce/Alexa_KI/actions/workflows/ci.yml/badge.svg)](https://github.com/christianjkce/Alexa_KI/actions/workflows/ci.yml)

## Quick Links
- Playbook: `docs/Playbook.md`
- Deployment: `docs/deploy.md`
- Testing: `docs/testing.md`
- Alexa Model: `skill-package/interactionModels/custom/de-DE.json`

## Features
- Alexa Skill Backend mit Account Linking
- Web-App fuer Nutzerverwaltung und Admin-Panel
- LLM Routing inkl. Live-Daten via Perplexity
- Docker Setup (App, Postgres, Caddy)
- Täglicher Log-Report mit Handlungsempfehlungen

Backend und Web-App fuer den Alexa Skill "KI".

## Inhalte
- Alexa Skill Endpoint (Node.js)
- Web-App (Login, Account-Linking, Admin)
- Docker Setup (App, Postgres, Caddy)
- Skripte fuer Log-Reports

## Schnellstart (lokal)
```bash
cp .env.example .env
docker compose up -d --build
```

## Wichtige Pfade
- Server: `src/server.js`
- Skill Model: `skill-package/interactionModels/custom/de-DE.json`
- Playbook: `docs/Playbook.md`

## Konfiguration
Alle Secrets gehoeren in `.env` (nicht commiten).
Beispiele: `.env.example`, `.env.production.example`

## Betrieb
Rebuild:
```bash
docker compose up -d --build
```

Logs:
```bash
docker compose logs --since=24h app
```

## Lizenz
Proprietary.
