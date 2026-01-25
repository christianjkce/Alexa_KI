# Contributing

Danke fuer deinen Beitrag zu Alexa_KI.

## Grundsaetze
- Keine Secrets oder personenbezogenen Daten committen.
- Nutze `.env` lokal, niemals im Repo.
- Halte Aenderungen klein und nachvollziehbar.

## Lokale Checks
```bash
./scripts/secret-scan.sh
npm test --if-present
```

## PR Hinweise
- Kurz beschreiben, warum die Aenderung notwendig ist.
- Falls Konfigurationsaenderungen noetig sind, dokumentiere sie in `docs/Playbook.md`.
