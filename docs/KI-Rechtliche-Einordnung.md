# Rechtliche Einordnung – Arbeitsentwurf (KI-Richtlinie, Abschnitt 14)

Stand: 28. Oktober 2026 · **Entwurf mit KI-Unterstützung erstellt. Keine Rechtsberatung.** Die Einordnung muss vom Projektverantwortlichen geprüft und bei Unsicherheit von einer fachkundigen Stelle bestätigt werden. Fristen und Inhalte des AI Act vor der Freigabe am aktuellen Stand prüfen; Änderungen und Verschiebungen einzelner Pflichten sind möglich.

## 1. Das System

- Öffentlich erreichbare Website; ein Chat beantwortet Fragen zu OBD2-Fehlercodes mit einem Sprachmodell (`qwen3.8-flash-next`, lokal in LM Studio), ergänzt um Einträge der eigenen Code-Datenbank.
- Kostenlos, ohne Konten, unter dem Namen des Projektverantwortlichen betrieben. Kein Zugriff auf Fahrzeuge, keine automatischen Entscheidungen über Personen.

## 2. Rolle nach der KI-Verordnung (EU) 2024/1689 („AI Act“)

| Rolle | Einschätzung |
|---|---|
| **Anbieter** eines KI-Systems (Art. 3 Nr. 3) | Wahrscheinlich ja: Der Chat wird selbst entwickelt (Modell + Systemanweisung + Datenbasis + Oberfläche) und unter eigenem Namen in Betrieb genommen; Unentgeltlichkeit ändert daran nach der Definition nichts. |
| **Betreiber** (Art. 3 Nr. 4) | Ja, gleichzeitig: Das System wird in eigener Verantwortung verwendet. Die Ausnahme für rein persönliche, nicht berufliche Nutzung greift bei einer öffentlichen Website voraussichtlich nicht. |
| Anbieter eines KI-Modells mit allgemeinem Verwendungszweck | Nein: Das Modell wird unverändert genutzt, nicht selbst trainiert oder wesentlich verändert. Pflichten dazu liegen beim Modellanbieter. |
| Ausnahme Forschung (Art. 2 Abs. 6) | Voraussichtlich nein: Das System dient nicht ausschließlich der wissenschaftlichen Forschung, sondern ist öffentlich nutzbar. Die Bezeichnung „Lernprojekt“ ersetzt die Prüfung nicht (Richtlinie, Abschnitt 14). |

## 3. Risikoeinstufung

| Frage | Einschätzung |
|---|---|
| Verbotene Praktiken (Art. 5) | Keine erkennbar (keine Manipulation, keine Bewertung von Personen, keine Biometrie). |
| Hochrisiko über Produktrecht (Art. 6 Abs. 1, Anhang I) | Voraussichtlich nein: Die App ist weder Sicherheitsbauteil eines Fahrzeugs noch selbst ein Produkt nach den Fahrzeug-Typgenehmigungsvorschriften; sie greift nicht ins Fahrzeug ein. |
| Hochrisiko nach Anhang III | Voraussichtlich nein: Kein Einsatz in den genannten Bereichen (z. B. kein Sicherheitsbauteil für die Steuerung des Straßenverkehrs, keine Entscheidungen über Zugang zu Leistungen). |
| Ergebnis | **Voraussichtlich KI-System mit begrenztem Risiko**; Transparenzpflichten und KI-Kompetenz relevant. Neu prüfen bei Fahrzeuganbindung oder Diagnosefunktionen (Richtlinie, Abschnitte 2 und 14). |

## 4. Voraussichtlich relevante Pflichten

| Pflicht | Inhalt (vereinfacht) | Stand im Projekt |
|---|---|---|
| KI-Kompetenz (Art. 4) | Anbieter und Betreiber sorgen für ausreichende KI-Kompetenz der Beteiligten | Vorlage [KI-Einweisung](KI-Einweisung.md); Einweisung noch zu dokumentieren |
| Hinweis auf Interaktion mit KI (Art. 50 Abs. 1) | Personen müssen erkennen, dass sie mit einem KI-System interagieren | Hinweisbox über dem Chat, Absender „KI-Assistent“ – umgesetzt |
| Kennzeichnung KI-erzeugter Inhalte (Art. 50 Abs. 2) | Anbieter von Systemen, die synthetische Texte erzeugen, kennzeichnen Ausgaben maschinenlesbar, soweit technisch möglich (mit Ausnahmen) | **Prüfen**, ob und wie das auf Chat-Antworten zutrifft; derzeit nur sichtbare Kennzeichnung |
| Anwendungszeitpunkte | Art. 4 und 5 gelten seit 2. Februar 2025; Art. 50 nach derzeitigem Text ab 2. August 2026 | Vor Freigabe am aktuellen Stand prüfen |

## 5. Sonstige einschlägige Anforderungen (Abschnitt 14, zusätzlich)

| Bereich | Stand |
|---|---|
| Datenschutz (DSGVO, TDDDG) | Datenschutzerklärung vorhanden; offene Punkte in [KI-Betriebspruefung](KI-Betriebspruefung.md) |
| Impressum (DDG, MStV) | Impressum vorhanden |
| Lizenzen | Wal33D/dtc-database (MIT) genannt; Lizenz des Sprachmodells noch zu dokumentieren |
| Produkthaftung | Neue EU-Produkthaftungsrichtlinie (EU) 2024/2853 bezieht Software ein; Anwendbarkeit auf ein kostenloses, nicht kommerzielles Angebot prüfen |

## 6. Ergebnis und Freigabe

| | |
|---|---|
| Geprüft von | |
| Datum | |
| Ergebnis | |
| Nächste Überprüfung | mit der Richtlinie, spätestens nach zwölf Monaten oder bei wesentlichen Änderungen |
