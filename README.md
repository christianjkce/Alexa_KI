# Alexa_KI

Backend und Web-App fuer den Alexa Skill "K.I.".

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
