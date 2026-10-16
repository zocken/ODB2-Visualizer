// Drehbare 3D-Fahrzeugansicht (Three.js). Die Lage der Bauteile in der Ebene stammt aus dem
// 2D-Plan (SVG, data-component); Höhe und Form legt SPEC fest. So bleiben beide Ansichten deckungsgleich
// und alle Code-Zuordnungen funktionieren ohne Änderung.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { addVehicleDecor, COMPONENT_DETAILS } from './vehicle3d-details.js';

// SVG-Plan (viewBox 360×620, Front oben, Fahrerseite links) → Meter. +x = Fahrerseite, +z = Front.
const SX = 0.01, SZ = 0.0078, CX = 180, CY = 313;
const toX = (svgX) => (CX - svgX) * SX;
const toZ = (svgY) => (CY - svgY) * SZ;

// Höhe (Mitte, m), Bauhöhe und Form je Bauteil. Ohne Eintrag: flacher Kasten im Motorraum.
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
  const d = pathEl.getAttribute('d');
  const parts = d.split(/(?=M)/).filter((p) => p.trim());
  const ns = 'http://www.w3.org/2000/svg';
  return parts.map((part) => {
    const p = document.createElementNS(ns, 'path');
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

function bodyGeometry() {
  // Seitenprofil (z = Länge, y = Höhe), entlang der Breite extrudiert.
  const s = new THREE.Shape();
  const P = (z, y) => [-z, y];
  s.moveTo(...P(-2.15, 0.32));
  s.lineTo(...P(2.05, 0.32));
  s.quadraticCurveTo(...P(2.25, 0.34), ...P(2.25, 0.55));
  s.quadraticCurveTo(...P(2.24, 0.72), ...P(2.05, 0.78));
  s.lineTo(...P(1.0, 0.95));
  s.quadraticCurveTo(...P(0.62, 1.04), ...P(0.35, 1.36));
  s.quadraticCurveTo(...P(-0.4, 1.47), ...P(-1.25, 1.4));
  s.quadraticCurveTo(...P(-1.75, 1.26), ...P(-1.95, 1.02));
  s.lineTo(...P(-2.2, 0.98));
  s.quadraticCurveTo(...P(-2.28, 0.7), ...P(-2.2, 0.45));
  s.quadraticCurveTo(...P(-2.18, 0.32), ...P(-2.15, 0.32));
  const width = 1.62;
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 5, curveSegments: 28 });
  g.rotateY(Math.PI / 2);
  g.translate(-width / 2, 0, 0);
  return g;
}

function makeMaterial() {
  return new THREE.MeshStandardMaterial({ color: COLORS.base, roughness: 0.45, metalness: 0.3, transparent: true, opacity: 0.95, emissive: 0x000000 });
}

export function createVehicle3D({ container, svg, onHover }) {
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
  camera.position.copy(views['3d']);
  // Bei schmalen (hohen) Bühnen wie auf dem Handy weiter wegrücken, damit das Auto ganz ins Bild passt.
  // Abstand so wählen, dass die je Blickrichtung sichtbare Fahrzeugausdehnung (Radius) in den engeren Bildwinkel passt.
  // [vertikaler, horizontaler] Radius des Fahrzeugs je Blickrichtung (m)
  const VIEW_FIT = { '3d': [1.5, 2.4], top: [2.4, 1.1], side: [0.95, 2.45], front: [1.35, 1.45] };
  const fitDistance = (name) => {
    const v = THREE.MathUtils.degToRad(camera.fov) / 2;
    const h = Math.atan(Math.tan(v) * camera.aspect);
    const [rv, rh] = VIEW_FIT[name];
    return Math.max(rv / Math.sin(v), rh / Math.sin(h));
  };
  const viewPosition = (name) => views[name].clone().normalize().multiplyScalar(fitDistance(name));
  let userMoved = false;

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
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.45 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const rim = new THREE.DirectionalLight(0xb9f36b, 0.45);
  rim.position.set(-5, 3, -6);
  scene.add(rim);
  const grid = new THREE.GridHelper(9, 36, 0x24443a, 0x13261f);
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  scene.add(grid);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(0.55, 1.05, 1);
  shadow.position.y = 0.002;
  scene.add(shadow);

  // Karosserie: gläsern mit Konturlinien, damit das Innenleben sichtbar bleibt
  const body = bodyGeometry();
  scene.add(new THREE.Mesh(body, new THREE.MeshPhysicalMaterial({ color: 0x9fc4b8, transparent: true, opacity: 0.11, roughness: 0.15, depthWrite: false, side: THREE.DoubleSide })));
  scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(body, 22), new THREE.LineBasicMaterial({ color: COLORS.edge, transparent: true, opacity: 0.7 })));

  // Räder, Fahrwerk, Scheiben, Leuchten, Innenraum
  addVehicleDecor(scene);

  // Bauteile aus dem SVG-Plan aufbauen
  const parts = new Map(); // id → { group, materials[], label }
  const pickables = [];
  for (const g of svg.querySelectorAll('[data-component]')) {
    const id = g.dataset.component;
    const spec = SPEC[id] || { y: 0.62, h: 0.06 };
    const label = g.querySelector('title')?.textContent || id;
    const group = new THREE.Group();
    group.userData = { id, label };
    const materials = [];
    const add = (geometry, position, rotation, baseColor) => {
      const material = makeMaterial();
      if (baseColor !== undefined) { material.userData.baseColor = baseColor; material.color.setHex(baseColor); }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      if (rotation) mesh.rotation.set(...rotation);
      mesh.castShadow = true;
      mesh.userData = { id, label };
      group.add(mesh);
      materials.push(material);
      pickables.push(mesh);
      return mesh;
    };
    const box = g.getBBox();
    const cx = toX(box.x + box.width / 2), cz = toZ(box.y + box.height / 2);
    const w = Math.max(box.width * SX, 0.03), d = Math.max(box.height * SZ, 0.03);

    if (spec.shape === 'tube') {
      const path = g.querySelector('path');
      for (const pts of svgPathPoints(path)) {
        const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(toX(p.x), spec.y, toZ(p.y))), false, 'catmullrom', 0.05);
        add(new THREE.TubeGeometry(curve, Math.max(8, pts.length * 2), spec.r, 8, false), new THREE.Vector3());
      }
    } else if (spec.shape === 'steering') {
      const rack = g.querySelector('rect').getBBox();
      add(new THREE.BoxGeometry(rack.width * SX, 0.05, 0.05), new THREE.Vector3(toX(rack.x + rack.width / 2), 0.45, toZ(rack.y + rack.height / 2)));
      const ring = g.querySelector('circle');
      const rx = toX(+ring.getAttribute('cx')), rz = toZ(+ring.getAttribute('cy'));
      add(new THREE.TorusGeometry(0.17, 0.018, 10, 36), new THREE.Vector3(rx, 0.98, rz), [Math.PI * 0.3, 0, 0]);
      const column = new THREE.CylinderGeometry(0.018, 0.018, 0.7, 10);
      add(column, new THREE.Vector3(rx, 0.75, rz + 0.25), [Math.PI * 0.3, 0, 0]);
    } else if (spec.shape === 'dots') {
      for (const c of g.querySelectorAll('circle')) {
        add(new THREE.CylinderGeometry(0.018, 0.018, spec.h, 10), new THREE.Vector3(toX(+c.getAttribute('cx')), spec.y, toZ(+c.getAttribute('cy'))));
      }
    } else if (spec.shape === 'cylV') {
      const r = Math.min(w, d) / 2;
      add(new THREE.CylinderGeometry(r, r, spec.h, 24), new THREE.Vector3(cx, spec.y, cz));
    } else if (spec.shape === 'cylX' || spec.shape === 'cylZ') {
      const r = Math.min(w, d) / 2;
      const len = spec.shape === 'cylX' ? Math.max(w, 0.08) : Math.max(d, 0.08);
      const mesh = add(new THREE.CylinderGeometry(r, r, len, 24), new THREE.Vector3(cx, spec.y, cz));
      if (spec.shape === 'cylX') mesh.rotation.z = Math.PI / 2; else mesh.rotation.x = Math.PI / 2;
    } else if (spec.shape === 'engine') {
      const block = add(new THREE.BoxGeometry(w, spec.h, d), new THREE.Vector3(cx, spec.y, cz));
      block.geometry.translate(0, 0, 0);
      add(new THREE.BoxGeometry(w * 0.86, 0.07, d * 0.6), new THREE.Vector3(cx, spec.y + spec.h / 2 + 0.035, cz)); // Zylinderkopfhaube
    } else if (spec.shape !== 'none') {
      add(new THREE.BoxGeometry(w, spec.h ?? 0.06, d), new THREE.Vector3(cx, spec.y ?? 0.62, cz));
    }
    // Zusatzformen (z. B. Rippen, Schläuche, Leitungen), die mit dem Bauteil aufleuchten
    COMPONENT_DETAILS[id]?.({
      add: (geometry, position, rotation, baseColor) => add(geometry, new THREE.Vector3(...position), rotation, baseColor),
      cx, cz, w, d, spec,
    });
    scene.add(group);
    parts.set(id, { group, materials, label });
  }

  // Schwebende Beschriftungen für markierte Bauteile
  const labelLayer = document.createElement('div');
  labelLayer.className = 'vehicle-3d-labels';
  container.appendChild(labelLayer);
  let labelEls = [];

  let state = { active: [], context: [] };
  function highlight({ active = [], context = [], labels = [] } = {}) {
    state = { active, context };
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
      ? [{ ids: active, text: labels.find((l) => !context.some((id) => parts.get(id)?.label === l)) || `${active.length} Bauteile` }]
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
    const hit = raycaster.intersectObjects(pickables, false).find((h) => h.object.material.opacity > 0.5) || raycaster.intersectObjects(pickables, false)[0];
    renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
    onHover?.(hit ? hit.object.userData.label : null, event.clientX - rect.left, event.clientY - rect.top);
  });
  renderer.domElement.addEventListener('pointerleave', () => onHover?.(null));

  // Kamerafahrten zu Schnellansichten
  let cameraTween = null;
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
    const pulsing = state.active.length > 0 && !reducedMotion;
    if (pulsing) {
      const k = 0.65 + 0.45 * Math.sin(time / 260);
      for (const id of state.active) for (const m of parts.get(id)?.materials || []) m.emissiveIntensity = k;
    }
    if (!(moving || pulsing || needsRender)) return;
    renderer.render(scene, camera);
    // Beschriftungen an die projizierte Bauteilmitte setzen
    const { clientWidth: w, clientHeight: h } = container;
    for (const { ids, el } of labelEls) {
      centerBox.makeEmpty();
      for (const id of ids) { const group = parts.get(id)?.group; if (group) centerBox.expandByObject(group); }
      if (centerBox.isEmpty()) continue;
      centerBox.getCenter(projected);
      projected.y = centerBox.max.y + 0.05;
      projected.project(camera);
      // Mitte der Beschriftung innerhalb der Bühne halten
      const half = el.offsetWidth / 2 + 6;
      const px = Math.min(Math.max(((projected.x + 1) / 2) * w, half), w - half);
      el.style.transform = `translate(${px}px, ${((1 - projected.y) / 2) * h}px) translate(-50%, -130%)`;
    }
    needsRender = false;
  });

  resize();
  return { highlight, setView, labels: Object.fromEntries([...parts].map(([id, p]) => [id, p.label])) };
}
