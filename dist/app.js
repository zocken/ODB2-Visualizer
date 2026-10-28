const categoryNames={P:'Antrieb',B:'Karosserie',C:'Fahrwerk',U:'Netzwerk'};
const form=document.querySelector('#code-form'), input=document.querySelector('#code-input'), suggestions=document.querySelector('#code-suggestions'), suggestionList=document.querySelector('#suggestion-list'), result=document.querySelector('#result');
const byId=id=>document.getElementById(id);
const makerSelect=byId('maker-select');
let activeCode='';
// Selected manufacturer slug; '' = standard codes only (initial choice).
let manufacturer='';
// Page context for the AI chat: the shown result, else a complete code in the input
// (picked from the suggestions or typed, already highlighted in the vehicle view), plus the manufacturer.
window.obd2ChatContext=()=>({code:activeCode||(/^[PBCU][0-9A-F]{4}$/.test(input.value)?input.value:undefined),manufacturer:manufacturer||undefined});
const makerQuery=(prefix)=>manufacturer?`${prefix}manufacturer=${encodeURIComponent(manufacturer)}`:'';
// Suggestions are loaded page by page while scrolling the list.
const PAGE_SIZE=40;

// Data comes from the API (Docker/DB) or, without a backend (GitHub Pages), from a static export of the seed data.
// Schematic locations represent the system named by the code, not a confirmed defective part.
function normalize(d){
  const v=d.vehicle||d;
  return {code:d.code,title:d.title,titleEn:d.titleEn||null,source:d.source||'redaktionell',system:d.system,urgency:d.urgency,explanation:d.explanation,causes:d.causes,location:d.location,
    category:categoryNames[d.code[0]],origin:d.manufacturer?.name?`herstellerspezifisch · ${d.manufacturer.name}`:d.code[1]==='0'?'Standardcode':'herstellerspezifisch',
    vehicle:{active:v.active||[],context:v.context||[],labels:v.labels||[]}};
}

const apiSource={
  async init(){const r=await fetch('api/health');if(!r.ok)throw new Error('API nicht verfügbar');this.count=(await r.json()).genericCodes},
  async manufacturers(){const r=await fetch('api/manufacturers');return r.ok?r.json():[]},
  // Returns one page of matches plus the total number of matches.
  async search(term,offset=0){
    const r=await fetch(`api/codes?q=${encodeURIComponent(term)}&limit=${PAGE_SIZE}&offset=${offset}${makerQuery('&')}`);
    if(!r.ok)throw new Error('Suche fehlgeschlagen');
    const items=await r.json();
    return {items,total:Number(r.headers.get('X-Total-Count'))||offset+items.length};
  },
  async get(code){
    const r=await fetch(`api/codes/${code}${makerQuery('?')}`);
    if(r.status===404)return {missing:true,alternatives:(await r.json()).alternatives||[]};
    if(!r.ok)throw new Error('Abfrage fehlgeschlagen');
    return normalize(await r.json());
  }
};

const staticSource={
  async init(){
    const r=await fetch('data/generic-codes.json');if(!r.ok)throw new Error('Keine Datenbasis gefunden');
    this.codes=new Map((await r.json()).codes.filter(c=>!c.manufacturer).map(c=>[c.code,normalize(c)]));this.count=this.codes.size;
  },
  async manufacturers(){return []},
  async search(term,offset=0){
    term=term.trim().toUpperCase();
    const all=[...this.codes.values()].filter(c=>c.code.startsWith(term)).sort((a,b)=>a.code.localeCompare(b.code));
    return {items:all.slice(offset,offset+PAGE_SIZE),total:all.length};
  },
  async get(code){
    return this.codes.get(code)||{missing:true,alternatives:[...this.codes.keys()].filter(candidate=>candidate[0]===code[0]).slice(0,4)};
  }
};

let source=null;
const ready=(async()=>{
  for(const candidate of [apiSource,staticSource]){
    try{await candidate.init();source=candidate;return}catch{}
  }
  throw new Error('Datenbasis nicht erreichbar');
})();

const lookups=new Map();
function lookup(code){
  const key=`${manufacturer}|${code}`;
  if(!lookups.has(key))lookups.set(key,ready.then(()=>source.get(code)).catch(error=>{lookups.delete(key);throw error}));
  return lookups.get(key);
}

let makers=new Map();
const formatCount=n=>Number(n).toLocaleString('de-DE');
// Header count follows the selection: standard codes, plus the chosen brand's codes.
function updateCount(){
  const maker=makers.get(manufacturer);
  byId('database-count').textContent=maker?`${formatCount(source.count)} Standard + ${formatCount(maker.codes)} ${maker.name}`:`${formatCount(source.count)} Standardcodes`;
}

// Fills the manufacturer select with all brands that currently have codes; hidden without a backend.
ready.then(()=>source.manufacturers()).then(list=>{
  if(!list.length)return;
  makers=new Map(list.map(m=>[m.slug,m]));
  makerSelect.append(...list.map(m=>{const option=document.createElement('option');option.value=m.slug;option.textContent=`${m.name} (${formatCount(m.codes)})`;return option}));
  byId('maker-row').hidden=false;
}).catch(()=>{});

// Parts that exist only in some 3D layouts (cylinders 5–8, bank 2 sensors) fall back to their parent in the 2D plan.
const PLAN_FALLBACK={'cylinder-5':'engine','cylinder-6':'engine','cylinder-7':'engine','cylinder-8':'engine','injector-5':'fuel-rail','injector-6':'fuel-rail','injector-7':'fuel-rail','injector-8':'fuel-rail','lambda-front-2':'lambda-front','lambda-rear-2':'lambda-rear'};
const planIds=ids=>(ids||[]).map(id=>document.querySelector(`#vehicle-diagram [data-component="${id}"]`)?id:PLAN_FALLBACK[id]).filter(Boolean);

function updateVehicle(c){
  const vehicle=c?.vehicle?.labels?.length?c.vehicle:null, code=c?.code;
  const entry=vehicle&&{...vehicle,active:planIds(vehicle.active),context:planIds(vehicle.context)};
  document.querySelectorAll('[data-component]').forEach(part=>{
    const id=part.dataset.component;
    part.classList.toggle('is-active',!!entry?.active?.includes(id));
    part.classList.toggle('is-context',!!entry?.context?.includes(id));
  });
  byId('vehicle-code').textContent=entry?`${code} · ${c.system}`:'Keine Systemzuordnung';
  byId('vehicle-svg-title').textContent=entry?`${code}: ${entry.labels.join(', ')} – Pkw in Draufsicht`:'Pkw in Draufsicht – keine Systemzuordnung';
  byId('vehicle-svg-desc').textContent=entry?`Zum Code gehörende Bereiche: ${entry.labels.join(', ')}. Orange markiert den betroffenen Bereich, hellorange das zugehörige System. Lage und Zylindernummerierung sind schematisch und fahrzeugabhängig.`:'Kein bekanntes Ergebnis. Alle Bauteile sind neutral dargestellt.';
  byId('vehicle-parts').replaceChildren(...(entry?entry.labels:['Keine Zuordnung']).map(label=>{
    const tag=document.createElement('span');tag.textContent=label;if(!entry)tag.className='unmapped';return tag;
  }));
  // Same state for the 3D view (vehicle-view.js); kept on window in case the module loads later.
  window.vehicleState={active:vehicle?.active||[],context:(vehicle?.context||[]).filter(id=>!vehicle.active?.includes(id)),labels:vehicle?.labels||[]};
  window.vehicle3d?.highlight(window.vehicleState);
}

function closeSuggestions(){
  suggestions.hidden=true;
  input.setAttribute('aria-expanded','false');
  highlightSuggestion(-1);
}

// Keyboard selection inside the listbox (focus stays in the input, aria-activedescendant points to the option).
let highlighted=-1;
function highlightSuggestion(index){
  const options=[...suggestionList.querySelectorAll('[role=option]')];
  highlighted=options.length?Math.max(-1,Math.min(index,options.length-1)):-1;
  options.forEach((option,i)=>{const on=i===highlighted;option.classList.toggle('is-highlighted',on);option.setAttribute('aria-selected',String(on));if(on)option.scrollIntoView({block:'nearest'})});
  if(highlighted>=0)input.setAttribute('aria-activedescendant',options[highlighted].id);else input.removeAttribute('aria-activedescendant');
}

function suggestionButton(c,index){
  const button=document.createElement('button');
  button.type='button'; button.className='suggestion'; button.dataset.code=c.code; button.setAttribute('role','option');
  button.id=`suggestion-${index}`; button.tabIndex=-1; button.setAttribute('aria-selected','false');
  const code=document.createElement('b'); code.textContent=c.code;
  const copy=document.createElement('span'); copy.textContent=c.title;
  const area=document.createElement('small'); area.textContent=c.system;
  if(c.manufacturerName){const brand=document.createElement('em');brand.textContent=c.manufacturerName;area.prepend(brand,' · ')}
  button.append(code,copy,area);
  return button;
}

// Paging state of the open list: further pages load while scrolling (or arrowing) towards the end.
const suggestionCount=document.querySelector('.suggestion-head strong');
let suggestionRequest=0, page={filter:'',loaded:0,total:0,loading:false};
function updateSuggestionCount(){
  suggestionCount.textContent=page.total>page.loaded?`Treffer · ${formatCount(page.loaded)} von ${formatCount(page.total)}`:page.total?`${formatCount(page.total)} Treffer`:'Passende Treffer';
}

async function renderSuggestions(filter=''){
  const request=++suggestionRequest;
  let result;
  try{await ready;result=await source.search(filter,0)}catch{result={items:[],total:0}}
  if(request!==suggestionRequest)return;
  page={filter,loaded:result.items.length,total:result.total,loading:false};
  suggestionList.replaceChildren();
  if(!result.items.length){
    const empty=document.createElement('p');
    empty.className='suggestion-empty';
    empty.textContent='Kein passender hinterlegter Code.';
    suggestionList.append(empty);
  }else{
    suggestionList.append(...result.items.map((c,index)=>suggestionButton(c,index)));
  }
  updateSuggestionCount();
  highlighted=-1; input.removeAttribute('aria-activedescendant');
  suggestions.hidden=false;
  suggestions.scrollTop=0;
  input.setAttribute('aria-expanded','true');
}

async function loadMoreSuggestions(){
  if(page.loading||page.loaded>=page.total)return;
  const request=suggestionRequest;
  page.loading=true;
  let result;
  try{result=await source.search(page.filter,page.loaded)}catch{page.loading=false;return}
  if(request!==suggestionRequest)return;
  suggestionList.append(...result.items.map((c,index)=>suggestionButton(c,page.loaded+index)));
  page.loaded+=result.items.length;
  page.loading=false;
  updateSuggestionCount();
}
suggestions.addEventListener('scroll',()=>{
  if(suggestions.scrollTop+suggestions.clientHeight>=suggestions.scrollHeight-120)loadMoreSuggestions();
});

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

// Sicherheitsrelevante Systeme bekommen eine eigene Empfehlung statt der allgemeinen nach Dringlichkeitsfarbe
// (KI-Richtlinie, Abschnitt 4). Gleiche Liste in server/chat.js (SAFETY). Texte brauchen noch eine fachliche Prüfung.
const SAFETY=[
  [/ABS|Bremse|Fahrstabilit/i,'Bremsen und Fahrstabilität','Leuchtet die rote Bremswarnleuchte oder fühlt sich die Bremse anders an, nicht weiterfahren. Sonst nur vorsichtig und direkt zur Fachwerkstatt – ABS und ESP können ausgefallen sein.'],
  [/Lenkung/i,'Lenkung','Wird die Lenkung schwergängig, ungewohnt oder erscheint eine Lenkungswarnung, sicher anhalten und nicht weiterfahren.'],
  [/Schmierung|Öldruck/i,'Öldruck','Bei Öldruckwarnung sofort sicher anhalten und den Motor abstellen. Nicht weiterfahren, bevor die Ursache geklärt ist.'],
  [/Kühlung|Kühlsystem|Überhitz/i,'Motorkühlung','Steigt die Temperaturanzeige, erscheint eine Temperaturwarnung oder tritt Dampf aus: sofort sicher anhalten und den Motor abstellen. Das heiße Kühlsystem nicht öffnen.'],
  [/Rückhalte|Airbag|Gurt/i,'Airbag und Gurte','Airbags oder Gurtstraffer lösen bei einem Unfall möglicherweise nicht aus. Nicht selbst am System arbeiten und zeitnah eine Fachwerkstatt aufsuchen.'],
  [/Hybrid|Elektroantrieb|Hochvolt/i,'Hochvoltsystem','Keine eigenen Arbeiten am Hochvoltsystem – nur durch entsprechend geschultes Fachpersonal. Bei einer Hochvolt-Warnmeldung sicher anhalten.'],
];
function safetyFor(c){const hit=SAFETY.find(([re])=>re.test(c.system));return hit&&{area:hit[1],text:hit[2]}}

function adviceFor(c,details){
  const firstCheck=details[0]?.check||'Sichtprüfung am betroffenen System durchführen';
  const safety=safetyFor(c);
  if(safety) return {verdict:'Nur nach Prüfung',title:`Sicherheitsrelevant: ${safety.area}`,text:safety.text,steps:['Auf Warnleuchten und spürbare Veränderungen achten.',firstCheck,'Fachwerkstatt hinzuziehen, im Zweifel abschleppen lassen.']};
  // Importierte Einträge: Dringlichkeit ist nur automatisch abgeleitet, daher keine Einschätzung nach Farbe (KI-Richtlinie, Abschnitt 6).
  if(c.source!=='redaktionell') return {verdict:'Nicht geprüft',title:'Keine geprüfte Einschätzung',text:'Für diesen automatisch importierten Code liegt keine fachlich geprüfte Einschätzung zur Weiterfahrt vor. Bei Warnleuchten, spürbaren Veränderungen oder Unsicherheit nicht weiterfahren und fachlich prüfen lassen.',steps:['Auf Warnleuchten und spürbare Veränderungen achten.',firstCheck,'Fehlerspeicher und betroffenes System fachlich prüfen lassen.']};
  if(c.urgency==='Rot') return {verdict:'Nur eingeschränkt',title:'Vorsichtig reagieren',text:'Starke Belastung vermeiden. Bei deutlichen Symptomen, roter oder blinkender Warnleuchte sicher anhalten.',steps:[firstCheck,'Belastung und längere Fahrten vermeiden.','Fehlerspeicher und betroffenes System zeitnah fachlich prüfen lassen.']};
  if(c.urgency==='Grün') return {verdict:'Meist möglich',title:'Weiterfahrt meist möglich',text:'Wenn das Fahrzeug normal fährt und keine weiteren Warnzeichen auftreten, ist eine vorsichtige Weiterfahrt meist möglich.',steps:[firstCheck,'Nach einigen Fahrzyklen erneut auslesen.','Bei wiederkehrendem Code Werkstatttermin planen.']};
  return {verdict:'Meist möglich',title:'Zeitnah prüfen lassen',text:'Eine vorsichtige Weiterfahrt ist meist möglich, solange keine starken Symptome oder roten Warnleuchten auftreten.',steps:[firstCheck,'Hohe Belastung nach Möglichkeit vermeiden.','Ursache zeitnah systematisch prüfen lassen.']};
}

function hideError(){
  byId('form-error').hidden=true;
  byId('form-error').replaceChildren();
}

function showError(message,alternatives=[]){
  activeCode=''; result.hidden=true; byId('empty-state').hidden=false; updateVehicle(null); document.dispatchEvent(new Event('obd2:context'));
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

// Datenbasis und Informationsstand passend zur Herkunft des Eintrags (redaktionell oder automatisch importiert).
function renderDataNotes(c){
  const edited=c.source==='redaktionell', sha=c.source.match(/Stand (\w+)/)?.[1];
  byId('r-basis').textContent=edited?'SAE J2012 / ISO 15031-6':'Wal33D/dtc-database (MIT)';
  byId('r-stand').textContent=edited?'Redaktionell geprüft · 16.10.2026':`Automatisch übersetzt · nicht redaktionell geprüft${sha?` · Quellstand ${sha}`:''}`;
  byId('r-limit').textContent=c.origin.startsWith('herstellerspezifisch · ')?'Herstellerangabe · nicht modellgenau':'Nicht fahrzeugspezifisch';
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

async function showCode(code,{scroll=true}={}){
  let c;
  try{c=await lookup(code)}catch{showError('Die Datenbasis ist gerade nicht erreichbar. Bitte später erneut versuchen.');return}
  // Count deliberate lookups only (not the silent refresh after a manufacturer switch).
  if(scroll)track({type:c.missing?'missing':'lookup',key:code});
  if(c.missing){
    showError(`${code} hat ein gültiges Format, ist aber noch nicht in dieser Datenbasis enthalten.`,c.alternatives);
    return;
  }
  const details=causeDetailsFor(c), a=adviceFor(c,details);
  activeCode=c.code; hideError(); closeSuggestions(); result.hidden=false; byId('empty-state').hidden=true;
  byId('r-code').textContent=c.code; byId('r-category').textContent=`${c.code[0]} · ${c.category}`; byId('r-origin').textContent=c.origin;
  // Importierte Einträge zeigen keine automatisch abgeleitete Dringlichkeitsfarbe (KI-Richtlinie, Abschnitt 6).
  if(c.source!=='redaktionell'){byId('r-urgency').textContent='Dringlichkeit nicht geprüft';byId('r-urgency').className='urgency unchecked';}
  else{byId('r-urgency').textContent=`${c.urgency} · ${c.urgency==='Rot'?'Dringend prüfen':c.urgency==='Grün'?'Beobachten':'Zeitnah prüfen'}`; byId('r-urgency').className=`urgency ${c.urgency==='Rot'?'red':c.urgency==='Grün'?'green':'amber'}`;}
  byId('r-title').textContent=c.title; byId('system-icon').textContent={P:'⚙',B:'◇',C:'◉',U:'⌁'}[c.code[0]]; byId('r-system').textContent=c.system; byId('r-system-copy').textContent=`Der Code gehört zum Bereich ${c.category} und betrifft ${c.system.toLowerCase()}.`; byId('r-location').textContent=`Typischer Bereich: ${c.location}`;
  byId('r-explanation').textContent=c.explanation;
  byId('r-causes').replaceChildren(...details.map(item=>{const li=document.createElement('li'),rank=document.createElement('b'),cause=document.createElement('span');rank.textContent=item.rank;cause.textContent=item.cause;li.append(rank,cause);return li}));
  byId('r-verdict').textContent=a.verdict; byId('r-advice-title').textContent=a.title; byId('r-advice').textContent=a.text;
  byId('r-steps').replaceChildren(...a.steps.map(step=>{const li=document.createElement('li');li.textContent=step;return li}));
  byId('r-tech').textContent=`${c.code} ist als ${c.origin} dem Diagnosebereich ${c.category} zugeordnet. Der Code beschreibt eine erkannte Abweichung in ${c.system.toLowerCase()}, benennt aber nicht automatisch ein defektes Bauteil. Messwerte, Begleitcodes und fahrzeugspezifische Herstellerangaben müssen gemeinsam bewertet werden.${c.source!=='redaktionell'?` Originalbezeichnung: ${c.titleEn||c.title}. Quelle: ${c.source}; Erklärung und Ursachen sind automatisch erzeugt und nicht redaktionell geprüft.`:''}`;
  renderDataNotes(c); renderCauseTable(details); resetTechnicalDetails(); updateVehicle(c); document.dispatchEvent(new Event('obd2:context'));
  if(scroll)result.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
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

// Highlights the vehicle as soon as a complete, known code is typed or picked.
function previewVehicle(code){
  updateVehicle(null);
  if(!/^[PBCU][0-9A-F]{4}$/.test(code))return;
  lookup(code).then(c=>{if(input.value===code&&!c.missing)updateVehicle(c)}).catch(()=>{});
}

input.addEventListener('input',()=>{
  input.value=input.value.toUpperCase().replace(/[^0-9A-FPBCU]/g,'').slice(0,5);
  hideError();
  if(input.value!==activeCode){result.hidden=true;byId('empty-state').hidden=false;activeCode='';document.dispatchEvent(new Event('obd2:context'))}
  previewVehicle(input.value);
  renderSuggestions(input.value);
});
input.addEventListener('focus',()=>renderSuggestions(input.value));
input.addEventListener('keydown',event=>{
  const open=!suggestions.hidden;
  if(event.key==='Escape'){closeSuggestions();return}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    event.preventDefault();
    if(!open){renderSuggestions(input.value);return}
    highlightSuggestion(highlighted+(event.key==='ArrowDown'?1:-1));
    if(highlighted>=page.loaded-5)loadMoreSuggestions();
    return;
  }
  // Enter on a highlighted option takes it over and shows the result right away.
  if(event.key==='Enter'&&open&&highlighted>=0){
    event.preventDefault();
    const code=suggestionList.querySelectorAll('[role=option]')[highlighted].dataset.code;
    input.value=code; closeSuggestions(); showCode(code);
  }
});
form.addEventListener('submit',event=>{event.preventDefault();runSearch()});
suggestions.addEventListener('click',event=>{
  const button=event.target.closest('[data-code]'); if(!button)return;
  input.value=button.dataset.code; hideError();
  if(activeCode!==input.value){result.hidden=true;byId('empty-state').hidden=false;activeCode='';document.dispatchEvent(new Event('obd2:context'))}
  previewVehicle(input.value); closeSuggestions(); input.focus();
});
// Switching the manufacturer refreshes the shown result, the vehicle preview and open suggestions.
makerSelect.addEventListener('change',()=>{
  manufacturer=makerSelect.value;
  // The 3D view switches to the brand's typical layout (vehicle-view.js); remembered in case it loads later.
  window.vehicleBrand=manufacturer; window.setVehicleBrand?.(manufacturer);
  if(manufacturer)track({type:'manufacturer',key:manufacturer});
  updateCount();
  // Re-run a shown result or a search that just failed (the code may exist for this brand).
  const retry=activeCode||(!byId('form-error').hidden&&/^[PBCU][0-9A-F]{4}$/.test(input.value)?input.value:'');
  hideError();
  if(retry)showCode(retry,{scroll:false});
  else previewVehicle(input.value);
  if(!suggestions.hidden)renderSuggestions(input.value);
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

ready.then(updateCount,()=>{byId('database-count').textContent='Datenbasis offline'});

// Anonymous usage counters: daily totals only, no cookies or identifiers; only with the API backend.
function track(...events){
  if(source!==apiSource)return;
  const body=JSON.stringify({events});
  try{if(navigator.sendBeacon?.('api/events',body))return}catch{}
  fetch('api/events',{method:'POST',body,keepalive:true,headers:{'Content-Type':'text/plain'}}).catch(()=>{});
}
ready.then(()=>track({type:'pageview'},{type:'device',key:window.matchMedia('(max-width: 620px)').matches?'mobile':'desktop'})).catch(()=>{});

// Hidden usage statistics: five clicks on the logo within three seconds.
let logoClicks=[];
document.querySelector('.brand').addEventListener('click',event=>{
  const now=Date.now();
  logoClicks=[...logoClicks.filter(t=>now-t<3000),now];
  if(logoClicks.length<5)return;
  event.preventDefault(); logoClicks=[];
  import('./stats.js?v=2').then(m=>m.openStats()).catch(()=>{});
});
input.value='P0300';
updateVehicle('P0300');
