// ─────────────────────────────────────────────────────────────────────────────
//  SITE CONFIG — the one file you edit to add, move, resize or remove things.
//
//  Units: metres and degrees.
//  Coordinates: x grows to the RIGHT of the drone photo, z grows DOWN the photo.
//               (0, 0) is the centre of the drone photo.
//  status: 'built'   = already exists
//          'planned' = idea / future work (shown with a "planned" tag, can be
//                      hidden with the "Planned items" switch)
//
//  Tip: turn on "Edit layout" in the app, drag things where you want them,
//  press "Copy layout" and paste the numbers here (or give them to Claude).
// ─────────────────────────────────────────────────────────────────────────────

export const SITE = {
  title: { mk: 'Викендичка — 3Д план', en: 'Weekend house — 3D plan' },

  // Drone photo used as the ground. metresPerPixel was calculated so that the
  // fenced plot equals 5 decares (5000 m²). Increase it if things look too
  // small against the photo, decrease it if they look too big.
  ground: {
    image: 'assets/drone.jpg',
    imageWidthPx: 3200,
    imageHeightPx: 2400,
    metresPerPixel: 0.0366, // 0.0731 m per pixel of the 1600-px preview
  },

  // Outline of the fenced plot (traced by eye from the drone photo).
  boundary: [
    [37.3, -32.9], [21.9, -30.4], [10.2, -28.2], [-7.3, -25.2], [-23.4, -21.9],
    [-30.7, -14.6], [-38.0, -5.9], [-44.6, 2.9], [-47.5, 13.2], [-46.8, 21.9],
    [-43.9, 28.5], [-38.8, 32.5], [-14.6, 31.4], [14.6, 26.3], [36.6, 20.5],
    [58.5, 15.4], [58.5, 0.0], [54.1, -5.9], [49.0, -14.6], [43.9, -24.9],
    [39.9, -31.4],
  ],

  // Everything standing on the plot. Order does not matter.
  objects: [
    {
      id: 'house',
      type: 'house', // geometry lives in src/house.js (from the architect's plan)
      name: { mk: 'Куќа', en: 'House' },
      status: 'built',
      position: [16.1, -9.5],
      rotation: 107.5,
    },
    {
      id: 'shed',
      type: 'shed', // the 4.0 × 3.5 m small object
      name: { mk: 'Помошен објект', en: 'Small object' },
      status: 'built',
      position: [10.3, -18.7],
      rotation: 107.5,
    },
    {
      id: 'gate',
      type: 'gate',
      name: { mk: 'Влез', en: 'Entrance' },
      status: 'built',
      position: [36.6, -32.0],
      rotation: 17,
      width: 6,
      height: 1.8,
    },
    {
      id: 'pool',
      type: 'pool',
      name: { mk: 'Базен', en: 'Pool' },
      status: 'planned',
      position: [31.2, -4.8],
      rotation: 107.5,
      length: 8,
      width: 4,
      deck: 1.5, // paved strip around the water
    },
    {
      id: 'parking',
      type: 'parking',
      name: { mk: 'Паркинг', en: 'Parking' },
      status: 'planned',
      position: [29.0, -24.5],
      rotation: 17,
      spots: 3, // each spot is 2.5 × 5 m
    },

    // ── Examples of things you can add later (remove the // to switch on) ──
    // { id: 'road', type: 'area', name: { mk: 'Пат', en: 'Road' }, status: 'planned',
    //   position: [20, -27], rotation: 17, length: 30, width: 3.5, color: '#8d8d8d' },
    // { id: 'gazebo', type: 'box', name: { mk: 'Летниковец', en: 'Gazebo' }, status: 'planned',
    //   position: [0, 5], rotation: 0, size: [4, 2.6, 4], color: '#b08a5a' },
    // { id: 'tree1', type: 'tree', name: { mk: 'Дрво', en: 'Tree' }, status: 'planned',
    //   position: [-10, 0], height: 5 },
  ],
};
