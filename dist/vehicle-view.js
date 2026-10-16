// Startet die 3D-Ansicht, schaltet zwischen 3D und 2D-Plan um und wählt die Bauform.
// Ohne WebGL (oder bei Fehlern) bleibt der 2D-Plan unverändert aktiv.
import { createVehicle3D } from './vehicle3d.js';
import { LAYOUTS, BRAND_LAYOUT } from './vehicle3d-layouts.js';

const svg = document.getElementById('vehicle-diagram');
const scan = document.querySelector('.vehicle-scan');
const host = document.getElementById('vehicle-3d');
const toolbar = document.getElementById('view-toolbar');
const tip = host.querySelector('.vehicle-3d-tip');
const modeButton = toolbar.querySelector('[data-mode-toggle]');
const viewButtons = [...toolbar.querySelectorAll('[data-view]')];
const layoutPick = toolbar.querySelector('.layout-pick');
const layoutSelect = document.getElementById('layout-select');

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function readMode() {
  try { return localStorage.getItem('vehicle-view') === '2d' ? '2d' : '3d'; } catch { return '3d'; }
}

function storeMode(mode) {
  try { localStorage.setItem('vehicle-view', mode); } catch { /* Speicher nicht verfügbar */ }
}

if (webglAvailable()) {
  try {
    // Der SVG-Plan muss beim Aufbau sichtbar sein, damit seine Maße gelesen werden können.
    const viewer = createVehicle3D({
      container: host.querySelector('.vehicle-3d-stage'),
      svg,
      onHover(label, x, y) {
        tip.hidden = !label;
        if (label) {
          tip.textContent = label;
          tip.style.left = `${x}px`;
          tip.style.top = `${y}px`;
        }
      },
    });
    window.vehicle3d = viewer;
    if (window.vehicleState) viewer.highlight(window.vehicleState);

    // Bauform: folgt dem gewählten Hersteller, bis der Nutzer selbst eine wählt (gilt bis zum nächsten Herstellerwechsel).
    layoutSelect.append(...Object.entries(LAYOUTS).map(([id, layout]) => new Option(layout.name, id)));
    const applyLayout = (id) => { viewer.setLayout(id); layoutSelect.value = viewer.layout; };
    window.setVehicleBrand = (slug) => applyLayout(BRAND_LAYOUT[slug] || 'fwd4');
    window.setVehicleBrand(window.vehicleBrand || '');
    layoutSelect.addEventListener('change', () => applyLayout(layoutSelect.value));

    const setMode = (mode) => {
      const is3d = mode === '3d';
      host.hidden = !is3d;
      scan.hidden = is3d;
      viewButtons.forEach((b) => { b.hidden = !is3d; });
      layoutPick.hidden = !is3d;
      modeButton.textContent = is3d ? '2D-Plan' : '3D-Ansicht';
      modeButton.setAttribute('aria-pressed', String(!is3d));
      storeMode(mode);
    };

    toolbar.addEventListener('click', (event) => {
      const view = event.target.closest('[data-view]')?.dataset.view;
      if (view) {
        viewer.setView(view);
        viewButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
      }
      if (event.target.closest('[data-mode-toggle]')) setMode(host.hidden ? '3d' : '2d');
    });

    toolbar.hidden = false;
    setMode(readMode());
  } catch (error) {
    console.warn('3D-Ansicht nicht verfügbar, 2D-Plan bleibt aktiv:', error);
  }
}
