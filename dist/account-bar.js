import { fillAccountBar } from './account-api.js';
// The public, static GitHub Pages demonstration has no account backend.
async function refresh(){
  try{
    const response=await fetch('api/auth/me',{cache:'no-store'});
    if(!response.ok)return;
    const {user}=await response.json();
    if(!user){location.replace('anmelden.html');return;}
    const meta=document.querySelector('.top-meta');if(meta)meta.hidden=true;
    document.getElementById('account-bar').hidden=false;fillAccountBar(user);
    window.obd2AccountRole=user.role;
  }catch{}
}
await refresh();setInterval(refresh,60000);window.addEventListener('focus',refresh);
