const raw = [
['P0100','Luftmassenmesser – Stromkreis','Luftversorgung','Gelb','Der Messwert der angesaugten Luft fehlt oder ist elektrisch unplausibel.','Stecker oder Kabel am Luftmassenmesser|Verschmutzter Luftmassenmesser|Defekter Sensor','Ansaugsystem im Motorraum'],
['P0101','Luftmassenmesser – Bereich/Funktion','Luftversorgung','Gelb','Die gemessene Luftmenge passt nicht zu den übrigen Motorwerten.','Verschmutzter Luftmassenmesser|Undichtigkeit im Ansaugtrakt|Sensor misst ungenau','Ansaugtrakt im Motorraum'],
['P0115','Kühlmitteltemperatursensor – Stromkreis','Motorkühlung','Gelb','Das Motorsteuergerät erhält kein plausibles Temperatursignal.','Stecker oder Leitung|Defekter Temperatursensor|Kontaktproblem durch Feuchtigkeit','Motor und Kühlsystem'],
['P0128','Kühlmitteltemperatur unter Regelbereich','Motorkühlung','Gelb','Der Motor erreicht seine vorgesehene Betriebstemperatur zu langsam.','Thermostat bleibt offen|Temperatursensor misst falsch|Sehr niedrige Außentemperatur','Kühlkreislauf im Motorraum'],
['P0130','Lambdasonde Bank 1 Sensor 1 – Stromkreis','Abgasregelung','Gelb','Das Signal der Lambdasonde vor dem Katalysator ist fehlerhaft.','Sonde oder Stecker|Kabel nahe der Abgasanlage|Undichtigkeit im Abgastrakt','Abgasstrang nahe Motor'],
['P0135','Lambdasondenheizung Bank 1 Sensor 1','Abgasregelung','Gelb','Die Heizung der vorderen Lambdasonde arbeitet nicht wie erwartet.','Heizelement der Sonde|Sicherung oder Leitung|Korrodierter Steckkontakt','Abgasstrang nahe Motor'],
['P0171','Gemisch zu mager – Bank 1','Gemischaufbereitung','Gelb','Der Motor bekommt im Verhältnis zum Kraftstoff zu viel Luft.','Falschluft im Ansaugsystem|Zu niedriger Kraftstoffdruck|Verschmutzter Luftmassenmesser','Ansaugung und Kraftstoffsystem'],
['P0172','Gemisch zu fett – Bank 1','Gemischaufbereitung','Gelb','Der Motor bekommt im Verhältnis zur Luft zu viel Kraftstoff.','Undichtes Einspritzventil|Falscher Luftmassenwert|Zu hoher Kraftstoffdruck','Einspritzung und Ansaugung'],
['P0201','Einspritzventil Zylinder 1 – Stromkreis','Einspritzung','Rot','Die elektrische Ansteuerung des Einspritzventils an Zylinder 1 ist gestört.','Stecker oder Leitung|Defektes Einspritzventil|Treiber im Motorsteuergerät','Motor – Zylinder 1'],
['P0202','Einspritzventil Zylinder 2 – Stromkreis','Einspritzung','Rot','Die elektrische Ansteuerung des Einspritzventils an Zylinder 2 ist gestört.','Stecker oder Leitung|Defektes Einspritzventil|Treiber im Motorsteuergerät','Motor – Zylinder 2'],
['P0300','Zufällige/mehrfache Fehlzündung erkannt','Motor & Verbrennung','Rot','Ein oder mehrere Zylinder zünden unregelmäßig. Das kann Ruckeln, Leistungsverlust oder eine blinkende Motorkontrollleuchte verursachen.','Zündkerzen oder Zündspulen|Falschluft im Ansaugsystem|Kraftstoff- oder Kompressionsproblem','Motorraum'],
['P0301','Fehlzündung an Zylinder 1','Motor & Verbrennung','Rot','Zylinder 1 verbrennt das Gemisch nicht zuverlässig.','Zündkerze oder Zündspule|Einspritzventil|Kompressionsverlust','Motor – Zylinder 1'],
['P0302','Fehlzündung an Zylinder 2','Motor & Verbrennung','Rot','Zylinder 2 verbrennt das Gemisch nicht zuverlässig.','Zündkerze oder Zündspule|Einspritzventil|Kompressionsverlust','Motor – Zylinder 2'],
['P0303','Fehlzündung an Zylinder 3','Motor & Verbrennung','Rot','Zylinder 3 verbrennt das Gemisch nicht zuverlässig.','Zündkerze oder Zündspule|Einspritzventil|Kompressionsverlust','Motor – Zylinder 3'],
['P0304','Fehlzündung an Zylinder 4','Motor & Verbrennung','Rot','Zylinder 4 verbrennt das Gemisch nicht zuverlässig.','Zündkerze oder Zündspule|Einspritzventil|Kompressionsverlust','Motor – Zylinder 4'],
['P0335','Kurbelwellensensor A – Stromkreis','Motorsynchronisation','Rot','Das Drehzahl- und Positionssignal der Kurbelwelle fehlt oder ist gestört.','Kurbelwellensensor|Stecker oder Kabel|Beschädigtes Geberrad','Unterer Motorbereich'],
['P0340','Nockenwellensensor A – Stromkreis','Motorsynchronisation','Gelb','Das Steuergerät erkennt kein korrektes Nockenwellensignal.','Nockenwellensensor|Stecker oder Kabel|Steuerzeiten außerhalb Soll','Zylinderkopf'],
['P0401','Abgasrückführung – Durchfluss zu gering','Abgasrückführung','Gelb','Es wird weniger Abgas zurückgeführt als vom Motorsteuergerät erwartet.','Verkoktes AGR-Ventil|Verstopfte Kanäle|Defekter Drucksensor','AGR-System am Motor'],
['P0420','Katalysator-Wirkungsgrad zu niedrig – Bank 1','Abgasnachbehandlung','Gelb','Der Katalysator reinigt die Abgase laut Messung nicht ausreichend.','Gealterter Katalysator|Defekte Lambdasonde|Länger bestehende Fehlzündungen','Abgasstrang Bank 1'],
['P0430','Katalysator-Wirkungsgrad zu niedrig – Bank 2','Abgasnachbehandlung','Gelb','Der Katalysator an Bank 2 arbeitet laut Messung nicht effizient genug.','Gealterter Katalysator|Defekte Lambdasonde|Abgasleck','Abgasstrang Bank 2'],
['P0442','Tankentlüftung – kleine Undichtigkeit','Tankentlüftung','Grün','Im geschlossenen Kraftstoffdampfsystem wurde eine kleine Undichtigkeit erkannt.','Tankdeckel nicht dicht|Poröser Schlauch|Kleines Leck am Aktivkohlebehälter','Tank und Entlüftungsleitungen'],
['P0455','Tankentlüftung – große Undichtigkeit','Tankentlüftung','Gelb','Das Kraftstoffdampfsystem ist deutlich undicht oder nicht verschlossen.','Tankdeckel fehlt oder sitzt lose|Schlauch abgerutscht|Defektes Entlüftungsventil','Tank und Entlüftungsleitungen'],
['P0500','Fahrgeschwindigkeitssensor – Signal','Geschwindigkeitserfassung','Gelb','Das Steuergerät erhält kein plausibles Geschwindigkeitssignal.','Raddrehzahl- oder Geschwindigkeitssensor|Kabel oder Stecker|Signalübertragung vom ABS','Getriebe oder Radnabe'],
['P0562','Systemspannung zu niedrig','Bordnetz','Rot','Die elektrische Bordspannung ist während des Betriebs zu niedrig.','Schwache Batterie|Lichtmaschine lädt nicht|Lose oder korrodierte Anschlüsse','Batterie und Ladesystem'],
['P0700','Getriebesteuerung meldet einen Fehler','Automatikgetriebe','Gelb','Die Getriebesteuerung hat einen eigenen Fehler gespeichert. Ein weiteres Diagnosegerät muss den Detailcode lesen.','Sensor im Getriebe|Hydraulik- oder Schaltproblem|Kommunikation zur Getriebesteuerung','Getriebe und Steuergerät'],
['P0715','Eingangsdrehzahlsensor – Stromkreis','Automatikgetriebe','Gelb','Das Getriebesteuergerät erhält kein korrektes Eingangsdrehzahlsignal.','Drehzahlsensor|Kabel oder Steckverbindung|Interner Getriebefehler','Getriebegehäuse'],
['B0020','Seitenairbag links – Auslösesteuerung','Rückhaltesystem','Rot','Im Stromkreis des linken Seitenairbags wurde ein Fehler erkannt. Der Airbag kann deaktiviert sein.','Stecker unter Sitz|Kabel zum Seitenairbag|Airbagmodul oder Steuergerät','Linker Sitz / Seitenairbag'],
['B1000','Herstellerspezifischer Karosseriecode','Karosserieelektronik','Gelb','Dieser Code ist herstellerspezifisch. Seine genaue Bedeutung hängt von Marke, Modell und Steuergerät ab.','Herstellerspezifische Konfiguration|Unterspannung|Fehler im Karosseriesteuergerät','Karosserie-Steuergeräte'],
['C0035','Raddrehzahlsensor vorne links – Stromkreis','ABS & Fahrstabilität','Rot','Das ABS erhält vom linken Vorderrad kein zuverlässiges Drehzahlsignal.','Raddrehzahlsensor|Kabel im Radhaus|Beschädigter Sensorring','Vorderrad links'],
['C0040','Raddrehzahlsensor vorne rechts – Stromkreis','ABS & Fahrstabilität','Rot','Das ABS erhält vom rechten Vorderrad kein zuverlässiges Drehzahlsignal.','Raddrehzahlsensor|Kabel im Radhaus|Beschädigter Sensorring','Vorderrad rechts'],
['U0100','Kommunikation mit Motorsteuergerät verloren','Steuergeräte-Netzwerk','Rot','Andere Steuergeräte können das Motorsteuergerät zeitweise oder dauerhaft nicht erreichen.','Unterspannung|CAN-Bus-Leitung oder Stecker|Ausfall des Motorsteuergeräts','CAN-Netzwerk / Motorsteuergerät'],
['U0121','Kommunikation mit ABS-Steuergerät verloren','Steuergeräte-Netzwerk','Rot','Andere Steuergeräte können das ABS-Steuergerät nicht zuverlässig erreichen.','Unterspannung|CAN-Bus-Verbindung|ABS-Steuergerät ohne Versorgung','CAN-Netzwerk / ABS-Steuergerät']
];

const categoryNames={P:'Antrieb',B:'Karosserie',C:'Fahrwerk',U:'Netzwerk'};
const codes=Object.fromEntries(raw.map(x=>[x[0],{code:x[0],title:x[1],system:x[2],urgency:x[3],explanation:x[4],causes:x[5].split('|'),location:x[6],category:categoryNames[x[0][0]],origin:x[0][1]==='0'?'Standardcode':'herstellerspezifisch'}]));
const form=document.querySelector('#code-form'), input=document.querySelector('#code-input'), suggestions=document.querySelector('#code-suggestions'), suggestionList=document.querySelector('#suggestion-list'), result=document.querySelector('#result');
const byId=id=>document.getElementById(id);
let activeCode='';

// Schematic locations represent the system named by the code, not a confirmed defective part.
const componentMap={
  P0100:{active:['maf'],context:['intake'],labels:['Luftmassenmesser','Ansaugung']},
  P0101:{active:['maf'],context:['intake'],labels:['Luftmassenmesser','Ansaugung']},
  P0115:{active:['coolant-sensor'],context:['cooling'],labels:['Kühlmitteltemperatursensor','Kühlsystem']},
  P0128:{active:['cooling','thermostat'],labels:['Kühlsystem','Thermostatbereich']},
  P0130:{active:['lambda-front'],context:['exhaust'],labels:['Lambdasonde · Bank 1 / Sensor 1']},
  P0135:{active:['lambda-front'],context:['exhaust'],labels:['Lambdasondenheizung · Bank 1 / Sensor 1']},
  P0171:{active:['intake','fuel-rail'],context:['engine'],labels:['Gemischaufbereitung','Ansaugung / Einspritzung']},
  P0172:{active:['intake','fuel-rail'],context:['engine'],labels:['Gemischaufbereitung','Ansaugung / Einspritzung']},
  P0201:{active:['injector-1'],context:['engine','cylinder-1'],labels:['Motor','Einspritzventil · Zylinder 1']},
  P0202:{active:['injector-2'],context:['engine','cylinder-2'],labels:['Motor','Einspritzventil · Zylinder 2']},
  P0300:{active:['cylinder-1','cylinder-2','cylinder-3','cylinder-4'],context:['engine'],labels:['Motor','Mehrere / nicht zugeordnete Zylinder']},
  P0301:{active:['cylinder-1'],context:['engine'],labels:['Motor','Zylinder 1']},
  P0302:{active:['cylinder-2'],context:['engine'],labels:['Motor','Zylinder 2']},
  P0303:{active:['cylinder-3'],context:['engine'],labels:['Motor','Zylinder 3']},
  P0304:{active:['cylinder-4'],context:['engine'],labels:['Motor','Zylinder 4']},
  P0335:{active:['crankshaft'],context:['engine'],labels:['Kurbelwellensensor','Motor']},
  P0340:{active:['camshaft'],context:['engine'],labels:['Nockenwellensensor','Motor']},
  P0401:{active:['egr'],context:['engine','exhaust'],labels:['Abgasrückführung']},
  P0420:{active:['cat-1'],context:['exhaust'],labels:['Katalysator · Bank 1']},
  P0430:{active:['cat-2'],context:['exhaust'],labels:['Katalysator · Bank 2']},
  P0442:{active:['evap','tank-cap'],context:['tank'],labels:['Tankentlüftung','Tank / Verschlussbereich']},
  P0455:{active:['evap','tank-cap'],context:['tank'],labels:['Tankentlüftung','Tank / Verschlussbereich']},
  P0500:{active:['vehicle-speed'],context:['transmission'],labels:['Geschwindigkeitssignal','Sensorlage fahrzeugabhängig']},
  P0562:{active:['battery','alternator'],labels:['Batterie','Ladesystem']},
  P0700:{active:['tcm'],context:['transmission'],labels:['Getriebesteuerung','Getriebe']},
  P0715:{active:['input-speed'],context:['transmission'],labels:['Getriebe-Eingangsdrehzahlsensor']},
  B0020:{active:['airbag-left'],labels:['Seitenairbag links']},
  B1000:{context:['bcm'],active:[],labels:['Karosserieelektronik · herstellerabhängig']},
  C0035:{active:['wheel-fl'],labels:['Raddrehzahlsensor','Vorne links']},
  C0040:{active:['wheel-fr'],labels:['Raddrehzahlsensor','Vorne rechts']},
  U0100:{active:['ecm','can'],labels:['Motorsteuergerät','Kommunikationsweg']},
  U0121:{active:['abs','can'],labels:['ABS-Steuergerät','Kommunikationsweg']}
};

function updateVehicle(code){
  const entry=componentMap[code];
  document.querySelectorAll('[data-component]').forEach(part=>{
    const id=part.dataset.component;
    part.classList.toggle('is-active',!!entry?.active?.includes(id));
    part.classList.toggle('is-context',!!entry?.context?.includes(id));
  });
  byId('vehicle-code').textContent=entry?`${code} · ${codes[code].system}`:'Keine Systemzuordnung';
  byId('vehicle-svg-title').textContent=entry?`${code}: ${entry.labels.join(', ')} – Pkw in Draufsicht`:'Pkw in Draufsicht – keine Systemzuordnung';
  byId('vehicle-svg-desc').textContent=entry?`Zum Code gehörende Bereiche: ${entry.labels.join(', ')}. Orange markiert den betroffenen Bereich, hellorange das zugehörige System. Lage und Zylindernummerierung sind schematisch und fahrzeugabhängig.`:'Kein bekanntes Ergebnis. Alle Bauteile sind neutral dargestellt.';
  byId('vehicle-parts').replaceChildren(...(entry?entry.labels:['Keine Zuordnung']).map(label=>{
    const tag=document.createElement('span');tag.textContent=label;if(!entry)tag.className='unmapped';return tag;
  }));
}

function closeSuggestions(){
  suggestions.hidden=true;
  input.setAttribute('aria-expanded','false');
}

function renderSuggestions(filter=''){
  const term=filter.trim().toLowerCase();
  const list=Object.values(codes).filter(c=>!term||c.code.toLowerCase().includes(term)||c.title.toLowerCase().includes(term)||c.system.toLowerCase().includes(term)).slice(0,12);
  suggestionList.replaceChildren();
  if(!list.length){
    const empty=document.createElement('p');
    empty.className='suggestion-empty';
    empty.textContent='Kein passender hinterlegter Code.';
    suggestionList.append(empty);
  }else{
    list.forEach(c=>{
      const button=document.createElement('button');
      button.type='button'; button.className='suggestion'; button.dataset.code=c.code; button.setAttribute('role','option');
      const code=document.createElement('b'); code.textContent=c.code;
      const copy=document.createElement('span'); copy.textContent=c.title;
      const area=document.createElement('small'); area.textContent=c.system;
      button.append(code,copy,area); suggestionList.append(button);
    });
  }
  suggestions.hidden=false;
  input.setAttribute('aria-expanded','true');
}

function causeGuide(cause,c){
  const text=cause.toLowerCase();
  if(/stecker|kabel|leitung|kontakt|anschluss/.test(text)) return {symptom:'Oft sporadisch, bei Bewegung oder Nässe',check:'Stecker, Kabelweg, Versorgung und Masse sichtbar prüfen'};
  if(/sensor|luftmassenmesser|lambdasonde|temperatur/.test(text)) return {symptom:'Messwert fehlt, springt oder ist unplausibel',check:'Live-Daten mit plausiblen Sollwerten vergleichen'};
  if(/zündkerze|zündspule|fehlzündung/.test(text)) return {symptom:'Ruckeln, unrunder Lauf oder Leistungsverlust',check:'Zündkomponenten zylinderweise vergleichen'};
  if(/undicht|falschluft|schlauch|tankdeckel|leck/.test(text)) return {symptom:'Zischen, Geruch oder instabiler Motorlauf möglich',check:'Schläuche, Dichtungen und Verschlüsse prüfen'};
  if(/batterie|lichtmaschine|spannung|unterspannung/.test(text)) return {symptom:'Start- oder Elektrikprobleme, mehrere Warnungen',check:'Batterie-, Ladespannung und Massepunkte messen'};
  if(/katalysator|abgas|agr|egr|verkok/.test(text)) return {symptom:'Warnleuchte, Abgasabweichung oder Leistungsverlust',check:'Begleitcodes, Dichtheit und relevante Messwerte prüfen'};
  if(/einspritz|kraftstoff|gemisch/.test(text)) return {symptom:'Unruhiger Lauf, Geruch oder fehlende Leistung',check:'Kraftstoffdruck und Ansteuerung fachlich prüfen'};
  if(/can|kommunikation|steuergerät/.test(text)) return {symptom:'Mehrere Warnungen oder fehlende Steuergerätedaten',check:'Versorgung, Masse und Netzwerkverbindungen prüfen'};
  if(/raddrehzahl|sensorring|radlager/.test(text)) return {symptom:'ABS-/ESP-Warnung oder unplausible Raddrehzahl',check:'Raddrehzahlen vergleichen, Kabel und Impulsring prüfen'};
  if(/kompression|steuerzeit|getriebe|hydraulik|intern/.test(text)) return {symptom:'Eher dauerhaftes mechanisches Fahr- oder Laufproblem',check:'Mechanische Prüfung oder Fachdiagnose einplanen'};
  return {symptom:`Typische Begleiterscheinung im Bereich ${c.system}`,check:`„${cause}“ nach Herstellervorgabe prüfen`};
}

function causeDetailsFor(c){
  const ranks=['Häufig','Möglich','Seltener'];
  return c.causes.map((cause,index)=>({rank:ranks[index]||'Weitere',cause,...causeGuide(cause,c)}));
}

function adviceFor(c,details){
  const firstCheck=details[0]?.check||'Sichtprüfung am betroffenen System durchführen';
  if(c.urgency==='Rot') return {verdict:'Nur eingeschränkt',title:'Vorsichtig reagieren',text:'Starke Belastung vermeiden. Bei deutlichen Symptomen, roter oder blinkender Warnleuchte sicher anhalten.',steps:[firstCheck,'Belastung und längere Fahrten vermeiden.','Fehlerspeicher und betroffenes System zeitnah fachlich prüfen lassen.']};
  if(c.urgency==='Grün') return {verdict:'Meist möglich',title:'Weiterfahrt meist möglich',text:'Wenn das Fahrzeug normal fährt und keine weiteren Warnzeichen auftreten, ist eine vorsichtige Weiterfahrt meist möglich.',steps:[firstCheck,'Nach einigen Fahrzyklen erneut auslesen.','Bei wiederkehrendem Code Werkstatttermin planen.']};
  return {verdict:'Meist möglich',title:'Zeitnah prüfen lassen',text:'Eine vorsichtige Weiterfahrt ist meist möglich, solange keine starken Symptome oder roten Warnleuchten auftreten.',steps:[firstCheck,'Hohe Belastung nach Möglichkeit vermeiden.','Ursache zeitnah systematisch prüfen lassen.']};
}

function hideError(){
  byId('form-error').hidden=true;
  byId('form-error').replaceChildren();
}

function showError(message,alternatives=[]){
  activeCode=''; result.hidden=true; byId('empty-state').hidden=false; updateVehicle(null);
  const box=byId('form-error'); box.replaceChildren();
  const title=document.createElement('strong'); title.textContent=message;
  const hint=document.createElement('span'); hint.textContent=alternatives.length?'Diese ähnlichen Codes sind bereits hinterlegt:':'Beispiel für ein gültiges Format: P0300';
  box.append(title,hint);
  if(alternatives.length){
    const row=document.createElement('div'); row.className='error-alternatives';
    alternatives.forEach(code=>{const button=document.createElement('button');button.type='button';button.dataset.alternative=code;button.textContent=code;row.append(button)});
    box.append(row);
  }
  box.hidden=false;
}

function renderCauseTable(details){
  const body=byId('cause-table-body'); body.replaceChildren();
  details.forEach(item=>{
    const row=document.createElement('tr');
    [item.rank,item.cause,item.symptom,item.check].forEach((value,index)=>{const cell=document.createElement('td');cell.textContent=value;if(index===0)cell.className='rank';row.append(cell)});
    body.append(row);
  });
}

function resetTechnicalDetails(){
  byId('technical-details').hidden=true;
  byId('detail-toggle').setAttribute('aria-expanded','false');
  byId('detail-toggle').querySelector('b').textContent='+';
}

function showCode(code){
  const c=codes[code];
  if(!c){
    const alternatives=Object.keys(codes).filter(candidate=>candidate[0]===code[0]).slice(0,4);
    showError(`${code} hat ein gültiges Format, ist aber noch nicht in dieser Datenbasis enthalten.`,alternatives);
    return;
  }
  const details=causeDetailsFor(c), a=adviceFor(c,details);
  activeCode=c.code; hideError(); closeSuggestions(); result.hidden=false; byId('empty-state').hidden=true;
  byId('r-code').textContent=c.code; byId('r-category').textContent=`${c.code[0]} · ${c.category}`; byId('r-origin').textContent=c.origin;
  byId('r-urgency').textContent=`${c.urgency} · ${c.urgency==='Rot'?'Dringend prüfen':c.urgency==='Grün'?'Beobachten':'Zeitnah prüfen'}`; byId('r-urgency').className=`urgency ${c.urgency==='Rot'?'red':c.urgency==='Grün'?'green':'amber'}`;
  byId('r-title').textContent=c.title; byId('system-icon').textContent={P:'⚙',B:'◇',C:'◉',U:'⌁'}[c.code[0]]; byId('r-system').textContent=c.system; byId('r-system-copy').textContent=`Der Code gehört zum Bereich ${c.category} und betrifft ${c.system.toLowerCase()}.`; byId('r-location').textContent=`Typischer Bereich: ${c.location}`;
  byId('r-explanation').textContent=c.explanation;
  byId('r-causes').replaceChildren(...details.map(item=>{const li=document.createElement('li'),rank=document.createElement('b'),cause=document.createElement('span');rank.textContent=item.rank;cause.textContent=item.cause;li.append(rank,cause);return li}));
  byId('r-verdict').textContent=a.verdict; byId('r-advice-title').textContent=a.title; byId('r-advice').textContent=a.text;
  byId('r-steps').replaceChildren(...a.steps.map(step=>{const li=document.createElement('li');li.textContent=step;return li}));
  byId('r-tech').textContent=`${c.code} ist als ${c.origin} dem Diagnosebereich ${c.category} zugeordnet. Der Code beschreibt eine erkannte Abweichung in ${c.system.toLowerCase()}, benennt aber nicht automatisch ein defektes Bauteil. Messwerte, Begleitcodes und fahrzeugspezifische Herstellerangaben müssen gemeinsam bewertet werden.`;
  renderCauseTable(details); resetTechnicalDetails(); updateVehicle(c.code);
  result.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
}

function runSearch(){
  const value=input.value.trim().toUpperCase();
  if(!/^[PBCU][0-9A-F]{4}$/.test(value)){
    closeSuggestions();
    showError('Bitte einen OBD2-Code mit P, B, C oder U und vier Zeichen von 0–9 beziehungsweise A–F eingeben.');
    return;
  }
  showCode(value);
}

input.addEventListener('input',()=>{
  input.value=input.value.toUpperCase().replace(/[^0-9A-FPBCU]/g,'').slice(0,5);
  hideError();
  if(input.value!==activeCode){result.hidden=true;byId('empty-state').hidden=false;activeCode=''}
  updateVehicle(codes[input.value]?input.value:null);
  renderSuggestions(input.value);
});
input.addEventListener('focus',()=>renderSuggestions(input.value));
input.addEventListener('keydown',event=>{if(event.key==='Escape')closeSuggestions()});
form.addEventListener('submit',event=>{event.preventDefault();runSearch()});
suggestions.addEventListener('click',event=>{
  const button=event.target.closest('[data-code]'); if(!button)return;
  input.value=button.dataset.code; hideError();
  if(activeCode!==input.value){result.hidden=true;byId('empty-state').hidden=false;activeCode=''}
  updateVehicle(input.value); closeSuggestions(); input.focus();
});
byId('form-error').addEventListener('click',event=>{
  const button=event.target.closest('[data-alternative]'); if(!button)return;
  input.value=button.dataset.alternative; showCode(button.dataset.alternative);
});
byId('detail-toggle').addEventListener('click',()=>{
  const panel=byId('technical-details'), willOpen=panel.hidden;
  panel.hidden=!willOpen; byId('detail-toggle').setAttribute('aria-expanded',String(willOpen)); byId('detail-toggle').querySelector('b').textContent=willOpen?'−':'+';
});
document.addEventListener('click',event=>{if(!form.contains(event.target))closeSuggestions()});

byId('database-count').textContent=`${Object.keys(codes).length} Codes`;
input.value='P0300';
updateVehicle('P0300');
