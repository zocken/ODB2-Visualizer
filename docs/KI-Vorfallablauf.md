# Ablauf bei gemeldeten Fehlern und Sicherheitsvorfällen (KI-Richtlinie, Abschnitt 13)

Stand: 28. Oktober 2026 · Entwurf, vom Projektverantwortlichen festzulegen

## 1. Eingang

- Meldeweg für Nutzende: Link „Falsche Antwort melden“ im Chat (E-Mail an den Projektverantwortlichen) und Kontakt im Impressum.
- Jede Meldung bekommt einen Eintrag im Vorfallprotokoll (Abschnitt 5). Gespeichert werden nur die für die Bewertung nötigen Angaben (Frage, Antwortausschnitt, Code, Datum) – keine Namen, Kontaktdaten oder vollständigen Chatverläufe über die Bearbeitung hinaus.

## 2. Bewertung

| Stufe | Beispiel | Reaktion |
|---|---|---|
| **Kritisch** | Antwort oder Seite verharmlost eine akute Gefahr, rät bei Bremsen-/Lenkungs-/Öldruck-/Überhitzungs-/Hochvoltproblemen zur Weiterfahrt, gibt eine Anleitung zum Umgehen von Sicherheits- oder Abgassystemen, Datenschutzvorfall | **sofort** (Abschnitt 3) |
| **Hoch** | Falsche Bedeutung eines Codes, erfundene Messwerte oder Herstellerangaben, falsche Dringlichkeit eines redaktionellen Eintrags | innerhalb von 2 Tagen korrigieren |
| **Normal** | Ungenaue Übersetzung, missverständliche Formulierung, Gestaltung | im nächsten Pflegezyklus |

## 3. Sofortmaßnahmen (kritisch)

| Maßnahme | So geht es | Wirkung |
|---|---|---|
| KI-Chat abschalten | In Coolify bei der App `CHAT_DISABLED=true` setzen und neu starten | Chat antwortet mit „vorübergehend abgeschaltet“; Code-Erklärungen und feste Sicherheitshinweise (Seite und Chat) bleiben aktiv |
| Modellverbindung trennen | `LM_GATEWAY_URL` leeren oder SSH-Tunnel/LM Studio stoppen | Chat meldet „nicht eingerichtet“ bzw. „nicht erreichbar“ |
| Einzelnen Code korrigieren | Eintrag in `dtc_codes` bearbeiten und `source = 'redaktionell'` setzen | Der nächtliche Abgleich ändert nur Einträge mit Quelle Wal33D – die Korrektur bleibt dauerhaft |
| Einzelnen Code sperren | `UPDATE dtc_codes SET source = 'gesperrt', source_removed_at = now() WHERE code = 'P0606' AND manufacturer_id IS NULL;` (Herstellervariante: `AND manufacturer_id = (SELECT id FROM manufacturers WHERE slug = 'bmw')`) | Code wird nicht mehr angezeigt; der Abgleich setzt ihn nicht zurück (nur `source_removed_at` allein würde der Abgleich wieder aufheben) |
| Auf geprüften Stand zurück | Letzten geprüften Commit in Git wiederherstellen (`git revert`) und deployen | Code, Texte und Systemanweisung wie beim letzten geprüften Stand |
| Sicherheitstext ändern | `dist/safety-signals.js`, `SAFETY` in `dist/app.js` und `server/chat.js` anpassen, Tests ausführen, deployen | Änderung braucht danach eine fachliche Prüfung ([Prüfliste](Pruefliste-Sicherheitstexte.md)) |

Datenbankänderungen im Coolify-Terminal des Datenbank-Containers (`psql`) ausführen und im Vorfallprotokoll festhalten.

## 4. Wiederfreigabe

Vor dem Wiedereinschalten dokumentieren: Ursache, Korrektur, durchgeführte Prüfung (mit echtem Modell, falls die KI betroffen war) und wer freigegeben hat. Danach `CHAT_DISABLED` zurück auf `false`.

## 5. Vorfallprotokoll (Vorlage)

| Nr. | Eingang | Meldung (kurz, ohne personenbezogene Daten) | Stufe | Sofortmaßnahme | Ursache | Korrektur | Prüfung | Wiederfreigabe (wer, wann) |
|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | |
