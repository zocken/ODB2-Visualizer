import { safetySignals } from './safety-signals.js?v=2';

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
      // Fester Hinweis über dem Antworttext; bleibt beim Weiterschreiben der Antwort stehen.
      notice(text) {
        const note = document.createElement('small');
        note.className = 'ai-chat-notice-line';
        note.textContent = text;
        label.after(note);
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
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); if (!busy) form.requestSubmit(); }
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

  // Seitenkontext: Kopfzeile „Bezieht sich auf …“, passende Vorschlagsfragen und der Sprung-Knopf fürs Handy.
  const section = document.querySelector('.ai-chat');
  const contextLine = document.querySelector('#ai-chat-context');
  const suggestions = document.querySelector('#ai-chat-suggestions');
  const jump = document.querySelector('#ai-chat-jump');
  const result = document.querySelector('#result');
  let chatVisible = false;
  function openChat() {
    // Erst fokussieren, dann scrollen: ein Fokus während des weichen Scrollens bricht es ab.
    input.focus({ preventScroll: true });
    section.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  function updateContext() {
    const { code } = window.obd2ChatContext?.() || {};
    const maker = document.querySelector('#maker-select');
    const makerName = maker?.value ? maker.selectedOptions[0].text.replace(/\s*\(\d+\)$/, '') : '';
    const shown = code && !result.hidden;
    contextLine.hidden = !shown;
    contextLine.textContent = shown ? `Bezieht sich auf ${code}${makerName ? ` · ${makerName}` : ''}` : '';
    suggestions.replaceChildren(...(shown ? [`Kann ich mit ${code} noch weiterfahren?`, 'Was sollte ich zuerst prüfen?', 'Welche Live-Daten helfen weiter?'] : []).map(text => {
      const chip = document.createElement('button');
      chip.type = 'button'; chip.textContent = text;
      chip.addEventListener('click', () => { if (busy) return; input.value = text; form.requestSubmit(); });
      return chip;
    }));
    suggestions.hidden = !shown;
    input.placeholder = shown ? `Deine Frage zu ${code} …` : 'Zum Beispiel: Was bedeutet P0300 und was sollte ich zuerst prüfen?';
    jump.hidden = !shown || chatVisible;
  }
  new IntersectionObserver(([entry]) => { chatVisible = entry.isIntersecting; updateContext(); }).observe(section);
  document.addEventListener('obd2:context', updateContext);
  document.querySelector('#maker-select')?.addEventListener('change', updateContext);
  for (const button of [jump, document.querySelector('#r-ask')]) button?.addEventListener('click', openChat);
  updateContext();

  let controller = null, cancelled = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    // Während einer Antwort ist der Senden-Knopf ein Abbrechen-Knopf.
    if (busy) { cancelled = true; controller?.abort(); return; }
    const question = input.value.trim();
    if (!question) return;
    if (question.length > 2000) { error.textContent = 'Bitte kürze deine Frage auf 2.000 Zeichen.'; error.hidden = false; return; }
    busy = true; cancelled = false; error.hidden = true; reset.disabled = true;
    input.readOnly = true; send.textContent = 'Abbrechen'; send.classList.add('is-cancel');
    status.textContent = 'Die KI denkt nach …'; log.setAttribute('aria-busy', 'true');
    const userMessage = message('user', question);
    // Akute Gefahrenzeichen: Hinweis sofort und unabhängig von der KI anzeigen (KI-Richtlinie, Abschnitt 4).
    const signals = safetySignals(question);
    if (signals.length) {
      const box = document.createElement('div');
      box.className = 'ai-chat-safety'; box.setAttribute('role', 'alert');
      const title = document.createElement('strong');
      title.textContent = 'Sicherheitshinweis';
      const list = document.createElement('ul');
      list.append(...signals.map(({ text }) => { const li = document.createElement('li'); li.textContent = text; return li; }));
      const note = document.createElement('small');
      note.textContent = 'Automatisch angezeigt, unabhängig von der KI-Antwort.';
      box.append(title, list, note); log.append(box);
    }
    // Warteblase im Verlauf, bis der erste Text kommt; lokale Modelle brauchen dafür oft eine Minute oder länger.
    const started = Date.now();
    const pending = message('assistant', 'Denkt nach …');
    pending.item.classList.add('is-pending');
    const tick = () => pending.update(`Denkt nach … ${Math.round((Date.now() - started) / 1000)} s\nAntwortbeginn innerhalb von 60 Sekunden, insgesamt höchstens 2 Minuten.`);
    tick();
    const ticker = setInterval(tick, 1000);
    let reply = null, answer = '', dataNotice = false;
    controller = new AbortController();
    let firstTimer = setTimeout(() => controller.abort(), 65000);
    const totalTimer = setTimeout(() => controller.abort(), 125000);
    let idleTimer;
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
        // Denkphasen setzen nur die Pausengrenze zurück; Antwortbeginn und Gesamtdauer bleiben fest begrenzt.
        if (part.delta || part.thinking) { clearTimeout(idleTimer); idleTimer = setTimeout(() => controller.abort(), 25000); }
        if (part.delta?.trim()) clearTimeout(firstTimer);
        if (part.sources) sources = part.sources;
        // Datenbasis nicht erreichbar: Hinweis sofort und vor dem ersten Antworttext (KI-Richtlinie, Abschnitt 5).
        if (part.dataUnavailable && !dataNotice) { dataNotice = true; pending.notice('Datenbasis gerade nicht erreichbar – diese Antwort beruht nicht auf den Projektdaten.'); }
        if (part.error) throw new Error(part.error);
        if (part.delta) {
          if (!reply) { clearInterval(ticker); reply = pending; pending.item.classList.remove('is-pending'); status.textContent = 'Die KI antwortet …'; }
          answer += part.delta; reply.update(answer.trimStart());
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
      // Sicherheits- und Ausfallhinweise bleiben stehen; ohne sie verschwinden Frage und Warteblase wie bisher.
      if (!answer.trim()) {
        clearInterval(ticker);
        if (dataNotice) { pending.item.classList.remove('is-pending'); pending.update('Keine Antwort erhalten.'); } else pending.item.remove();
        if (!signals.length && !dataNotice) userMessage.item.remove();
      }
      error.textContent = cancelled ? 'Abgebrochen. Deine Frage steht noch im Eingabefeld.'
        : reason.name === 'AbortError' ? 'Die Antwort dauert zu lange. Bitte versuche es erneut.' : reason.message || 'Keine Verbindung zur KI. Bitte versuche es später erneut.';
      error.hidden = false; status.textContent = cancelled ? 'Abgebrochen' : 'Bitte erneut versuchen';
    } finally {
      clearTimeout(firstTimer); clearTimeout(totalTimer); clearTimeout(idleTimer); clearInterval(ticker); busy = false; reset.disabled = false; input.readOnly = false;
      send.textContent = 'Senden →'; send.classList.remove('is-cancel'); log.removeAttribute('aria-busy'); input.focus({ preventScroll: true });
    }
  });
})();
