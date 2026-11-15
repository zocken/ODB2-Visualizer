# Modellauswahl unter dem Chat

Stand: 15. November 2026. Beauftragte Änderung: geladene Modelle unter der Chatbox auswählbar machen und paralleles Laden mehrerer Modelle ermöglichen.

## Technische Prüfung

- `node --test`: 65 Tests bestanden. Darunter Modellauswahl für Werkzeugentscheidung und Antwort, Prüfung gegen die geladene Liste, abgewiesene ungültige und entladene Kennungen, geschützter Zugriff auf das Gateway, Grenzen für Inventarabrufe und Streaming.
- Lokale Oberfläche mit simuliertem Backend: Zwei Modelle erscheinen unter dem Eingabefeld. Die ausgewählte Kennung erreicht die Antwortanfrage. Modellwechsel setzt das Gespräch zurück; Neuladen merkt sich die Kennung. Ein fester Sicherheitshinweis wird auch ohne gewähltes Modell unmittelbar angezeigt.
- Responsiver Prüfpunkt bei 390 Pixel Breite: keine horizontale Überbreite; Auswahl befindet sich unter dem Eingabefeld.
- Echte Gateway-Anfragen an `local/gpt-oss-120b-obd2` und `recursivesi/flint`: beide mit HTTP 200, passender Antwortkennung und sichtbarem Antworttext. Beide Modelle blieben gleichzeitig geladen.
- Vollständiger OBD2-Verarbeitungsweg mit Werkzeugentscheidung und kurzer Begrüßung: beide Modelle lieferten eine vollständige Antwort.

## Getrennte Beobachtungen zur Modellqualität

Vier vorhandene synthetische Fahrzeugfragen wurden zusätzlich mit jedem Modell über den OBD2-Verarbeitungsweg geprüft. GPT-OSS lieferte drei vollständige Antworten; beim vierten Fall war die Werkzeugentscheidung nicht als JSON verwertbar. Flint lieferte in diesen vier Fällen keine vollständige Antwort: einmal war das Tokenbudget mit der Denkphase ausgeschöpft, dreimal war die Werkzeugentscheidung nicht verwertbar. Unbrauchbare Werkzeugantworten werden nun als Modellproblem mit HTTP 502 gemeldet, anstatt einen Verbindungsfehler vorzutäuschen.

Diese Beobachtungen sind keine bestandene fachliche Modellprüfung. Die Auswahlfunktion erteilt keine Inhaltsfreigabe für ein geladenes Modell. Ergebnisse einfacher Erreichbarkeitstests und komplexer Fahrzeugfragen dürfen nicht gleichgesetzt werden.

Die simulierten Prüfungen bestätigen keine Antwortqualität des Modells. Prüfungen mit echten Modellen und synthetischen Fahrzeugfragen werden getrennt erfasst; Textmuster ersetzen keine fachliche Inhaltsfreigabe. Sicherheitsvorgaben, deterministische Warnungen und Begrenzung der MCP-Werkzeuge bleiben unabhängig von der Modellauswahl erhalten.
