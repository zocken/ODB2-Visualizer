# OBD2 Klartext-Assistent

Deutschsprachige Web-App zur verständlichen Einordnung von OBD2-Fehlercodes. Die Anwendung visualisiert betroffene Fahrzeugsysteme schematisch und nennt mögliche nächste Prüfschritte.

Ab Version 12 kommen die Codes aus einer PostgreSQL-Datenbank. Das Schema ist auf herstellerunabhängige Codes ausgelegt und kann später um herstellerspezifische Codes je Marke erweitert werden.

## Projektstruktur

- `dist/` – Frontend (`index.html`, `app.js`, `styles.css`, `vehicle.css`, 3D-Ansicht `vehicle-view.js`, `vehicle3d.js`, `vehicle3d-details.js`, `vendor/three`)
- `server/index.js` – Express-Server: liefert `dist/` aus und stellt die API bereit
- `server/seed.js` – importiert Seed-Dateien per Upsert in die Datenbank
- `server/build-static.js` – exportiert die Basisdaten nach `dist/data/` für den Betrieb ohne Backend
- `db/schema.sql` – Datenbankschema (wird beim Serverstart angewendet)
- `db/seed/generic-codes.json` – herstellerunabhängige Basiscodes und Fahrzeugbauteile
- `Dockerfile`, `docker-compose.yml` – Container-Betrieb
- `.github/workflows/pages.yml` – statische Veröffentlichung auf GitHub Pages
- `QUELLEN.md` – Herkunft und Grenzen der Code-Texte

## Fahrzeugansicht

Die Systemansicht ist eine drehbare 3D-Ansicht (Three.js 0.170, MIT, lokal in `dist/vendor/three`). Schnellansichten 3D/Oben/Seite/Vorne, Bauteilname beim Überfahren, schwebende Beschriftung am markierten Bauteil. Die Lage der Bauteile stammt aus dem 2D-Plan (SVG in `dist/index.html`), Höhe und Form aus `dist/vehicle3d.js`, Zusatzdetails aus `dist/vehicle3d-details.js`. Der 2D-Plan bleibt per Umschalter und als Rückfall ohne WebGL erhalten.

**Bauformen** (`dist/vehicle3d-layouts.js`): Die 3D-Ansicht zeigt eine für den gewählten Hersteller typische Bauform – schematisch, nicht modellgenau. Sie wechselt ausschließlich mit der Herstellerauswahl; ihr Name steht im Hinweis unter der Grafik:

| Bauform | Merkmale | Hersteller |
|---|---|---|
| Kompakt · R4 quer · Front | Grundform aus dem 2D-Plan | alle übrigen, „Nur Standardcodes“ |
| Limousine · R6 längs · Heck | Reihensechser, Kardanwelle, Batterie im Kofferraum | BMW, Mercedes-Benz, Jaguar, Infiniti |
| SUV/Pick-up · V8 längs · Allrad | Bank 1 links (1-3-5-7), Bank 2 rechts (2-4-6-8), zwei Abgasstränge | Chevrolet, GMC, Cadillac, GM, Ford, Lincoln, Mercury, Dodge, Chrysler, Jeep, Plymouth, Pontiac, Buick, Oldsmobile |
| Kombi · Boxer längs · Allrad | liegende Zylinder, Ladeluftkühler oben | Subaru |
| Hybrid · R4 quer + E-Motor · Front | E-Motor/Leistungselektronik, Hochvoltbatterie unter der Rückbank | Toyota, Lexus |

Codes für Zylinder 5–8, Einspritzventile 5–8 und Lambdasonden der Bank 2 haben eigene Bauteile. Fehlt ein Bauteil in einer Bauform (z. B. Zylinder 7 beim Vierzylinder) oder im 2D-Plan, wird das übergeordnete Bauteil markiert (`FALLBACK`).

## Datenmodell

| Tabelle | Inhalt |
|---|---|
| `dtc_codes` | Code, Titel, System, Dringlichkeit, Erklärung, Lage. `manufacturer_id` ist `NULL` für herstellerunabhängige Codes |
| `manufacturers` | Hersteller für spätere herstellerspezifische Codes |
| `dtc_causes` | Mögliche Ursachen je Code in Reihenfolge |
| `vehicle_components` | Bauteile der Pkw-Draufsicht (`data-component` im SVG) |
| `dtc_components` | Zuordnung Code → Bauteil (`active` = betroffen, `context` = zugehöriges System) |

Ein Code kann einmal herstellerunabhängig und zusätzlich pro Hersteller existieren. Die API liefert bei `?manufacturer=<slug>` die Herstellervariante und sonst den generischen Eintrag.

## Herstellerauswahl

Oberhalb des Codefelds wählt man den Hersteller. Startwert ist **„Nur Standardcodes“**. Mit einem Hersteller stehen dessen Codes zusätzlich zu den Standardcodes zur Verfügung; gibt es einen Code in beiden Varianten, gilt die Herstellerbedeutung. Die Liste enthält automatisch alle Hersteller, für die Codes in der Datenbank stehen. Ohne Backend (GitHub Pages) ist die Auswahl ausgeblendet.

## API

- `GET /api/health` – Status und Anzahl der herstellerunabhängigen Codes
- `GET /api/codes?q=<Code-Anfang>&limit=40&offset=0[&manufacturer=<slug>]` – Codes, die mit der Eingabe beginnen, seitenweise; Gesamtzahl im Header `X-Total-Count`; mit Hersteller ein Treffer je Code (Herstellervariante vor Standardcode)
- `GET /api/codes/<CODE>[?manufacturer=<slug>]` – Detail; `404` mit `alternatives`, wenn unbekannt
- `GET /api/manufacturers` – Hersteller mit sichtbaren Codes inkl. Anzahl (füllt die Herstellerauswahl)
- `GET /api/updates` – die letzten Läufe des nächtlichen Code-Abgleichs (angelegt, aktualisiert, entfernt)

## Produktivbetrieb (Coolify)

Live: https://obd2.traders-ai-signals.de

- Coolify-Projekt „OBD2 Klartext“, Build Pack *Docker Compose* mit `docker-compose.coolify.yml` (keine Host-Ports, Routing über den Coolify-Proxy auf Port 8080)
- PostgreSQL läuft als eigener Container mit Volume `obd2-db-data`; Zugangsdaten erzeugt Coolify (`SERVICE_USER_POSTGRES`, `SERVICE_PASSWORD_POSTGRES`)
- **Automatisches Deployment:** Jeder Push auf `main` löst über den GitHub-Webhook (Repo → Settings → Webhooks, Push-Events) ein neues Deployment aus
- HTTPS-Zertifikat per Let's Encrypt, HTTP wird auf HTTPS umgeleitet

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

## Nächtlicher Code-Abgleich

`server/update-codes.js` lädt den aktuellen Stand von Wal33D/dtc-database, wandelt ihn mit `server/wal33d.js` und `server/glossary.js` um und gleicht die Pkw-Codes (generisch und herstellerspezifisch) ab:

| Fall | Verhalten |
|---|---|
| Code fehlt in der Datenbank | wird angelegt |
| Importierter Code hat sich geändert | wird samt Ursachen und Bauteilen aktualisiert (Erkennung über `content_hash`; greift auch nach Änderungen an Glossar oder Zuordnungsregeln) |
| Importierter Code fehlt in der Quelle | wird mit `source_removed_at` markiert und in der API ausgeblendet, nicht gelöscht; taucht er wieder auf, wird er wieder sichtbar |
| Eintrag mit anderer Quelle (z. B. `redaktionell`) | wird nie verändert |

**Handkorrekturen schützen:** Wer einen importierten Code von Hand verbessert, setzt `source = 'redaktionell'` – dann überschreibt der Abgleich ihn nicht mehr.

**Sicherung:** Würde ein Lauf mehr als 10 % der importierten Codes als entfernt markieren (z. B. bei unvollständiger Quelle), wird die Markierung zurückgerollt und der Lauf als fehlgeschlagen protokolliert.

- Der Abgleich läuft **täglich nachts**: Der Server prüft alle 15 Minuten und startet einmal pro Kalendertag im Fenster ab `UPDATE_HOUR` (Standard 3 Uhr) für 3 Stunden, Zeitzone `UPDATE_TIMEZONE` (Standard Europe/Berlin, inkl. Sommerzeit). Nach einem Fehler wird im selben Fenster frühestens nach 1 Stunde erneut versucht; außerhalb des Fensters (z. B. Neustart tagsüber) wartet er bis zur nächsten Nacht.
- Nutzfahrzeug-spezifische Codes (Nebenabtrieb/PTO, Druckluftbremse, Retarder, Tachograf …) und Einträge ohne Markenzuordnung werden übersprungen.
- Titel sind deutsch, wo das Glossar vollständig greift, sonst englisch.
- Ein Advisory Lock verhindert parallele Läufe mehrerer Instanzen; jeder Lauf steht in der Tabelle `code_updates`.
- Protokoll: `GET /api/updates` · manuell auslösen: `docker compose exec app npm run update-codes` · abschalten: `AUTO_UPDATE=false`

## Nutzungsstatistik

Anonyme Tageszähler in der Tabelle `usage_daily`: Seitenaufrufe, abgefragte Codes (gefunden / nicht gefunden), gewählte Hersteller und Geräteklasse (Handy/Desktop). Keine Cookies, kein Tracking-Speicher im Browser, keine IP-Adressen oder Browserkennungen in der Datenbank; Zähler älter als 365 Tage werden gelöscht. Die IP dient nur im Arbeitsspeicher der Begrenzung auf 60 Ereignisse pro Minute.

- Erfassen: `POST /api/events` mit `{"events":[{"type":"lookup","key":"P0420"}]}` (Typen: pageview, lookup, missing, manufacturer, device)
- Abrufen: `GET /api/stats?days=30`
- Anzeige: **fünfmal schnell auf das Logo oben links klicken** – Kennzahlen, Seitenaufrufe pro Tag, meistgefragte und nicht gefundene Codes, Hersteller; Zeitraum 7/30/90 Tage. Das Fenster ist ein verstecktes Extra, kein Zugriffsschutz.
- Ohne Backend (GitHub Pages) wird nichts erfasst.

## Betrieb ohne Backend

Ist keine API erreichbar, lädt das Frontend `data/generic-codes.json`. Der Pages-Workflow erzeugt diese Datei mit `node server/build-static.js`. Herstellerspezifische Codes sind nur mit Datenbank verfügbar.

## Wichtiger Hinweis

Die App ist ein Lern- und Orientierungstool. Sie ersetzt weder fahrzeugspezifische Herstellerunterlagen noch Messungen oder eine fachgerechte Diagnose.

## KI-Chat

Verbindliche Vorgaben: [KI-Richtlinie](docs/KI-Richtlinie.md) · Stand der Umsetzung, Prüfprotokoll und offene Punkte: [KI-Umsetzungsstand](docs/KI-Umsetzungsstand.md).

Am Seitenende steht ein kompakter KI-Chat. Browseranfragen gehen an `POST /api/chat`; ausschließlich das Backend verwendet `LM_GATEWAY_URL` und `LM_GATEWAY_KEY`. Beide Werte gehören in die Produktions-Laufzeitvariablen von Coolify, niemals in Browsercode oder ins Repository.

Der Chat ist erreichbar, solange die lokale KI und ihr SSH-Tunnel laufen. Bei einer getrennten Verbindung zeigt die Oberfläche eine verständliche Fehlermeldung. Gesprächsverläufe bleiben im Speicher des jeweiligen Browser-Tabs und werden vom Chat-Backend nicht gespeichert.

**Datenbankkontext:** Vor jeder Anfrage sucht der Server bis zu drei Codes heraus – zuerst aus der aktuellen Frage, dann den gerade angezeigten Code, dann aus früheren Fragen – und holt deren Einträge passend zur Herstellerauswahl aus der Datenbank (`server/code-context.js`). Titel, System, Dringlichkeit, Erklärung, Ursachen und dieselbe Weiterfahrt-Empfehlung wie auf der Ergebnisseite gehen als zusätzliche Systemnachricht an die KI; Codes ohne Eintrag werden als „nicht in der Datenbasis“ gekennzeichnet. Unter der Antwort steht, auf welchen Einträgen sie beruht. Fällt die Datenbank aus, antwortet der Chat ohne Kontext. Der Server meldet das in der ersten Zeile (`{"sources":[],"dataUnavailable":true}`); die Oberfläche blendet den Hinweis sofort oben in der Antwortblase ein – vor dem ersten Antworttext und auch bei Abbruch oder Zeitüberschreitung. Die KI wird zusätzlich angewiesen, Codebedeutungen nur unter Vorbehalt und Sicherheitsaussagen nur allgemein zu geben.

**Weiterfahrt-Einschätzung:** Seite (`dist/app.js`, `SAFETY`/`adviceFor`) und Chat (`server/chat.js`, `SAFETY`/`drivingAdvice`) nutzen dieselben Regeln. Für Bremsen/ABS, Lenkung, Öldruck, Motorkühlung, Airbag/Gurte und Hochvolt gilt unabhängig von der Dringlichkeitsfarbe „Nur nach Prüfung“ mit konkreten Warnzeichen; sonst richtet sich die Einschätzung nach Rot/Gelb/Grün. Sie wird als „Einschätzung, keine Freigabe“ angezeigt. Die Texte sind ein Entwurf und brauchen laut KI-Richtlinie (Abschnitte 4 und 10) noch eine fachliche Prüfung. Automatisch importierte Einträge haben eine automatisch abgeleitete Dringlichkeit (`server/wal33d.js`), die ebenfalls nicht fachlich geprüft ist.

**Sofortiger Sicherheitshinweis:** Enthält eine Chatfrage akute Gefahrenzeichen (Bremse ohne Wirkung, Lenkung schwergängig, Öldruckwarnung, Überhitzung/Dampf, Rauch/Brandgeruch, blinkende Motorkontrollleuchte, Kraftstoffgeruch/-austritt, Hochvolt-Warnung), zeigt der Browser sofort einen festen Hinweis unter der Frage – unabhängig von Erreichbarkeit und Antwortzeit der KI; er bleibt auch bei Fehlern stehen. Liste und Texte: `dist/safety-signals.js` (Tests: `server/safety-signals.test.js`); sie sind bewusst vorsichtig und brauchen noch eine fachliche Prüfung.

**Hinweise im Chat:** Über dem Verlauf stehen vor der ersten Eingabe die Grenzen (keine Diagnose oder Freigabe), der Vorrang von Fahrzeugwarnungen und Herstellerangaben, die Bitte, keine personenbezogenen Daten einzugeben, sowie Links zum Datenschutz und zum Melden falscher Antworten.

**Streaming:** Der Server fragt das Gateway mit `stream: true` an und reicht die Antwort als NDJSON weiter (`{"sources":[…]}`, dann `{"delta":"…"}`-Teile, zum Schluss `{"done":true}` oder `{"error":"…"}`), sodass der Text sofort erscheint. Liefert das Gateway kein Streaming, wird die JSON-Antwort am Stück weitergegeben. Lehnt das Gateway `stream: true` ab, fragt der Server ohne Streaming erneut und merkt sich das bis zum nächsten Neustart. Reasoning-Modelle: Die Denkphase (`reasoning_content`) wird nicht weitergegeben, nur höchstens alle 5 s ein `{"thinking":true}` als Lebenszeichen; `<think>…</think>`-Blöcke im Antworttext werden ebenso herausgefiltert. Zeitgrenzen: 180 s bis zum ersten Lebenszeichen, 60 s zwischen zwei Teilen.

Tests: `npm test` (`server/chat.test.js`, ohne Datenbank und ohne echtes Gateway). Diese Tests nutzen simulierte Modellantworten; Prüfungen mit dem tatsächlich eingesetzten Modell werden getrennt dokumentiert (KI-Richtlinie, Abschnitt 10).

### Modell und Betrieb (KI-Richtlinie, Abschnitt 9)

| | |
|---|---|
| Modell | `qwen3.8-flash-next` in LM Studio (Standard `DEFAULT_MODEL` in `server/chat.js`, änderbar über `LM_MODEL`); Reasoning-Modell |
| Vorher | `devstral-small-2-24b-instruct-2512` (bis Oktober 2026) |
| Herkunft, Nutzungsbedingungen | noch zu dokumentieren (Modellkarte und Lizenz des eingesetzten Modells) |
| Betriebsumgebung | LM Studio auf einem selbst betriebenen Rechner, `Parallel 1` (Anfragen warten nacheinander) |
| Datenweg | Browser → App-Server (Coolify, Hostinger, Frankfurt; HTTPS) → `LM_GATEWAY_URL` über SSH-Tunnel → LM Studio |
| Systemanweisung | `SYSTEM` und `factsMessage` in `server/chat.js`; Freigabestand: Entwurf, nicht freigegeben |
| Bekannte Grenzen | Antwortzeit meist 1–2 Minuten; keine fahrzeugspezifischen Daten; kann trotz Anweisung Fehler oder ungenaue Angaben enthalten; Sicherheitsvorgaben werden zusätzlich im Anwendungscode (Weiterfahrt-Regeln, Ausgabe nur als Text, Grenzen) umgesetzt |

Ein Modellwechsel oder wesentliche Änderungen an der Systemanweisung brauchen eine erneute Prüfung.

Grenzen: sechs Anfragen je Besucher und Minute, 18 insgesamt je Minute, zwei laufende Anfragen, 2.000 Zeichen pro neuer Frage und 2.048 Ausgabetokens (Denkphase eingeschlossen). Der Server setzt Modell und Systemanweisung fest; Clients können keine Systemrollen oder Tools übergeben. Der Verlauf ist auf wenige Nachrichten begrenzt. Ein neuer Chat setzt den Verlauf zurück.

Backend-Tests: `node --test server/chat.test.js`.

## Technische KI-Prüfungen

Prüfstatus, Freigabebefehle, Zeitlimits, Browsertests und Versionsnachweise: siehe [TECHNISCHE-FREIGABE.md](TECHNISCHE-FREIGABE.md).
