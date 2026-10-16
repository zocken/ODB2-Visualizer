# Quellen und redaktionelle Methodik

Stand: 16.10.2026

## Herkunft der Code-Bezeichnungen

Die Struktur der Diagnosecodes und die standardisierten englischen Bezeichnungen werden durch SAE J2012 sowie den zugehörigen Digital Annex J2012DA beschrieben. ISO 15031-6 verweist für den standardisierten DTC-Satz und die Textbezeichnungen auf SAE J2012-DA. Die in der App verwendeten deutschen Bezeichnungen sind kurze redaktionelle Übertragungen und keine amtlichen deutschen Normzitate.

Primärquellen:

1. SAE International, **SAE J2012 – Diagnostic Trouble Code Definitions**, aktuelle Fassung 2025: https://saemobilus.sae.org/standards/j2012_202509-diagnostic-trouble-code-definitions
2. SAE International, **J2012DA – Digital Annex of Diagnostic Trouble Code Definitions and Failure Type Byte Definitions**, aktuelle Fassung 2026: https://saemobilus.sae.org/standards/j2012da_202607-digital-annex-diagnostic-trouble-code-definitions-failure-type-byte-definitions
3. ISO, **ISO 15031-6:2015 – Diagnostic trouble code definitions**: https://www.iso.org/standard/66369.html
4. Europäische Union, **Richtlinie 98/69/EG**, Anhang XI 3.1.1; emissionsbezogene Fehlercodes müssen mit ISO 15031-6 beziehungsweise SAE J2012 übereinstimmen: https://eur-lex.europa.eu/eli/dir/1998/69/oj/deu
5. U.S. Environmental Protection Agency, **On-Board Diagnostic (OBD) Regulations and Requirements: Questions and Answers**: https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=P100LW9G.TXT

## Abdeckung der 32 Codes

Die Standardzuordnung gilt für die in der App enthaltenen Codes:

- Antrieb: `P0100`, `P0101`, `P0115`, `P0128`, `P0130`, `P0135`, `P0171`, `P0172`, `P0201`, `P0202`, `P0300`, `P0301`, `P0302`, `P0303`, `P0304`, `P0335`, `P0340`, `P0401`, `P0420`, `P0430`, `P0442`, `P0455`, `P0500`, `P0562`, `P0700`, `P0715`
- Karosserie: `B0020`, `B1000`
- Fahrwerk: `C0035`, `C0040`
- Netzwerk: `U0100`, `U0121`

`B1000` ist als herstellerspezifisch gekennzeichnet. Seine genaue Bedeutung kann ohne Marke, Modell, Baujahr und betroffenes Steuergerät nicht allgemein bestimmt werden.

## Herkunft der Erklärungen und Ursachen

Die einfachen deutschen Erklärungen, Dringlichkeitsstufen, möglichen Ursachen und Prüfschritte wurden für dieses Lernprojekt redaktionell formuliert. Sie stammen nicht wörtlich aus SAE J2012, ISO 15031-6 oder einer einzelnen Reparaturdatenbank. Insbesondere legt ein DTC in der Regel ein erkanntes Fehlerbild fest, aber nicht automatisch das tatsächlich defekte Bauteil.

Die Ursachenlisten sind deshalb als **allgemeine, nicht abschließende Diagnosehypothesen** gekennzeichnet. Für eine belastbare Diagnose sind mindestens erforderlich:

- Marke, Modell, Baujahr, Motorisierung und Steuergerät
- Freeze-Frame-Daten und weitere gespeicherte Codes
- Messwerte und elektrische beziehungsweise mechanische Prüfungen
- fahrzeugspezifische Hersteller-Reparaturinformationen und technische Servicehinweise

Die App darf nicht als Beleg dafür verstanden werden, dass ein genanntes Bauteil tatsächlich defekt ist. Sie ersetzt keine Fachdiagnose.

