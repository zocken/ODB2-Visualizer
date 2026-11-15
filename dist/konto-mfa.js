import {api,currentUser,fillAccountBar,showMessage} from './account-api.js';
const $=id=>document.getElementById(id);
let user,status,busy=false,codes=[];
async function refresh(){
  user=await currentUser();status=await api('api/auth/mfa/status');fillAccountBar(user);
  $('mfa-status-text').textContent=status.enabled?`2FA ist aktiv. Noch ${status.recoveryCodesRemaining} Wiederherstellungscodes verfügbar.`:'2FA ist noch nicht aktiviert. Wir empfehlen, dein Konto zusätzlich zu deinem Passwort zu schützen.';
  $('mfa-setup-button').hidden=status.enabled;$('mfa-disable-button').hidden=!status.enabled;$('mfa-regenerate-button').hidden=!status.enabled;
  $('mfa-manage-code-field').hidden=!status.enabled;$('mfa-manage-code').required=status.enabled;
  $('password-mfa-field').hidden=!status.enabled;$('password-mfa-code').disabled=!status.enabled;$('password-mfa-code').required=status.enabled;
  $('mfa-setup-button').disabled=!status.available;
  if(!status.available)$('mfa-status-text').textContent='2FA wird vom Betreiber noch eingerichtet.';
}
function displayCodes(data){
  codes=data.recoveryCodes||[];$('mfa-recovery-list').replaceChildren();
  for(const value of codes){const item=document.createElement('li');item.textContent=value;$('mfa-recovery-list').append(item);}
  $('mfa-recovery').hidden=!codes.length;showMessage('account-status',data.message);
}
$('mfa-manage').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const action=event.submitter.value;
  if(action==='disable'&&!confirm('2FA wirklich deaktivieren? Dein Konto wird danach nur noch durch dein Passwort geschützt.'))return;
  busy=true;const buttons=[...document.querySelectorAll('#mfa-manage button')];buttons.forEach(button=>button.disabled=true);
  try{
    const data=await api(`api/auth/mfa/${action}`,{method:'POST',body:JSON.stringify({currentPassword:$('mfa-password').value,code:$('mfa-manage-code').value.trim()})});
    $('mfa-password').value='';$('mfa-manage-code').value='';
    if(action==='setup'){
      $('mfa-qr').src=data.qrCode;$('mfa-secret').textContent=data.secret;$('mfa-enrollment').hidden=false;$('mfa-manage').hidden=true;$('mfa-confirm-code').focus();
    }else{
      if(action==='disable'){codes=[];$('mfa-recovery-list').replaceChildren();$('mfa-recovery').hidden=true;}
      displayCodes(data);await refresh();
    }
  }catch(error){showMessage('account-status',error.message,true);}
  finally{busy=false;buttons.forEach(button=>button.disabled=false);}
});
$('mfa-enable-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;busy=true;event.submitter.disabled=true;
  try{
    const data=await api('api/auth/mfa/enable',{method:'POST',body:JSON.stringify({code:$('mfa-confirm-code').value.trim()})});
    $('mfa-confirm-code').value='';$('mfa-qr').removeAttribute('src');$('mfa-secret').textContent='';$('mfa-enrollment').hidden=true;$('mfa-manage').hidden=false;
    displayCodes(data);await refresh();
  }catch(error){showMessage('account-status',error.message,true);}
  finally{busy=false;event.submitter.disabled=false;}
});
$('mfa-cancel').addEventListener('click',()=>{
  $('mfa-qr').removeAttribute('src');$('mfa-secret').textContent='';$('mfa-confirm-code').value='';$('mfa-enrollment').hidden=true;$('mfa-manage').hidden=false;
});
$('mfa-download').addEventListener('click',()=>{
  if(!codes.length)return;
  const blob=new Blob([`OBD2 Klartext – Wiederherstellungscodes\nKonto: ${user.email}\n\nJeder Code kann nur einmal verwendet werden. Bewahre diese Datei sicher und getrennt von deinem Passwort auf.\n\n${codes.join('\n')}\n`],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='OBD2-Klartext-Wiederherstellungscodes.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('mfa-codes-saved').addEventListener('click',()=>{codes=[];$('mfa-recovery-list').replaceChildren();$('mfa-recovery').hidden=true;});
try{await refresh();}catch(error){showMessage('account-status',error.message,true);}
