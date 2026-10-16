# OBD2 Klartext-Assistent

Statische deutschsprachige Web-App zur verständlichen Einordnung ausgewählter OBD2-Fehlercodes. Die Anwendung visualisiert betroffene Fahrzeugsysteme schematisch und nennt mögliche nächste Prüfschritte.

## Projektstruktur

- `dist/index.html` – Seitenaufbau
- `dist/app.js` – Code-Daten und Interaktion
- `dist/styles.css` – allgemeines und responsives Design
- `dist/vehicle.css` – Fahrzeugdarstellung und Radarlinien
- `.openai/hosting.json` – Zuordnung zur bestehenden Sites-Veröffentlichung
- `QUELLEN.md` – Herkunft und Grenzen der Code-Texte
- `GIT-WIEDERHERSTELLUNG.md` – Wiederherstellung der Versionsverwaltung
- `VEROEFFENTLICHUNG.md` – Wiederveröffentlichung auf der bestehenden Website

## Lokaler Start

```text
python -m http.server 4173 --directory dist
```

Anschließend `http://localhost:4173/` öffnen.

## Wichtiger Hinweis

Die App ist ein Lern- und Orientierungstool. Sie ersetzt weder fahrzeugspezifische Herstellerunterlagen noch Messungen oder eine fachgerechte Diagnose.

