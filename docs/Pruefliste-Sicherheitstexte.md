# Prüfliste Sicherheitstexte (KI-Richtlinie, Abschnitte 4 und 10)

Stand: 28. Oktober 2026 · Version der Texte: Commit `389da27`

Die Richtlinie verlangt, dass sicherheitsrelevante Fahrzeughinweise **fachlich geprüft** werden. Alle Texte unten wurden mit KI-Unterstützung formuliert und sind **noch nicht fachlich geprüft**. Die Tabellen A–C sind automatisch aus dem Code erzeugt (Skript: Texte aus `dist/safety-signals.js`, `dist/app.js` und `server/chat.js` gelesen), damit sie genau dem entsprechen, was Nutzende sehen.

**Vorgehen:** Eine fachlich geeignete Person (z. B. Kfz-Meister:in oder Kfz-Sachverständige:r) prüft jeden Text, trägt Ergebnis (`freigegeben` / `ändern: …` / `streichen`), Namen und Datum ein. Änderungen werden im Code umgesetzt, die Liste danach neu erzeugt und erneut geprüft. Erst wenn alle Zeilen freigegeben sind, gilt Abschnitt 4 als erfüllt.

Prüffragen je Text:
- Ist die Aussage fachlich richtig und für Laien verständlich?
- Ist sie vorsichtig genug, ohne unnötig zu alarmieren?
- Fehlt ein Warnzeichen, bei dem sofort angehalten werden muss?
- Passt die Einordnung des Systems (z. B. „Motorkühlung“ auch bei reinen Sensorfehlern)?

### A. Sofort-Sicherheitshinweise im Chat (`dist/safety-signals.js`)

| Nr. | Auslöser (Kennung) | Text | Ergebnis | Geprüft von | Datum |
|---|---|---|---|---|---|
| A1 | brake | Bremse: Fühlt sich die Bremse anders an oder leuchtet die rote Bremswarnleuchte, nicht weiterfahren. Sicher anhalten und abschleppen lassen. | | | |
| A2 | steering | Lenkung: Wird die Lenkung schwergängig oder ungewohnt, sicher anhalten und nicht weiterfahren. | | | |
| A3 | oil | Öldruck: Bei Öldruckwarnung sofort sicher anhalten und den Motor abstellen. Nicht weiterfahren, bevor die Ursache geklärt ist. | | | |
| A4 | heat | Überhitzung: Sofort sicher anhalten und den Motor abstellen. Das heiße Kühlsystem nicht öffnen. | | | |
| A5 | fire | Rauch oder Brandgeruch: Sofort sicher anhalten, Motor aus, alle aussteigen und Abstand halten. Bei Feuer 112 anrufen. | | | |
| A6 | misfire | Blinkende Motorkontrollleuchte: Möglichst bald sicher anhalten und nicht weiter belasten – unverbrannter Kraftstoff kann den Katalysator überhitzen. | | | |
| A7 | fuel | Kraftstoffgeruch oder -austritt: Brandgefahr. Sicher anhalten, Motor aus, nicht rauchen und Abstand halten. | | | |
| A8 | highvoltage | Hochvoltsystem: Keine eigenen Arbeiten. Bei einer Hochvolt-Warnmeldung sicher anhalten und geschultes Fachpersonal hinzuziehen. | | | |

### B. Weiterfahrt-Einschätzung auf der Ergebnisseite (`dist/app.js`, `adviceFor`)

| Nr. | Fall | Anzeige | Ergebnis | Geprüft von | Datum |
|---|---|---|---|---|---|
| B1 | Bremsen/ABS | Nur nach Prüfung – Sicherheitsrelevant: Bremsen und Fahrstabilität: Leuchtet die rote Bremswarnleuchte oder fühlt sich die Bremse anders an, nicht weiterfahren. Sonst nur vorsichtig und direkt zur Fachwerkstatt – ABS und ESP können ausgefallen sein. Schritte: Auf Warnleuchten und spürbare Veränderungen achten. / ‹erste Prüfung aus der Ursachenliste› / Fachwerkstatt hinzuziehen, im Zweifel abschleppen lassen. | | | |
| B2 | Lenkung | Nur nach Prüfung – Sicherheitsrelevant: Lenkung: Wird die Lenkung schwergängig, ungewohnt oder erscheint eine Lenkungswarnung, sicher anhalten und nicht weiterfahren. Schritte: Auf Warnleuchten und spürbare Veränderungen achten. / ‹erste Prüfung aus der Ursachenliste› / Fachwerkstatt hinzuziehen, im Zweifel abschleppen lassen. | | | |
| B3 | Öldruck | Nur nach Prüfung – Sicherheitsrelevant: Öldruck: Bei Öldruckwarnung sofort sicher anhalten und den Motor abstellen. Nicht weiterfahren, bevor die Ursache geklärt ist. Schritte: Auf Warnleuchten und spürbare Veränderungen achten. / ‹erste Prüfung aus der Ursachenliste› / Fachwerkstatt hinzuziehen, im Zweifel abschleppen lassen. | | | |
| B4 | Motorkühlung | Nur nach Prüfung – Sicherheitsrelevant: Motorkühlung: Steigt die Temperaturanzeige, erscheint eine Temperaturwarnung oder tritt Dampf aus: sofort sicher anhalten und den Motor abstellen. Das heiße Kühlsystem nicht öffnen. Schritte: Auf Warnleuchten und spürbare Veränderungen achten. / ‹erste Prüfung aus der Ursachenliste› / Fachwerkstatt hinzuziehen, im Zweifel abschleppen lassen. | | | |
| B5 | Airbag/Gurte | Nur nach Prüfung – Sicherheitsrelevant: Airbag und Gurte: Airbags oder Gurtstraffer lösen bei einem Unfall möglicherweise nicht aus. Nicht selbst am System arbeiten und zeitnah eine Fachwerkstatt aufsuchen. Schritte: Auf Warnleuchten und spürbare Veränderungen achten. / ‹erste Prüfung aus der Ursachenliste› / Fachwerkstatt hinzuziehen, im Zweifel abschleppen lassen. | | | |
| B6 | Hochvolt | Nur nach Prüfung – Sicherheitsrelevant: Hochvoltsystem: Keine eigenen Arbeiten am Hochvoltsystem – nur durch entsprechend geschultes Fachpersonal. Bei einer Hochvolt-Warnmeldung sicher anhalten. Schritte: Auf Warnleuchten und spürbare Veränderungen achten. / ‹erste Prüfung aus der Ursachenliste› / Fachwerkstatt hinzuziehen, im Zweifel abschleppen lassen. | | | |
| B7 | Sonstige, Rot | Nur eingeschränkt – Vorsichtig reagieren: Starke Belastung vermeiden. Bei deutlichen Symptomen, roter oder blinkender Warnleuchte sicher anhalten. Schritte: ‹erste Prüfung aus der Ursachenliste› / Belastung und längere Fahrten vermeiden. / Fehlerspeicher und betroffenes System zeitnah fachlich prüfen lassen. | | | |
| B8 | Sonstige, Gelb | Meist möglich – Zeitnah prüfen lassen: Eine vorsichtige Weiterfahrt ist meist möglich, solange keine starken Symptome oder roten Warnleuchten auftreten. Schritte: ‹erste Prüfung aus der Ursachenliste› / Hohe Belastung nach Möglichkeit vermeiden. / Ursache zeitnah systematisch prüfen lassen. | | | |
| B9 | Sonstige, Grün | Meist möglich – Weiterfahrt meist möglich: Wenn das Fahrzeug normal fährt und keine weiteren Warnzeichen auftreten, ist eine vorsichtige Weiterfahrt meist möglich. Schritte: ‹erste Prüfung aus der Ursachenliste› / Nach einigen Fahrzyklen erneut auslesen. / Bei wiederkehrendem Code Werkstatttermin planen. | | | |
| B10 | Importiert, nicht geprüft | Nicht geprüft – Keine geprüfte Einschätzung: Für diesen automatisch importierten Code liegt keine fachlich geprüfte Einschätzung zur Weiterfahrt vor. Bei Warnleuchten, spürbaren Veränderungen oder Unsicherheit nicht weiterfahren und fachlich prüfen lassen. Schritte: Auf Warnleuchten und spürbare Veränderungen achten. / ‹erste Prüfung aus der Ursachenliste› / Fehlerspeicher und betroffenes System fachlich prüfen lassen. | | | |

### C. Weiterfahrt-Einschätzung für den KI-Chat (`server/chat.js`, `drivingAdvice`)

| Nr. | Fall | Text an die KI | Ergebnis | Geprüft von | Datum |
|---|---|---|---|---|---|
| C1 | Bremsen/ABS | nur nach Prüfung (Bremsen und Fahrstabilität). Leuchtet die rote Bremswarnleuchte oder fühlt sich die Bremse anders an, nicht weiterfahren. Sonst nur vorsichtig und direkt zur Fachwerkstatt – ABS und ESP können ausgefallen sein. | | | |
| C2 | Lenkung | nur nach Prüfung (Lenkung). Wird die Lenkung schwergängig, ungewohnt oder erscheint eine Lenkungswarnung, sicher anhalten und nicht weiterfahren. | | | |
| C3 | Öldruck | nur nach Prüfung (Öldruck). Bei Öldruckwarnung sofort sicher anhalten und den Motor abstellen. Nicht weiterfahren, bevor die Ursache geklärt ist. | | | |
| C4 | Motorkühlung | nur nach Prüfung (Motorkühlung). Steigt die Temperaturanzeige, erscheint eine Temperaturwarnung oder tritt Dampf aus: sofort sicher anhalten und den Motor abstellen. Das heiße Kühlsystem nicht öffnen. | | | |
| C5 | Airbag/Gurte | nur nach Prüfung (Airbag und Gurte). Airbags oder Gurtstraffer lösen bei einem Unfall möglicherweise nicht aus. Nicht selbst am System arbeiten und zeitnah eine Fachwerkstatt aufsuchen. | | | |
| C6 | Hochvolt | nur nach Prüfung (Hochvoltsystem). Keine eigenen Arbeiten am Hochvoltsystem – nur durch entsprechend geschultes Fachpersonal. Bei einer Hochvolt-Warnmeldung sicher anhalten. | | | |
| C7 | Sonstige, Rot | nur eingeschränkt. Starke Belastung und längere Fahrten vermeiden; bei deutlichen Symptomen, roter oder blinkender Warnleuchte sicher anhalten. Zeitnah fachlich prüfen lassen. | | | |
| C8 | Sonstige, Gelb | meist möglich, solange keine starken Symptome oder roten Warnleuchten auftreten. Hohe Belastung vermeiden und zeitnah prüfen lassen. | | | |
| C9 | Sonstige, Grün | meist möglich, wenn das Fahrzeug normal fährt und keine weiteren Warnzeichen auftreten. Nach einigen Fahrten erneut auslesen. | | | |
| C10 | Importiert, nicht geprüft | keine fachlich geprüfte Einschätzung vorhanden (automatisch importierter Eintrag). Bei Warnleuchten, spürbaren Veränderungen oder Unsicherheit nicht weiterfahren und fachlich prüfen lassen. | | | |

### D. Weitere zu prüfende Inhalte

| Nr. | Inhalt | Ort | Ergebnis | Geprüft von | Datum |
|---|---|---|---|---|---|
| D1 | Allgemeiner Sicherheitshinweis unter dem Ergebnis („Bei roter Warnleuchte, Rauch …“) | `dist/index.html`, `.safety` | | | |
| D2 | Hinweisbox im Chat (Grenzen, Vorrang von Fahrzeugwarnungen, keine personenbezogenen Daten) | `dist/index.html`, `.ai-chat-notice` | | | |
| D3 | Systemanweisung an die KI | `server/chat.js`, `SYSTEM` | | | |
| D4 | Anweisung zur Datenbasis und Weiterfahrt (inkl. Ausfall der Datenbasis) | `server/chat.js`, `factsMessage` | | | |
| D5 | Redaktionelle Einträge (32 Basiscodes): Dringlichkeit, Erklärung, Ursachen | `db/seed/generic-codes.json` | | | |

### E. Auslöser der Sofort-Hinweise

Die Erkennung arbeitet mit festen Wortmustern (`dist/safety-signals.js`), versteht keine Verneinungen und warnt im Zweifel lieber. Bitte prüfen, ob typische Formulierungen echter Notlagen fehlen; Beispiele in `server/safety-signals.test.js` ergänzen.

| Nr. | Frage | Ergebnis | Geprüft von | Datum |
|---|---|---|---|---|
| E1 | Fehlen Gefahrenzeichen ganz (z. B. Reifenschaden, Radverlust, Gasgeruch bei Gasfahrzeugen)? | | | |
| E2 | Fehlen typische Formulierungen zu den vorhandenen Gefahrenzeichen? | | | |
