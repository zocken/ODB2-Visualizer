# OBD2 Klartext-Assistent

Deutschsprachige Web-App zur verständlichen Einordnung von OBD2-Fehlercodes. Die Anwendung visualisiert betroffene Fahrzeugsysteme schematisch und nennt mögliche nächste Prüfschritte.

Ab Version 12 kommen die Codes aus einer PostgreSQL-Datenbank. Das Schema ist auf herstellerunabhängige Codes ausgelegt und kann später um herstellerspezifische Codes je Marke erweitert werden.

## Projektstruktur

- `dist/` – Frontend (`index.html`, `app.js`, `styles.css`, `vehicle.css`)
- `server/index.js` – Express-Server: liefert `dist/` aus und stellt die API bereit
- `server/seed.js` – importiert Seed-Dateien per Upsert in die Datenbank
- `server/build-static.js` – exportiert die Basisdaten nach `dist/data/` für den Betrieb ohne Backend
- `db/schema.sql` – Datenbankschema (wird beim Serverstart angewendet)
- `db/seed/generic-codes.json` – herstellerunabhängige Basiscodes und Fahrzeugbauteile
- `Dockerfile`, `docker-compose.yml` – Container-Betrieb
- `.github/workflows/pages.yml` – statische Veröffentlichung auf GitHub Pages
- `QUELLEN.md` – Herkunft und Grenzen der Code-Texte

## Datenmodell

| Tabelle | Inhalt |
|---|---|
| `dtc_codes` | Code, Titel, System, Dringlichkeit, Erklärung, Lage. `manufacturer_id` ist `NULL` für herstellerunabhängige Codes |
| `manufacturers` | Hersteller für spätere herstellerspezifische Codes |
| `dtc_causes` | Mögliche Ursachen je Code in Reihenfolge |
| `vehicle_components` | Bauteile der Pkw-Draufsicht (`data-component` im SVG) |
| `dtc_components` | Zuordnung Code → Bauteil (`active` = betroffen, `context` = zugehöriges System) |

Ein Code kann einmal herstellerunabhängig und zusätzlich pro Hersteller existieren. Die API liefert bei `?manufacturer=<slug>` die Herstellervariante und sonst den generischen Eintrag.

## API

- `GET /api/health` – Status und Anzahl der herstellerunabhängigen Codes
- `GET /api/codes?q=<text>&limit=12[&manufacturer=<slug>]` – Suche über Code, Titel und System
- `GET /api/codes/<CODE>[?manufacturer=<slug>]` – Detail; `404` mit `alternatives`, wenn unbekannt
- `GET /api/manufacturers` – hinterlegte Hersteller
- `GET /api/updates` – die letzten Läufe des automatischen Code-Abgleichs (angelegt, aktualisiert, entfernt)

## Lokaler Start mit Docker

```text
docker compose up --build
```

Anschließend `http://localhost:8080/` öffnen. Beim ersten Start mit leerer Datenbank werden die Basiscodes automatisch importiert.

## Daten importieren oder aktualisieren

Seed-Dateien haben das Format von `db/seed/generic-codes.json`. Herstellerspezifische Codes bekommen ein Feld `"manufacturer": "<slug>"`, der Hersteller wird in `"manufacturers": [{"slug": "vw", "name": "Volkswagen"}]` angelegt.

```text
DATABASE_URL=postgres://… npm run seed -- db/seed/<datei>.json
```

## Importierte Codes (Wal33D/dtc-database)

Neben den 32 redaktionell geschriebenen Basiscodes enthält die Datenbank importierte Codes aus [Wal33D/dtc-database](https://github.com/Wal33D/dtc-database) (MIT, Quellstand `04c43d7`, Rohdaten und Lizenz in `db/source/wal33d/`):

- `db/seed/sae-generic-wal33d.json` – 2000 herstellerunabhängige Codes (P0, P2, U0, C0, B0), gleichmäßig über die Codebereiche verteilt; nur Codes, deren Titel vollständig übersetzt werden konnte
- `db/seed/manufacturer-wal33d.json` – 6.770 herstellerspezifische Codes für 32 Marken; Titel deutsch, wo das Glossar vollständig greift, sonst englisch (`other_codes.txt` ohne Markenzuordnung ist nicht enthalten)

Titel werden mit `server/glossary.js` übersetzt, der englische Originaltitel steht in `title_en`. Erklärung, Ursachen, Dringlichkeit und Bauteilzuordnung erzeugt `server/wal33d.js` aus Vorlagen je Codefamilie. Diese Texte sind **nicht redaktionell geprüft**; die App weist in den technischen Details darauf hin.

Neu erzeugen und importieren:

```text
node tools/import-wal33d.js 2000
docker compose up --build -d
docker compose exec app node server/seed.js
```

## Wöchentlicher Code-Abgleich

`server/update-codes.js` lädt den aktuellen Stand von Wal33D/dtc-database, wandelt ihn mit `server/wal33d.js` und `server/glossary.js` um und gleicht die Pkw-Codes (generisch und herstellerspezifisch) ab:

| Fall | Verhalten |
|---|---|
| Code fehlt in der Datenbank | wird angelegt |
| Importierter Code hat sich geändert | wird samt Ursachen und Bauteilen aktualisiert (Erkennung über `content_hash`; greift auch nach Änderungen an Glossar oder Zuordnungsregeln) |
| Importierter Code fehlt in der Quelle | wird mit `source_removed_at` markiert und in der API ausgeblendet, nicht gelöscht; taucht er wieder auf, wird er wieder sichtbar |
| Eintrag mit anderer Quelle (z. B. `redaktionell`) | wird nie verändert |

**Handkorrekturen schützen:** Wer einen importierten Code von Hand verbessert, setzt `source = 'redaktionell'` – dann überschreibt der Abgleich ihn nicht mehr.

**Sicherung:** Würde ein Lauf mehr als 10 % der importierten Codes als entfernt markieren (z. B. bei unvollständiger Quelle), wird die Markierung zurückgerollt und der Lauf als fehlgeschlagen protokolliert.

- Der Server prüft stündlich, ob der letzte erfolgreiche Lauf mindestens `UPDATE_INTERVAL_DAYS` (Standard 7) Tage zurückliegt. Nach Neustart oder Ruhezustand (z. B. Render Free) wird ein fälliger Lauf nachgeholt; nach einem Fehler frühestens nach 6 Stunden erneut.
- Nutzfahrzeug-spezifische Codes (Nebenabtrieb/PTO, Druckluftbremse, Retarder, Tachograf …) und Einträge ohne Markenzuordnung werden übersprungen.
- Titel sind deutsch, wo das Glossar vollständig greift, sonst englisch.
- Ein Advisory Lock verhindert parallele Läufe mehrerer Instanzen; jeder Lauf steht in der Tabelle `code_updates`.
- Protokoll: `GET /api/updates` · manuell auslösen: `docker compose exec app npm run update-codes` · abschalten: `AUTO_UPDATE=false`

## Betrieb ohne Backend

Ist keine API erreichbar, lädt das Frontend `data/generic-codes.json`. Der Pages-Workflow erzeugt diese Datei mit `node server/build-static.js`. Herstellerspezifische Codes sind nur mit Datenbank verfügbar.

## Wichtiger Hinweis

Die App ist ein Lern- und Orientierungstool. Sie ersetzt weder fahrzeugspezifische Herstellerunterlagen noch Messungen oder eine fachgerechte Diagnose.
