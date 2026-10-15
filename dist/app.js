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
const form=document.querySelector('#code-form'), input=document.querySelector('#code-input'), suggestions=document.querySelector('#suggestions'), result=document.querySelector('#result');
const byId=id=>document.getElementById(id);

function renderSuggestions(filter=''){
  const list=Object.values(codes).filter(c=>!filter||c.code.includes(filter)||c.title.toLowerCase().includes(filter.toLowerCase()));
  suggestions.innerHTML=list.map(c=>`<button type="button" class="suggestion" data-code="${c.code}"><b>${c.code}</b><span>${c.title}</span></button>`).join('')||'<p>Kein passender hinterlegter Code.</p>';
  suggestions.hidden=false;
}

function adviceFor(c){
  if(c.urgency==='Rot') return {verdict:'Nur eingeschränkt',title:'Vorsichtig reagieren',text:'Starke Belastung vermeiden. Bei deutlichen Symptomen, roter oder blinkender Warnleuchte sicher anhalten.',steps:['Warnleuchten und Fahrverhalten beobachten.','Belastung und längere Fahrten vermeiden.','Fehlerspeicher und betroffenes System zeitnah fachlich prüfen lassen.']};
  if(c.urgency==='Grün') return {verdict:'Meist möglich',title:'Weiterfahrt meist möglich',text:'Wenn das Fahrzeug normal fährt und keine weiteren Warnzeichen auftreten, ist eine vorsichtige Weiterfahrt meist möglich.',steps:['Verschluss und sichtbare Leitungen prüfen.','Nach einigen Fahrzyklen erneut auslesen.','Bei wiederkehrendem Code Werkstatttermin planen.']};
  return {verdict:'Meist möglich',title:'Zeitnah prüfen lassen',text:'Eine vorsichtige Weiterfahrt ist meist möglich, solange keine starken Symptome oder roten Warnleuchten auftreten.',steps:['Fahrverhalten und Warnleuchten beobachten.','Hohe Belastung nach Möglichkeit vermeiden.','Ursache zeitnah systematisch prüfen lassen.']};
}

function showError(type){
  result.hidden=false; document.querySelector('#empty-state').hidden=true;
  const valid=type==='unknown';
  byId('r-code').textContent=valid?input.value.toUpperCase():'Eingabe prüfen';
  byId('r-category').textContent=valid?'Gültiges Format':'Erwartet: P0123'; byId('r-origin').textContent='Nicht ausgewertet';
  byId('r-urgency').textContent='Keine Diagnose'; byId('r-urgency').className='urgency';
  byId('r-title').textContent=valid?'Dieser Code ist noch nicht hinterlegt.':'Das Format des Codes ist ungültig.';
  byId('r-system').textContent='Keine Zuordnung'; byId('r-system-copy').textContent=valid?'Das Format ist korrekt, die aktuelle Datenbasis enthält diesen Code aber nicht.':'Ein OBD2-Code beginnt mit P, B, C oder U und hat danach vier Ziffern.';
  byId('r-location').textContent='32 Codes im Prototyp'; byId('r-explanation').textContent=valid?'Herstellerunterlagen oder eine erweiterte Diagnosedatenbank können weiterhelfen.':'Beispiel: P0300';
  byId('r-causes').innerHTML=''; byId('r-verdict').textContent='Nicht bewertbar'; byId('r-advice-title').textContent='Keine Fahr-Empfehlung'; byId('r-advice').textContent='Ohne passende Code-Erklärung ist keine sichere Einordnung möglich.'; byId('r-steps').innerHTML='<li>Code am Diagnosegerät noch einmal prüfen.</li><li>Bei Warnzeichen fachliche Hilfe nutzen.</li>';
  byId('r-tech').textContent='Es wurde keine technische Einordnung erzeugt.'; result.scrollIntoView({behavior:'smooth',block:'start'});
}

function showCode(code){
  const c=codes[code]; if(!c){showError('unknown');return} const a=adviceFor(c);
  result.hidden=false; document.querySelector('#empty-state').hidden=true;
  byId('r-code').textContent=c.code; byId('r-category').textContent=`${c.code[0]} · ${c.category}`; byId('r-origin').textContent=c.origin;
  byId('r-urgency').textContent=`${c.urgency} · ${c.urgency==='Rot'?'Dringend prüfen':c.urgency==='Grün'?'Beobachten':'Zeitnah prüfen'}`; byId('r-urgency').className=`urgency ${c.urgency==='Rot'?'red':c.urgency==='Grün'?'green':'amber'}`;
  byId('r-title').textContent=c.title; byId('r-system').textContent=c.system; byId('r-system-copy').textContent=`Der Code gehört zum Bereich ${c.category} und betrifft ${c.system.toLowerCase()}.`; byId('r-location').textContent=`Typischer Bereich: ${c.location}`;
  byId('r-explanation').textContent=c.explanation; byId('r-causes').innerHTML=c.causes.map((x,i)=>`<li><b>${i===0?'Häufig':i===1?'Möglich':'Seltener'}</b><span>${x}</span></li>`).join('');
  byId('r-verdict').textContent=a.verdict; byId('r-advice-title').textContent=a.title; byId('r-advice').textContent=a.text; byId('r-steps').innerHTML=a.steps.map(x=>`<li>${x}</li>`).join('');
  byId('r-tech').textContent=`${c.code} ist als ${c.origin} dem Diagnosebereich ${c.category} zugeordnet. Die Codebezeichnung weist auf ${c.system.toLowerCase()} hin; eine eindeutige Bauteildiagnose ist daraus allein nicht möglich.`;
  byId('vehicle-code').textContent=`${c.code} · ${c.system}`; document.querySelectorAll('.zone').forEach(z=>z.classList.toggle('active',z.dataset.zone===c.code[0]));
  result.scrollIntoView({behavior:'smooth',block:'start'});
}

input.addEventListener('input',()=>{input.value=input.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);if(!suggestions.hidden)renderSuggestions(input.value)});
form.addEventListener('submit',e=>{e.preventDefault();const value=input.value.trim().toUpperCase();if(!/^[PBCU][0-9A-Z]{4}$/.test(value)){showError('invalid');return}showCode(value)});
byId('show-codes').addEventListener('click',()=>{suggestions.hidden?renderSuggestions(input.value):suggestions.hidden=true});
suggestions.addEventListener('click',e=>{const b=e.target.closest('[data-code]');if(!b)return;input.value=b.dataset.code;suggestions.hidden=true;showCode(b.dataset.code)});

input.value='P0300';
