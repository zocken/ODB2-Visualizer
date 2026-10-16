// Verstecktes Statistik-Fenster (5× Klick aufs Logo). Zeigt die anonymen Tageszähler aus /api/stats.
const fmt = (n) => Number(n).toLocaleString('de-DE');
const dayLabel = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v; else if (k === 'text') node.textContent = v; else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
};

const STYLE = `
.stats-dialog{width:min(860px,calc(100vw - 32px));max-height:calc(100vh - 32px);padding:0;border:1px solid #284139;border-radius:20px;background:#0d1a16;color:#f3f1e8;box-shadow:0 40px 120px rgba(0,0,0,.6)}
.stats-dialog::backdrop{background:rgba(2,6,5,.72);backdrop-filter:blur(3px)}
.stats-inner{padding:22px 24px 24px;overflow:auto;max-height:calc(100vh - 34px);box-sizing:border-box}
.stats-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:6px}
.stats-head h2{margin:0;font-size:22px;letter-spacing:-.02em}
.stats-note{margin:0 0 16px;color:#9eaaa5;font-size:12px}
.stats-close{border:1px solid #284139;background:#13241e;color:#f3f1e8;border-radius:999px;width:34px;height:34px;font-size:18px;cursor:pointer;flex:none}
.stats-range{display:inline-flex;gap:2px;background:#0b1512;border:1px solid #26372f;border-radius:999px;padding:3px;margin-bottom:16px}
.stats-range button{border:0;background:transparent;color:#a3b4bc;font:800 11px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;padding:7px 12px;border-radius:999px;cursor:pointer}
.stats-range button[aria-pressed=true]{background:#b9f36b;color:#07110e}
.stats-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px}
.stats-tile{background:#13241e;border:1px solid #223830;border-radius:14px;padding:12px 14px}
.stats-tile small{display:block;color:#9eaaa5;font-size:11px;text-transform:uppercase;letter-spacing:.08em}
.stats-tile b{display:block;font-size:26px;letter-spacing:-.02em;margin-top:4px}
.stats-tile span{color:#9eaaa5;font-size:12px}
.stats-section{background:#0b1512;border:1px solid #1f342c;border-radius:14px;padding:14px 16px;margin-bottom:12px}
.stats-section h3{margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#cfdad5}
.stats-chart{position:relative}
.stats-chart svg{display:block;width:100%;height:170px}
.stats-chart .bar{fill:#b9f36b}
.stats-chart .hit{fill:transparent;cursor:crosshair}
.stats-chart .hit:hover+.bar,.stats-chart .bar.is-hover{fill:#dcff9e}
.stats-chart .axis{fill:#6f8580;font:11px ui-sans-serif,system-ui,sans-serif}
.stats-chart .grid{stroke:#1f342c;stroke-width:1}
.stats-tip{position:absolute;pointer-events:none;background:rgba(7,17,14,.96);border:1px solid #2d4a40;border-radius:8px;padding:6px 9px;font-size:12px;white-space:nowrap;transform:translate(-50%,-110%)}
.stats-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.stats-list{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.stats-list li{display:grid;grid-template-columns:62px minmax(0,1fr) auto;align-items:center;gap:8px;font-size:12px}
.stats-list li b{font-family:ui-monospace,monospace;font-size:12px}
.stats-list .track{height:8px;border-radius:4px;background:#13241e;overflow:hidden}
.stats-list .fill{display:block;height:100%;border-radius:4px;background:#b9f36b}
.stats-list .num{color:#cfdad5;font-variant-numeric:tabular-nums}
.stats-empty{color:#6f8580;font-size:12px;margin:0}
.stats-sr{position:absolute;left:0;top:0;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@media(max-width:700px){.stats-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.stats-cols{grid-template-columns:1fr}.stats-inner{padding:18px 16px}}
`;

function tile(label, value, sub) {
  return el('div', { class: 'stats-tile' }, el('small', { text: label }), el('b', { text: value }), el('span', { text: sub }));
}

// Säulendiagramm Seitenaufrufe je Tag (eine Reihe, daher ohne Legende), Tooltip mit Abfragen.
function dailyChart(daily) {
  const W = 800, H = 170, padL = 34, padB = 22, padT = 8;
  const max = Math.max(1, ...daily.map((d) => d.pageviews));
  const niceMax = Math.ceil(max / 5) * 5 || 5;
  const slot = (W - padL) / daily.length, barW = Math.max(2, slot - 2);
  const y = (v) => padT + (H - padT - padB) * (1 - v / niceMax);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Seitenaufrufe pro Tag, höchstens ${fmt(max)}`);
  const add = (tag, attrs) => { const n = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); svg.appendChild(n); return n; };
  for (const v of [0, niceMax / 2, niceMax]) {
    add('line', { class: 'grid', x1: padL, x2: W, y1: y(v), y2: y(v) });
    add('text', { class: 'axis', x: padL - 6, y: y(v) + 4, 'text-anchor': 'end' }).textContent = fmt(v);
  }
  const wrap = el('div', { class: 'stats-chart' });
  const tip = el('div', { class: 'stats-tip', hidden: '' });
  daily.forEach((d, i) => {
    const x = padL + i * slot + 1, top = y(d.pageviews), h = H - padB - top;
    const hit = add('rect', { class: 'hit', x: padL + i * slot, y: padT, width: slot, height: H - padT - padB });
    // Säule mit 4px gerundeter Oberkante, an der Grundlinie verankert
    const r = Math.min(4, barW / 2, h);
    const bar = add('path', { class: 'bar', d: h > 0 ? `M${x},${H - padB}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW - r}Q${x + barW},${top} ${x + barW},${top + r}V${H - padB}Z` : '' });
    hit.addEventListener('pointerenter', () => {
      bar.classList.add('is-hover');
      tip.hidden = false;
      tip.textContent = `${dayLabel(d.day)}: ${fmt(d.pageviews)} Aufrufe · ${fmt(d.lookups)} Abfragen`;
      tip.style.left = `${((x + barW / 2) / W) * 100}%`;
      tip.style.top = `${(top / H) * 100}%`;
    });
    hit.addEventListener('pointerleave', () => { bar.classList.remove('is-hover'); tip.hidden = true; });
  });
  const every = Math.ceil(daily.length / 7);
  daily.forEach((d, i) => {
    if (i % every === 0 || i === daily.length - 1) add('text', { class: 'axis', x: padL + i * slot + slot / 2, y: H - 6, 'text-anchor': 'middle' }).textContent = dayLabel(d.day);
  });
  // Tabellenansicht für Screenreader
  const table = el('div', { class: 'stats-sr' }, el('table', {}, el('caption', { text: 'Seitenaufrufe und Abfragen pro Tag' }),
    el('tr', {}, el('th', { text: 'Tag' }), el('th', { text: 'Aufrufe' }), el('th', { text: 'Abfragen' })),
    ...daily.map((d) => el('tr', {}, el('td', { text: dayLabel(d.day) }), el('td', { text: fmt(d.pageviews) }), el('td', { text: fmt(d.lookups) })))));
  wrap.append(svg, tip, table);
  return wrap;
}

function rankList(title, rows, labelOf) {
  const section = el('div', { class: 'stats-section' }, el('h3', { text: title }));
  if (!rows.length) { section.append(el('p', { class: 'stats-empty', text: 'Noch keine Daten' })); return section; }
  const max = Math.max(...rows.map((r) => r.n));
  section.append(el('ol', { class: 'stats-list' }, ...rows.map((r) => el('li', {},
    el('b', { text: labelOf(r) }),
    el('span', { class: 'track' }, el('span', { class: 'fill', style: `width:${Math.max(4, (r.n / max) * 100)}%` })),
    el('span', { class: 'num', text: fmt(r.n) })))));
  return section;
}

let dialog;
export async function openStats() {
  if (!dialog) {
    document.head.append(el('style', { text: STYLE }));
    dialog = el('dialog', { class: 'stats-dialog', 'aria-labelledby': 'stats-title' });
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    document.body.append(dialog);
  }
  await render(30);
  if (!dialog.open) dialog.showModal();
}

async function render(days) {
  let data;
  try {
    const r = await fetch(`api/stats?days=${days}`, { cache: 'no-store' });
    if (!r.ok) throw new Error();
    data = await r.json();
  } catch {
    dialog.replaceChildren(el('div', { class: 'stats-inner' }, el('p', { text: 'Statistik nur mit Server verfügbar.' }), closeButton()));
    return;
  }
  const t = data.totals;
  const devices = (data.devices.mobile || 0) + (data.devices.desktop || 0);
  const pct = (n) => (devices ? `${Math.round((n / devices) * 100)} %` : '–');
  const range = el('div', { class: 'stats-range', role: 'group', 'aria-label': 'Zeitraum' },
    ...[7, 30, 90].map((d) => { const b = el('button', { type: 'button', 'aria-pressed': String(d === data.days), text: `${d} Tage` }); b.addEventListener('click', () => render(d)); return b; }));
  dialog.replaceChildren(el('div', { class: 'stats-inner' },
    el('div', { class: 'stats-head' }, el('h2', { id: 'stats-title', text: `Nutzungsstatistik · ${data.days} Tage` }), closeButton()),
    el('p', { class: 'stats-note', text: 'Anonym: nur Tageszähler – keine Cookies, keine IP-Adressen, keine Einzelbesuche.' }),
    range,
    el('div', { class: 'stats-tiles' },
      tile('Seitenaufrufe', fmt(t.pageviews), `heute ${fmt(t.pageviewsToday)}`),
      tile('Code-Abfragen', fmt(t.lookups), `heute ${fmt(t.lookupsToday)}`),
      tile('Nicht gefunden', fmt(t.missing), t.lookups ? `${Math.round((t.missing / t.lookups) * 100)} % der Abfragen` : '–'),
      tile('Geräte', pct(data.devices.mobile || 0), `Handy · Desktop ${pct(data.devices.desktop || 0)}`)),
    el('div', { class: 'stats-section' }, el('h3', { text: 'Seitenaufrufe pro Tag' }), dailyChart(data.daily)),
    el('div', { class: 'stats-cols' },
      rankList('Meistgefragte Codes', data.topCodes, (r) => r.key),
      rankList('Häufig nicht gefunden', data.missingCodes, (r) => r.key),
      rankList('Gewählte Hersteller', data.manufacturers, (r) => r.name))));
}

function closeButton() {
  const b = el('button', { class: 'stats-close', type: 'button', 'aria-label': 'Statistik schließen', text: '×' });
  b.addEventListener('click', () => dialog.close());
  return b;
}
