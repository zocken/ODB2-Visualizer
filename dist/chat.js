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
  // Render basic emphasis with DOM nodes; model output is never inserted as HTML.
  function render(body, text) {
    const emphasis = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
    let position = 0;
    body.replaceChildren();
    for (const match of text.matchAll(emphasis)) {
      body.append(document.createTextNode(text.slice(position, match.index)));
      const part = document.createElement(match[1] ? 'b' : 'em');
      part.textContent = match[1] || match[2]; body.append(part);
      position = match.index + match[0].length;
    }
    body.append(document.createTextNode(text.slice(position)));
  }
  function message(role, text) {
    const item = document.createElement('div');
    item.className = `ai-chat-message ai-chat-message--${role}`;
    const label = document.createElement('strong');
    label.textContent = role === 'user' ? 'Du' : 'KI-Assistent';
    const body = document.createElement('p');
    render(body, text);
    item.append(label, body); log.append(item); log.scrollTop = log.scrollHeight;
    return {
      item,
      update(next) {
        const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
        render(body, next);
        if (atBottom) log.scrollTop = log.scrollHeight;
      },
      // Which database entries the answer is based on.
      sources(list) {
        if (!list.length) return;
        const note = document.createElement('small');
        note.className = 'ai-chat-sources';
        note.textContent = `Grundlage: ${list.map((s) => `${s.code}${s.manufacturer ? ` (${s.manufacturer})` : ''}`).join(', ')} aus der Datenbasis`;
        item.append(note);
      },
    };
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

  // Reads the NDJSON answer stream: {sources}, then {delta} parts, finally {done} or {error}.
  async function* events(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffer.split('\n');
      buffer = done ? '' : lines.pop();
      for (const line of lines) if (line.trim()) yield JSON.parse(line);
      if (done) return;
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || busy) return;
    if (question.length > 2000) { error.textContent = 'Bitte kürze deine Frage auf 2.000 Zeichen.'; error.hidden = false; return; }
    busy = true; error.hidden = true; send.disabled = reset.disabled = true;
    input.readOnly = true; send.textContent = 'Wird gesendet …';
    status.textContent = 'Die KI denkt nach …'; log.setAttribute('aria-busy', 'true');
    const userMessage = message('user', question);
    let reply = null, answer = '';
    const controller = new AbortController();
    let timeout = setTimeout(() => controller.abort(), 130000);
    try {
      let recent = history.slice(-10);
      while (recent.length && recent.reduce((n, m) => n + m.content.length, question.length) > 11000) recent = recent.slice(2);
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...recent, { role: 'user', content: question }], context: window.obd2ChatContext?.() }),
        signal: controller.signal });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Die Antwort konnte nicht geladen werden.');
      }
      let sources = [], finished = false;
      for await (const part of events(response)) {
        clearTimeout(timeout);
        timeout = setTimeout(() => controller.abort(), 70000);
        if (part.sources) sources = part.sources;
        if (part.error) throw new Error(part.error);
        if (part.delta) {
          if (!reply) { reply = message('assistant', ''); status.textContent = 'Die KI antwortet …'; }
          answer += part.delta; reply.update(answer);
        }
        if (part.done) finished = true;
      }
      if (!finished || !answer.trim()) throw new Error('Die KI hat keine Antwort geliefert.');
      reply.sources(sources);
      history.push({ role: 'user', content: question }, { role: 'assistant', content: answer.trim().slice(0, 4000) });
      if (history.length > 10) history.splice(0, history.length - 10);
      input.value = ''; status.textContent = 'Antwort erhalten';
    } catch (reason) {
      // A partial answer stays visible but is not added to the history; the question stays in the input.
      if (!answer.trim()) { userMessage.item.remove(); reply?.item.remove(); }
      error.textContent = reason.name === 'AbortError' ? 'Die Antwort dauert zu lange. Bitte versuche es erneut.' : reason.message || 'Keine Verbindung zur KI. Bitte versuche es später erneut.';
      error.hidden = false; status.textContent = 'Bitte erneut versuchen';
    } finally {
      clearTimeout(timeout); busy = false; send.disabled = reset.disabled = false; input.readOnly = false;
      send.textContent = 'Senden →'; log.removeAttribute('aria-busy'); input.focus({ preventScroll: true });
    }
  });
})();
