## Lokales Testing der Alexa-Crok-Integration

### 1) Umgebung setzen
Kopiere `.env.example` nach `.env` und trage deine Werte ein. Für reine lokale Tests ohne echte Alexa-Signaturprüfung kannst du setzen:

```
DISABLE_ALEXA_SIGNATURE_VALIDATION=1
```

### 2) Server starten

```
node src/server.js
```

### 3) Beispiel-Requests an `/alexa`
Hinweis: Ohne echtes Alexa-Signatur-Header-Set schlägt die Prüfung nur durch, wenn `DISABLE_ALEXA_SIGNATURE_VALIDATION` aktiv ist.

#### Status-Intent

```
curl -X POST http://localhost:3000/alexa \
  -H "Content-Type: application/json" \
  -d '{
    "request": {
      "type": "IntentRequest",
      "timestamp": "2024-01-01T00:00:00Z",
      "intent": {
        "name": "GetCrokStatusIntent",
        "slots": {}
      }
    }
  }'
```

#### Action-Intent mit Slots

```
curl -X POST http://localhost:3000/alexa \
  -H "Content-Type: application/json" \
  -d '{
    "request": {
      "type": "IntentRequest",
      "timestamp": "2024-01-01T00:00:00Z",
      "intent": {
        "name": "TriggerCrokActionIntent",
        "slots": {
          "Action": { "value": "deploy" },
          "Environment": { "value": "staging" }
        }
      }
    }
  }'
```

Die Slots werden als `parameters` an den Crok-Action-Endpunkt weitergegeben (inkl. aller vorhandenen Slot-Namen).

### 4) OAuth/Authcode-Flow (curl)
Wichtig: Der `/oauth/authorize`-Endpoint erwartet `client_id` und `redirect_uri` sowohl in der Query (erste Validierung) als auch im POST-Body.

Server mit passenden Env-Variablen starten, z. B.
```
APP_HOST=localhost \
ALEXA_CLIENT_ID=local-client \
ALEXA_CLIENT_SECRET=local-secret \
ALEXA_REDIRECT_URI=http://localhost:3000/dev-callback \
ADMIN_DEFAULT_USER=admin \
DISABLE_ALEXA_SIGNATURE_VALIDATION=1 \
node src/server.js
```

Auth-Code holen (liefert 302 mit `Location` inkl. `code`):
```
curl -i -X POST \
  "http://localhost:3000/oauth/authorize?client_id=${ALEXA_CLIENT_ID}&redirect_uri=${ALEXA_REDIRECT_URI}&state=xyz&scope=test" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=${ALEXA_CLIENT_ID}&redirect_uri=${ALEXA_REDIRECT_URI}&username=${ADMIN_DEFAULT_USER}&password=<admin-pass>"
```

Code gegen Tokens tauschen:
```
AUTH_CODE="<code-aus-dem-location-header>"
curl -i -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=${ALEXA_CLIENT_ID}&client_secret=${ALEXA_CLIENT_SECRET}&redirect_uri=${ALEXA_REDIRECT_URI}&code=${AUTH_CODE}"
```

Refresh-Token prüfen:
```
REFRESH_TOKEN="<refresh_token-aus-der-antwort>"
curl -i -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&client_id=${ALEXA_CLIENT_ID}&client_secret=${ALEXA_CLIENT_SECRET}&refresh_token=${REFRESH_TOKEN}"
```

### 5) Alexa-Signatur-Validierung
- Signatur-Prüfung an (Default): `DISABLE_ALEXA_SIGNATURE_VALIDATION` _nicht_ setzen. Ein Request ohne gültige Alexa-Signatur sollte `401 {"error":"invalid_signature"}` liefern.
- Signatur-Prüfung aus: `DISABLE_ALEXA_SIGNATURE_VALIDATION=1` erlaubt lokale Tests ohne echte Alexa-Signatur (siehe Beispiele oben).
- Echte Positiv-Tests nur mit echten Alexa-Requests (Developer Console/echtes Gerät), da ein korrekt signierter Payload benötigt wird.

### 6) Token-Store-Persistenz
Nach einem Refresh-Flow sollte `data/token-store.json` den Refresh-Token enthalten. Server neu starten und den Refresh-Call wiederholen, um sicherzustellen, dass der Persistenzpfad funktioniert.

### 7) Positiver Flow mit lokalem Crok-Stub
Für positive Alexa-Antworten ohne echtes Backend einen Stub starten und die App dagegen richten:
```
node scripts/mock-crok.js &
PORT=3101 CROK_API_BASE=http://localhost:3200 DISABLE_ALEXA_SIGNATURE_VALIDATION=1 \
ALEXA_CLIENT_ID=local-client ALEXA_CLIENT_SECRET=local-secret \
ALEXA_REDIRECT_URI=http://localhost:3000/dev-callback \
ADMIN_DEFAULT_USER=admin \
node src/server.js
```
Dann z. B. (Port 3101 beachten):
- `/oauth/authorize` wie oben mit Port 3101 aufrufen
- `/oauth/token` (authorization_code + refresh) durchspielen
- `/alexa` mit `GetCrokStatusIntent` ⇒ Antwort: `Crok meldet: Status ok.`
- `/alexa` mit `TriggerCrokActionIntent` (`Action` Slot) ⇒ Antwort: `Aktion <slot> gestartet.`

Automatisiert: `scripts/e2e-stub.sh` führt Stub + App + OAuth + Alexa-Intents in einem Rutsch aus (Ports per `PORT`/`CROK_STUB_PORT` überschreibbar).
