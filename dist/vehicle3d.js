// Drehbare 3D-Fahrzeugansicht (Three.js) mit austauschbaren Bauformen.
// Die Grundform (Lage der Bauteile) stammt aus dem 2D-Plan (SVG, data-component); Höhe und Form legt SPEC fest.
// Bauformen (vehicle3d-layouts.js) überschreiben Karosserie, Antriebsstrang und die Lage der Antriebsbauteile.
// Alle Bauteil-IDs bleiben gleich, daher funktionieren die Code-Zuordnungen in jeder Bauform.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { addVehicleDecor, COMPONENT_DETAILS, profileShape } from './vehicle3d-details.js';
import { LAYOUTS, PROFILES, FALLBACK, EXTRA_LABELS } from './vehicle3d-layouts.js';

// SVG-Plan (viewBox 360×620, Front oben, Fahrerseite links) → Meter. +x = Fahrerseite, +z = Front.
const SX = 0.01, SZ = 0.0078, CX = 180, CY = 313;
const toX = (svgX) => (CX - svgX) * SX;
const toZ = (svgY) => (CY - svgY) * SZ;

// Höhe (Mitte, m), Bauhöhe und Form je Bauteil der Grundform. Ohne Eintrag: flacher Kasten im Motorraum.
const SPEC = {
  'cooling': { y: 0.72, h: 0.42 },
  'charge-air-cooler': { y: 0.42, h: 0.16 },
  'coolant-sensor': { y: 0.98, h: 0.05 },
  'thermostat': { y: 0.97, h: 0.07 },
  'engine': { y: 0.72, h: 0.42, shape: 'engine' },
  'cylinder-1': { y: 0.97, h: 0.06, shape: 'cylV' },
  'cylinder-2': { y: 0.97, h: 0.06, shape: 'cylV' },
  'cylinder-3': { y: 0.97, h: 0.06, shape: 'cylV' },
  'cylinder-4': { y: 0.97, h: 0.06, shape: 'cylV' },
  'fuel-rail': { y: 1.02, h: 0.035 },
  'injector-1': { y: 0.99, h: 0.08 }, 'injector-2': { y: 0.99, h: 0.08 },
  'injector-3': { y: 0.99, h: 0.08 }, 'injector-4': { y: 0.99, h: 0.08 },
  'glow-plugs': { y: 1.0, h: 0.06, shape: 'dots' },
  'intake': { y: 0.95, h: 0.2 },
  'maf': { y: 0.95, h: 0.12, shape: 'cylZ' },
  'throttle': { y: 0.92, h: 0.12, shape: 'cylX' },
  'battery': { y: 0.74, h: 0.24 },
  'ecm': { y: 0.82, h: 0.06 },
  'alternator': { y: 0.56, shape: 'cylX' },
  'camshaft': { y: 1.0, h: 0.05 },
  'crankshaft': { y: 0.42, h: 0.06 },
  'knock-sensor': { y: 0.62, h: 0.05 },
  'oil-pressure': { y: 0.5, h: 0.05 },
  'egr': { y: 0.8, h: 0.12 },
  'turbo': { y: 0.6, shape: 'cylX' },
  'ac-compressor': { y: 0.5, shape: 'cylX' },
  'transmission': { y: 0.55, h: 0.32 },
  'input-speed': { y: 0.6, h: 0.06 },
  'vehicle-speed': { y: 0.45, h: 0.06 },
  'tcm': { y: 0.6, h: 0.05 },
  'abs': { y: 0.76, h: 0.12 },
  'wheel-fl': { y: 0.33, h: 0.1 }, 'wheel-fr': { y: 0.33, h: 0.1 },
  'wheel-rl': { y: 0.33, h: 0.1 }, 'wheel-rr': { y: 0.33, h: 0.1 },
  'can': { y: 0.55, r: 0.008, shape: 'tube' },
  'exhaust': { y: 0.24, r: 0.032, shape: 'tube' },
  'lambda-front': { y: 0.28, h: 0.1, shape: 'cylV' },
  'lambda-rear': { y: 0.28, h: 0.1, shape: 'cylV' },
  'cat-1': { y: 0.25, h: 0.12 }, 'cat-2': { y: 0.25, h: 0.12 },
  'bcm': { y: 0.74, h: 0.06 },
  'airbag-left': { y: 0.9, h: 0.26 },
  'steering': { shape: 'steering' },
  'pedal': { y: 0.42, h: 0.14 },
  'hv-battery': { y: 0.28, h: 0.1 },
  'e-motor': { y: 0.36, shape: 'cylX' },
  'tank': { y: 0.36, h: 0.22, shape: 'none' },
  'evap': { y: 0.36, h: 0.1 },
  'tank-cap': { y: 0.86, shape: 'cylX' },
};

const COLORS = { base: 0x6e8f9a, active: 0xffb62e, context: 0xc9963a, edge: 0x9fc7bb };

function svgPathPoints(pathEl, step = 6) {
  // Teilpfade (M …) getrennt abtasten, damit Sprünge nicht verbunden werden.
  const parts = pathEl.getAttribute('d').split(/(?=M)/).filter((p) => p.trim());
  return parts.map((part) => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', part);
    pathEl.ownerSVGElement.appendChild(p);
    const length = p.getTotalLength();
    const pts = [];
    for (let s = 0; s <= length; s += step) pts.push(p.getPointAtLength(s));
    pts.push(p.getPointAtLength(length));
    p.remove();
    return pts;
  });
}

// Grundform aus dem SVG-Plan lesen: Bauteil-Definitionen in Metern.
function readPlan(svg) {
  const defs = new Map();
  for (const g of svg.querySelectorAll('[data-component]')) {
    const id = g.dataset.component;
    const spec = SPEC[id] || { y: 0.62, h: 0.06 };
    const box = g.getBBox();
    const def = {
      label: g.querySelector('title')?.textContent || id,
      shape: spec.shape || 'box',
      x: toX(box.x + box.width / 2), z: toZ(box.y + box.height / 2),
      w: Math.max(box.width * SX, 0.03), d: Math.max(box.height * SZ, 0.03),
      y: spec.y ?? 0.62, h: spec.h ?? 0.06, r: spec.r,
    };
    if (def.shape === 'tube') {
      def.paths = svgPathPoints(g.querySelector('path')).map((pts) => pts.map((p) => [toX(p.x), spec.y, toZ(p.y)]));
    } else if (def.shape === 'steering') {
      const rack = g.querySelector('rect').getBBox();
      const ring = g.querySelector('circle');
      def.rack = { x: toX(rack.x + rack.width / 2), z: toZ(rack.y + rack.height / 2), w: rack.width * SX };
      def.ring = { x: toX(+ring.getAttribute('cx')), z: toZ(+ring.getAttribute('cy')) };
    } else if (def.shape === 'dots') {
      def.points = [...g.querySelectorAll('circle')].map((c) => ({ x: toX(+c.getAttribute('cx')), z: toZ(+c.getAttribute('cy')) }));
    } else if (def.shape === 'cylV' || def.shape === 'cylX' || def.shape === 'cylZ') {
      def.r = Math.min(def.w, def.d) / 2;
      def.len = def.shape === 'cylX' ? Math.max(def.w, 0.08) : Math.max(def.d, 0.08);
    }
    defs.set(id, def);
  }
  return defs;
}

// Geometrie zu einer Definition erzeugen. add(geometry, position, rotation, color)
function buildShape(def, add) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  switch (def.shape) {
    case 'none': return;
    case 'tube':
      for (const path of def.paths) {
        const curve = new THREE.CatmullRomCurve3(path.map((p) => V(...p)), false, 'catmullrom', 0.05);
        add(new THREE.TubeGeometry(curve, Math.max(10, path.length * 3), def.r ?? 0.02, 8, false), V(0, 0, 0), null, def.color);
      }
      return;
    case 'steering': {
      add(new THREE.BoxGeometry(def.rack.w, 0.05, 0.05), V(def.rack.x, 0.45, def.rack.z));
      add(new THREE.TorusGeometry(0.17, 0.018, 10, 36), V(def.ring.x, 0.98, def.ring.z), [Math.PI * 0.3, 0, 0]);
      add(new THREE.CylinderGeometry(0.018, 0.018, 0.7, 10), V(def.ring.x, 0.75, def.ring.z + 0.25), [Math.PI * 0.3, 0, 0]);
      return;
    }
    case 'dots':
      for (const p of def.points) add(new THREE.CylinderGeometry(0.018, 0.018, def.h, 10), V(p.x, def.y, p.z), null, def.color);
      return;
    case 'cylV':
      add(new THREE.CylinderGeometry(def.r, def.r, def.h, 24), V(def.x, def.y, def.z), def.rotation, def.color);
      return;
    case 'cylX':
      add(new THREE.CylinderGeometry(def.r, def.r, def.len ?? def.w, 24), V(def.x, def.y, def.z), def.rotation ?? [0, 0, Math.PI / 2], def.color);
      return;
    case 'cylZ':
      add(new THREE.CylinderGeometry(def.r, def.r, def.len ?? def.d, 24), V(def.x, def.y, def.z), def.rotation ?? [Math.PI / 2, 0, 0], def.color);
      return;
    case 'engine':
      add(new THREE.BoxGeometry(def.w, def.h, def.d), V(def.x, def.y, def.z));
      add(new THREE.BoxGeometry(def.w * 0.86, 0.07, def.d * 0.6), V(def.x, def.y + def.h / 2 + 0.035, def.z));
      return;
    default:
      add(new THREE.BoxGeometry(def.w, def.h, def.d), V(def.x, def.y, def.z), def.rotation, def.color);
  }
}

function bodyGeometry(profile) {
  const width = 1.62;
  const g = new THREE.ExtrudeGeometry(profileShape(profile.outline), { depth: width, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 5, curveSegments: 28 });
  g.rotateY(Math.PI / 2);
  g.translate(-width / 2, 0, 0);
  return g;
}

function makeMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: COLORS.base, roughness: 0.45, metalness: 0.3, transparent: true, opacity: 0.95, emissive: 0x000000 });
  m.userData.own = true;
  return m;
}

function disposeTree(object) {
  object.traverse((o) => {
    o.geometry?.dispose();
    const materials = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of materials) if (m.userData?.own) m.dispose();
  });
}

export function createVehicle3D({ container, svg, onHover, layout = 'fwd4' }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  const views = {
    '3d': new THREE.Vector3(3.9, 2.7, 4.3),
    top: new THREE.Vector3(0.001, 9.6, -0.45),
    side: new THREE.Vector3(8.3, 1.2, 0),
    front: new THREE.Vector3(0, 1.45, 7.2),
  };
  // Abstand so wählen, dass das Fahrzeug je Blickrichtung in den engeren Bildwinkel passt:
  // [vertikaler, horizontaler] Radius in Metern.
  const VIEW_FIT = { '3d': [1.5, 2.4], top: [2.4, 1.1], side: [0.95, 2.45], front: [1.35, 1.45] };
  const fitDistance = (name) => {
    const v = THREE.MathUtils.degToRad(camera.fov) / 2;
    const h = Math.atan(Math.tan(v) * camera.aspect);
    const [rv, rh] = VIEW_FIT[name];
    return Math.max(rv / Math.sin(v), rh / Math.sin(h));
  };
  const viewPosition = (name) => views[name].clone().normalize().multiplyScalar(fitDistance(name));
  camera.position.copy(views['3d']);
  let userMoved = false;
  let cameraTween = null;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.6, -0.05);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3.2;
  controls.maxDistance = 18;
  controls.maxPolarAngle = Math.PI * 0.49;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 0.55;
  controls.addEventListener('start', () => { controls.autoRotate = false; cameraTween = null; userMoved = true; });

  // Licht, Reflexionen, Schatten und Boden
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.add(new THREE.HemisphereLight(0xe4f4ee, 0x1a2a24, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3.5, 7, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 20 });
  key.shadow.radius = 4;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb9f36b, 0.45);
  rim.position.set(-5, 3, -6);
  scene.add(rim);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.45 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(9, 36, 0x24443a, 0x13261f);
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  scene.add(grid);

  // Fahrzeug (Karosserie, Dekor, Bauteile) – wird beim Bauformwechsel neu aufgebaut
  const base = readPlan(svg);
  const vehicle = new THREE.Group();
  scene.add(vehicle);
  const parts = new Map(); // id → { group, materials[], label }
  const pickables = [];
  let currentLayout = null;

  function build(layoutId) {
    const L = LAYOUTS[layoutId] || LAYOUTS.fwd4;
    currentLayout = LAYOUTS[layoutId] ? layoutId : 'fwd4';
    disposeTree(vehicle);
    vehicle.clear();
    parts.clear();
    pickables.length = 0;

    const profile = PROFILES[L.profile];
    const body = bodyGeometry(profile);
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x9fc4b8, transparent: true, opacity: 0.11, roughness: 0.15, depthWrite: false, side: THREE.DoubleSide });
    const edges = new THREE.LineBasicMaterial({ color: COLORS.edge, transparent: true, opacity: 0.7 });
    glass.userData.own = edges.userData.own = true;
    vehicle.add(new THREE.Mesh(body, glass), new THREE.LineSegments(new THREE.EdgesGeometry(body, 22), edges));
    addVehicleDecor(vehicle, profile, L.drivetrain);

    const defs = new Map(base);
    for (const [id, override] of Object.entries(L.overrides || {})) {
      const from = base.get(id) || {};
      defs.set(id, { ...from, label: from.label || EXTRA_LABELS[id] || id, ...override });
    }

    for (const [id, def] of defs) {
      const group = new THREE.Group();
      const materials = [];
      const add = (geometry, position, rotation, color) => {
        const material = makeMaterial();
        if (color !== undefined) { material.userData.baseColor = color; material.color.setHex(color); }
        const m = new THREE.Mesh(geometry, material);
        m.position.copy(position);
        if (rotation) m.rotation.set(...rotation);
        m.castShadow = true;
        m.userData = { id, label: def.label };
        group.add(m);
        materials.push(material);
        pickables.push(m);
        return m;
      };
      buildShape(def, add);
      // Zusatzformen: eigene der Bauform oder die der Grundform (sofern passend)
      if (L.details?.[id]) {
        L.details[id]({ def, add: (shape, extra) => buildShape({ ...extra, shape }, add) });
      } else if (!L.skipDetails?.includes(id) && COMPONENT_DETAILS[id]) {
        COMPONENT_DETAILS[id]({
          add: (geometry, position, rotation, color) => add(geometry, new THREE.Vector3(...position), rotation, color),
          cx: def.x, cz: def.z, w: def.w, d: def.d, spec: { y: def.y, h: def.h },
        });
      }
      vehicle.add(group);
      parts.set(id, { group, materials, label: def.label });
    }
    highlight(state);
  }

  // Schwebende Beschriftungen für markierte Bauteile
  const labelLayer = document.createElement('div');
  labelLayer.className = 'vehicle-3d-labels';
  container.appendChild(labelLayer);
  let labelEls = [];

  // Bauteile, die die Bauform nicht hat, auf das übergeordnete Bauteil abbilden
  const resolve = (id) => (parts.has(id) ? id : parts.has(FALLBACK[id]) ? FALLBACK[id] : null);

  let state = { active: [], context: [], labels: [] };
  let shown = { active: [], context: [] };
  function highlight(next = {}) {
    state = { active: next.active || [], context: next.context || [], labels: next.labels || [] };
    // Sind alle Zylinder der Grundform (1–4) betroffen, gilt das für alle Zylinder der Bauform (z. B. 6 oder 8).
    const allCylinders = ['cylinder-1', 'cylinder-2', 'cylinder-3', 'cylinder-4'].every((id) => state.active.includes(id));
    const requested = allCylinders ? [...state.active, ...[...parts.keys()].filter((id) => id.startsWith('cylinder-'))] : state.active;
    const active = [...new Set(requested.map(resolve).filter(Boolean))];
    const context = [...new Set(state.context.map(resolve).filter((id) => id && !active.includes(id)))];
    shown = { active, context };
    const any = active.length > 0 || context.length > 0;
    for (const [id, part] of parts) {
      const isActive = active.includes(id), isContext = !isActive && context.includes(id);
      for (const m of part.materials) {
        m.color.setHex(isActive ? COLORS.active : isContext ? COLORS.context : (m.userData.baseColor ?? COLORS.base));
        m.emissive.setHex(isActive ? 0xff9a00 : isContext ? 0x3a2600 : 0x000000);
        m.emissiveIntensity = isActive ? 0.9 : 0.6;
        m.opacity = isActive || isContext ? 1 : any ? 0.3 : 0.95;
        m.depthWrite = m.opacity > 0.5;
      }
    }
    labelLayer.replaceChildren();
    // Bis zu zwei Bauteile einzeln beschriften, mehr als zwei mit einem gemeinsamen Label.
    const groups = active.length > 2
      ? [{ ids: active, text: state.labels.find((l) => !context.some((id) => parts.get(id)?.label === l)) || `${active.length} Bauteile` }]
      : active.map((id) => ({ ids: [id], text: parts.get(id)?.label || id }));
    labelEls = groups.map(({ ids, text }) => {
      const el = document.createElement('span');
      el.textContent = text;
      labelLayer.appendChild(el);
      return { ids, el };
    });
    requestRender();
  }

  // Bauteilname beim Überfahren
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  renderer.domElement.addEventListener('pointermove', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    const hit = hits.find((h) => h.object.material.opacity > 0.5) || hits[0];
    renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
    onHover?.(hit ? hit.object.userData.label : null, event.clientX - rect.left, event.clientY - rect.top);
  });
  renderer.domElement.addEventListener('pointerleave', () => onHover?.(null));

  // Kamerafahrten zu Schnellansichten
  function setView(name) {
    if (!views[name]) return;
    userMoved = true; // gewählte Ansicht nicht durch spätere Größenänderungen überschreiben
    const to = viewPosition(name);
    controls.autoRotate = false;
    if (reducedMotion) { camera.position.copy(to); controls.update(); requestRender(); return; }
    cameraTween = { from: camera.position.clone(), to: to.clone(), start: performance.now(), duration: 700 };
    requestRender();
  }

  // Größe, Sichtbarkeit, Renderschleife
  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!userMoved && !cameraTween) camera.position.copy(viewPosition('3d'));
    requestRender();
  }
  new ResizeObserver(resize).observe(container);

  let visible = true, needsRender = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(container);
  function requestRender() { needsRender = true; }
  const projected = new THREE.Vector3();
  const centerBox = new THREE.Box3();

  renderer.setAnimationLoop((time) => {
    if (!visible || document.hidden || container.offsetParent === null) return;
    if (cameraTween) {
      const t = Math.min(1, (time - cameraTween.start) / cameraTween.duration);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      camera.position.lerpVectors(cameraTween.from, cameraTween.to, e);
      if (t >= 1) cameraTween = null;
      needsRender = true;
    }
    const moving = controls.update() || controls.autoRotate;
    const pulsing = shown.active.length > 0 && !reducedMotion;
    if (pulsing) {
      const k = 0.65 + 0.45 * Math.sin(time / 260);
      for (const id of shown.active) for (const m of parts.get(id)?.materials || []) m.emissiveIntensity = k;
    }
    if (!(moving || pulsing || needsRender)) return;
    renderer.render(scene, camera);
    // Beschriftungen an die projizierte Bauteilmitte setzen, innerhalb der Bühne gehalten
    const { clientWidth: w, clientHeight: h } = container;
    for (const { ids, el } of labelEls) {
      centerBox.makeEmpty();
      for (const id of ids) { const group = parts.get(id)?.group; if (group) centerBox.expandByObject(group); }
      if (centerBox.isEmpty()) continue;
      centerBox.getCenter(projected);
      projected.y = centerBox.max.y + 0.05;
      projected.project(camera);
      const half = el.offsetWidth / 2 + 6;
      const px = Math.min(Math.max(((projected.x + 1) / 2) * w, half), w - half);
      el.style.transform = `translate(${px}px, ${((1 - projected.y) / 2) * h}px) translate(-50%, -130%)`;
    }
    needsRender = false;
  });

  build(layout);
  resize();
  return {
    highlight,
    setView,
    setLayout(id) { if (id !== currentLayout) build(id); },
    get layout() { return currentLayout; },
  };
}
