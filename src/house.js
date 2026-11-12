// The existing house and the small object, built from the architect's plan
// (data/2d architecture.png) and the site photos.
//
// Local "plan" coordinates, in metres: x = left→right on the plan,
// z = top→bottom on the plan, origin at the top-left outer corner.
// Each builder returns a group centred on the building so it rotates nicely.

import * as THREE from 'three';

const C = {
  wall: 0xe9d8b8,
  plinth: 0xcfc6b4,
  roof: 0x3c4146,
  wood: 0x6b3f22,
  timber: 0xc7a47a,
  glass: 0x26343d,
  tile: 0xd9d4c8,
};

const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

function mesh(geo, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

// Flat polygon lying on the ground (points are [x, z]), extruded upward.
function prism(points, y0, y1, material, holes = []) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)));
  for (const h of holes) {
    shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, z))));
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false });
  geo.rotateX(Math.PI / 2); // shape y → world z, extrusion → downward
  geo.translate(0, y1, 0);
  return mesh(geo, material);
}

// Any flat polygon from 3D points, with explicit triangles and optional UVs.
function poly(points, triangles, material, uvFn) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  if (uvFn) {
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(points.flatMap(uvFn), 2));
  }
  geo.setIndex(triangles.flat());
  geo.computeVertexNormals();
  return mesh(geo, material);
}

function box(w, h, d, material, x, y, z) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  return m;
}

let seamTexture;
function roofMaterial() {
  if (!seamTexture) {
    // standing-seam metal: a thin lighter line every 0.5 m
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 4;
    const g = cv.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 64, 4);
    g.fillStyle = '#b9bcc0';
    g.fillRect(0, 0, 5, 4);
    seamTexture = new THREE.CanvasTexture(cv);
    seamTexture.wrapS = seamTexture.wrapT = THREE.RepeatWrapping;
    seamTexture.colorSpace = THREE.SRGBColorSpace;
    seamTexture.anisotropy = 8;
  }
  return new THREE.MeshStandardMaterial({
    color: C.roof,
    map: seamTexture,
    roughness: 0.55,
    metalness: 0.35,
    side: THREE.DoubleSide,
  });
}

// Window / door: a brown frame with dark glass (or a closed roller shutter).
// rot = 0 for walls running left-right on the plan, 90 for walls running up-down.
function opening(group, { x, z, rot = 0, w, h, sill, kind = 'window' }) {
  const g = new THREE.Group();
  const frame = box(w + 0.14, h + 0.14, 0.1, mat(C.wood), 0, 0, 0);
  const inner =
    kind === 'shutter'
      ? box(w, h, 0.12, mat(0x7a4a2a), 0, 0, 0)
      : kind === 'door'
        ? box(w, h, 0.12, mat(0x7a4a2a), 0, 0, 0)
        : box(w, h, 0.12, mat(C.glass, { roughness: 0.15, metalness: 0.6 }), 0, 0, 0);
  g.add(frame, inner);
  if (kind === 'window' && w > 1) g.add(box(0.06, h, 0.14, mat(C.wood), 0, 0, 0));
  g.position.set(x, sill + h / 2, z);
  g.rotation.y = THREE.MathUtils.degToRad(rot);
  group.add(g);
}

// ─────────────────────────────── HOUSE ──────────────────────────────────────
export function buildHouse() {
  const FLOOR = 0.3; // floor level above ground
  const EAVE = 3.0; // top of walls
  const RISE = 1.7; // main ridge above the eaves
  const p = RISE / 6; // roof slope (main roof is 12 m deep → 6 m each side)
  const O = 0.5; // roof overhang
  const T = 0.25; // wall thickness

  const inner = new THREE.Group(); // plan coordinates
  const roof = new THREE.Group(); // hidden by the "Roof" switch
  const planFloor = new THREE.Group(); // shown when the roof is hidden
  inner.add(roof, planFloor);

  // plinth + walls (L-shaped footprint from the plan: 11.0 × 9.5 m plus the
  // living-room part that reaches 12.0 m)
  const foot = [[0, 0], [11, 0], [11, 12], [6, 12], [6, 9.5], [0, 9.5]];
  const footIn = [[T, T], [11 - T, T], [11 - T, 12 - T], [6 + T, 12 - T], [6 + T, 9.5 - T], [T, 9.5 - T]];
  inner.add(prism(foot, 0, FLOOR, mat(C.plinth)));
  inner.add(prism(foot, FLOOR, EAVE, mat(C.wall), [footIn]));

  // terrace 6.0 × 3.5 m with steps
  inner.add(prism([[0, 9.5], [6, 9.5], [6, 13], [0, 13]], 0, FLOOR, mat(C.tile)));
  for (let i = 0; i < 2; i++) {
    inner.add(box(1.5, FLOOR - 0.1 * (i + 1), 0.3, mat(C.tile), 5.25, (FLOOR - 0.1 * (i + 1)) / 2, 13.15 + 0.3 * i));
  }
  // timber posts and beams carrying the terrace roof
  const timber = mat(C.timber);
  for (const x of [0.12, 3, 5.88]) inner.add(box(0.22, EAVE - FLOOR - 0.25, 0.22, timber, x, (EAVE - 0.25 + FLOOR) / 2, 12.88));
  inner.add(box(6, 0.25, 0.22, timber, 3, EAVE - 0.125, 12.88));
  inner.add(box(0.22, 0.25, 3.5, timber, 0.12, EAVE - 0.125, 11.25));

  // ceiling under the roof (so you don't see into the attic from the terrace)
  const ceiling = prism([[0, 0], [11, 0], [11, 12], [6, 12], [6, 13], [0, 13]], EAVE - 0.02, EAVE, mat(0xf2ede2));
  roof.add(ceiling);

  // floor with the architect's drawing on it (visible when the roof is off)
  const tex = new THREE.TextureLoader().load('assets/plan.jpg');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const floorPts = [[0, 0], [11, 0], [11, 12], [6, 12], [6, 13], [0, 13]];
  const fShape = new THREE.Shape(floorPts.map(([x, z]) => new THREE.Vector2(x, z)));
  const fGeo = new THREE.ShapeGeometry(fShape);
  fGeo.rotateX(Math.PI / 2);
  const pos = fGeo.attributes.position;
  const uv = fGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 11, 1 - pos.getZ(i) / 13);
  const floor = new THREE.Mesh(fGeo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  floor.position.y = FLOOR + 0.01;
  planFloor.add(floor);
  planFloor.visible = false;

  // ── roof ──
  const rm = roofMaterial();
  const L = 0.06; // lift above the walls
  const ym = (z) => EAVE + L + (6 - Math.abs(z - 6)) * p; // main roof height
  const yc = (x) => EAVE + L + (3 - Math.abs(x - 3)) * p; // terrace roof height
  const M = (x, z) => [x, ym(z), z];
  const K = (x, z) => [x, yc(x), z];
  const uvMain = ([x, , z]) => [x * 2, z];
  const uvCross = ([x, , z]) => [z * 2, x];

  // main gable roof, ridge running left-right on the plan at z = 6
  roof.add(poly([M(-O, -O), M(11 + O, -O), M(11 + O, 6), M(-O, 6)], [[0, 2, 1], [0, 3, 2]], rm, uvMain));
  // south slope, cut along the valleys where the terrace roof joins it
  roof.add(
    poly(
      [M(-O, 6), M(11 + O, 6), M(11 + O, 12 + O), M(6 + O, 12 + O), M(3, 9), M(-O, 12 + O)],
      [[0, 4, 1], [1, 4, 3], [1, 3, 2], [0, 5, 4]],
      rm,
      uvMain,
    ),
  );
  // gable roof over the terrace, ridge running top-bottom on the plan at x = 3
  roof.add(poly([K(3, 9), K(-O, 12 + O), K(-O, 13 + O), K(3, 13 + O)], [[0, 1, 2], [0, 2, 3]], rm, uvCross));
  roof.add(poly([K(3, 9), K(3, 13 + O), K(6 + O, 13 + O), K(6 + O, 12 + O)], [[0, 1, 2], [0, 2, 3]], rm, uvCross));

  // gable walls (triangles above the eaves)
  const wm = mat(C.wall, { side: THREE.DoubleSide });
  const e = 0.001;
  roof.add(poly([[11 - e, EAVE, 0], [11 - e, EAVE, 12], [11 - e, EAVE + RISE, 6]], [[0, 1, 2]], wm));
  roof.add(poly([[e, EAVE, 0], [e, EAVE, 9.5], [e, EAVE + 2.5 * p, 9.5], [e, EAVE + RISE, 6]], [[0, 1, 2], [0, 2, 3]], wm));
  roof.add(poly([[6 + e, EAVE, 9.5], [6 + e, EAVE, 12], [6 + e, EAVE + 2.5 * p, 9.5]], [[0, 1, 2]], wm));
  roof.add(poly([[0, EAVE, 9.5 - e], [6, EAVE, 9.5 - e], [6, EAVE + 2.5 * p, 9.5 - e], [0, EAVE + 2.5 * p, 9.5 - e]], [[0, 1, 2], [0, 2, 3]], wm));
  roof.add(poly([[0, EAVE, 12.88], [6, EAVE, 12.88], [3, EAVE + 3 * p, 12.88]], [[0, 1, 2]], mat(C.timber, { side: THREE.DoubleSide })));

  // small gable canopy over the kitchen door (right side of the plan)
  const cz = 6.15, ch = 1.15, cy = 2.75, cr = 0.5, cx1 = 12.6;
  const P = (x, y, z) => [x, y, z];
  roof.add(poly([P(11, cy + cr, cz), P(cx1, cy + cr, cz), P(cx1, cy, cz - ch), P(11, cy, cz - ch)], [[0, 1, 2], [0, 2, 3]], rm, ([x, , z]) => [x * 2, z]));
  roof.add(poly([P(11, cy + cr, cz), P(11, cy, cz + ch), P(cx1, cy, cz + ch), P(cx1, cy + cr, cz)], [[0, 1, 2], [0, 2, 3]], rm, ([x, , z]) => [x * 2, z]));
  roof.add(poly([P(cx1 - 0.1, cy, cz - ch + 0.1), P(cx1 - 0.1, cy, cz + ch - 0.1), P(cx1 - 0.1, cy + cr - 0.05, cz)], [[0, 1, 2]], wm));
  inner.add(box(1.5, 0.12, 2, mat(C.plinth), 11.75, 0.06, cz));

  // ── windows and doors (positions and sizes from the plan) ──
  const W = (o) => opening(inner, o);
  const F = FLOOR;
  // top wall: two children's rooms
  W({ x: 2.28, z: 0, w: 1.4, h: 1.4, sill: F + 0.8 });
  W({ x: 5.64, z: 0, w: 1.4, h: 1.4, sill: F + 0.8 });
  // right wall: storage, kitchen, kitchen door, living room
  W({ x: 11, z: 1.08, rot: 90, w: 0.8, h: 1.4, sill: F + 0.8, kind: 'shutter' });
  W({ x: 11, z: 3.78, rot: 90, w: 1.4, h: 1.2, sill: F + 1.0 });
  W({ x: 11, z: cz, rot: 90, w: 0.8, h: 2.0, sill: F });
  W({ x: 11, z: 8.34, rot: 90, w: 0.8, h: 1.4, sill: F + 0.8 });
  // bottom wall of the living room
  W({ x: 8.47, z: 12, w: 1.4, h: 1.4, sill: F + 0.8 });
  // living room sliding door to the terrace
  W({ x: 6, z: 10.65, rot: 90, w: 2.0, h: 2.1, sill: F });
  // wall facing the terrace: bedroom balcony door and the main entrance
  W({ x: 2.48, z: 9.5, w: 1.7, h: 2.1, sill: F });
  W({ x: 5.43, z: 9.5, w: 1.0, h: 2.0, sill: F, kind: 'door' });
  // left wall: bathroom and bedroom
  W({ x: 0, z: 4.35, rot: 90, w: 0.6, h: 0.6, sill: F + 1.5 });
  W({ x: 0, z: 6.47, rot: 90, w: 0.7, h: 1.4, sill: F + 0.8 });
  W({ x: 0, z: 8.92, rot: 90, w: 0.7, h: 1.4, sill: F + 0.8 });

  inner.position.set(-5.5, 0, -6); // centre of the building at the group origin
  const group = new THREE.Group();
  group.add(inner);
  group.userData.setRoofVisible = (on) => {
    roof.visible = on;
    planFloor.visible = !on;
  };
  group.userData.labelHeight = EAVE + RISE + 1;
  return group;
}

// ───────────────────────── SMALL OBJECT (4.0 × 3.5 m) ───────────────────────
export function buildShed() {
  const group = new THREE.Group();
  const W = 4, D = 3.5, LOW = 2.6, HIGH = 3.4; // mono-pitch roof, high side towards the house

  const side = (pts, depth, material) => {
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    geo.translate(0, 0, -depth / 2);
    return mesh(geo, material);
  };
  group.add(side([[-W / 2, 0], [W / 2, 0], [W / 2, LOW], [-W / 2, HIGH]], D, mat(C.wall)));
  const s = (LOW - HIGH) / W;
  const o = 0.35;
  const y1 = HIGH - s * o + 0.02, y2 = LOW + s * o + 0.02;
  group.add(side([[-W / 2 - o, y1], [W / 2 + o, y2], [W / 2 + o, y2 + 0.14], [-W / 2 - o, y1 + 0.14]], D + 2 * o, mat(C.roof, { roughness: 0.55, metalness: 0.35 })));

  // door and two small windows on the far (top-of-plan) side, shutter window on the driveway side
  opening(group, { x: -0.1, z: -D / 2, w: 0.9, h: 2.0, sill: 0.1, kind: 'door' });
  opening(group, { x: -1.3, z: -D / 2, w: 0.6, h: 0.4, sill: 1.9 });
  opening(group, { x: 1.1, z: -D / 2, w: 0.6, h: 0.4, sill: 1.9, kind: 'shutter' });
  opening(group, { x: W / 2, z: 0.5, rot: 90, w: 0.8, h: 1.4, sill: 0.9, kind: 'shutter' });

  group.userData.labelHeight = HIGH + 1;
  return group;
}
