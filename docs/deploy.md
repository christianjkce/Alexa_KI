## Deployment (Production)

### 1) Environment vorbereiten
- Kopiere `.env.production.example` nach `.env` oder `.env.production` und fülle alle Werte:
  - `APP_HOST`: öffentlicher FQDN, z. B. `alexa.example.com`
  - `ACME_EMAIL`: für Caddy/Let’s Encrypt
  - Alexa-Creds (`ALEXA_CLIENT_ID/SECRET`, `ALEXA_REDIRECT_URI`)
  - Crok-Creds (`CROK_API_BASE`, `CROK_API_KEY`, `CROK_CLIENT_ID/SECRET`, Pfade/Timeout nach Bedarf)
  - `SESSION_SECRET`, `ADMIN_PASS` anpassen
  - `DISABLE_ALEXA_SIGNATURE_VALIDATION` auf `false` lassen
  - DB-Variablen für Postgres (werden von docker-compose erwartet, die App nutzt aktuell den FS-Token-Store)

Hinweis zu Alexa Redirect URIs:
- Die Alexa Developer Console zeigt dir mehrere Redirect-URLs an (Regionen: z. B. pitangui/layla).
- Trage alle in `ALEXA_REDIRECT_URIS` (kommagetrennt) ein und optional eine einzelne in `ALEXA_REDIRECT_URI`.
  Beispiel: `ALEXA_REDIRECT_URIS=https://pitangui.amazon.com/api/skill/link/<skill-id>,https://layla.amazon.com/api/skill/link/<skill-id>`

### 2) Starten

```
docker compose up -d --build
```

Hinweis: Caddy läuft als Reverse Proxy mit TLS (Let’s Encrypt) und leitet auf den App-Service (`app:3000`) weiter. Healthcheck: `/health`.

### 3) Logs / Diagnose
- App-Logs: `docker compose logs -f app`
- Proxy-Logs: `docker compose logs -f proxy` (Access-Log in `./logs/caddy`)

### 4) Test
- `curl -H "Host: ${APP_HOST}" https://APP_HOST/health` (oder lokal via Port-Forward)
- Alexa-Endpoint: `POST https://APP_HOST/alexa` mit echten Alexa-Signaturen (Prod: Signatur-Validation an)

### 5) Härten
- Admin-Default-Passwort ändern und nur per HTTPS erreichbar machen
- Token-Store-Volume (`./data`) sichern/backuppen
- Optional Rate-Limits / zusätzliche Auth für Admin-UI vor Proxy schalten
