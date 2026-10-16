// Fahrzeug-Bauformen für die 3D-Ansicht. Eine Bauform beschreibt Karosserieprofil, Antriebsart
// und die Lage der Antriebsbauteile; alle übrigen Bauteile übernimmt sie aus der Grundform (2D-Plan).
// Maße in Metern: +x = Fahrerseite (links), +z = Front, y = Höhe.

// Seitenprofile: Befehle in (z, y) – M = Start, L = Linie, Q = Kurve (Kontrollpunkt, Ziel).
export const PROFILES = {
  hatch: {
    outline: [['M', -2.15, 0.32], ['L', 2.05, 0.32], ['Q', 2.25, 0.34, 2.25, 0.55], ['Q', 2.24, 0.72, 2.05, 0.78], ['L', 1.0, 0.95],
      ['Q', 0.62, 1.04, 0.35, 1.36], ['Q', -0.4, 1.47, -1.25, 1.4], ['Q', -1.75, 1.26, -1.95, 1.02], ['L', -2.2, 0.98],
      ['Q', -2.28, 0.7, -2.2, 0.45], ['Q', -2.18, 0.32, -2.15, 0.32]],
    windows: [['M', 0.92, 1.0], ['Q', 0.62, 1.12, 0.4, 1.32], ['Q', -0.35, 1.41, -1.18, 1.35], ['Q', -1.6, 1.22, -1.78, 1.02], ['L', 0.92, 1.0]],
    windshield: { y: 1.17, z: 0.66, tilt: -0.95, height: 0.5 },
    rearWindow: { y: 1.2, z: -1.6, tilt: 0.85, height: 0.36 },
    front: 2.25, rear: -2.25, headlightY: 0.7, taillightY: 0.88, seams: [0.88, -0.28, -1.3],
  },
  sedan: {
    outline: [['M', -2.3, 0.32], ['L', 2.15, 0.32], ['Q', 2.34, 0.34, 2.34, 0.55], ['Q', 2.33, 0.7, 2.15, 0.76], ['L', 0.9, 0.93],
      ['Q', 0.5, 1.0, 0.2, 1.33], ['Q', -0.5, 1.43, -1.15, 1.36], ['Q', -1.55, 1.2, -1.82, 0.98], ['L', -2.3, 0.96],
      ['Q', -2.39, 0.7, -2.31, 0.45], ['Q', -2.29, 0.32, -2.3, 0.32]],
    windows: [['M', 0.84, 0.98], ['Q', 0.5, 1.07, 0.25, 1.29], ['Q', -0.45, 1.38, -1.1, 1.32], ['Q', -1.45, 1.18, -1.66, 1.0], ['L', 0.84, 0.98]],
    windshield: { y: 1.13, z: 0.56, tilt: -1.0, height: 0.5 },
    rearWindow: { y: 1.17, z: -1.48, tilt: 1.0, height: 0.4 },
    front: 2.34, rear: -2.39, headlightY: 0.68, taillightY: 0.86, seams: [0.8, -0.35, -1.25],
  },
  suv: {
    outline: [['M', -2.3, 0.42], ['L', 2.15, 0.42], ['Q', 2.37, 0.44, 2.37, 0.7], ['Q', 2.36, 0.92, 2.2, 0.99], ['L', 1.05, 1.1],
      ['Q', 0.75, 1.2, 0.5, 1.6], ['Q', -0.3, 1.73, -1.95, 1.69], ['Q', -2.26, 1.6, -2.31, 1.3], ['L', -2.33, 0.62],
      ['Q', -2.34, 0.43, -2.3, 0.42]],
    windows: [['M', 0.98, 1.16], ['Q', 0.72, 1.26, 0.53, 1.55], ['Q', -0.3, 1.65, -1.9, 1.61], ['Q', -2.12, 1.52, -2.16, 1.2], ['L', 0.98, 1.16]],
    windshield: { y: 1.36, z: 0.76, tilt: -0.9, height: 0.55 },
    rearWindow: { y: 1.42, z: -2.29, tilt: 0.15, height: 0.5 },
    front: 2.37, rear: -2.34, headlightY: 0.86, taillightY: 1.12, seams: [0.95, -0.35, -1.4],
  },
  wagon: {
    outline: [['M', -2.25, 0.36], ['L', 2.1, 0.36], ['Q', 2.3, 0.38, 2.3, 0.6], ['Q', 2.29, 0.76, 2.1, 0.82], ['L', 1.0, 0.98],
      ['Q', 0.62, 1.06, 0.38, 1.4], ['Q', -0.4, 1.5, -1.9, 1.46], ['Q', -2.18, 1.4, -2.22, 1.15], ['L', -2.25, 0.55],
      ['Q', -2.27, 0.36, -2.25, 0.36]],
    windows: [['M', 0.94, 1.03], ['Q', 0.62, 1.14, 0.42, 1.36], ['Q', -0.4, 1.44, -1.85, 1.4], ['Q', -2.05, 1.32, -2.08, 1.07], ['L', 0.94, 1.03]],
    windshield: { y: 1.2, z: 0.68, tilt: -0.95, height: 0.5 },
    rearWindow: { y: 1.25, z: -2.2, tilt: 0.2, height: 0.42 },
    front: 2.3, rear: -2.26, headlightY: 0.74, taillightY: 0.98, seams: [0.88, -0.3, -1.35],
  },
  aero: {
    outline: [['M', -2.2, 0.32], ['L', 2.05, 0.32], ['Q', 2.27, 0.34, 2.27, 0.52], ['Q', 2.26, 0.66, 2.08, 0.72], ['L', 1.1, 0.9],
      ['Q', 0.55, 1.05, 0.15, 1.45], ['Q', -0.45, 1.52, -1.1, 1.38], ['Q', -1.75, 1.16, -2.15, 0.98],
      ['Q', -2.28, 0.66, -2.2, 0.42], ['Q', -2.19, 0.32, -2.2, 0.32]],
    windows: [['M', 1.02, 0.95], ['Q', 0.55, 1.1, 0.2, 1.4], ['Q', -0.42, 1.46, -1.05, 1.34], ['Q', -1.5, 1.17, -1.8, 1.0], ['L', 1.02, 0.95]],
    windshield: { y: 1.15, z: 0.6, tilt: -1.1, height: 0.62 },
    rearWindow: { y: 1.15, z: -1.62, tilt: 1.15, height: 0.5 },
    front: 2.27, rear: -2.22, headlightY: 0.68, taillightY: 0.92, seams: [0.9, -0.25, -1.25],
  },
};

const cylinderRow = (count, { x = 0, z0, dz, y = 0.97, r = 0.062, axis = 'z', prefix = 'cylinder' }) =>
  Object.fromEntries(Array.from({ length: count }, (_, i) => [
    `${prefix}-${i + 1}`,
    axis === 'z' ? { shape: 'cylV', x, z: z0 - i * dz, y, h: 0.06, r } : { shape: 'cylV', x: x - i * dz, z: z0, y, h: 0.06, r },
  ]));

export const LAYOUTS = {
  fwd4: {
    name: 'Kompakt · R4 quer · Front',
    profile: 'hatch',
    drivetrain: 'fwd',
    overrides: {},
  },

  rwd6: {
    name: 'Limousine · R6 längs · Heck',
    profile: 'sedan',
    drivetrain: 'rwd',
    skipDetails: ['engine', 'intake', 'exhaust', 'transmission', 'battery', 'steering', 'e-motor'],
    overrides: {
      // Reihensechser längs, leicht hinter der Vorderachse (Front-Mittelmotor)
      engine: { shape: 'engine', x: 0, z: 1.3, w: 0.46, d: 1.12, y: 0.7, h: 0.44 },
      ...cylinderRow(6, { x: -0.02, z0: 1.74, dz: 0.172, y: 0.98, r: 0.06 }),
      ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`injector-${i + 1}`, { shape: 'box', x: 0.11, z: 1.74 - i * 0.172, w: 0.04, d: 0.04, y: 0.99, h: 0.08 }])),
      'fuel-rail': { shape: 'box', x: 0.13, z: 1.31, w: 0.035, d: 0.98, y: 1.03, h: 0.035 },
      'glow-plugs': { shape: 'dots', points: Array.from({ length: 6 }, (_, i) => ({ x: -0.1, z: 1.74 - i * 0.172 })), y: 1.0, h: 0.06 },
      // Ansaugseite links (Fahrerseite), Abgasseite rechts
      intake: { shape: 'box', x: 0.36, z: 1.3, w: 0.16, d: 0.9, y: 0.86, h: 0.2 },
      maf: { shape: 'cylZ', x: 0.5, z: 1.98, r: 0.045, len: 0.14, y: 0.92 },
      throttle: { shape: 'cylX', x: 0.33, z: 1.83, r: 0.05, len: 0.1, y: 0.9 },
      'charge-air-cooler': { shape: 'box', x: 0, z: 2.12, w: 1.0, d: 0.06, y: 0.42, h: 0.16 },
      turbo: { shape: 'cylX', x: -0.4, z: 1.25, r: 0.07, len: 0.14, y: 0.6 },
      egr: { shape: 'box', x: -0.3, z: 0.98, w: 0.1, d: 0.12, y: 0.82, h: 0.1 },
      camshaft: { shape: 'box', x: 0, z: 1.9, w: 0.08, d: 0.05, y: 1.02, h: 0.05 },
      crankshaft: { shape: 'box', x: 0.08, z: 1.88, w: 0.08, d: 0.05, y: 0.42, h: 0.06 },
      'knock-sensor': { shape: 'box', x: 0.24, z: 1.35, w: 0.05, d: 0.06, y: 0.6, h: 0.05 },
      'oil-pressure': { shape: 'box', x: 0.24, z: 1.0, w: 0.05, d: 0.06, y: 0.5, h: 0.05 },
      alternator: { shape: 'cylX', x: 0.3, z: 1.88, r: 0.1, len: 0.12, y: 0.58 },
      'ac-compressor': { shape: 'cylX', x: -0.3, z: 1.88, r: 0.09, len: 0.12, y: 0.5 },
      thermostat: { shape: 'box', x: 0.05, z: 1.95, w: 0.1, d: 0.06, y: 0.96, h: 0.07 },
      'coolant-sensor': { shape: 'box', x: -0.08, z: 1.95, w: 0.07, d: 0.05, y: 0.98, h: 0.05 },
      // Getriebe im Mitteltunnel, Batterie im Kofferraum
      transmission: { shape: 'box', x: 0, z: 0.42, w: 0.34, d: 0.62, y: 0.45, h: 0.3 },
      'input-speed': { shape: 'box', x: 0.13, z: 0.7, w: 0.05, d: 0.05, y: 0.5, h: 0.06 },
      'vehicle-speed': { shape: 'box', x: 0.08, z: 0.1, w: 0.05, d: 0.05, y: 0.42, h: 0.06 },
      tcm: { shape: 'box', x: -0.18, z: 0.42, w: 0.06, d: 0.18, y: 0.45, h: 0.05 },
      battery: { shape: 'box', x: -0.5, z: -1.95, w: 0.26, d: 0.18, y: 0.45, h: 0.22 },
      // Abgasanlage rechts unter dem Fahrzeug, ein Strang (eine Bank)
      exhaust: { shape: 'tube', r: 0.032, paths: [[[-0.3, 0.62, 1.55], [-0.36, 0.42, 1.2], [-0.3, 0.26, 0.85], [-0.26, 0.24, 0.3], [-0.26, 0.24, -1.2], [-0.4, 0.26, -1.75], [-0.42, 0.26, -2.25]]] },
      'cat-1': { shape: 'box', x: -0.28, z: 0.42, w: 0.15, d: 0.34, y: 0.25, h: 0.12 },
      'lambda-front': { shape: 'cylV', x: -0.3, z: 0.72, r: 0.02, y: 0.28, h: 0.1 },
      'lambda-rear': { shape: 'cylV', x: -0.27, z: 0.16, r: 0.02, y: 0.28, h: 0.1 },
      // Lenkgetriebe vor der Vorderachse
      steering: { shape: 'steering', rack: { x: 0, z: 1.55, w: 0.7 }, ring: { x: 0.41, z: 0.0 } },
    },
    details: {
      engine({ add, def }) {
        const top = def.y + def.h / 2;
        add('box', { x: def.x, z: def.z, w: def.w * 0.8, d: def.d * 0.9, y: top + 0.04, h: 0.07 }); // Haube
        add('box', { x: def.x, z: def.z, w: def.w * 0.7, d: def.d * 0.8, y: def.y - def.h / 2 - 0.06, h: 0.12 }); // Ölwanne
        for (let i = 0; i < 6; i++) add('tube', { r: 0.017, paths: [[[-0.12, 0.85, 1.74 - i * 0.172], [-0.28, 0.72, 1.74 - i * 0.172], [-0.32, 0.6, 1.5 - i * 0.05]]] }); // Krümmer
      },
      exhaust({ add }) {
        add('box', { x: -0.3, z: -1.75, w: 0.45, d: 0.42, y: 0.27, h: 0.16 }); // Schalldämpfer
        add('cylV', { x: -0.27, z: -0.45, r: 0.07, y: 0.24, h: 0.34, rotation: [Math.PI / 2, 0, 0] }); // Mitteltopf
      },
      transmission({ add, def }) {
        add('cylZ', { x: def.x, z: def.z + def.d / 2 + 0.06, r: 0.2, len: 0.12, y: def.y + 0.05 }); // Kupplungsglocke
      },
      intake({ add }) {
        for (let i = 0; i < 6; i++) add('tube', { r: 0.017, paths: [[[0.3, 0.9, 1.74 - i * 0.172], [0.17, 0.98, 1.74 - i * 0.172], [0.08, 0.96, 1.74 - i * 0.172]]] });
        add('box', { x: 0.5, z: 1.95, w: 0.22, d: 0.2, y: 0.88, h: 0.16 }); // Luftfilterkasten
      },
      battery({ add, def }) {
        add('cylV', { x: def.x, z: def.z + 0.05, r: 0.017, y: def.y + def.h / 2 + 0.02, h: 0.04, color: 0xc0392b });
        add('cylV', { x: def.x, z: def.z - 0.05, r: 0.017, y: def.y + def.h / 2 + 0.02, h: 0.04, color: 0x1d2426 });
      },
      steering({ add }) {
        for (const sx of [1, -1]) add('cylX', { x: sx * 0.52, z: 1.5, r: 0.012, len: 0.34, y: 0.45 });
      },
    },
  },
};

// V8 längs (SUV/Pick-up, Allrad): Bank 1 links (Zylinder 1-3-5-7), Bank 2 rechts (2-4-6-8).
const V8_Z = [1.62, 1.4, 1.18, 0.96];
const v8Bank = (bank) => {
  const sx = bank === 1 ? 1 : -1;
  return Object.fromEntries(V8_Z.flatMap((z, i) => {
    const n = bank === 1 ? 1 + i * 2 : 2 + i * 2;
    const zz = bank === 1 ? z : z - 0.06;
    return [
      [`cylinder-${n}`, { shape: 'cylV', x: sx * 0.22, z: zz, y: 0.98, h: 0.06, r: 0.055, rotation: [0, 0, -sx * 0.5] }],
      [`injector-${n}`, { shape: 'box', x: sx * 0.12, z: zz, w: 0.04, d: 0.04, y: 1.02, h: 0.08, rotation: [0, 0, -sx * 0.5] }],
    ];
  }));
};
const v8Exhaust = (sx) => [[sx * 0.32, 0.62, 1.5], [sx * 0.38, 0.42, 1.1], [sx * 0.32, 0.28, 0.7], [sx * 0.3, 0.26, 0.2], [sx * 0.3, 0.26, -1.3], [sx * 0.46, 0.28, -1.85], [sx * 0.5, 0.28, -2.32]];

LAYOUTS.v8 = {
  name: 'SUV/Pick-up · V8 längs · Allrad',
  profile: 'suv',
  drivetrain: 'awd',
  skipDetails: ['engine', 'intake', 'exhaust', 'transmission', 'steering'],
  overrides: {
    engine: { shape: 'engine', x: 0, z: 1.27, w: 0.62, d: 0.9, y: 0.68, h: 0.4 },
    ...v8Bank(1),
    ...v8Bank(2),
    'fuel-rail': { shape: 'box', x: 0.13, z: 1.27, w: 0.035, d: 0.8, y: 1.07, h: 0.035 },
    'glow-plugs': { shape: 'dots', points: [...V8_Z.map((z) => ({ x: 0.31, z })), ...V8_Z.map((z) => ({ x: -0.31, z: z - 0.06 }))], y: 0.95, h: 0.06 },
    intake: { shape: 'box', x: 0, z: 1.26, w: 0.24, d: 0.74, y: 1.05, h: 0.14 },
    throttle: { shape: 'cylZ', x: 0, z: 1.75, r: 0.055, len: 0.1, y: 1.02 },
    maf: { shape: 'cylZ', x: 0.25, z: 2.0, r: 0.05, len: 0.14, y: 0.98 },
    turbo: { shape: 'cylX', x: -0.46, z: 1.05, r: 0.07, len: 0.14, y: 0.62 },
    egr: { shape: 'box', x: -0.18, z: 1.72, w: 0.1, d: 0.1, y: 0.96, h: 0.1 },
    camshaft: { shape: 'box', x: 0, z: 1.8, w: 0.08, d: 0.05, y: 0.95, h: 0.05 },
    crankshaft: { shape: 'box', x: 0.1, z: 1.8, w: 0.08, d: 0.05, y: 0.42, h: 0.06 },
    'knock-sensor': { shape: 'box', x: 0, z: 1.15, w: 0.06, d: 0.05, y: 0.94, h: 0.05 },
    'oil-pressure': { shape: 'box', x: 0.06, z: 1.72, w: 0.05, d: 0.05, y: 0.86, h: 0.05 },
    alternator: { shape: 'cylX', x: 0.33, z: 1.82, r: 0.1, len: 0.12, y: 0.74 },
    'ac-compressor': { shape: 'cylX', x: -0.33, z: 1.82, r: 0.09, len: 0.12, y: 0.56 },
    thermostat: { shape: 'box', x: 0, z: 1.84, w: 0.1, d: 0.06, y: 0.92, h: 0.07 },
    'coolant-sensor': { shape: 'box', x: 0.09, z: 1.84, w: 0.07, d: 0.05, y: 0.96, h: 0.05 },
    transmission: { shape: 'box', x: 0, z: 0.38, w: 0.36, d: 0.76, y: 0.48, h: 0.32 },
    'input-speed': { shape: 'box', x: 0.15, z: 0.72, w: 0.05, d: 0.05, y: 0.52, h: 0.06 },
    'vehicle-speed': { shape: 'box', x: 0.05, z: 0.02, w: 0.05, d: 0.05, y: 0.45, h: 0.06 },
    tcm: { shape: 'box', x: -0.2, z: 0.38, w: 0.06, d: 0.2, y: 0.48, h: 0.05 },
    exhaust: { shape: 'tube', r: 0.032, paths: [v8Exhaust(1), v8Exhaust(-1)] },
    'cat-1': { shape: 'box', x: 0.3, z: 0.42, w: 0.14, d: 0.32, y: 0.26, h: 0.12 },
    'cat-2': { shape: 'box', label: 'Katalysator Bank 2', x: -0.3, z: 0.42, w: 0.14, d: 0.32, y: 0.26, h: 0.12 },
    'lambda-front': { shape: 'cylV', x: 0.31, z: 0.72, r: 0.02, y: 0.29, h: 0.1 },
    'lambda-front-2': { shape: 'cylV', x: -0.31, z: 0.72, r: 0.02, y: 0.29, h: 0.1 },
    'lambda-rear': { shape: 'cylV', x: 0.3, z: 0.12, r: 0.02, y: 0.29, h: 0.1 },
    'lambda-rear-2': { shape: 'cylV', x: -0.3, z: 0.12, r: 0.02, y: 0.29, h: 0.1 },
    steering: { shape: 'steering', rack: { x: 0, z: 1.6, w: 0.72 }, ring: { x: 0.41, z: 0.0 } },
  },
  details: {
    engine({ add, def }) {
      for (const sx of [1, -1]) add('box', { x: sx * 0.24, z: def.z - 0.03, w: 0.16, d: def.d * 0.95, y: 0.92, h: 0.1, rotation: [0, 0, -sx * 0.5] }); // Zylinderköpfe
      add('box', { x: def.x, z: def.z, w: def.w * 0.7, d: def.d * 0.85, y: def.y - def.h / 2 - 0.06, h: 0.12 }); // Ölwanne
      for (const sx of [1, -1]) for (const [i, z] of V8_Z.entries()) { // Krümmer je Bank
        const zz = sx === 1 ? z : z - 0.06;
        add('tube', { r: 0.017, paths: [[[sx * 0.3, 0.84, zz], [sx * 0.38, 0.72, zz - 0.02], [sx * 0.34, 0.62, 1.5 - i * 0.02]]] });
      }
    },
    'fuel-rail'({ add, def }) {
      add('box', { x: -0.13, z: def.z - 0.06, w: def.w, d: def.d, y: def.y, h: def.h }); // zweite Leiste (Bank 2)
    },
    intake({ add }) {
      for (const sx of [1, -1]) for (const z of V8_Z) add('tube', { r: 0.016, paths: [[[sx * 0.06, 1.08, sx === 1 ? z : z - 0.06], [sx * 0.14, 1.05, sx === 1 ? z : z - 0.06], [sx * 0.19, 1.0, sx === 1 ? z : z - 0.06]]] });
      add('box', { x: 0.25, z: 1.95, w: 0.24, d: 0.22, y: 0.94, h: 0.16 }); // Luftfilterkasten
    },
    exhaust({ add }) {
      for (const sx of [1, -1]) {
        add('box', { x: sx * 0.34, z: -1.65, w: 0.24, d: 0.5, y: 0.28, h: 0.16 }); // Schalldämpfer je Strang
        add('cylZ', { x: sx * 0.5, z: -2.3, r: 0.04, len: 0.14, y: 0.28 }); // Endrohre
      }
    },
    transmission({ add, def }) {
      add('cylZ', { x: def.x, z: def.z + def.d / 2 + 0.06, r: 0.22, len: 0.12, y: def.y + 0.05 });
    },
    steering({ add }) {
      for (const sx of [1, -1]) add('cylX', { x: sx * 0.53, z: 1.55, r: 0.013, len: 0.34, y: 0.46 });
    },
  },
};

// Boxer längs vor der Vorderachse (Kombi, symmetrischer Allrad). Zylinder 1/3 rechts, 2/4 links, liegend.
const BOXER = { 1: [-0.3, 1.66], 2: [0.3, 1.66], 3: [-0.3, 1.44], 4: [0.3, 1.44] };
LAYOUTS.boxer = {
  name: 'Kombi · Boxer längs · Allrad',
  profile: 'wagon',
  drivetrain: 'awd',
  skipDetails: ['engine', 'intake', 'exhaust', 'transmission', 'steering'],
  overrides: {
    engine: { shape: 'box', x: 0, z: 1.55, w: 0.6, d: 0.48, y: 0.55, h: 0.3 },
    ...Object.fromEntries(Object.entries(BOXER).flatMap(([n, [x, z]]) => [
      [`cylinder-${n}`, { shape: 'cylX', x, z, y: 0.55, r: 0.06, len: 0.1 }],
      [`injector-${n}`, { shape: 'box', x: x * 0.93, z, w: 0.04, d: 0.04, y: 0.74, h: 0.08 }],
    ])),
    'fuel-rail': { shape: 'box', x: -0.28, z: 1.55, w: 0.035, d: 0.36, y: 0.79, h: 0.035 },
    'glow-plugs': { shape: 'dots', points: Object.values(BOXER).map(([x, z]) => ({ x: x * 1.4, z })), y: 0.6, h: 0.06 },
    intake: { shape: 'box', x: 0, z: 1.55, w: 0.34, d: 0.4, y: 0.8, h: 0.1 },
    'charge-air-cooler': { shape: 'box', x: 0, z: 1.4, w: 0.52, d: 0.3, y: 0.98, h: 0.06 }, // Ladeluftkühler oben auf dem Motor
    throttle: { shape: 'cylZ', x: 0, z: 1.85, r: 0.05, len: 0.1, y: 0.8 },
    maf: { shape: 'cylZ', x: 0.32, z: 1.98, r: 0.045, len: 0.14, y: 0.88 },
    turbo: { shape: 'cylX', x: -0.12, z: 1.24, r: 0.07, len: 0.14, y: 0.42 },
    egr: { shape: 'box', x: 0.2, z: 1.3, w: 0.1, d: 0.1, y: 0.74, h: 0.1 },
    camshaft: { shape: 'box', x: -0.4, z: 1.8, w: 0.06, d: 0.05, y: 0.66, h: 0.05 },
    crankshaft: { shape: 'box', x: 0, z: 1.82, w: 0.08, d: 0.05, y: 0.45, h: 0.06 },
    'knock-sensor': { shape: 'box', x: 0, z: 1.55, w: 0.06, d: 0.05, y: 0.72, h: 0.05 },
    'oil-pressure': { shape: 'box', x: 0.1, z: 1.32, w: 0.05, d: 0.05, y: 0.5, h: 0.05 },
    alternator: { shape: 'cylX', x: 0.3, z: 1.86, r: 0.09, len: 0.12, y: 0.78 },
    'ac-compressor': { shape: 'cylX', x: -0.3, z: 1.86, r: 0.08, len: 0.12, y: 0.72 },
    thermostat: { shape: 'box', x: -0.1, z: 1.85, w: 0.1, d: 0.06, y: 0.48, h: 0.07 },
    'coolant-sensor': { shape: 'box', x: 0.05, z: 1.8, w: 0.07, d: 0.05, y: 0.7, h: 0.05 },
    transmission: { shape: 'box', x: 0, z: 0.95, w: 0.36, d: 0.6, y: 0.48, h: 0.3 },
    'input-speed': { shape: 'box', x: 0.15, z: 1.15, w: 0.05, d: 0.05, y: 0.52, h: 0.06 },
    'vehicle-speed': { shape: 'box', x: 0.05, z: 0.62, w: 0.05, d: 0.05, y: 0.42, h: 0.06 },
    tcm: { shape: 'box', x: -0.2, z: 0.95, w: 0.06, d: 0.18, y: 0.5, h: 0.05 },
    exhaust: { shape: 'tube', r: 0.032, paths: [
      [[-0.4, 0.5, 1.6], [-0.3, 0.26, 1.4], [0, 0.22, 1.15], [0, 0.22, 0.6], [-0.05, 0.24, -1.2], [-0.3, 0.26, -1.8], [-0.35, 0.26, -2.26]],
      [[0.4, 0.5, 1.6], [0.3, 0.26, 1.4], [0.02, 0.22, 1.18]],
    ] },
    'cat-1': { shape: 'box', x: 0, z: 1.0, w: 0.16, d: 0.3, y: 0.23, h: 0.12 },
    'lambda-front': { shape: 'cylV', x: 0, z: 1.22, r: 0.02, y: 0.26, h: 0.1 },
    'lambda-rear': { shape: 'cylV', x: 0, z: 0.78, r: 0.02, y: 0.26, h: 0.1 },
    steering: { shape: 'steering', rack: { x: 0, z: 1.15, w: 0.7 }, ring: { x: 0.41, z: 0.0 } },
  },
  details: {
    engine({ add, def }) {
      for (const sx of [1, -1]) add('box', { x: sx * 0.38, z: def.z, w: 0.12, d: def.d * 0.95, y: def.y, h: 0.26 }); // Zylinderköpfe außen
      add('box', { x: def.x, z: def.z, w: def.w * 0.5, d: def.d * 0.8, y: def.y - def.h / 2 - 0.05, h: 0.1 }); // Ölwanne
    },
    'fuel-rail'({ add, def }) {
      add('box', { x: 0.28, z: def.z, w: def.w, d: def.d, y: def.y, h: def.h });
    },
    intake({ add }) {
      for (const [x, z] of Object.values(BOXER)) add('tube', { r: 0.017, paths: [[[x * 0.3, 0.8, z], [x * 0.7, 0.78, z], [x * 0.95, 0.68, z]]] });
    },
    exhaust({ add }) {
      add('box', { x: -0.3, z: -1.7, w: 0.42, d: 0.42, y: 0.27, h: 0.15 });
      add('cylZ', { x: -0.35, z: -2.24, r: 0.04, len: 0.12, y: 0.26 });
    },
    transmission({ add, def }) {
      add('cylZ', { x: def.x, z: def.z + def.d / 2 + 0.05, r: 0.2, len: 0.1, y: def.y + 0.04 });
    },
    steering({ add }) {
      for (const sx of [1, -1]) add('cylX', { x: sx * 0.52, z: 1.2, r: 0.012, len: 0.36, y: 0.45 });
    },
  },
};

// Vollhybrid (Aero-Schrägheck, Frontantrieb): R4 quer, E-Motor/Leistungselektronik am Getriebe,
// Hochvoltbatterie unter der Rückbank, 12-V-Batterie im Kofferraum. Übrige Lage wie Grundform.
const HV_ORANGE = 0xff7a1a;
LAYOUTS.hybrid = {
  name: 'Hybrid · R4 quer + E-Motor · Front',
  profile: 'aero',
  drivetrain: 'fwd',
  skipDetails: ['e-motor', 'battery', 'transmission', 'hv-battery'],
  overrides: {
    'e-motor': { shape: 'cylX', x: -0.22, z: 0.93, r: 0.15, len: 0.22, y: 0.55 },
    transmission: { shape: 'box', x: 0.03, z: 0.93, w: 0.2, d: 0.36, y: 0.52, h: 0.3 },
    'hv-battery': { shape: 'box', x: 0, z: -1.0, w: 1.2, d: 0.5, y: 0.37, h: 0.15 },
    battery: { shape: 'box', x: -0.55, z: -1.82, w: 0.24, d: 0.16, y: 0.42, h: 0.2 },
  },
  details: {
    'e-motor'({ add, def }) {
      add('box', { x: def.x + 0.05, z: def.z + 0.08, w: 0.36, d: 0.3, y: def.y + 0.27, h: 0.14 }); // Leistungselektronik (Inverter)
    },
    'hv-battery'({ add, def }) {
      const top = def.y + def.h / 2 + 0.004;
      for (let i = 1; i < 8; i++) add('box', { x: def.x - def.w / 2 + (i * def.w) / 8, z: def.z, w: 0.008, d: def.d * 0.9, y: top, h: 0.006 });
      add('tube', { r: 0.014, color: HV_ORANGE, paths: [[[0.15, 0.4, -0.74], [0.25, 0.3, -0.2], [0.2, 0.3, 0.5], [-0.05, 0.6, 0.9], [-0.12, 0.84, 1.0]]] }); // HV-Leitung
    },
    battery({ add, def }) {
      add('cylV', { x: def.x, z: def.z + 0.05, r: 0.017, y: def.y + def.h / 2 + 0.02, h: 0.04, color: 0xc0392b });
      add('cylV', { x: def.x, z: def.z - 0.05, r: 0.017, y: def.y + def.h / 2 + 0.02, h: 0.04, color: 0x1d2426 });
    },
  },
};

// Typische Bauform je Hersteller (Slug aus der Datenbank). Nicht aufgeführte Marken: Grundform.
export const BRAND_LAYOUT = {
  subaru: 'boxer', toyota: 'hybrid', lexus: 'hybrid', infiniti: 'rwd6',
  bmw: 'rwd6', mercedes: 'rwd6', jaguar: 'rwd6',
  chevy: 'v8', gmc: 'v8', cadillac: 'v8', gm: 'v8', ford: 'v8', lincoln: 'v8', mercury: 'v8',
  dodge: 'v8', chrysler: 'v8', jeep: 'v8', plymouth: 'v8', pontiac: 'v8', buick: 'v8', oldsmobile: 'v8',
};

// Bauteile, die eine Bauform nicht hat, werden auf das übergeordnete Bauteil markiert.
export const FALLBACK = {
  'cylinder-5': 'engine', 'cylinder-6': 'engine', 'cylinder-7': 'engine', 'cylinder-8': 'engine',
  'injector-5': 'fuel-rail', 'injector-6': 'fuel-rail', 'injector-7': 'fuel-rail', 'injector-8': 'fuel-rail',
  'cat-2': 'cat-1', 'lambda-front-2': 'lambda-front', 'lambda-rear-2': 'lambda-rear',
};

// Bezeichnungen für Bauteile, die es nicht im 2D-Plan gibt.
export const EXTRA_LABELS = {
  'cylinder-5': 'Zylinder 5', 'cylinder-6': 'Zylinder 6', 'cylinder-7': 'Zylinder 7', 'cylinder-8': 'Zylinder 8',
  'injector-5': 'Einspritzventil Zylinder 5', 'injector-6': 'Einspritzventil Zylinder 6',
  'injector-7': 'Einspritzventil Zylinder 7', 'injector-8': 'Einspritzventil Zylinder 8',
  'lambda-front-2': 'Lambdasonde vor Katalysator Bank 2', 'lambda-rear-2': 'Lambdasonde nach Katalysator Bank 2',
};
