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

## Betrieb ohne Backend

Ist keine API erreichbar, lädt das Frontend `data/generic-codes.json`. Der Pages-Workflow erzeugt diese Datei mit `node server/build-static.js`. Herstellerspezifische Codes sind nur mit Datenbank verfügbar.

## Wichtiger Hinweis

Die App ist ein Lern- und Orientierungstool. Sie ersetzt weder fahrzeugspezifische Herstellerunterlagen noch Messungen oder eine fachgerechte Diagnose.
