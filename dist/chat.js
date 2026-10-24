(() => {
  const form = document.querySelector('#ai-chat-form');
  if (!form) return;
  const input = document.querySelector('#ai-chat-input');
  const log = document.querySelector('#ai-chat-log');
  const send = document.querySelector('#ai-chat-send');
  const reset = document.querySelector('#ai-chat-reset');
  const status = document.querySelector('#ai-chat-status');
  const error = document.querySelector('#ai-chat-error');
  const history = [];
  let busy = false;
  function message(role, text) {
    const item = document.createElement('div');
    item.className = `ai-chat-message ai-chat-message--${role}`;
    const label = document.createElement('strong');
    label.textContent = role === 'user' ? 'Du' : 'KI-Assistent';
    const body = document.createElement('p');
    // Render basic emphasis with DOM nodes; model output is never inserted as HTML.
    const emphasis = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
    let position = 0;
    for (const match of text.matchAll(emphasis)) {
      body.append(document.createTextNode(text.slice(position, match.index)));
      const part = document.createElement(match[1] ? 'b' : 'em');
      part.textContent = match[1] || match[2]; body.append(part);
      position = match.index + match[0].length;
    }
    body.append(document.createTextNode(text.slice(position)));
    item.append(label, body); log.append(item); log.scrollTop = log.scrollHeight;
    return item;
  }
  const greeting = () => message('assistant', 'Hallo! Was möchtest du über einen Fehlercode oder dein Fahrzeug wissen?');
  greeting();
  reset.addEventListener('click', () => {
    if (busy) return;
    history.length = 0; log.replaceChildren(); greeting(); error.hidden = true;
    status.textContent = 'Neues Gespräch'; input.focus();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || busy) return;
    if (question.length > 2000) { error.textContent = 'Bitte kürze deine Frage auf 2.000 Zeichen.'; error.hidden = false; return; }
    busy = true; error.hidden = true; send.disabled = reset.disabled = true;
    input.readOnly = true; send.textContent = 'Wird gesendet …';
    status.textContent = 'Die KI antwortet …'; log.setAttribute('aria-busy', 'true');
    const userMessage = message('user', question);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 125000);
    try {
      let recent = history.slice(-10);
      while (recent.length && recent.reduce((n, m) => n + m.content.length, question.length) > 11000) recent = recent.slice(2);
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...recent, { role: 'user', content: question }] }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Die Antwort konnte nicht geladen werden.');
      if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('Die KI hat keine Antwort geliefert.');
      history.push({ role: 'user', content: question }, { role: 'assistant', content: data.answer.slice(0, 4000) });
      if (history.length > 10) history.splice(0, history.length - 10);
      message('assistant', data.answer); input.value = ''; status.textContent = 'Antwort erhalten';
    } catch (reason) {
      userMessage.remove();
      error.textContent = reason.name === 'AbortError' ? 'Die Antwort dauert zu lange. Bitte versuche es erneut.' : reason.message || 'Keine Verbindung zur KI. Bitte versuche es später erneut.';
      error.hidden = false; status.textContent = 'Bitte erneut versuchen';
    } finally {
      clearTimeout(timeout); busy = false; send.disabled = reset.disabled = false; input.readOnly = false;
      send.textContent = 'Senden →'; log.removeAttribute('aria-busy'); input.focus({ preventScroll: true });
    }
  });
})();
