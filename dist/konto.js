import { api,currentUser,fillAccountBar,showMessage } from './account-api.js';
const $=id=>document.getElementById(id);
try{
  const user=await currentUser();fillAccountBar(user);$('admin-link').hidden=user.role!=='admin';
  for(const [label,value] of [['E-Mail-Adresse',user.email],['Anzeigename',user.displayName||'Nicht angegeben'],['Rolle',user.role==='admin'?'Administrator':'Nutzer'],['E-Mail bestätigt',new Date(user.verifiedAt).toLocaleDateString('de-DE')]]){
    const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('account-details').append(dt,dd);
  }
}catch(error){showMessage('account-status',error.message,true);}
$('password-form').addEventListener('submit',async event=>{
  event.preventDefault();const password=$('new-password').value;
  if(password!==$('confirm-password').value)return showMessage('account-status','Die Passwörter stimmen nicht überein.',true);
  if([...password].length<15||[...password].length>128)return showMessage('account-status','Verwende ein Passwort mit 15 bis 128 Zeichen.',true);
  const button=event.submitter;button.disabled=true;
  try{await api('api/auth/change-password',{method:'POST',body:JSON.stringify({currentPassword:$('current-password').value,password,code:$('password-mfa-code').value.trim()})});location.replace('anmelden.html#anmelden');}
  catch(error){showMessage('account-status',error.message,true);}
  finally{button.disabled=false;}
});
