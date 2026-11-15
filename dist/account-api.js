export async function api(path, options = {}) {
  const response=await fetch(path,{cache:'no-store',...options,headers:{'Content-Type':'application/json',...options.headers}});
  if(response.status===204)return null;
  const data=await response.json().catch(()=>({error:'Der Server ist gerade nicht erreichbar.'}));
  if(response.status===401 && !path.includes('/api/auth/login'))location.replace('anmelden.html');
  if(!response.ok)throw new Error(data.error||'Die Anfrage konnte nicht abgeschlossen werden.');
  return data;
}
export async function currentUser() {
  const {user}=await api('api/auth/me');
  if(!user){location.replace('anmelden.html');throw new Error('Bitte melde dich an.');}
  return user;
}
export async function logout() {
  await api('api/auth/logout',{method:'POST',body:'{}'});
  location.replace('anmelden.html');
}
export function showMessage(id,text,error=false) {
  const el=document.getElementById(id);el.hidden=false;el.textContent=text;el.classList.toggle('is-error',error);el.focus();
}
export function fillAccountBar(user) {
  const bar=document.getElementById('account-bar');if(!bar)return;
  bar.replaceChildren();
  const name=document.createElement('span');name.className='account-name';name.textContent=user.displayName||user.email;bar.append(name);
  for(const [label,href] of [['Mein Konto','konto.html'],...(!user.twoFactorEnabled?[['2FA aktivieren','konto.html#two-factor']]:[]),...(user.role==='admin'?[['Nutzerverwaltung','nutzer.html']]:[])]){
    const link=document.createElement('a');link.textContent=label;link.href=href;bar.append(link);
  }
  const button=document.createElement('button');button.type='button';button.textContent='Abmelden';
  button.addEventListener('click',async()=>{button.disabled=true;try{await logout();}catch{button.disabled=false;button.textContent='Erneut abmelden';}});bar.append(button);
}
