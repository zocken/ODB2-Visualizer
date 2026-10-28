# Prüfliste Modell und Verarbeitungskette (KI-Richtlinie, Abschnitte 7 und 9)

Stand: 28. Oktober 2026 · auszufüllen vom Projektverantwortlichen

LM Studio und der Weiterleitungsdienst laufen auf einem eigenen Rechner, auf den die Entwicklungsumgebung keinen Zugriff hat. Diese Punkte lassen sich deshalb nur dort prüfen.

## Modell (Abschnitt 9)

| Punkt | Wo nachsehen | Ergebnis |
|---|---|---|
| Genaue Modellbezeichnung und Version (inkl. Quantisierung, z. B. Q4_K_M) | LM Studio → My Models, Modelldetails | `qwen3.8-flash-next` – Version: |
| Herkunft (Anbieter, Download-Quelle, z. B. Hugging Face-Repository) | Modelldetails / Download-Seite | |
| Lizenz und Nutzungsbedingungen (öffentliche, auch nicht-kommerzielle Nutzung erlaubt?) | Modellkarte / Lizenzdatei des Repositorys | |
| Bekannte Grenzen laut Modellkarte (Sprache, Halluzinationen, Wissensstand) | Modellkarte | |
| Systemanweisung und Freigabestand | `server/chat.js` (`SYSTEM`, `factsMessage`), Git-Commit | Entwurf, nicht freigegeben |

## Verarbeitungskette (Abschnitt 7)

| Station | Zu prüfen | Ergebnis |
|---|---|---|
| App-Server (Coolify, Hostinger, Frankfurt) | Container-Logs enthalten nur Fehlercodes, keine Fragen (bereits im Code so umgesetzt); Aufbewahrung der Coolify-Logs | |
| Hostinger | Auftragsverarbeitungsvertrag (Art. 28 DSGVO) abgeschlossen bzw. in den AGB enthalten | |
| Weiterleitung (`LM_GATEWAY_URL`, SSH-Tunnel) | Wird Anfrageinhalt protokolliert? Verschlüsselt (HTTPS bzw. SSH)? | |
| LM Studio | Protokolliert der Server Prompts/Antworten (Developer-Logs, ausführliche Protokollierung)? Wo und wie lange werden Logs gespeichert? Gespeicherte Chats in der LM-Studio-Oberfläche betreffen den Server nicht, trotzdem prüfen | |
| Modelltraining | Keine Übermittlung an Dritte; LM Studio lokal ohne Telemetrie zu Prompts? | |
| Missbrauchsabwehr | IP-Adressen nur im Arbeitsspeicher, nach ca. einer Minute verworfen (im Code umgesetzt) | erfüllt |

Ergebnisse, die von der Datenschutzerklärung abweichen, erfordern eine Anpassung der Datenschutzerklärung (Abschnitt 7, letzter Absatz).
