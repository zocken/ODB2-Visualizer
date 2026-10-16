// Erzeugt Seed-Dateien aus der Codeliste von github.com/Wal33D/dtc-database (MIT).
// Titel werden per Glossar übersetzt; Erklärung, Ursachen, Dringlichkeit und Bauteilzuordnung
// entstehen aus Vorlagen je Codefamilie und sind als automatisch erzeugt gekennzeichnet.
//
// Aufruf: node tools/import-wal33d.js [Anzahl generischer Codes, Standard 2000]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { translateTitle } from './glossary.js';

const ROOT = new URL('../', import.meta.url);
const SOURCE_DIR = new URL('db/source/wal33d/', ROOT);
const SOURCE = 'Wal33D/dtc-database (MIT) · deutsche Texte automatisch erzeugt';
const GENERIC_FILES = ['p_codes.txt', 'u_codes.txt', 'c_codes.txt', 'b_codes.txt'];
const SKIPPED_FILES = ['other_codes.txt']; // keine Herstellerzuordnung
const GENERIC_TARGET = Number(process.argv[2] || 2000);
// Anteil je Bereich, Rest wird mit P0-Codes aufgefüllt.
const QUOTAS = { P0: 0.6, U0: 0.15, C0: 0.075, B0: 0.05, P2: 0.125 };

const BRANDS = {
  acura: 'Acura', audi: 'Audi', bmw: 'BMW', buick: 'Buick', cadillac: 'Cadillac', chevy: 'Chevrolet',
  chrysler: 'Chrysler', dodge: 'Dodge', ford: 'Ford', geo: 'Geo', gm: 'General Motors', gmc: 'GMC',
  honda: 'Honda', infiniti: 'Infiniti', jaguar: 'Jaguar', jeep: 'Jeep', kia: 'Kia', lexus: 'Lexus',
  lincoln: 'Lincoln', mazda: 'Mazda', mercedes: 'Mercedes-Benz', mercury: 'Mercury', mitsubishi: 'Mitsubishi',
  nissan: 'Nissan', oldsmobile: 'Oldsmobile', plymouth: 'Plymouth', pontiac: 'Pontiac', saturn: 'Saturn',
  subaru: 'Subaru', suzuki: 'Suzuki', toyota: 'Toyota', volkswagen: 'Volkswagen',
};

const generic = JSON.parse(readFileSync(new URL('db/seed/generic-codes.json', ROOT), 'utf8'));
const componentLabels = Object.fromEntries(generic.components.map((c) => [c.id, c.label]));
const handwritten = new Set(generic.codes.map((c) => c.code));

function readCodes(file) {
  const codes = new Map();
  for (const line of readFileSync(new URL(file, SOURCE_DIR), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([PBCU][0-3][0-9A-F]{3}) - (.+)$/);
    if (m && !codes.has(m[1])) codes.set(m[1], m[2].trim());
  }
  return codes;
}

// Codefamilien: erste passende Regel bestimmt System, Lage, Bauteile und Dringlichkeit.
const FAMILIES = [
  { re: /misfire/i, system: 'Motor & Verbrennung', location: 'Motor', context: ['engine'], cylinders: true, urgency: 'Rot' },
  // Vor Getriebe/Kraftstoff prüfen, sonst greifen "Clutch" bzw. "Fuel" (A/C Clutch, Cruise Control).
  { re: /a\/c|refrigerant|hvac/i, system: 'Klimaanlage', location: 'Klimakreislauf', active: ['ac-compressor'], urgency: 'Grün' },
  { re: /cruise control/i, system: 'Tempomat', location: 'Lenkrad / Steuergerät', context: ['steering'], urgency: 'Grün' },
  { re: /glow plug/i, system: 'Vorglühanlage', location: 'Motor – Zylinderkopf', active: ['glow-plugs'], context: ['engine'] },
  { re: /ignition coil|ignition [a-l] |spark/i, system: 'Zündung', location: 'Motor – Zündanlage', context: ['engine'], cylinders: true },
  { re: /injector|injection/i, system: 'Einspritzung', location: 'Motor – Einspritzanlage', active: ['fuel-rail'], context: ['engine'], injectors: true },
  { re: /knock/i, system: 'Klopfregelung', location: 'Motorblock', active: ['knock-sensor'], context: ['engine'] },
  { re: /crankshaft/i, system: 'Motorsynchronisation', location: 'Unterer Motorbereich', active: ['crankshaft'], context: ['engine'], urgency: 'Rot' },
  { re: /camshaft|valve timing|intake valve|exhaust valve|rocker/i, system: 'Ventilsteuerung', location: 'Zylinderkopf', active: ['camshaft'], context: ['engine'] },
  { re: /o2 sensor|ho2s|oxygen sensor|air-fuel ratio/i, system: 'Abgasregelung', location: 'Abgasstrang', active: ['lambda-front'], context: ['exhaust'], lambdaRear: true },
  { re: /catalyst|catalytic/i, system: 'Abgasnachbehandlung', location: 'Abgasstrang', active: ['cat-1'], context: ['exhaust'], bank2: ['cat-2'] },
  { re: /particulate|dpf|reductant|nox|aftertreatment|scr/i, system: 'Abgasnachbehandlung (Diesel)', location: 'Abgasstrang', active: ['exhaust'] },
  { re: /egr|exhaust gas recirculation/i, system: 'Abgasrückführung', location: 'AGR-System am Motor', active: ['egr'], context: ['engine', 'exhaust'] },
  { re: /secondary air/i, system: 'Sekundärluftsystem', location: 'Motorraum / Abgasstrang', active: ['intake'], context: ['exhaust'] },
  { re: /exhaust/i, system: 'Abgasanlage', location: 'Abgasstrang', active: ['exhaust'] },
  { re: /evap|purge|fuel cap|\bvent\b|leak detection/i, system: 'Tankentlüftung', location: 'Tank und Entlüftungsleitungen', active: ['evap'], context: ['tank'] },
  { re: /fuel level/i, system: 'Kraftstoffanzeige', location: 'Kraftstofftank', active: ['tank'], urgency: 'Grün' },
  { re: /fuel/i, system: 'Kraftstoffversorgung', location: 'Kraftstoffsystem', active: ['fuel-rail'], context: ['engine'] },
  { re: /mass or volume air flow|mass air flow|\bmaf\b/i, system: 'Luftversorgung', location: 'Ansaugtrakt', active: ['maf'], context: ['intake'] },
  { re: /charge air cooler|intercooler/i, system: 'Aufladung', location: 'Ladeluftstrecke', active: ['charge-air-cooler'], context: ['turbo'] },
  { re: /turbo|supercharger|boost|wastegate|charge air/i, system: 'Aufladung', location: 'Turbolader / Ladeluftstrecke', active: ['turbo'], context: ['intake', 'charge-air-cooler'] },
  { re: /pedal position|accelerator/i, system: 'Fahrpedal', location: 'Fußraum Fahrerseite', active: ['pedal'], context: ['ecm'], urgency: 'Rot' },
  { re: /throttle|idle air|idle control/i, system: 'Luftversorgung', location: 'Drosselklappe / Ansaugtrakt', active: ['throttle'], context: ['intake'] },
  { re: /manifold absolute|barometric|intake air|intake manifold|idle/i, system: 'Luftversorgung', location: 'Ansaugtrakt', active: ['intake'], context: ['engine'] },
  { re: /thermostat/i, system: 'Motorkühlung', location: 'Kühlkreislauf', active: ['thermostat'], context: ['cooling'] },
  { re: /coolant temperature/i, system: 'Motorkühlung', location: 'Kühlkreislauf', active: ['coolant-sensor'], context: ['cooling'] },
  { re: /coolant|radiator|cooling fan|\bfan\b/i, system: 'Motorkühlung', location: 'Kühlkreislauf', active: ['cooling'], context: ['engine'] },
  { re: /oil pressure/i, system: 'Motorschmierung', location: 'Motor', active: ['oil-pressure'], context: ['engine'], urgency: 'Rot' },
  { re: /\boil\b/i, system: 'Motorschmierung', location: 'Motor', active: ['engine'] },
  { re: /input.*speed|turbine speed/i, system: 'Automatikgetriebe', location: 'Getriebegehäuse', active: ['input-speed'], context: ['transmission'] },
  { re: /transmission|shift|gear|torque converter|clutch|output.*speed|intermediate shaft|park position/i, system: 'Getriebe', location: 'Getriebe und Steuergerät', active: ['transmission'], context: ['tcm'] },
  { re: /vehicle speed/i, system: 'Geschwindigkeitserfassung', location: 'Getriebe oder Radnabe', active: ['vehicle-speed'], context: ['transmission'] },
  { re: /wheel speed/i, system: 'ABS & Fahrstabilität', location: 'Radbereich', active: ['abs'], urgency: 'Rot', wheels: true },
  { re: /brake|\babs\b|stability|yaw|acceleration sensor|traction/i, system: 'Bremse & Fahrstabilität', location: 'Bremssystem', active: ['abs'], urgency: 'Rot' },
  { re: /steering/i, system: 'Lenkung', location: 'Lenkung / Vorderachse', active: ['steering'], urgency: 'Rot' },
  { re: /airbag|deployment|restraint|pretensioner|occupant|knee bolster|seat belt/i, system: 'Rückhaltesystem', location: 'Innenraum', context: ['bcm'], urgency: 'Rot', airbag: true },
  { re: /drive motor|inverter|motor generator/i, system: 'Hybrid-/Elektroantrieb', location: 'Elektromotor / Leistungselektronik', active: ['e-motor'], context: ['hv-battery'], urgency: 'Rot' },
  { re: /hybrid|\bev\b|contactor|high voltage|dc\/dc|battery pack|charger|cell/i, system: 'Hybrid-/Elektroantrieb', location: 'Hochvolt-System', active: ['hv-battery'], urgency: 'Rot' },
  { re: /battery|generator|alternator|charging|system voltage|starter/i, system: 'Bordnetz', location: 'Batterie und Ladesystem', active: ['battery', 'alternator'] },
  { re: /lost communication|invalid data|communication bus|\bcan\b|\bbus\b/i, system: 'Steuergeräte-Netzwerk', location: 'CAN-Netzwerk', active: ['can'], network: true },
  { re: /control module|ecm|pcm|processor|memory|programming|reference voltage|supply voltage|power relay|software/i, system: 'Steuergerät / Elektronik', location: 'Motorsteuergerät', active: ['ecm'] },
];
const DEFAULTS = {
  P: { system: 'Antrieb', location: 'Motor / Antrieb', context: ['engine'] },
  B: { system: 'Karosserieelektronik', location: 'Karosserie-Steuergeräte', context: ['bcm'] },
  C: { system: 'Fahrwerk', location: 'Fahrwerk' },
  U: { system: 'Steuergeräte-Netzwerk', location: 'CAN-Netzwerk', active: ['can'] },
};

// Fehlerart aus dem Originaltitel: bestimmt Erklärung und typische Ursachen.
const FAULTS = [
  { re: /misfire/i, explain: 'Das Motorsteuergerät erkennt Verbrennungsaussetzer. Das kann Ruckeln, Leistungsverlust oder eine blinkende Motorkontrollleuchte verursachen.', causes: ['Zündkerze oder Zündspule', 'Einspritzventil', 'Kompressionsverlust oder Falschluft'] },
  { re: /lost communication/i, explain: 'Andere Steuergeräte empfangen keine Botschaften mehr vom genannten Modul.', causes: ['Unterspannung oder fehlende Versorgung des Steuergeräts', 'CAN-Bus-Leitung oder Stecker', 'Steuergerät ohne Funktion'] },
  { re: /invalid data/i, explain: 'Vom genannten Modul kommen Daten an, die unplausibel oder fehlerhaft sind.', causes: ['Fehlerhafter Sensorwert im sendenden Modul', 'Software- oder Konfigurationsstand', 'Störung auf dem CAN-Bus'] },
  { re: /\bbus\b.*(open|low|high|off|performance)|communication bus/i, explain: 'Auf dem Kommunikationsbus wurde eine elektrische Störung oder ein Busausfall erkannt.', causes: ['CAN-Bus-Leitung beschädigt oder Kurzschluss', 'Korrodierter Stecker am Bus', 'Steuergerät stört den Bus'] },
  { re: /leak/i, explain: 'Im geschlossenen System wurde eine Undichtigkeit erkannt.', causes: ['Tankdeckel oder Dichtung', 'Poröser Schlauch oder lose Verbindung', 'Defektes Ventil'] },
  { re: /too lean|\blean\b/i, explain: 'Das Gemisch enthält im Verhältnis zum Kraftstoff zu viel Luft.', causes: ['Falschluft im Ansaugsystem', 'Zu niedriger Kraftstoffdruck', 'Luftmassenmesser misst ungenau'] },
  { re: /too rich|\brich\b/i, explain: 'Das Gemisch enthält im Verhältnis zur Luft zu viel Kraftstoff.', causes: ['Undichtes Einspritzventil', 'Zu hoher Kraftstoffdruck', 'Fehlerhafter Sensorwert'] },
  { re: /efficiency|threshold/i, explain: 'Die gemessene Wirkung des Systems liegt unter dem vorgeschriebenen Mindestwert.', causes: ['Gealtertes oder beschädigtes Bauteil', 'Fehlerhafte Lambdasonde oder Sensor', 'Vorangegangene Motorfehler'] },
  { re: /over ?temperature|temperature too high/i, explain: 'Die Temperatur im betroffenen System ist höher als zulässig.', causes: ['Kühlung oder Flüssigkeitsstand', 'Defekter Temperatursensor', 'Hohe Belastung'] },
  { re: /circuit\s*\/\s*open|\bopen\b/i, explain: 'Das Steuergerät erkennt im betroffenen Stromkreis eine Unterbrechung oder ein fehlendes Signal.', causes: ['Leitungsunterbrechung oder gelöster Stecker', 'Defektes Bauteil', 'Sicherung oder Spannungsversorgung'] },
  { re: /intermittent|erratic/i, explain: 'Das Signal fällt zeitweise aus oder springt unplausibel. Typisch sind Wackelkontakte.', causes: ['Wackelkontakt an Stecker oder Leitung', 'Scheuerstelle am Kabelbaum', 'Bauteil fällt sporadisch aus'] },
  { re: /\blow\b|short to ground/i, explain: 'Das Signal im betroffenen Stromkreis liegt unter dem erwarteten Bereich – häufig ein Kurzschluss nach Masse oder ein Sensorfehler.', causes: ['Kurzschluss nach Masse in der Leitung', 'Stecker korrodiert oder beschädigt', 'Defektes Bauteil'] },
  { re: /\bhigh\b|short to battery/i, explain: 'Das Signal im betroffenen Stromkreis liegt über dem erwarteten Bereich – häufig eine Unterbrechung, ein Kurzschluss nach Plus oder ein Sensorfehler.', causes: ['Unterbrechung oder Kurzschluss nach Plus', 'Fehlerhafte Masseverbindung', 'Defektes Bauteil'] },
  { re: /range|performance|correlation|stuck|slow|delayed|incorrect|no activity|no signal/i, explain: 'Das Bauteil liefert zwar ein Signal oder reagiert, arbeitet aber außerhalb des erwarteten Bereichs oder passt nicht zu anderen Messwerten.', causes: ['Bauteil arbeitet außerhalb des Sollbereichs', 'Mechanische Ursache im betroffenen System', 'Fehlerhaftes Signal eines beteiligten Sensors'] },
];
const DEFAULT_FAULT = { explain: 'Das Steuergerät hat im betroffenen System eine Abweichung erkannt.', causes: ['Stecker oder Leitung', 'Bauteil im betroffenen System', 'Steuergerät oder Software'] };

const CRITICAL_MODULES = /engine control|ecm|pcm|abs|brake|steering|restraint|airbag/i;

function describe(code, en, brand) {
  const family = FAMILIES.find((f) => f.re.test(en)) || DEFAULTS[code[0]];
  const fault = FAULTS.find((f) => f.re.test(en)) || DEFAULT_FAULT;
  let active = [...(family.active || [])];
  const context = [...(family.context || [])];
  const cylinder = Number(en.match(/cylinder (\d+)/i)?.[1]);
  if (family.cylinders && cylinder >= 1 && cylinder <= 4) active = [`cylinder-${cylinder}`];
  if (family.injectors && cylinder >= 1 && cylinder <= 4) active = [`injector-${cylinder}`];
  if (family.bank2 && /bank 2/i.test(en)) active = family.bank2;
  // Sensor 2/3 sitzen hinter dem Katalysator.
  if (family.lambdaRear && /sensor [23]\b/i.test(en)) active = ['lambda-rear'];
  if (family.wheels) {
    if (/left front|front left|\blf\b/i.test(en)) active = ['wheel-fl'];
    else if (/right front|front right|\brf\b/i.test(en)) active = ['wheel-fr'];
    else if (/left rear|rear left|\blr\b/i.test(en)) active = ['wheel-rl'];
    else if (/right rear|rear right|\brr\b/i.test(en)) active = ['wheel-rr'];
  }
  if (family.airbag && /left side|side.*left/i.test(en)) active = ['airbag-left'];
  if (family.network) {
    if (/engine control|ecm|pcm/i.test(en)) active = ['ecm', 'can'];
    else if (/\babs\b|anti-lock|brake/i.test(en)) active = ['abs', 'can'];
    else if (/transmission|\btcm\b/i.test(en)) active = ['tcm', 'can'];
  }
  let urgency = family.urgency || 'Gelb';
  if (family.network) urgency = CRITICAL_MODULES.test(en) ? 'Rot' : 'Gelb';
  if (/small leak|very small leak/i.test(en)) urgency = 'Grün';
  const ids = [...active, ...context.filter((id) => !active.includes(id))];
  const explanation = `${fault.explain}${brand ? ` Herstellerspezifischer Code (${brand}): Die genaue Bedeutung kann je nach Modell und Steuergerät abweichen.` : ''}`;
  return {
    system: family.system,
    urgency,
    explanation,
    location: family.location,
    causes: fault.causes,
    vehicle: { active, context: context.filter((id) => !active.includes(id)), labels: ids.map((id) => componentLabels[id]).filter(Boolean) },
  };
}

function entry(code, en, brand, manufacturer = null) {
  const title = translateTitle(en);
  return {
    code,
    manufacturer,
    title: title.complete ? title.text : en,
    titleEn: en,
    ...describe(code, en, brand),
    source: SOURCE,
    translated: title.complete,
  };
}

// Herstellerunabhängige Codes: nur vollständig übersetzte, Kontingente je Bereich.
const pool = new Map();
for (const file of GENERIC_FILES) {
  for (const [code, en] of readCodes(file)) {
    if (handwritten.has(code) || !/^[PBCU][023]/.test(code)) continue;
    const e = entry(code, en);
    if (!e.translated) continue;
    const group = code.slice(0, 2);
    if (!pool.has(group)) pool.set(group, []);
    pool.get(group).push(e);
  }
}
// Gleichmäßig über den Codebereich verteilen, damit alle Systemfamilien vertreten sind.
const spread = (list, n) => (n >= list.length ? list : Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]));
const chosen = [];
for (const [group, share] of Object.entries(QUOTAS)) chosen.push(...spread(pool.get(group) || [], Math.round(GENERIC_TARGET * share)));
const chosenCodes = new Set(chosen.map((c) => c.code));
for (const group of ['P0', 'P2', 'U0', 'C0', 'B0']) {
  for (const e of pool.get(group) || []) {
    if (chosen.length >= GENERIC_TARGET) break;
    if (!chosenCodes.has(e.code)) { chosen.push(e); chosenCodes.add(e.code); }
  }
}
chosen.sort((a, b) => a.code.localeCompare(b.code));
const strip = ({ translated, ...rest }) => rest;
writeFileSync(new URL('db/seed/sae-generic-wal33d.json', ROOT), `${JSON.stringify({
  description: `Herstellerunabhängige Codes aus ${SOURCE}`,
  codes: chosen.map(strip),
}, null, 1)}\n`);

// Herstellerspezifische Codes: alle Marken, Titel übersetzt wo vollständig möglich, sonst englisch.
const manufacturers = [];
const brandCodes = [];
let translatedBrand = 0;
for (const file of readdirSync(SOURCE_DIR).filter((f) => f.endsWith('_codes.txt')).sort()) {
  const slug = file.replace('_codes.txt', '');
  if (GENERIC_FILES.includes(file) || SKIPPED_FILES.includes(file)) continue;
  const name = BRANDS[slug];
  if (!name) { console.warn(`Unbekannte Marke übersprungen: ${file}`); continue; }
  manufacturers.push({ slug, name });
  for (const [code, en] of readCodes(file)) {
    const e = entry(code, en, name, slug);
    if (e.translated) translatedBrand++;
    brandCodes.push(strip(e));
  }
}
writeFileSync(new URL('db/seed/manufacturer-wal33d.json', ROOT), `${JSON.stringify({
  description: `Herstellerspezifische Codes aus ${SOURCE}`,
  manufacturers,
  codes: brandCodes,
}, null, 1)}\n`);

const byGroup = Object.fromEntries([...new Set(chosen.map((c) => c.code.slice(0, 2)))].map((g) => [g, chosen.filter((c) => c.code.startsWith(g)).length]));
console.log(`Generisch: ${chosen.length} Codes`, byGroup);
console.log(`Herstellerspezifisch: ${brandCodes.length} Codes, ${manufacturers.length} Marken, ${translatedBrand} Titel übersetzt`);
