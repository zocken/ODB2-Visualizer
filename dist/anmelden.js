const $ = id => document.getElementById(id);
const states = {
  anmelden: ['Willkommen zurück', 'Schön, dass du da bist.', 'Melde dich mit deiner E-Mail-Adresse und deinem Passwort an.', 'Anmelden', '/login'],
  registrieren: ['Schritt 1 von 2', 'Dein Konto beginnt hier.', 'Wir senden dir einen Link, mit dem du deine E-Mail-Adresse bestätigst. Dein Passwort legst du bei der ersten Anmeldung fest.', 'Bestätigungslink anfordern', '/register'],
  'erster-zugang': ['Erste Anmeldung', 'Dein Passwort legst du selbst fest.', 'Deine E-Mail-Adresse ist schon bestätigt, aber du hast noch kein Passwort? Fordere deinen einmaligen Zugangslink an.', 'Link für die erste Anmeldung senden', '/first-login'],
  erneut: ['E-Mail bestätigen', 'Noch keine E-Mail erhalten?', 'Fordere einen neuen Bestätigungslink an. Der bisherige Link wird dadurch ungültig.', 'Bestätigungslink erneut senden', '/resend'],
  vergessen: ['Neues Passwort', 'Zugang wiederherstellen.', 'Wenn ein aktives Konto zu dieser Adresse besteht, erhältst du einen Link zum Zurücksetzen.', 'Link zum Zurücksetzen senden', '/forgot-password'],
  bestaetigen: ['Schritt 2 von 2', 'Bestätige deine E-Mail-Adresse.', 'Aktiviere dein Konto. Dein Passwort legst du anschließend bei deiner ersten Anmeldung fest.', 'E-Mail-Adresse bestätigen', '/verify'],
  'erstes-passwort': ['Erste Anmeldung', 'Dein Passwort. Dein Zugang.', 'Deine E-Mail-Adresse ist bestätigt. Lege jetzt dein persönliches Passwort fest und melde dich zum ersten Mal an.', 'Passwort festlegen & anmelden', '/set-password'],
  zuruecksetzen: ['Neues Passwort', 'Wieder sicher anmelden.', 'Lege ein neues Passwort fest. Anschließend werden alle bisherigen Anmeldungen beendet.', 'Passwort speichern', '/reset-password'],
};
let mode = 'anmelden', token = '', busy = false;
let mailAvailable = true;
function message(text, error = false) { const el=$('auth-status'); el.textContent=text; el.hidden=false; el.classList.toggle('is-error', error); el.focus(); }
function render() {
  const fragment = location.hash.slice(1);
  const match = /^(bestaetigen|erstes-passwort|zuruecksetzen)=([A-Za-z0-9_-]{43})$/.exec(fragment);
  mode = match ? match[1] : (states[fragment] && !['bestaetigen', 'erstes-passwort', 'zuruecksetzen'].includes(fragment) ? fragment : 'anmelden');
  token = match?.[2] || '';
  if (match) history.replaceState(null, '', location.pathname + location.search); // Keep the token only in this tab's memory.
  $('auth-password').value=''; $('auth-confirm').value='';
  $('auth-status').hidden=true;
  const [step,title,description,submit] = states[mode];
  $('auth-step').textContent=step; $('auth-title').textContent=title; $('auth-description').textContent=description;
  $('auth-submit').textContent=submit; document.title=`${title} · OBD2 Klartext`;
  const activation = ['erstes-passwort','zuruecksetzen'].includes(mode), password = mode==='anmelden'||activation;
  const hasToken=activation||mode==='bestaetigen';
  $('email-field').hidden=hasToken; $('auth-email').required=!hasToken; $('auth-email').disabled=hasToken;
  $('password-field').hidden=!password; $('auth-password').required=password; $('auth-password').disabled=!password;
  $('auth-password').autocomplete=activation?'new-password':'current-password';
  $('auth-password').minLength=activation?15:1; $('auth-password').maxLength=activation?256:512;
  $('confirm-field').hidden=!activation; $('auth-confirm').required=activation; $('auth-confirm').disabled=!activation;
  $('name-field').hidden=mode!=='erstes-passwort'; $('auth-name').disabled=mode!=='erstes-passwort';
  $('password-help').hidden=!activation; $('registration-note').hidden=mode!=='registrieren';
  document.querySelectorAll('[data-mode]').forEach(link=>{if(link.dataset.mode===mode)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  if (!mailAvailable && ['registrieren','erneut','vergessen','erster-zugang'].includes(mode)) message('Der E-Mail-Versand ist noch nicht eingerichtet. Bitte wende dich an den Betreiber.', true);
}
window.addEventListener('hashchange', () => { if (!busy) render(); });
$('auth-form').addEventListener('submit', async event => {
  event.preventDefault(); if(busy)return;
  const activation=['erstes-passwort','zuruecksetzen'].includes(mode);
  if(activation && $('auth-password').value!==$('auth-confirm').value)return message('Die Passwörter stimmen nicht überein.',true);
  if(activation && ([...$('auth-password').value].length<15 || [...$('auth-password').value].length>128))return message('Verwende ein Passwort mit 15 bis 128 Zeichen.',true);
  const submittedMode=mode;
  busy=true; $('auth-submit').disabled=true;
  // Prevent navigation between different forms while a request is in flight.
  const lockNavigation=event=>event.preventDefault();
  document.querySelectorAll('.auth-tabs a,.account-links a').forEach(link=>link.addEventListener('click',lockNavigation));
  try {
    const body=mode==='bestaetigen'?{token}:activation ? {token,password:$('auth-password').value,displayName:$('auth-name').value} : {email:$('auth-email').value};
    if(mode==='anmelden')body.password=$('auth-password').value;
    const response=await fetch(`api/auth${states[mode][4]}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json().catch(()=>({error:'Die Anmeldung ist hier nicht verfügbar. Bitte nutze die Adresse der App mit Serverbetrieb.'}));
    if(!response.ok)throw new Error(data.error||'Die Anfrage konnte nicht abgeschlossen werden.');
    if(submittedMode==='anmelden'||submittedMode==='erstes-passwort'){location.replace('./');return;}
    if(submittedMode==='bestaetigen'){
      history.replaceState(null,'',`${location.pathname}#erstes-passwort=${data.setupToken}`);render();
      return;
    }
    if(activation){token='';history.replaceState(null,'',`${location.pathname}#anmelden`);render();}
    message(data.message);
    if(!activation)$('auth-form').reset();
  } catch(error){message(error.message||'Der Server ist gerade nicht erreichbar.',true);}
  finally{busy=false;$('auth-submit').disabled=false;document.querySelectorAll('.auth-tabs a,.account-links a').forEach(link=>link.removeEventListener('click',lockNavigation));}
});
render();
fetch('api/auth/me',{cache:'no-store'}).then(async response=>{
  if(!response.ok)return;
  const data=await response.json();mailAvailable=data.registrationAvailable;
  if(data.user && mode==='anmelden')location.replace('./');
  else if(!mailAvailable && ['registrieren','erneut','vergessen','erster-zugang'].includes(mode))message('Der E-Mail-Versand ist noch nicht eingerichtet. Bitte wende dich an den Betreiber.',true);
}).catch(()=>{});
