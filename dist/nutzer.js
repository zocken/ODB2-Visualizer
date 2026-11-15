import { api,currentUser,fillAccountBar,showMessage } from './account-api.js';
const $=id=>document.getElementById(id);
let me,offset=0,busy=false;
function element(tag,text,className){const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;}
async function change(user,body,remove=false){
  const currentPassword=$('admin-password').value;
  if(!currentPassword){$('admin-password').focus();return showMessage('users-status','Bitte gib dein Passwort ein, um diese Änderung zu bestätigen.',true);}
  if(remove && !confirm(`Konto ${user.email} endgültig löschen? Alle zugehörigen Anmeldungen und Bestätigungslinks werden ebenfalls gelöscht.`))return;
  if(busy)return;busy=true;
  document.querySelectorAll('.user-controls button').forEach(button=>button.disabled=true);
  try{
    await api(`api/admin/users/${user.id}`,{method:remove?'DELETE':'PATCH',body:JSON.stringify({...body,currentPassword})});
    $('admin-password').value='';await load();showMessage('users-status',remove?'Das Konto wurde gelöscht.':'Das Konto wurde aktualisiert. Bestehende Anmeldungen dieses Kontos wurden beendet.');
  }catch(error){showMessage('users-status',error.message,true);}
  finally{busy=false;document.querySelectorAll('.user-controls button').forEach(button=>button.disabled=false);}
}
async function load(){
  const data=await api(`api/admin/users?q=${encodeURIComponent($('user-query').value)}&offset=${offset}`);
  $('user-list').replaceChildren();
  if(!data.users.length)$('user-list').append(element('p','Keine Konten gefunden.','account-description'));
  for(const user of data.users){
    const row=element('article',null,'user-row'),info=element('div',null,'user-info');
    info.append(element('strong',user.email));
    if(user.displayName)info.append(element('p',user.displayName));
    info.append(element('span',user.disabledAt?'Gesperrt':!user.verifiedAt?'Bestätigung ausstehend':user.passwordSet?'Bestätigt':'Erste Anmeldung ausstehend','user-badge'));
    info.append(element('span',user.role==='admin'?'Administrator':'Nutzer','user-badge'));
    info.append(element('p',`Registriert: ${new Date(user.createdAt).toLocaleDateString('de-DE')} · Letzte Anmeldung: ${user.lastLoginAt?new Date(user.lastLoginAt).toLocaleString('de-DE'):'Noch keine'}`));
    row.append(info);
    if(user.id===me.id)info.append(element('p','Dein Konto · Änderungen hier gesperrt'));
    else{
      const controls=element('div',null,'user-controls'),role=element('select');role.setAttribute('aria-label',`Rolle für ${user.email}`);
      for(const [value,label] of [['user','Nutzer'],['admin','Administrator']]){const option=element('option',label);option.value=value;option.disabled=value==='admin'&&!user.verifiedAt;role.append(option);}role.value=user.role;
      const save=element('button','Rolle speichern','account-secondary');save.type='button';save.addEventListener('click',()=>change(user,{role:role.value}));
      const block=element('button',user.disabledAt?'Entsperren':'Sperren','account-secondary');block.type='button';block.addEventListener('click',()=>change(user,{disabled:!user.disabledAt}));
      const remove=element('button','Löschen','account-secondary account-danger');remove.type='button';remove.addEventListener('click',()=>change(user,{},true));
      controls.append(role,save,block,remove);row.append(controls);
    }
    $('user-list').append(row);
  }
  $('users-prev').disabled=offset===0;$('users-next').disabled=!data.hasMore;$('users-page').textContent=`Seite ${offset/50+1}`;
}
async function safeLoad(){try{await load();}catch(error){showMessage('users-status',error.message,true);}}
$('user-search').addEventListener('submit',event=>{event.preventDefault();offset=0;safeLoad();});
$('users-prev').addEventListener('click',()=>{offset=Math.max(0,offset-50);safeLoad();});
$('users-next').addEventListener('click',()=>{offset+=50;safeLoad();});
try{me=await currentUser();fillAccountBar(me);if(me.role!=='admin'){location.replace('konto.html');}else await load();}
catch(error){showMessage('users-status',error.message,true);}
