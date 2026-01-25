# Alexa Conversations: K I (de-DE)

Dieses Projekt unterstuetzt jetzt Alexa Conversations ueber `Dialog.API.Invoked`.
Damit du natuereingaben ohne Signalwoerter nutzen kannst, brauchst du im
Developer Console Skill-Builder eine Conversations-Definition mit einer API
namens `SendToLLM` und einem Argument `query`.

## Empfehlungen fuer die Conversations-Definition
- API Name: `SendToLLM`
- Argumente:
  - `query` (Typ: `AMAZON.SearchQuery`)
- API Response:
  - `reply` (Typ: `AMAZON.SearchQuery` oder `AMAZON.LanguageText`)

## Freie Antworten auf Rueckfragen (Workaround)
Damit Antworten wie "36" nach einer Rueckfrage angenommen werden, nutze ein
Catch-All-Intent:
- Intent: `FreeReplyIntent`
- Slot: `Any` vom Typ `AMAZON.SearchQuery`
- Sample: `{Any}`
- In Alexa Conversations: binde `FreeReplyIntent` an der Rueckfrage und mappe
  `query = {Any}` zur API `SendToLLM`.

## Ablauf (Console)
1. Interaction Model importieren: `skill-package/interactionModels/custom/de-DE.json`.
2. Alexa Conversations aktivieren und eine API `SendToLLM` anlegen.
3. In deinen Dialogen die API aufrufen und `reply` als Ausgabe verwenden.
4. Skill bauen und testen.

## Backend
- `Dialog.API.Invoked` wird in `src/server.js` verarbeitet.
- `apiRequest.name` muss `SendToLLM` sein.
- Die Eingabe wird aus `arguments.query` gelesen.
