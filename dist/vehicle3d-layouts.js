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

// Typische Bauform je Hersteller (Slug aus der Datenbank). Nicht aufgeführte Marken: Grundform.
export const BRAND_LAYOUT = {
  bmw: 'rwd6', mercedes: 'rwd6', jaguar: 'rwd6',
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
