// Detailgeometrie für die 3D-Ansicht.
// addVehicleDecor: Karosserie, Räder, Fahrwerk, Innenraum – reine Orientierung, nicht markierbar.
// COMPONENT_DETAILS: zusätzliche Formen je Bauteil, die mit dem Bauteil zusammen aufleuchten.
import * as THREE from 'three';

const FRONT_Z = 1.295, REAR_Z = -1.466, TRACK = 0.8, WHEEL_R = 0.33;

const mat = {
  chassis: new THREE.MeshStandardMaterial({ color: 0x3a474b, roughness: 0.55, metalness: 0.6 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1b2326, roughness: 0.7, metalness: 0.3 }),
  tyre: new THREE.MeshStandardMaterial({ color: 0x141a1c, roughness: 0.92, metalness: 0 }),
  rim: new THREE.MeshStandardMaterial({ color: 0xaab8bc, roughness: 0.25, metalness: 0.9 }),
  disc: new THREE.MeshStandardMaterial({ color: 0x7c8588, roughness: 0.4, metalness: 0.85 }),
  caliper: new THREE.MeshStandardMaterial({ color: 0x9a2f22, roughness: 0.45, metalness: 0.4 }),
  spring: new THREE.MeshStandardMaterial({ color: 0x5f9a3a, roughness: 0.4, metalness: 0.5 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x0f2a31, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }),
  headlight: new THREE.MeshStandardMaterial({ color: 0xdff2ff, emissive: 0xbfe2ff, emissiveIntensity: 0.9, roughness: 0.2 }),
  taillight: new THREE.MeshStandardMaterial({ color: 0xff3b2f, emissive: 0xc0160c, emissiveIntensity: 0.8, roughness: 0.3 }),
  seat: new THREE.MeshStandardMaterial({ color: 0x24302f, roughness: 0.9, transparent: true, opacity: 0.55 }),
  line: new THREE.LineBasicMaterial({ color: 0x9fc7bb, transparent: true, opacity: 0.35 }),
};

class Helix extends THREE.Curve {
  constructor(radius, height, turns) { super(); Object.assign(this, { radius, height, turns }); }
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set(Math.cos(a) * this.radius, t * this.height, Math.sin(a) * this.radius);
  }
}

const tube = (points, radius, segments = 24) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), segments, radius, 8, false);

function mesh(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], shadow = true) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position);
  m.rotation.set(...rotation);
  m.castShadow = shadow;
  return m;
}

function wheel(x, z) {
  const g = new THREE.Group();
  const side = Math.sign(x);
  g.add(mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.2, 48), mat.tyre, [0, 0, 0], [0, 0, Math.PI / 2]));
  for (const dx of [-0.1, 0.1]) g.add(mesh(new THREE.TorusGeometry(WHEEL_R - 0.03, 0.03, 10, 48), mat.tyre, [dx, 0, 0], [0, Math.PI / 2, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.19, 32), mat.dark, [0, 0, 0], [0, 0, Math.PI / 2]));
  const outer = side * 0.098;
  g.add(mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 40), mat.rim, [outer, 0, 0], [0, Math.PI / 2, 0]));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(mesh(new THREE.BoxGeometry(0.02, 0.17, 0.035), mat.rim, [outer, Math.sin(a) * 0.1, Math.cos(a) * 0.1], [a, 0, 0]));
  }
  g.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 20), mat.rim, [outer, 0, 0], [0, 0, Math.PI / 2]));
  // Bremsscheibe und Sattel innen
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.022, 36), mat.disc, [-side * 0.05, 0, 0], [0, 0, Math.PI / 2]));
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.09, 0.13), mat.caliper, [-side * 0.05, 0.12, -0.06], [0.5, 0, 0]));
  g.position.set(x, WHEEL_R, z);
  return g;
}

function strut(x, z, height = 0.42) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.TubeGeometry(new Helix(0.065, height * 0.7, 6), 120, 0.009, 6, false), mat.spring, [0, 0.12, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, height, 12), mat.chassis, [0, height / 2 + 0.05, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 20), mat.chassis, [0, 0.12, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 20), mat.chassis, [0, 0.12 + height * 0.7, 0]));
  g.position.set(x, 0.38, z);
  return g;
}

// Seitenfenster als Fläche im Seitenprofil (z, y), außen an der Karosserie.
function sideWindows(halfWidth) {
  const s = new THREE.Shape();
  const P = (z, y) => [-z, y];
  s.moveTo(...P(0.92, 1.0));
  s.quadraticCurveTo(...P(0.62, 1.12), ...P(0.4, 1.32));
  s.quadraticCurveTo(...P(-0.35, 1.41), ...P(-1.18, 1.35));
  s.quadraticCurveTo(...P(-1.6, 1.22), ...P(-1.78, 1.02));
  s.lineTo(...P(0.92, 1.0));
  const geo = new THREE.ShapeGeometry(s, 16);
  const group = new THREE.Group();
  for (const sideX of [halfWidth, -halfWidth]) {
    const m = new THREE.Mesh(geo, mat.glass);
    m.rotation.y = Math.PI / 2;
    m.position.x = sideX;
    group.add(m);
  }
  return group;
}

export function addVehicleDecor(scene) {
  const decor = new THREE.Group();

  // Räder, Federbeine, Achsen, Hilfsrahmen
  for (const [x, z] of [[TRACK, FRONT_Z], [-TRACK, FRONT_Z], [TRACK, REAR_Z], [-TRACK, REAR_Z]]) {
    decor.add(wheel(x, z));
    decor.add(strut(Math.sign(x) * 0.6, z));
  }
  decor.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.5, 12), mat.chassis, [0, WHEEL_R, FRONT_Z], [0, 0, Math.PI / 2])); // Antriebswellen
  for (const sx of [0.62, -0.62]) decor.add(mesh(new THREE.SphereGeometry(0.045, 16, 12), mat.dark, [sx, WHEEL_R, FRONT_Z])); // Gelenke
  decor.add(mesh(new THREE.BoxGeometry(1.36, 0.08, 0.08), mat.chassis, [0, WHEEL_R, REAR_Z])); // Verbundlenkerachse
  for (const sx of [0.6, -0.6]) decor.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), mat.chassis, [sx, WHEEL_R, REAR_Z + 0.25]));
  for (const sx of [0.42, -0.42]) decor.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 1.0), mat.chassis, [sx, 0.32, 1.45])); // Hilfsrahmen
  decor.add(mesh(new THREE.BoxGeometry(0.9, 0.05, 0.06), mat.chassis, [0, 0.32, 1.0]));
  for (const sx of [0.62, -0.62]) decor.add(mesh(new THREE.BoxGeometry(0.06, 0.07, 2.2), mat.chassis, [sx, 0.3, -0.25])); // Schweller

  // Scheiben, Leuchten, Spiegel, Grill, Türfugen
  decor.add(sideWindows(0.882));
  const windshield = new THREE.PlaneGeometry(1.42, 0.5);
  decor.add(mesh(windshield, mat.glass, [0, 1.17, 0.66], [-0.95, 0, 0], false));
  decor.add(mesh(new THREE.PlaneGeometry(1.36, 0.36), mat.glass, [0, 1.2, -1.6], [0.85, Math.PI, 0], false));
  for (const sx of [0.58, -0.58]) {
    decor.add(mesh(new THREE.BoxGeometry(0.3, 0.07, 0.05), mat.headlight, [sx, 0.7, 2.23], [0, 0, 0], false));
    decor.add(mesh(new THREE.BoxGeometry(0.28, 0.08, 0.04), mat.taillight, [sx, 0.88, -2.25], [0, 0, 0], false));
    decor.add(mesh(new THREE.BoxGeometry(0.06, 0.08, 0.14), mat.dark, [Math.sign(sx) * 0.97, 1.03, 0.82]));
  }
  decor.add(mesh(new THREE.BoxGeometry(0.62, 0.12, 0.03), mat.dark, [0, 0.55, 2.27], [0, 0, 0], false));
  const seams = [];
  for (const sideX of [0.885, -0.885]) for (const z of [0.88, -0.28, -1.3]) seams.push(sideX, 0.38, z, sideX, 1.0, z);
  const seamGeo = new THREE.BufferGeometry();
  seamGeo.setAttribute('position', new THREE.Float32BufferAttribute(seams, 3));
  decor.add(new THREE.LineSegments(seamGeo, mat.line));

  // Innenraum (Sitze) zur Orientierung
  for (const sx of [0.4, -0.4]) {
    decor.add(mesh(new THREE.BoxGeometry(0.45, 0.1, 0.48), mat.seat, [sx, 0.48, -0.05], [0, 0, 0], false));
    decor.add(mesh(new THREE.BoxGeometry(0.45, 0.55, 0.1), mat.seat, [sx, 0.78, -0.3], [-0.15, 0, 0], false));
  }
  decor.add(mesh(new THREE.BoxGeometry(1.3, 0.1, 0.45), mat.seat, [0, 0.48, -1.0], [0, 0, 0], false));
  decor.add(mesh(new THREE.BoxGeometry(1.3, 0.5, 0.1), mat.seat, [0, 0.75, -1.24], [-0.12, 0, 0], false));

  // Kraftstoffleitung vom Tank nach vorn (Dekor)
  decor.add(mesh(tube([[0.3, 0.3, -1.4], [0.5, 0.29, -0.4], [0.5, 0.3, 0.6], [0.35, 0.6, 1.1], [0.2, 1.0, 1.42]], 0.008, 60), mat.chassis));

  scene.add(decor);
  return decor;
}

// Zusatzformen je Bauteil. add(geometry, position[], rotation[], baseColor?) hängt sie an die Bauteilgruppe.
export const COMPONENT_DETAILS = {
  engine({ add, cx, cz, w, d, spec }) {
    const top = spec.y + spec.h / 2;
    for (let i = -3; i <= 3; i++) add(new THREE.BoxGeometry(w * 0.8, 0.012, 0.012), [cx, top + 0.075, cz + i * d * 0.07]); // Rippen
    add(new THREE.BoxGeometry(w * 0.8, 0.12, d * 0.7), [cx, spec.y - spec.h / 2 - 0.06, cz]); // Ölwanne
    add(new THREE.BoxGeometry(0.06, spec.h * 0.8, d * 0.8), [cx + w / 2 + 0.03, spec.y, cz]); // Steuerkettendeckel
    for (let i = 0; i < 4; i++) { // Abgaskrümmer nach hinten
      const x = cx - w * 0.3 + i * w * 0.2;
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x, spec.y + 0.1, cz - d / 2), new THREE.Vector3(x * 0.6, spec.y - 0.05, cz - d / 2 - 0.12), new THREE.Vector3(-0.45, spec.y - 0.25, cz - d / 2 - 0.15)]), 16, 0.018, 8), [0, 0, 0]);
    }
  },
  cooling({ add, cx, cz, w, spec }) {
    for (let i = 0; i < 14; i++) add(new THREE.BoxGeometry(0.006, spec.h * 0.92, 0.05), [cx - w / 2 + 0.04 + i * (w - 0.08) / 13, spec.y, cz]);
    add(new THREE.BoxGeometry(w, 0.03, 0.08), [cx, spec.y + spec.h / 2, cz]);
    add(new THREE.BoxGeometry(w, 0.03, 0.08), [cx, spec.y - spec.h / 2, cz]);
    add(tube([[cx - w * 0.35, spec.y + 0.15, cz - 0.05], [cx - w * 0.3, spec.y + 0.2, cz - 0.25], [cx - 0.1, spec.y + 0.22, cz - 0.4]], 0.022), [0, 0, 0]);
    add(tube([[cx + w * 0.35, spec.y - 0.15, cz - 0.05], [cx + w * 0.3, spec.y - 0.2, cz - 0.3], [cx + 0.15, spec.y - 0.2, cz - 0.45]], 0.022), [0, 0, 0]);
  },
  battery({ add, cx, cz, w, d, spec }) {
    const top = spec.y + spec.h / 2;
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 12), [cx, top + 0.02, cz + d * 0.3], [0, 0, 0], 0xc0392b);
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 12), [cx, top + 0.02, cz - d * 0.3], [0, 0, 0], 0x1d2426);
    add(new THREE.BoxGeometry(w * 1.05, 0.02, d * 1.05), [cx, top - 0.01, cz]);
  },
  ecm({ add, cx, cz, w, d, spec }) {
    add(new THREE.BoxGeometry(w * 0.5, 0.05, 0.05), [cx, spec.y + 0.02, cz - d / 2 - 0.02]);
    add(tube([[cx, spec.y + 0.02, cz - d / 2 - 0.04], [cx - 0.05, spec.y + 0.08, cz - d / 2 - 0.2], [cx - 0.2, spec.y + 0.15, cz - d / 2 - 0.3]], 0.015), [0, 0, 0]);
  },
  transmission({ add, cx, cz, w, d, spec }) {
    add(new THREE.CylinderGeometry(spec.h * 0.55, spec.h * 0.45, 0.16, 28), [cx + w / 2 + 0.06, spec.y, cz], [0, 0, Math.PI / 2]); // Kupplungsglocke
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 16), [cx, spec.y - 0.12, cz + d / 2 + 0.04], [Math.PI / 2, 0, 0]);
  },
  intake({ add, cx, cz, w, d, spec }) {
    add(new THREE.BoxGeometry(w * 1.1, 0.03, d * 1.05), [cx, spec.y + spec.h / 2 + 0.015, cz]); // Deckel
    add(tube([[cx, spec.y + 0.05, cz + d / 2], [cx + 0.02, spec.y + 0.04, cz + d / 2 + 0.15], [cx + 0.05, spec.y - 0.05, cz + d / 2 + 0.3]], 0.04), [0, 0, 0]); // Ansaugschnorchel
    for (let i = 0; i < 4; i++) add(tube([[cx + 0.05, spec.y, cz - d / 2 + 0.05], [0.2 - i * 0.1, spec.y + 0.12, cz - d / 2 - 0.05], [0.32 - i * 0.21, 1.0, 1.52]], 0.018, 20), [0, 0, 0]); // Saugrohre
  },
  exhaust({ add }) {
    add(new THREE.BoxGeometry(0.42, 0.16, 0.5), [-0.26, 0.26, -1.78]); // Schalldämpfer
    add(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 16), [-0.4, 0.26, -2.12], [Math.PI / 2, 0, 0]); // Endrohr
    add(new THREE.CylinderGeometry(0.075, 0.075, 0.32, 24), [-0.29, 0.25, -0.1], [Math.PI / 2, 0, 0]); // Mitteltopf
  },
  tank({ add, cx, cz, w, d, spec }) {
    add(new THREE.CapsuleGeometry(d / 2, w - d, 6, 16), [cx, spec.y, cz], [0, 0, Math.PI / 2]);
    add(tube([[cx + w / 2 - 0.05, spec.y + 0.05, cz], [0.72, spec.y + 0.3, cz + 0.02], [0.79, 0.86, -1.48]], 0.022), [0, 0, 0]); // Einfüllstutzen
  },
  'hv-battery'({ add, cx, cz, w, d, spec }) {
    const top = spec.y + spec.h / 2 + 0.004;
    for (let i = 1; i < 8; i++) add(new THREE.BoxGeometry(0.008, 0.006, d * 0.9), [cx - w / 2 + (i * w) / 8, top, cz]);
    add(new THREE.BoxGeometry(w * 0.95, 0.006, 0.008), [cx, top, cz]);
  },
  'e-motor'({ add, cx, cz }) {
    add(new THREE.CylinderGeometry(0.022, 0.022, 1.3, 12), [cx, 0.33, -1.466], [0, 0, Math.PI / 2]);
    add(tube([[cx, 0.36, cz], [cx, 0.34, cz - 0.1], [cx, 0.33, -1.466]], 0.03), [0, 0, 0]);
  },
  abs({ add, cx, cz }) {
    // Bremsleitungen vom ABS-Aggregat zu den vier Rädern
    for (const [x, z] of [[0.68, FRONT_Z], [-0.68, FRONT_Z], [0.68, REAR_Z], [-0.68, REAR_Z]]) {
      add(tube([[cx, 0.72, cz], [cx * 0.6 + x * 0.4, 0.5, (cz + z) / 2], [x, 0.38, z]], 0.006, 30), [0, 0, 0]);
    }
  },
  steering({ add }) {
    for (const sx of [1, -1]) add(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 10), [sx * 0.52, 0.42, 1.12], [0, 0.35 * sx, Math.PI / 2]);
  },
  alternator({ add, cx, cz, w }) {
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 20), [cx + w / 2 + 0.02, 0.56, cz], [0, 0, Math.PI / 2]);
  },
  'ac-compressor'({ add, cx, cz, w }) {
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20), [cx + w / 2 + 0.02, 0.5, cz], [0, 0, Math.PI / 2]);
  },
  turbo({ add, cx, cz }) {
    add(new THREE.TorusGeometry(0.05, 0.022, 10, 24), [cx, 0.6, cz], [0, Math.PI / 2, 0]);
  },
};
