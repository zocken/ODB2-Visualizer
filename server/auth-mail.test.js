import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { createAuthMailer } from './auth-mail.js';
import { newToken } from './auth-security.js';

test('SMTP-Versand erzeugt getrennte Bestätigungs-, Erstzugangs- und Reset-Links ohne echte E-Mails',async()=>{
  const messages=[],sockets=new Set();
  const server=net.createServer(socket=>{
    sockets.add(socket);socket.on('close',()=>sockets.delete(socket));
    socket.write('220 synthetic.local ESMTP\r\n');
    let buffer='',data=false,message='';
    socket.on('data',chunk=>{
      buffer+=chunk.toString();
      while(buffer.includes('\r\n')){
        const end=buffer.indexOf('\r\n'),line=buffer.slice(0,end);buffer=buffer.slice(end+2);
        if(data){if(line==='.') {messages.push(message);message='';data=false;socket.write('250 Accepted\r\n');}else message+=line+'\r\n';continue;}
        if(/^EHLO/.test(line))socket.write('250 synthetic.local\r\n');
        else if(/^DATA/.test(line)){data=true;socket.write('354 End with dot\r\n');}
        else if(/^QUIT/.test(line))socket.end('221 Bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  }).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  try{
    const mailer=createAuthMailer({SMTP_HOST:'127.0.0.1',SMTP_PORT:String(server.address().port),SMTP_FROM:'sender@example.test',SMTP_ALLOW_INSECURE:'true'});
    assert.equal(mailer.ready,true);
    for(const [kind,fragment] of [['verify','bestaetigen'],['setup','erstes-passwort'],['reset','zuruecksetzen']]){
      const token=newToken();await mailer.send({email:'receiver@example.test',kind,token,origin:'https://example.test'});
      const text=messages.at(-1).replace(/=\r\n/g,'').replace(/=([A-F0-9]{2})/g,(_m,hex)=>String.fromCharCode(parseInt(hex,16)));
      assert.ok(text.includes(`https://example.test/anmelden.html#${fragment}=${token}`));
      assert.match(text,/To: receiver@example.test/);
      assert.doesNotMatch(text,/password_hash|SMTP_PASSWORD/);
    }
    assert.equal(messages.length,3);
  }finally{for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}
});
