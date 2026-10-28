# Technische Prüfungen und Inhaltsfreigabe

Diese Änderungen setzen technische Voraussetzungen der KI-Richtlinie um. Sie ersetzen keine fachliche oder rechtliche Freigabe. Es werden keine bestehenden Inhalte automatisch fachlich freigegeben.

## Installation und Tests

Node.js ab Version 22; nach Aktualisierung des Projekts `npm ci` ausführen. Für Tests werden ausschließlich Entwicklungsabhängigkeiten ergänzt.

```sh
npm test
npx playwright install chromium
npm run test:ui
```

Unter Windows kann alternativ ein installierter Edge verwendet werden: In PowerShell `$env:BROWSER_CHANNEL='msedge'` setzen und anschließend `npm run test:ui` ausführen. Die Browserprüfungen nutzen ausschließlich einen temporären lokalen Testserver und simulierte Antworten. Die Datenbanktests verwenden PGlite im Arbeitsspeicher, keine vorhandene Datenbank.

## Freigabe eines konkreten Inhaltsstands

Beim nächsten regulären Serverstart erweitert die bestehende Migration das Schema. Vor einer produktiven Aktualisierung eine Datenbanksicherung und die reguläre Veröffentlichungsfreigabe vorsehen. Hier wurde keine produktive Migration ausgeführt.

Alle bisherigen Einträge beginnen mit `pending`, auch Inhalte aus redaktioneller Quelle. Ohne gültige Fachfreigabe werden keine farbbasierten Weiterfahrbewertungen angezeigt oder als Fakten an das Modell übergeben. Fest eingeblendete allgemeine Gefahrenhinweise bleiben unabhängig davon verfügbar; deren fachliche Prüfung bleibt erforderlich.

Zuerst den vollständigen Inhalt und seinen Prüfwert abrufen:

```sh
npm run review-code -- P0520
# Herstellereintrag: zusätzlich --manufacturer volkswagen
```

Nach tatsächlicher fachlicher Prüfung genau diesen Stand freigeben:

```sh
npm run review-code -- P0520 --approve --reviewer "Name der prüfenden Person" --hash "Prüfwert aus der vorherigen Ausgabe"
```

Die Ausgabe enthält alle für die Prüfung benötigten Fakten. Der Befehl verlangt den aktuellen Prüfwert und schreibt eine Freigabehistorie. Änderungen an Codeinformationen, Ursachen, Bauteilzuordnungen oder dem Quellstand setzen die Freigabe zurück. Identische erneute Importe bewahren sie. Neue oder erneut eingeblendete Inhalte müssen geprüft werden. Diese Befehle sind nur im geschützten Serverbetrieb verfügbar; es gibt keinen öffentlichen Freigabe-Endpunkt.

## Verbindliche technische Zeitgrenzen

- Antwortbeginn: höchstens 60 Sekunden, einschließlich Datenbankabfrage und Denkphase.
- Gesamtdauer: höchstens 120 Sekunden; neue Antwortteile verlängern diese Grenze nicht.
- Pause zwischen Antwortteilen: höchstens 20 Sekunden.
- Datenbankkontext: nach 3 Sekunden erkennbarer Fallback.

Der Browser hat etwas längere Schutzgrenzen (65/125/25 Sekunden), damit reguläre Serverfehlermeldungen noch angezeigt werden. Abbruch und Fehler entfernen keine Sicherheitshinweise. Eine erreichte Zeitgrenze ist kein bestandener fachlicher Modelltest.

## Veröffentlichungsstand nachweisen

`GET /api/version` liefert Version und reproduzierbaren SHA-256-Prüfwert über Server, Browserdateien, Datenbankschema und Abhängigkeitsstand. Der Wert enthält keine Geheimnisse, Pfade oder Zugangsdaten. Bei identischem Paket ist er auf Windows und Linux gleich. Ein geänderter Stand benötigt eine neue Prüfung.

Nach einer autorisierten Veröffentlichung aus genau der geprüften Arbeitskopie ausführen:

```sh
npm run verify-release -- https://obd2.traders-ai-signals.de/
```

Die Prüfung verlangt die passende Kennung, ein bereites Backend, passende sicherheitsrelevante Browserdateien und die korrekte Moduleinbindung. Abweichungen führen zu einem Fehlerstatus. Für den statischen Export erstellt `npm run build:static` eine `release.json`; hierfür `npm run verify-release -- https://statische-adresse/ --static` verwenden.

## Verbleibende externe Prüfungen

Für einen späteren, ausdrücklich vorgesehenen Test des laufenden Modells steht `npm run evaluate-model -- https://adresse/` bereit. Er sendet vier synthetische Fragen nacheinander und speichert Antworten, Laufzeiten, Fehler und den veröffentlichten Versionsstand unter `test-results/`. Textmuster helfen bei der Sichtung, ersetzen aber keine fachliche Bewertung. Das tatsächlich geladene Modell ist zusätzlich in LM Studio zu bestätigen. Dieser Ablauf wurde nicht gegen die Live-App ausgeführt.

Fachliche Freigaben, echte Modell-Sicherheitstests, Prüfung von Hosting/Gateway/LM-Studio-Protokollen und Verschlüsselung, rechtliche Einordnung und organisatorische Einweisung bleiben gesonderte Aufgaben. Testberichte dürfen diese Aufgaben nicht als erledigt ausweisen.
