// Builders for every object "type" used in site-config.js.
// To invent a new type: write a function that returns a THREE.Group centred on
// its own origin, and add it to BUILDERS at the bottom.

import * as THREE from 'three';
import { buildHouse, buildShed } from './house.js';

const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });

function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildPool({ length = 8, width = 4, deck = 1.5 }) {
  const g = new THREE.Group();
  g.add(box(length + 2 * deck, 0.12, width + 2 * deck, mat(0xd8d2c4), 0, 0.06, 0));
  g.add(box(length + 0.3, 0.14, width + 0.3, mat(0xf4f4f0), 0, 0.07, 0)); // coping
  const water = box(length, 0.15, width, mat(0x2fa8d8, { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.9 }), 0, 0.075, 0);
  water.castShadow = false;
  g.add(water);
  g.userData.labelHeight = 1.5;
  return g;
}

function buildParking({ spots = 3 }) {
  const g = new THREE.Group();
  const w = spots * 2.5, d = 5;
  g.add(box(w, 0.06, d, mat(0x77797c), 0, 0.03, 0));
  for (let i = 0; i <= spots; i++) {
    g.add(box(0.1, 0.07, d - 0.4, mat(0xffffff), -w / 2 + i * 2.5 + (i === 0 ? 0.05 : i === spots ? -0.05 : 0), 0.035, 0));
  }
  g.userData.labelHeight = 1.5;
  return g;
}

function buildGate({ width = 6, height = 1.8 }) {
  const g = new THREE.Group();
  const green = mat(0x1f5a3a, { roughness: 0.6 });
  for (const x of [-width / 2, width / 2]) g.add(box(0.14, height + 0.2, 0.14, green, x, (height + 0.2) / 2, 0));
  for (const y of [0.15, height / 2, height]) g.add(box(width, 0.08, 0.06, green, 0, y, 0));
  for (let i = 1; i < 4; i++) g.add(box(0.08, height, 0.06, green, -width / 2 + (i * width) / 4, height / 2 + 0.05, 0));
  const meshPanel = box(width, height - 0.15, 0.02, mat(0x1f5a3a, { transparent: true, opacity: 0.35 }), 0, height / 2 + 0.08, 0);
  meshPanel.castShadow = false;
  g.add(meshPanel);
  g.userData.labelHeight = height + 1;
  return g;
}

// Flat paved/gravel/grass rectangle: { length, width, color }
function buildArea({ length = 10, width = 3, color = '#8d8d8d' }) {
  const g = new THREE.Group();
  g.add(box(length, 0.05, width, mat(color), 0, 0.025, 0));
  g.userData.labelHeight = 1.5;
  return g;
}

// Simple block for anything not modelled yet: { size: [w, h, d], color }
function buildBox({ size = [3, 2.5, 3], color = '#b08a5a' }) {
  const g = new THREE.Group();
  g.add(box(size[0], size[1], size[2], mat(color), 0, size[1] / 2, 0));
  g.userData.labelHeight = size[1] + 1;
  return g;
}

function buildTree({ height = 5 }) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, height * 0.35, 8), mat(0x6b4a2e));
  trunk.position.y = height * 0.175;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(height * 0.35, 1), mat(0x4f7a3a));
  crown.position.y = height * 0.65;
  crown.scale.y = 1.15;
  trunk.castShadow = crown.castShadow = true;
  g.add(trunk, crown);
  g.userData.labelHeight = height + 0.8;
  return g;
}

export const BUILDERS = {
  house: buildHouse,
  shed: buildShed,
  pool: buildPool,
  parking: buildParking,
  gate: buildGate,
  area: buildArea,
  box: buildBox,
  tree: buildTree,
};
