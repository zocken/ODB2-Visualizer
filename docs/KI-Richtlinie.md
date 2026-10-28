# KI-Richtlinie für das Projekt „OBD2 Klartext“

| | |
|---|---|
| Version | 1.1 |
| Stand | 28. Oktober 2026 |
| Status | Entwurf zur Freigabe |
| Projektverantwortlicher | Falk Brüggen |
| Anwendung | https://obd2.traders-ai-signals.de/ |

Umsetzungsstand je Abschnitt: [KI-Umsetzungsstand.md](KI-Umsetzungsstand.md)

## 1. Zweck und Geltungsbereich

OBD2 Klartext unterstützt Nutzende dabei, Fahrzeugfehlercodes zu verstehen, betroffene Systeme zu erkennen und Fragen zur Fahrzeugtechnik zu stellen.

Diese Richtlinie regelt die Entwicklung, den Betrieb und die Weiterentwicklung des KI-Assistenten sowie den Einsatz von KI als Entwicklungswerkzeug. Sie gilt für alle Personen, die im Auftrag des Projekts KI einsetzen oder betreuen.

Sie ist eine interne Projektrichtlinie und keine amtliche EU-Richtlinie. Ihre Freigabe bestätigt weder die vollständige technische Umsetzung noch automatisch die Rechtskonformität der Anwendung.

## 2. Aufgabe und Grenzen des KI-Assistenten

Der KI-Assistent darf:

- Fehlercodes und technische Zusammenhänge verständlich erläutern;
- mögliche Ursachen und allgemeine Prüfansätze nennen;
- nach Fahrzeugtyp, Baujahr, Motorisierung und Symptomen fragen;
- auf Unsicherheiten, fehlende Informationen und notwendigen fachlichen Rat hinweisen.

Er darf keine gesicherte Fahrzeugdiagnose, verbindliche Reparaturentscheidung oder Freigabe zur Weiterfahrt erteilen. Ein Fehlercode allein beweist keinen Bauteildefekt.

Die Anwendung steuert keine Fahrzeugfunktionen. Eine spätere Anbindung an Fahrzeuge, Diagnosegeräte oder ausführbare Werkzeuge benötigt eine gesonderte Prüfung und Freigabe.

## 3. Transparenz gegenüber Nutzenden

Vor der ersten Eingabe muss deutlich erkennbar sein, dass Antworten durch KI entstehen und Fehler enthalten können. KI-Antworten werden als solche bezeichnet und von fest hinterlegten Codeinformationen unterscheidbar dargestellt.

Im Chatbereich stehen Hinweise auf:

- die Grenzen als Diagnosehilfe;
- den Vorrang von Fahrzeugwarnungen und Herstellerangaben;
- den Verzicht auf personenbezogene Eingaben;
- die Datenschutzerklärung.

Verwendete Datenbankeinträge werden nach Möglichkeit an der Antwort genannt. Solche Quellenhinweise sind keine Bestätigung der gesamten Antwort.

## 4. Sicherheit bei Fahrzeugfragen

Sicherheitshinweise haben Vorrang vor Komfort, Kürze und einer möglichst vollständigen Antwort.

Bei Anzeichen einer akuten Gefahr muss der Assistent zum sicheren Anhalten und zur fachlichen Abklärung auffordern. Er darf gefährliche Symptome nicht durch eine allgemeine Weiterfahrhinweisung relativieren.

Bei erkannten Hinweisen auf eine akute Gefahr zeigt die Anwendung unverzüglich einen passenden, fachlich geprüften Sicherheitshinweis an. Diese Anzeige erfolgt unabhängig von der Erreichbarkeit und Antwortzeit des KI-Modells und bleibt auch bei einer Zeitüberschreitung sichtbar. Nutzende dürfen nicht auf eine KI-Antwort warten müssen, um den grundlegenden Sicherheitshinweis zu erhalten.

Eine Dringlichkeitsfarbe allein reicht für eine Aussage zur Weiterfahrt nicht aus. Insbesondere Hinweise zu Bremsen, Lenkung, Öldruck, Überhitzung, Rückhaltesystemen und Hochvolttechnik benötigen eine fachlich geprüfte Behandlung.

Der Assistent darf keine Anleitungen zur Deaktivierung oder Umgehung von Sicherheits- und Abgassystemen geben. Bei Arbeiten mit erheblichem Verletzungsrisiko verweist er auf entsprechend qualifiziertes Fachpersonal.

## 5. Wissensgrundlage und Unsicherheit

Für hinterlegte Fehlercodes nutzt der Assistent die freigegebene Projektdatenbasis. Allgemeines Modellwissen darf diese Informationen erläutern, aber keine unbelegten fahrzeugspezifischen Tatsachen hinzufügen.

Es gelten folgende Regeln:

- Mögliche Ursachen werden als Möglichkeiten bezeichnet.
- Messwerte, Herstellerangaben, Quellen und Prüfergebnisse dürfen nicht erfunden werden.
- Unbekannte Codes und fehlende Fahrzeugangaben werden ausdrücklich benannt.
- Automatisch importierte oder übersetzte Inhalte dürfen nicht als fachlich geprüft dargestellt werden.
- Widersprüche zwischen Datenbasis, Symptomen und Modellwissen werden offengelegt.

Ist die Datenbasis technisch nicht erreichbar, darf keine codebezogene Antwort den Eindruck erwecken, sie sei durch die Projektdatenbank abgesichert. Sicherheitsbezogene Empfehlungen werden auf vorsichtige allgemeine Hinweise begrenzt.

Bei einem solchen Ausfall zeigt die Anwendung vor dem ersten KI-Antworttext einen deutlich sichtbaren Hinweis darauf an. Dieser Hinweis wird technisch durch die Anwendung eingeblendet und hängt nicht davon ab, ob das Modell den Ausfall selbst erwähnt. Er bleibt der betreffenden Antwort für die Dauer ihrer Anzeige zugeordnet.

## 6. Pflege der Code-Datenbasis

Automatische Aktualisierungen müssen nachvollziehbar sein. Quelle, Quellstand und Änderungen werden dokumentiert.

Technisch erfolgreiche Importe gelten nicht als fachliche Freigabe. Neue oder geänderte sicherheitsrelevante Einstufungen und Handlungshinweise werden vor ihrer Freigabe fachlich geprüft. Bis dahin werden sie zurückgehalten oder mit eingeschränktem Informationsumfang angezeigt.

Fehlerhafte Inhalte müssen korrigiert, ausgeblendet oder auf einen geprüften Stand zurückgesetzt werden können.

## 7. Datenschutz und Datenverarbeitung

Für Chatantworten werden nur die erforderlichen Angaben verarbeitet: die Frage, ein begrenzter Gesprächskontext sowie gegebenenfalls Fehlercode und Herstellerauswahl.

Nutzende werden vor der Eingabe darauf hingewiesen, keine Namen, Kontaktdaten, Kennzeichen, Fahrgestellnummern oder vertraulichen Unterlagen einzugeben.

Für den vorgesehenen Betrieb gilt:

- Die Modellantworten werden auf selbst betriebener Infrastruktur erzeugt.
- Die Anwendung speichert Chatverläufe nicht dauerhaft.
- Chatdaten werden nicht zum Modelltraining verwendet.
- Zugangsschlüssel bleiben serverseitig.
- Übertragungen zwischen öffentlich erreichbaren Systemen werden verschlüsselt.

Diese Anforderungen müssen für die gesamte Verarbeitungskette geprüft werden, einschließlich Hosting, Weiterleitungsdienst, Modellserver und Fehlerprotokollen. Technische Metadaten zur Missbrauchsabwehr werden auf das erforderliche Maß und eine festgelegte Speicherdauer begrenzt.

Änderungen an Empfängern, Speicherfristen oder Verarbeitungszwecken benötigen vor ihrer Einführung eine Datenschutzprüfung und aktualisierte Nutzerinformationen.

## 8. Technische Begrenzung des Assistenten

Der öffentliche KI-Assistent erhält keine Berechtigungen zum Ausführen von Shellbefehlen, Ändern von Dateien, Steuern von Fahrzeugen oder eigenständigen Aufrufen beliebiger externer Dienste.

Anfragen und Antworten werden hinsichtlich Umfang, Laufzeit und Auslastung begrenzt. Modellausgaben werden als nicht vertrauenswürdiger Inhalt behandelt und nicht als ausführbarer Programmcode oder ungeprüftes HTML verarbeitet.

Sicherheitsvorgaben dürfen nicht allein von einer Anweisung an das Modell abhängen. Soweit erforderlich, werden sie zusätzlich durch Anwendungscode und Infrastruktur durchgesetzt.

## 9. Modellwahl und Änderungen

Der Projektverantwortliche dokumentiert:

- Modellbezeichnung und eingesetzte Version;
- Herkunft und Nutzungsbedingungen;
- Betriebsumgebung und Datenwege;
- bekannte Grenzen;
- Systemanweisungen und Freigabestand.

Ein Modellwechsel, wesentliche Änderungen der Systemanweisungen oder neue Funktionen benötigen eine erneute Prüfung. Bei relevanten Qualitäts- oder Sicherheitsproblemen wird die KI-Funktion deaktiviert oder auf einen geprüften Stand zurückgesetzt.

## 10. Prüfung und Freigabe

Vor einer Veröffentlichung und nach wesentlichen Änderungen werden technische und inhaltliche Prüfungen durchgeführt.

Die Prüfung umfasst mindestens:

- bekannte, unbekannte und herstellerspezifische Fehlercodes;
- fehlende und widersprüchliche Fahrzeugangaben;
- sicherheitskritische Symptome und die unverzügliche Anzeige passender Sicherheitshinweise;
- Versuche, Sicherheitsvorgaben zu umgehen;
- Datenbank- und Modellausfälle sowie Zeitüberschreitungen;
- die Anzeige eines Datenbankausfalls vor dem ersten KI-Antworttext;
- Datenschutz, sichere Ausgabe und Missbrauchsbegrenzung.

Tests mit simulierten Modellantworten werden von Tests mit dem tatsächlich eingesetzten Modell unterschieden. Nur durchgeführte Prüfungen werden als bestanden dokumentiert.

Eine Veröffentlichung benötigt die Freigabe des Projektverantwortlichen. Sicherheitsrelevante Fahrzeughinweise benötigen zusätzlich eine geeignete fachliche Prüfung.

## 11. Verantwortung und KI-Kompetenz

Der Projektverantwortliche verantwortet Zweckbestimmung, Modellwahl, Datenschutz, Freigaben und die Bearbeitung gemeldeter Fehler.

Personen, die das System entwickeln oder betreuen, erhalten eine ihrem Aufgabenbereich entsprechende Einweisung. Sie umfasst Modellfehler, Quellenprüfung, Fahrzeugrisiken, Datenschutz und den Umgang mit Sicherheitsvorfällen. Die Einweisung wird dokumentiert.

KI darf Entscheidungen vorbereiten; die Verantwortung für veröffentlichte Funktionen und Inhalte bleibt beim Menschen.

## 12. KI als Entwicklungswerkzeug

Bei der Entwicklung darf KI Texte, Code, Gestaltung und Testideen unterstützen. Übernommene Ergebnisse werden vor ihrer Verwendung geprüft.

Entwicklungsagenten erhalten nur die erforderlichen Projektzugriffe. Änderungen, Befehle und Netzwerkaktionen unterliegen den festgelegten Freigaben. Zugangsdaten und vertrauliche Informationen dürfen nicht ungeprüft in KI-Eingaben gelangen.

Simulierte Nutzertests oder Interviews werden als Simulation bezeichnet. Sie dürfen nicht als tatsächlich erhobene Nutzerergebnisse dokumentiert werden.

## 13. Fehler und Sicherheitsvorfälle

Gemeldete falsche oder gefährliche Antworten werden bewertet und nachvollziehbar bearbeitet. Für Meldungen ist ein leicht auffindbarer Kontakt bereitzustellen.

Bei einem erheblichen Risiko wird die betroffene Funktion unverzüglich eingeschränkt oder deaktiviert. Vor einer erneuten Freigabe werden Ursache, Korrektur und Prüfung dokumentiert.

Für die Fehleranalyse werden nur erforderliche Daten verarbeitet. Eine dauerhafte Sammlung vollständiger Chatverläufe erfolgt nicht automatisch.

## 14. Rechtliche Einordnung und Überprüfung

Für das Projekt wird dokumentiert, welche Rolle der Verantwortliche nach dem EU AI Act einnimmt und welche Pflichten auf die konkrete Anwendung zutreffen. Dabei werden insbesondere Transparenz, KI-Kompetenz und eine mögliche Hochrisiko-Einstufung geprüft.

Die Bezeichnung als Lernprojekt oder ein Haftungshinweis ersetzen diese Prüfung nicht. Datenschutzrechtliche und sonstige einschlägige Anforderungen werden zusätzlich berücksichtigt.

Die Richtlinie wird mindestens jährlich und zusätzlich bei wesentlichen Änderungen überprüft. Dazu gehören neue Modelle, geänderte Datenwege, neue Diagnosefunktionen oder eine Fahrzeuganbindung.

---

| | |
|---|---|
| Freigabe durch | ____________________ |
| Freigabedatum | ____________________ |
| Nächste Überprüfung | spätestens zwölf Monate nach Freigabe |
