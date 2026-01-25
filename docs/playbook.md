## Betrieb / Neustart-Playbook

Ziel: Nach Reboot oder Unterbrechung den Alexa/Straico-Stack wieder aufnehmen.

### Aktueller Stand
- Skill nutzt Straico als Chat-Backend; Modellwahl erfolgt per festem Routing (kein Auto-Selector).
- Intent/Szenario-Classifier ist regelbasiert (kein zusaetzlicher LLM-Call).
- Lange Antworten werden in Teile aufgeteilt; nach jedem Teil wird “Soll ich mit Teil X weitermachen?” angeboten.
- Verlauf wird pro User gespeichert und automatisch wiederhergestellt (60 Sekunden nach Neustart).
- Autorisierungs- und Login-Seiten sind responsiv und auf “KI for you” gestaltet.

### 1) Umgebung
- Projektpfad: `/home/ubuntu`
- Env-Datei: `.env` (bereits angelegt)
  - `APP_HOST=<host>`
  - `APP_BASE_URL=<https-url>`
  - `PORT=3000`
  - `ACME_EMAIL=<ops-email>`
  - `ADMIN_DEFAULT_USER=admin`
  - `ADMIN_PASS=<redacted>
  - `SESSION_SECRET=<set-secret>`
  - `JWT_SECRET=<set-secret>`
  - `ALEXA_CLIENT_ID=<from-console>`
  - `ALEXA_CLIENT_SECRET=<from-console>`
  - `ALEXA_REDIRECT_URI=<from-console>`
  - `ALEXA_REDIRECT_URIS=<from-console,comma-separated>`
  - `CROK_REQUEST_TIMEOUT_MS=15000`
  - `CROK_CHAT_MODE=straico`
  - `STRAICO_API_KEY=<set-secret>`
  - `STRAICO_API_BASE=https://api.straico.com`
  - `STRAICO_CHAT_PATH=/v2/chat/completions`
  - `STRAICO_CHAT_MODEL=openai/gpt-5.1`
  - `STRAICO_CHAT_SELECTOR=` (leer)
  - `STRAICO_MAX_TOKENS_SHORT=160`
  - `STRAICO_MAX_TOKENS_LONG=900`
  - `STRAICO_MAX_TOKENS_LONG_CHUNK=400`
  - `STRAICO_LONG_CHUNK_MAX_CHARS=1200`
  - `STRAICO_LONG_CHUNK_MODEL=x-ai/grok-4-fast`
  - `STRAICO_FALLBACK_MODEL=openai/gpt-5.1`
  - Routing-Modelle:
    - `STRAICO_MODEL_GPT_FULL=openai/gpt-5`
    - `STRAICO_MODEL_GPT_MINI=openai/gpt-5-mini`
    - `STRAICO_MODEL_GPT_NANO=openai/gpt-5-nano`
    - `STRAICO_MODEL_GEMINI_FLASH=google/gemini-2.5-flash`
    - `STRAICO_MODEL_CLAUDE_SONNET=anthropic/claude-sonnet-4.5`
    - `STRAICO_MODEL_GROK_FAST=x-ai/grok-4-fast`
  - `TOKEN_STORE_PATH=./data/token-store.json`
  - `CONVERSATION_STORE_PATH=./data/conversation-store.json`
  - `DISABLE_ALEXA_SIGNATURE_VALIDATION=0`
  - Postgres: `POSTGRES_USER=<user>`, `POSTGRES_PASSWORD=<set-secret>`, `POSTGRES_DB=app`

### 2) Stack starten (nach Reboot)
```bash
cd /home/ubuntu
sudo docker compose up -d --build
```

### 3) Status / Logs prüfen
```bash
sudo docker compose ps
sudo docker compose logs -f app
sudo docker compose logs -f proxy
```

### 4) Healthcheck
```bash
curl -H "Host: ga.ce1doc.jkce.de" https://ga.ce1doc.jkce.de/health
# Erwartet: {"status":"ok"}
```

### 5) Alexa-Skill Einrichtung (Developer Console)
- Endpoint: `https://ga.ce1doc.jkce.de/alexa`
- Account Linking: Auth-Code-Grant, Client-ID/Secret aus der Console verwenden
- Redirect-URIs: exakt aus der Console übernehmen und in `ALEXA_REDIRECT_URIS` eintragen (kommagetrennt).

### 6) Produktiver Test
1. Account Linking in der Alexa-App/Console durchführen.
2. Skill aufrufen: “Öffne <Skillname>”.
3. Chat: “Sag <Skillname> erzähle eine Geschichte”.
4. Bei Fehlern:
   - `invalid_signature`: Signaturprüfung aktiv lassen (`DISABLE_ALEXA_SIGNATURE_VALIDATION=0`), Alexa-Header prüfen.
   - `invalid_redirect_uri`: URIs zwischen Console und Env abgleichen.
   - Straico-Fehler: `STRAICO_API_KEY`/Netzwerk prüfen.

### 6b) Unterhaltung wiederherstellen
Sag: “frühere Unterhaltung fortführen” oder “letzte Unterhaltung fortführen”.

### 6c) Automatische Wiederaufnahme
Wenn der Skill innerhalb von 60 Sekunden nach “Alexa, Stopp” erneut gestartet wird, wird die letzte Unterhaltung automatisch geladen.

### 6d) Routing-Logik (Kurzuebersicht)
- FACT_SHORT → Gemini Flash
- EXPLAIN / HOWTO_SIMPLE → GPT-5 mini
- RECOMMEND / COMPLEX → GPT-5 (full) oder Claude Sonnet (erklaerend)
- REALTIME_TREND → Grok Fast
- CHAT_SMALLTALK → GPT-5 nano
- Fallback bei Fehler/500 → GPT-5.1

### 7) Sicherheitshinweis
Alle Secrets muessen geheim bleiben und duerfen nicht in das Repo. Verwende nur Platzhalter in Doku und setze echte Werte in `.env`.

### Offene Punkte
- Ein-Wort-Antworten wie “allgemein” funktionieren nur mit Trägerphrase oder separaten Intents. Entscheidung: kurze Trägerphrasen nutzen oder eigene Intents (z. B. Allgemein/Beispiel) anlegen.
- Chunk-Laenge fuer lange Antworten weiter feinjustieren (Alexa-Zeitfenster).
- Ansprechende Benutzerseite mit Anmeldung für zukünftige Kunden: Design/Branding final abstimmen (CI, Texte, rechtliche Hinweise).
